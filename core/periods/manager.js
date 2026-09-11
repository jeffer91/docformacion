(() => {
  'use strict';

  const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const MANAGER_KEY = 'periodManager';
  const PERIOD_STATUS = ['Activo','Cerrado','Archivado'];
  const unlockedClosed = new Set();

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function clean(value) {
    return String(value ?? '').trim();
  }

  function parseMonth(value) {
    const match = clean(value).match(/^(\d{4})-(\d{2})/);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    if (!Number.isInteger(year) || month < 1 || month > 12) return null;
    return { year, month };
  }

  function monthValue(year, month) {
    const y = Number(year);
    const m = Number(month);
    if (!Number.isInteger(y) || !Number.isInteger(m) || m < 1 || m > 12) return '';
    return String(y).padStart(4, '0') + '-' + String(m).padStart(2, '0');
  }

  function monthLabel(value) {
    const parsed = parseMonth(value);
    if (!parsed) return 'Sin definir';
    return MONTHS[parsed.month - 1] + ' ' + parsed.year;
  }

  function periodLabelFor(start, end) {
    if (!start || !end) return 'Período sin definir';
    return monthLabel(start) + ' - ' + monthLabel(end);
  }

  function periodId(start, end) {
    return start && end ? start + '_' + end : '';
  }

  function periodOrder(value) {
    const parsed = parseMonth(value);
    return parsed ? parsed.year * 100 + parsed.month : 0;
  }

  function suggestedPeriod(date = new Date()) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    if (month >= 4 && month <= 9) return { start: monthValue(year, 4), end: monthValue(year, 9) };
    if (month >= 10) return { start: monthValue(year, 10), end: monthValue(year + 1, 3) };
    return { start: monthValue(year - 1, 10), end: monthValue(year, 3) };
  }

  function normalizeStatus(value) {
    return PERIOD_STATUS.includes(clean(value)) ? clean(value) : 'Activo';
  }

  syncPeriodCodes = function periodBoundaryCodes(period) {
    if (!period) return;
    period.dnfCode = documentCodeFromDate(1, period.start);
    period.planCode = documentCodeFromDate(2, period.start);
    period.reportCode = documentCodeFromDate(3, period.end);
  };

  function snapshotOfCurrentState() {
    const out = {};
    Object.keys(state || {}).forEach(key => {
      if (key === MANAGER_KEY) return;
      out[key] = clone(state[key]);
    });
    if (out.period) syncPeriodCodes(out.period);
    return out;
  }

  function hydratedSnapshot(raw, record) {
    const base = defaultState();
    const snap = raw && typeof raw === 'object' ? clone(raw) : {};
    const merged = { ...base, ...snap };
    merged.period = { ...base.period, ...(snap.period || {}) };
    merged.settings = { ...base.settings, ...(snap.settings || {}) };
    merged.integrations = {
      ...base.integrations,
      ...(snap.integrations || {}),
      firebase: {
        ...base.integrations.firebase,
        ...(snap.integrations?.firebase || {})
      }
    };
    merged.period.start = record.start;
    merged.period.end = record.end;
    merged.period.status = normalizeStatus(record.status);
    syncPeriodCodes(merged.period);
    if (!Array.isArray(merged.needPlan)) merged.needPlan = Array.isArray(merged.plan) ? clone(merged.plan) : [];
    if (!Array.isArray(merged.needFollowup)) merged.needFollowup = Array.isArray(merged.followup) ? clone(merged.followup) : [];
    return merged;
  }

  function freshSnapshotForPeriod(start, end) {
    const base = defaultState();
    const current = state || {};
    const careers = clone(current.careers || base.careers || []);
    base.careers = careers;
    base.coordinations = careers.map(item => ({
      carrera: item.name,
      coordinador: '',
      priorityOverride: '',
      needsOverride: '',
      needItems: []
    }));
    base.settings = clone(current.settings || base.settings);
    base.integrations = clone(current.integrations || base.integrations);
    base.period = {
      ...base.period,
      preparedBy: current.period?.preparedBy || base.period.preparedBy,
      preparedRole: current.period?.preparedRole || base.period.preparedRole,
      reviewedBy: current.period?.reviewedBy || base.period.reviewedBy,
      reviewedRole: current.period?.reviewedRole || base.period.reviewedRole,
      approvedBy: current.period?.approvedBy || base.period.approvedBy,
      approvedRole: current.period?.approvedRole || base.period.approvedRole,
      version: current.period?.version || base.period.version,
      targetPercent: current.period?.targetPercent ?? base.period.targetPercent,
      status: 'Activo',
      start,
      end
    };
    syncPeriodCodes(base.period);
    base.teachers = [];
    base.plan = [];
    base.followup = [];
    base.needPlan = [];
    base.needFollowup = [];
    return base;
  }

  function recordFromState() {
    const start = clean(state?.period?.start);
    const end = clean(state?.period?.end);
    if (!start || !end) return null;
    syncPeriodCodes(state.period);
    return {
      id: periodId(start, end),
      start,
      end,
      label: periodLabelFor(start, end),
      status: normalizeStatus(state.period?.status),
      createdAt: new Date().toISOString(),
      snapshot: snapshotOfCurrentState()
    };
  }

  function normalizeManager(manager) {
    const previousActive = manager.activeId;
    const previousActiveRecord = (manager.periods || []).find(item => item?.id === previousActive);
    const desiredActiveId = previousActiveRecord ? periodId(previousActiveRecord.start, previousActiveRecord.end) : '';
    const byId = new Map();

    (manager.periods || [])
      .filter(item => item && item.start && item.end)
      .forEach(item => {
        const id = periodId(item.start, item.end);
        const normalized = {
          ...item,
          id,
          label: periodLabelFor(item.start, item.end),
          status: normalizeStatus(item.status)
        };
        const existing = byId.get(id);
        if (!existing || (!existing.snapshot && normalized.snapshot)) byId.set(id, normalized);
      });

    manager.version = 2;
    manager.periods = [...byId.values()];
    manager.activeId = desiredActiveId && byId.has(desiredActiveId)
      ? desiredActiveId
      : (byId.has(previousActive) ? previousActive : (manager.periods[0]?.id || ''));
    return manager;
  }

  function ensureManager() {
    if (!state || !state.period) return null;
    let manager = state[MANAGER_KEY];
    if (!manager || !Array.isArray(manager.periods)) {
      manager = { version: 2, activeId: '', periods: [] };
      const initial = recordFromState();
      if (initial) {
        manager.periods.push(initial);
        manager.activeId = initial.id;
      }
      state[MANAGER_KEY] = manager;
      return manager;
    }

    normalizeManager(manager);
    if (!manager.periods.length) {
      const initial = recordFromState();
      if (initial) {
        manager.periods.push(initial);
        manager.activeId = initial.id;
      } else {
        manager.activeId = '';
      }
    }

    let active = manager.periods.find(item => item.id === manager.activeId);
    if (!active && manager.periods.length) {
      active = manager.periods[0];
      manager.activeId = active.id;
    }
    if (active && (!active.snapshot || typeof active.snapshot !== 'object')) {
      active.snapshot = snapshotOfCurrentState();
    }
    state[MANAGER_KEY] = manager;
    return manager;
  }

  function activeRecord(manager = ensureManager()) {
    return manager?.periods?.find(item => item.id === manager.activeId) || null;
  }

  function syncActiveRecord() {
    const manager = ensureManager();
    const record = activeRecord(manager);
    if (!record) return;

    const start = clean(state.period?.start) || record.start;
    const end = clean(state.period?.end) || record.end;
    const newId = periodId(start, end);
    const collision = manager.periods.some(item => item !== record && item.id === newId);
    if (newId && !collision) {
      record.id = newId;
      manager.activeId = newId;
    }
    record.start = start;
    record.end = end;
    record.label = periodLabelFor(start, end);
    record.status = normalizeStatus(record.status || state.period?.status);
    state.period.status = record.status;
    syncPeriodCodes(state.period);
    record.snapshot = snapshotOfCurrentState();
  }

  const previousSave = save;
  save = async function periodAwareSave() {
    syncActiveRecord();
    return previousSave();
  };

  function injectStyles() {
    if (document.getElementById('periodManagerStyles')) return;
    const style = document.createElement('style');
    style.id = 'periodManagerStyles';
    style.textContent = `
      .period-topbar-right{display:flex;align-items:center;gap:10px;margin-left:auto;min-width:0}
      .period-main-filter{display:flex;align-items:center;gap:8px;padding:7px 9px;border:1px solid #dfe5ef;border-radius:12px;background:#f8fafc;min-width:0}
      .period-main-filter-copy{display:flex;flex-direction:column;gap:1px;min-width:0}
      .period-main-filter-copy span{font-size:9px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#7a8798}
      .period-main-filter-copy small{font-size:9px;color:#728197;white-space:nowrap}
      .period-main-filter select{width:285px;max-width:32vw;border:1px solid #cad5e2;border-radius:8px;background:#fff;color:#172033;padding:8px 9px;font-size:12px;font-weight:700}
      .period-create-btn,.period-status-btn{border:0;border-radius:8px;padding:9px 11px;font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap}
      .period-create-btn{background:#173b67;color:#fff}.period-status-btn{background:#fff;border:1px solid #cad5e2;color:#334155}
      .period-status-pill{display:inline-flex;align-items:center;border-radius:999px;padding:5px 8px;font-size:10px;font-weight:800;background:#edf2f7;color:#526174}
      .period-status-pill[data-status="Activo"]{background:#e9f6ef;color:#2d6a49}.period-status-pill[data-status="Cerrado"]{background:#fff4dd;color:#865b15}.period-status-pill[data-status="Archivado"]{background:#eef0f3;color:#59616d}
      .period-count{display:inline-flex;align-items:center;justify-content:center;border:1px solid #d7e0eb;border-radius:999px;background:#fff;padding:5px 8px;font-size:10px;color:#607086;white-space:nowrap}
      .period-manager-dialog{width:min(920px,94vw)!important}.period-manager-body{padding:22px}
      .period-create-grid{display:grid;grid-template-columns:minmax(180px,1fr) 130px minmax(180px,1fr) 130px;gap:12px;align-items:end}
      .period-doc-preview{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:16px}
      .period-doc-preview>div{border:1px solid #dfe5ef;border-radius:10px;padding:11px 12px;background:#f8fafc}.period-doc-preview span{display:block;font-size:10px;color:#6f7a8f;margin-bottom:3px}.period-doc-preview strong{font-size:12px;color:#173b67}
      .period-lock-notice{margin:0 0 16px;padding:12px 14px;border:1px solid #e2e8f0;border-radius:10px;background:#f8fafc;color:#475569;font-size:12px;line-height:1.5}.period-lock-notice strong{color:#1f2937}.period-lock-notice button{margin-left:10px}
      .period-gate{max-width:720px;margin:42px auto;padding:28px;border:1px solid #dfe5ef;border-radius:16px;background:#fff;text-align:center}.period-gate h2{margin:0 0 8px}.period-gate p{color:#66758a;line-height:1.5}
      @media(max-width:1100px){.topbar{align-items:flex-start;gap:12px;flex-wrap:wrap;height:auto}.period-topbar-right{width:100%;justify-content:flex-end;flex-wrap:wrap}.period-main-filter{flex:1;min-width:0}.period-main-filter select{width:100%;max-width:none}}
      @media(max-width:760px){.period-main-filter{width:100%;flex-wrap:wrap}.period-main-filter-copy{width:100%}.period-create-grid{grid-template-columns:1fr 120px}.period-doc-preview{grid-template-columns:1fr}.period-count{display:none}}
    `;
    document.head.appendChild(style);
  }

  function sortedPeriods(manager) {
    return [...manager.periods].sort((a, b) => {
      const byStart = periodOrder(b.start) - periodOrder(a.start);
      return byStart || periodOrder(b.end) - periodOrder(a.end);
    });
  }

  function topbarSummary(record) {
    return record ? ('DNF/Plan: ' + monthLabel(record.start) + ' · Informe: ' + monthLabel(record.end)) : 'Crea o selecciona un período';
  }

  function decorateTopbar() {
    const manager = ensureManager();
    const topbar = document.querySelector('.topbar');
    const saveState = document.getElementById('saveState');
    if (!manager || !topbar || !saveState) return;
    injectStyles();

    let right = document.getElementById('periodTopbarRight');
    if (!right) {
      right = document.createElement('div');
      right.id = 'periodTopbarRight';
      right.className = 'period-topbar-right';
      topbar.insertBefore(right, saveState);
      right.appendChild(saveState);
    }

    let filter = document.getElementById('periodMainFilter');
    if (!filter) {
      filter = document.createElement('div');
      filter.id = 'periodMainFilter';
      filter.className = 'period-main-filter';
      right.insertBefore(filter, saveState);
    }

    const active = activeRecord(manager);
    const options = sortedPeriods(manager).map(item =>
      '<option value="' + esc(item.id) + '" ' + (item.id === manager.activeId ? 'selected' : '') + '>' + esc(periodLabelFor(item.start, item.end)) + ' · ' + esc(normalizeStatus(item.status)) + '</option>'
    ).join('');

    filter.innerHTML = `
      <div class="period-main-filter-copy"><span>Período activo</span><small>${esc(topbarSummary(active))}</small></div>
      <select id="activePeriodSelector" aria-label="Período activo" ${manager.periods.length ? '' : 'disabled'}>${manager.periods.length ? options : '<option>Sin período</option>'}</select>
      ${active ? `<span class="period-status-pill" data-status="${esc(normalizeStatus(active.status))}">${esc(normalizeStatus(active.status))}</span>` : ''}
      <span class="period-count">${manager.periods.length} período${manager.periods.length === 1 ? '' : 's'}</span>
      ${active ? '<button type="button" class="period-status-btn" id="openPeriodStatus">Estado</button>' : ''}
      <button type="button" class="period-create-btn" id="openPeriodCreator">+ Crear</button>`;

    const selector = document.getElementById('activePeriodSelector');
    if (selector && manager.periods.length) selector.onchange = event => switchPeriod(event.target.value);
    document.getElementById('openPeriodCreator').onclick = openCreator;
    const statusButton = document.getElementById('openPeriodStatus');
    if (statusButton) statusButton.onclick = openStatusDialog;
  }

  function monthOptions(selected) {
    return MONTHS.map((label, index) => {
      const value = index + 1;
      return '<option value="' + value + '" ' + (Number(selected) === value ? 'selected' : '') + '>' + label + '</option>';
    }).join('');
  }

  function ensureCreatorDialog() {
    let dialog = document.getElementById('periodManagerDialog');
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'periodManagerDialog';
    dialog.className = 'period-manager-dialog';
    dialog.innerHTML = `
      <div class="period-manager-body">
        <div class="dialog-header"><div><h2>Crear período</h2><p>El período seleccionado será el contexto principal de DNF, Plan e Informe.</p></div><button type="button" class="icon-btn" id="closePeriodCreator">×</button></div>
        <div class="period-create-grid">
          <div class="field"><label>Mes de inicio</label><select id="periodCreateStartMonth"></select></div>
          <div class="field"><label>Año de inicio</label><input id="periodCreateStartYear" type="number" min="2000" max="2100" step="1"></div>
          <div class="field"><label>Mes de finalización</label><select id="periodCreateEndMonth"></select></div>
          <div class="field"><label>Año de finalización</label><input id="periodCreateEndYear" type="number" min="2000" max="2100" step="1"></div>
        </div>
        <div class="period-doc-preview" id="periodDocumentPreview"></div>
        <div class="dialog-actions"><button type="button" class="secondary" id="cancelPeriodCreator">Cancelar</button><button type="button" class="primary" id="createPeriodConfirm">Crear y seleccionar</button></div>
      </div>`;
    document.body.appendChild(dialog);
    document.getElementById('closePeriodCreator').onclick = () => dialog.close();
    document.getElementById('cancelPeriodCreator').onclick = () => dialog.close();
    ['periodCreateStartMonth','periodCreateStartYear','periodCreateEndMonth','periodCreateEndYear'].forEach(id => {
      document.getElementById(id).addEventListener('input', refreshCreatorPreview);
      document.getElementById(id).addEventListener('change', refreshCreatorPreview);
    });
    document.getElementById('createPeriodConfirm').onclick = createPeriod;
    return dialog;
  }

  function creatorDraft() {
    return {
      start: monthValue(document.getElementById('periodCreateStartYear')?.value, document.getElementById('periodCreateStartMonth')?.value),
      end: monthValue(document.getElementById('periodCreateEndYear')?.value, document.getElementById('periodCreateEndMonth')?.value)
    };
  }

  function refreshCreatorPreview() {
    const draft = creatorDraft();
    const preview = document.getElementById('periodDocumentPreview');
    if (!preview) return;
    preview.innerHTML = `<div><span>Detección de Necesidades</span><strong>${esc(monthLabel(draft.start))}</strong></div><div><span>Plan de Formación</span><strong>${esc(monthLabel(draft.start))}</strong></div><div><span>Informe final</span><strong>${esc(monthLabel(draft.end))}</strong></div>`;
  }

  function openCreator() {
    const dialog = ensureCreatorDialog();
    const suggested = suggestedPeriod();
    const current = parseMonth(state.period?.start) || parseMonth(suggested.start);
    const currentEnd = parseMonth(state.period?.end) || parseMonth(suggested.end);
    document.getElementById('periodCreateStartMonth').innerHTML = monthOptions(current.month);
    document.getElementById('periodCreateStartYear').value = current.year;
    document.getElementById('periodCreateEndMonth').innerHTML = monthOptions(currentEnd.month);
    document.getElementById('periodCreateEndYear').value = currentEnd.year;
    refreshCreatorPreview();
    dialog.showModal();
  }

  async function createPeriod() {
    const draft = creatorDraft();
    if (!draft.start || !draft.end) return toast('Completa el mes y año de inicio y finalización');
    if (periodOrder(draft.end) < periodOrder(draft.start)) return toast('El fin del período no puede ser anterior al inicio');

    const manager = ensureManager();
    const newId = periodId(draft.start, draft.end);
    const existing = manager.periods.find(item => item.id === newId);
    if (existing) {
      document.getElementById('periodManagerDialog')?.close();
      await switchPeriod(existing.id);
      return toast('Ese período ya existía; quedó seleccionado');
    }

    if (manager.activeId) await save();
    const snapshot = freshSnapshotForPeriod(draft.start, draft.end);
    const record = {
      id: newId,
      start: draft.start,
      end: draft.end,
      label: periodLabelFor(draft.start, draft.end),
      status: 'Activo',
      createdAt: new Date().toISOString(),
      snapshot
    };
    manager.periods.push(record);
    manager.activeId = newId;
    state = { ...hydratedSnapshot(snapshot, record), [MANAGER_KEY]: manager };
    await save();
    document.getElementById('periodManagerDialog')?.close();
    render();
    decorateTopbar();
    toast('Período creado y seleccionado');
  }

  async function switchPeriod(targetId) {
    const manager = ensureManager();
    if (!manager || targetId === manager.activeId) return;
    const target = manager.periods.find(item => item.id === targetId);
    if (!target) return;

    if (manager.activeId) await save();
    manager.activeId = target.id;
    state = { ...hydratedSnapshot(target.snapshot, target), [MANAGER_KEY]: manager };
    await save();
    render();
    decorateTopbar();
    toast('Período activo: ' + periodLabelFor(target.start, target.end));
  }

  function ensureStatusDialog() {
    let dialog = document.getElementById('periodStatusDialog');
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.id = 'periodStatusDialog';
    dialog.className = 'period-manager-dialog';
    dialog.innerHTML = `
      <div class="period-manager-body">
        <div class="dialog-header"><div><h2>Estado del período</h2><p>Controla si el período permite edición normal, edición protegida o solo consulta.</p></div><button type="button" class="icon-btn" id="closePeriodStatus">×</button></div>
        <div class="field" style="margin-top:16px"><label>Estado</label><select id="periodStatusSelect">${PERIOD_STATUS.map(status => '<option>' + status + '</option>').join('')}</select><span class="hint">Activo: edición normal · Cerrado: consulta/PDF y edición con habilitación · Archivado: solo consulta.</span></div>
        <div class="dialog-actions"><button type="button" class="secondary" id="cancelPeriodStatus">Cancelar</button><button type="button" class="primary" id="savePeriodStatus">Guardar estado</button></div>
      </div>`;
    document.body.appendChild(dialog);
    document.getElementById('closePeriodStatus').onclick = () => dialog.close();
    document.getElementById('cancelPeriodStatus').onclick = () => dialog.close();
    document.getElementById('savePeriodStatus').onclick = updatePeriodStatus;
    return dialog;
  }

  function openStatusDialog() {
    const record = activeRecord();
    if (!record) return;
    const dialog = ensureStatusDialog();
    document.getElementById('periodStatusSelect').value = normalizeStatus(record.status);
    dialog.showModal();
  }

  async function updatePeriodStatus() {
    const manager = ensureManager();
    const record = activeRecord(manager);
    if (!record) return;
    const next = normalizeStatus(document.getElementById('periodStatusSelect')?.value);
    record.status = next;
    state.period.status = next;
    if (next !== 'Activo') {
      record.lockedVersions = {
        appBuild: window.DOCFORMACION_BUILD || 'local',
        manifestVersion: window.DOCFORMACION_MANIFEST?.version || 'sin-versión',
        lockedAt: new Date().toISOString()
      };
      unlockedClosed.delete(record.id);
    }
    record.snapshot = snapshotOfCurrentState();
    await save();
    document.getElementById('periodStatusDialog')?.close();
    render();
    toast('Estado del período: ' + next);
  }

  function decoratePeriodEditor() {
    const root = document.getElementById('content');
    if (!root || !state?.period) return;
    const codeDnf = root.querySelector('[name="dnfCode"]');
    const codePlan = root.querySelector('[name="planCode"]');
    const codeReport = root.querySelector('[name="reportCode"]');
    syncPeriodCodes(state.period);
    if (codeDnf) codeDnf.value = state.period.dnfCode;
    if (codePlan) codePlan.value = state.period.planCode;
    if (codeReport) codeReport.value = state.period.reportCode;
    [[codeDnf,'Automático según el mes inicial del período.'],[codePlan,'Automático según el mes inicial del período.'],[codeReport,'Automático según el mes final del período.']].forEach(([input,text]) => {
      const hint = input?.closest('.field')?.querySelector('.hint');
      if (hint) hint.textContent = text;
    });
  }

  function isAllowedReadAction(button) {
    if (!button) return false;
    return button.id === 'generateCurrent'
      || !!button.dataset?.generate
      || button.classList.contains('preview-section')
      || button.classList.contains('download-section')
      || !!button.dataset?.v2Current;
  }

  function applyPeriodAccess() {
    const manager = ensureManager();
    const record = activeRecord(manager);
    const content = document.getElementById('content');
    if (!content) return;

    if (!record) {
      if (!['inicio','configuracion'].includes(typeof currentView === 'undefined' ? '' : currentView)) {
        content.innerHTML = '<div class="period-gate"><h2>Selecciona o crea un período</h2><p>El período activo es obligatorio antes de cargar datos, revisar documentos, previsualizar secciones o generar PDFs.</p><button type="button" class="primary" id="gateCreatePeriod">Crear período</button></div>';
        document.getElementById('gateCreatePeriod').onclick = openCreator;
      }
      return;
    }

    const status = normalizeStatus(record.status);
    if (status === 'Activo' || (status === 'Cerrado' && unlockedClosed.has(record.id))) return;

    const notice = document.createElement('div');
    notice.className = 'period-lock-notice';
    notice.innerHTML = status === 'Archivado'
      ? '<strong>Período archivado.</strong> Está disponible únicamente para consulta y generación de documentos.'
      : '<strong>Período cerrado.</strong> La edición está protegida. Puedes consultar y generar PDFs.';
    if (status === 'Cerrado') {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'secondary';
      button.textContent = 'Habilitar edición en esta sesión';
      button.onclick = () => {
        if (!window.confirm('¿Habilitar edición del período cerrado en esta sesión?')) return;
        unlockedClosed.add(record.id);
        render();
      };
      notice.appendChild(button);
    }
    content.prepend(notice);

    content.querySelectorAll('input,select,textarea').forEach(control => { control.disabled = true; });
    content.querySelectorAll('button').forEach(button => {
      if (!isAllowedReadAction(button) && button !== notice.querySelector('button')) button.disabled = true;
    });
  }

  const previousRender = render;
  render = function periodManagerRender() {
    const manager = ensureManager();
    const active = activeRecord(manager);
    if (active) {
      if (state.period.start !== active.start || state.period.end !== active.end) {
        state.period.start = active.start;
        state.period.end = active.end;
      }
      state.period.status = normalizeStatus(active.status);
      syncPeriodCodes(state.period);
    }
    const result = previousRender();
    decorateTopbar();
    decoratePeriodEditor();
    applyPeriodAccess();
    return result;
  };

  window.docformacionPeriods = Object.freeze({
    periodId,
    activeRecord: () => activeRecord(),
    status: () => normalizeStatus(activeRecord()?.status),
    list: () => sortedPeriods(ensureManager()).map(item => ({ ...item, snapshot: undefined }))
  });

  setTimeout(() => {
    try {
      ensureManager();
      if (state?.period) syncPeriodCodes(state.period);
      decorateTopbar();
      decoratePeriodEditor();
      applyPeriodAccess();
    } catch (error) {
      console.error('[DocFormación] No se pudo inicializar el selector de períodos:', error);
    }
  }, 0);
})();
