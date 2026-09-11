(() => {
  const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const MANAGER_KEY = 'periodManager';

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function parseMonth(value) {
    const match = String(value || '').match(/^(\d{4})-(\d{2})/);
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
    return monthLabel(start) + ' a ' + monthLabel(end);
  }

  function periodId(start, end) {
    return start && end ? start + '__' + end : '';
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

  // Los códigos ya no dependen de cuándo se presiona "Generar PDF".
  // DNF y Plan pertenecen al primer mes del período; el Informe, al último.
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
    syncPeriodCodes(merged.period);
    if (!Array.isArray(merged.needPlan)) merged.needPlan = [];
    if (!Array.isArray(merged.needFollowup)) merged.needFollowup = [];
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
    let start = norm(state?.period?.start);
    let end = norm(state?.period?.end);
    if (!start || !end) {
      const detected = suggestedPeriod();
      start = detected.start;
      end = detected.end;
      state.period.start = start;
      state.period.end = end;
    }
    syncPeriodCodes(state.period);
    return {
      id: periodId(start, end),
      start,
      end,
      label: periodLabelFor(start, end),
      createdAt: new Date().toISOString(),
      snapshot: snapshotOfCurrentState()
    };
  }

  function ensureManager() {
    if (!state || !state.period) return null;
    let manager = state[MANAGER_KEY];
    if (!manager || !Array.isArray(manager.periods)) {
      const initial = recordFromState();
      manager = {
        version: 1,
        activeId: initial.id,
        periods: [initial]
      };
      state[MANAGER_KEY] = manager;
      return manager;
    }

    manager.periods = manager.periods
      .filter(item => item && item.start && item.end)
      .map(item => ({
        ...item,
        id: item.id || periodId(item.start, item.end),
        label: periodLabelFor(item.start, item.end)
      }));

    if (!manager.periods.length) {
      const initial = recordFromState();
      manager.periods.push(initial);
      manager.activeId = initial.id;
    }

    let active = manager.periods.find(item => item.id === manager.activeId);
    if (!active) {
      active = manager.periods[0];
      manager.activeId = active.id;
    }

    // Si el estado cargado todavía es el formato anterior, se conserva como
    // snapshot del período activo en vez de perder información durante la migración.
    if (!active.snapshot || typeof active.snapshot !== 'object') {
      active.snapshot = snapshotOfCurrentState();
    }
    return manager;
  }

  function syncActiveRecord() {
    const manager = ensureManager();
    if (!manager) return;
    let record = manager.periods.find(item => item.id === manager.activeId);
    if (!record) return;

    const start = norm(state.period?.start) || record.start;
    const end = norm(state.period?.end) || record.end;
    const newId = periodId(start, end);
    const collision = manager.periods.some(item => item !== record && item.id === newId);
    if (newId && !collision) {
      record.id = newId;
      manager.activeId = newId;
    }
    record.start = start;
    record.end = end;
    record.label = periodLabelFor(start, end);
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
      .period-topbar-right{display:flex;align-items:center;gap:12px;margin-left:auto;min-width:0}
      .period-main-filter{display:flex;align-items:center;gap:8px;padding:7px 9px;border:1px solid #dfe5ef;border-radius:12px;background:#f8fafc;min-width:0}
      .period-main-filter-copy{display:flex;flex-direction:column;gap:1px;min-width:0}
      .period-main-filter-copy span{font-size:9px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#7a8798}
      .period-main-filter-copy small{font-size:9px;color:#728197;white-space:nowrap}
      .period-main-filter select{width:285px;max-width:32vw;border:1px solid #cad5e2;border-radius:8px;background:#fff;color:#172033;padding:8px 9px;font-size:12px;font-weight:700}
      .period-create-btn{border:0;border-radius:8px;background:#173b67;color:#fff;padding:9px 11px;font-size:12px;font-weight:800;cursor:pointer;white-space:nowrap}
      .period-count{display:inline-flex;align-items:center;justify-content:center;border:1px solid #d7e0eb;border-radius:999px;background:#fff;padding:5px 8px;font-size:10px;color:#607086;white-space:nowrap}
      .period-manager-dialog{width:min(920px,94vw)!important}
      .period-manager-body{padding:22px}
      .period-create-grid{display:grid;grid-template-columns:minmax(180px,1fr) 130px minmax(180px,1fr) 130px;gap:12px;align-items:end}
      .period-create-grid .field{min-width:0}
      .period-doc-preview{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:16px}
      .period-doc-preview>div{border:1px solid #dfe5ef;border-radius:10px;padding:11px 12px;background:#f8fafc}
      .period-doc-preview span{display:block;font-size:10px;color:#6f7a8f;margin-bottom:3px}
      .period-doc-preview strong{font-size:12px;color:#173b67}
      @media(max-width:1100px){
        .topbar{align-items:flex-start;gap:12px;flex-wrap:wrap;height:auto}
        .period-topbar-right{width:100%;justify-content:flex-end;flex-wrap:wrap}
        .period-main-filter{flex:1;min-width:0}
        .period-main-filter select{width:100%;max-width:none}
      }
      @media(max-width:760px){
        .period-main-filter{width:100%;flex-wrap:wrap}
        .period-main-filter-copy{width:100%}
        .period-create-grid{grid-template-columns:1fr 120px}
        .period-doc-preview{grid-template-columns:1fr}
        .period-count{display:none}
      }
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
    return 'DNF/Plan: ' + monthLabel(record.start) + ' · Informe: ' + monthLabel(record.end);
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

    const active = manager.periods.find(item => item.id === manager.activeId) || manager.periods[0];
    const options = sortedPeriods(manager).map(item =>
      '<option value="' + esc(item.id) + '" ' + (item.id === manager.activeId ? 'selected' : '') + '>' + esc(periodLabelFor(item.start, item.end)) + '</option>'
    ).join('');

    filter.innerHTML = `
      <div class="period-main-filter-copy">
        <span>Período activo</span>
        <small>${esc(topbarSummary(active))}</small>
      </div>
      <select id="activePeriodSelector" aria-label="Período activo">${options}</select>
      <span class="period-count">${manager.periods.length} período${manager.periods.length === 1 ? '' : 's'}</span>
      <button type="button" class="period-create-btn" id="openPeriodCreator">+ Crear</button>`;

    document.getElementById('activePeriodSelector').onchange = event => switchPeriod(event.target.value);
    document.getElementById('openPeriodCreator').onclick = openCreator;
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
        <div class="dialog-header">
          <div><h2>Crear período</h2><p>El período seleccionado será el filtro principal de DNF, Plan e Informe.</p></div>
          <button type="button" class="icon-btn" id="closePeriodCreator">×</button>
        </div>
        <div class="period-create-grid">
          <div class="field"><label>Mes de inicio</label><select id="periodCreateStartMonth"></select></div>
          <div class="field"><label>Año de inicio</label><input id="periodCreateStartYear" type="number" min="2000" max="2100" step="1"></div>
          <div class="field"><label>Mes de finalización</label><select id="periodCreateEndMonth"></select></div>
          <div class="field"><label>Año de finalización</label><input id="periodCreateEndYear" type="number" min="2000" max="2100" step="1"></div>
        </div>
        <div class="period-doc-preview" id="periodDocumentPreview"></div>
        <div class="dialog-actions">
          <button type="button" class="secondary" id="cancelPeriodCreator">Cancelar</button>
          <button type="button" class="primary" id="createPeriodConfirm">Crear y seleccionar</button>
        </div>
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
    preview.innerHTML = `
      <div><span>Detección de Necesidades</span><strong>${esc(monthLabel(draft.start))}</strong></div>
      <div><span>Plan de Formación</span><strong>${esc(monthLabel(draft.start))}</strong></div>
      <div><span>Informe final</span><strong>${esc(monthLabel(draft.end))}</strong></div>`;
  }

  function openCreator() {
    const dialog = ensureCreatorDialog();
    const current = parseMonth(state.period?.start) || parseMonth(suggestedPeriod().start);
    const currentEnd = parseMonth(state.period?.end) || parseMonth(suggestedPeriod().end);
    document.getElementById('periodCreateStartMonth').innerHTML = monthOptions(current.month);
    document.getElementById('periodCreateStartYear').value = current.year;
    document.getElementById('periodCreateEndMonth').innerHTML = monthOptions(currentEnd.month);
    document.getElementById('periodCreateEndYear').value = currentEnd.year;
    refreshCreatorPreview();
    dialog.showModal();
  }

  async function createPeriod() {
    const draft = creatorDraft();
    if (!draft.start || !draft.end) {
      toast('Completa el mes y año de inicio y finalización');
      return;
    }
    if (periodOrder(draft.end) < periodOrder(draft.start)) {
      toast('El fin del período no puede ser anterior al inicio');
      return;
    }

    const manager = ensureManager();
    const newId = periodId(draft.start, draft.end);
    const existing = manager.periods.find(item => item.id === newId);
    if (existing) {
      document.getElementById('periodManagerDialog')?.close();
      await switchPeriod(existing.id);
      toast('Ese período ya existía; quedó seleccionado');
      return;
    }

    await save();
    const snapshot = freshSnapshotForPeriod(draft.start, draft.end);
    const record = {
      id: newId,
      start: draft.start,
      end: draft.end,
      label: periodLabelFor(draft.start, draft.end),
      createdAt: new Date().toISOString(),
      snapshot
    };
    manager.periods.push(record);
    manager.activeId = newId;
    state = { ...hydratedSnapshot(snapshot, record), [MANAGER_KEY]: manager };
    syncPeriodCodes(state.period);
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

    await save();
    manager.activeId = targetId;
    state = { ...hydratedSnapshot(target.snapshot, target), [MANAGER_KEY]: manager };
    syncPeriodCodes(state.period);
    await save();
    render();
    decorateTopbar();
    toast('Período activo: ' + periodLabelFor(target.start, target.end));
  }

  function decoratePeriodEditor() {
    const root = document.getElementById('content');
    if (!root) return;
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

    const notices = [...root.querySelectorAll('.notice')];
    const codeNotice = notices.find(el => /códigos documentales/i.test(el.textContent || ''));
    if (codeNotice) codeNotice.textContent = 'Los códigos documentales se calculan desde el período activo: DNF y Plan usan el mes inicial; el Informe usa el mes final.';
  }

  const previousRender = render;
  render = function periodManagerRender() {
    const manager = ensureManager();
    if (manager) {
      const active = manager.periods.find(item => item.id === manager.activeId) || manager.periods[0];
      if (active && (state.period.start !== active.start || state.period.end !== active.end)) {
        state.period.start = active.start;
        state.period.end = active.end;
      }
      syncPeriodCodes(state.period);
    }
    const result = previousRender();
    decorateTopbar();
    decoratePeriodEditor();
    return result;
  };

  // Si app.js ya terminó su carga antes de esta capa, igualmente se migra y
  // se pinta el filtro sin esperar una navegación adicional.
  setTimeout(() => {
    try {
      ensureManager();
      syncPeriodCodes(state.period);
      decorateTopbar();
      decoratePeriodEditor();
    } catch (error) {
      console.error('[DocFormación] No se pudo inicializar el selector de períodos:', error);
    }
  }, 0);
})();