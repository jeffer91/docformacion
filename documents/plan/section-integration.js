(() => {
  'use strict';

  const SECTION_KIND = Object.freeze({
    'PLAN-04-matriz':'matrix',
    'PLAN-05-indicadores':'indicators',
    'PLAN-06-recursos':'resources'
  });
  const KIND_LABEL = Object.freeze({
    matrix:'Matriz',
    indicators:'Indicadores',
    resources:'Recursos'
  });
  const clean = value => String(value ?? '').trim();
  const html = value => typeof esc === 'function'
    ? esc(value)
    : clean(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  let observer = null;
  let scheduled = false;

  function isPlanView() {
    return typeof currentView !== 'undefined' && currentView === 'doc-plan';
  }

  function rows() {
    return window.docformacionWorkflow?.syncPlanRows?.() || [];
  }

  function context() {
    return window.docformacionDocumentContext?.build?.() || null;
  }

  function matrixState(kind) {
    const ctx = context();
    if (!ctx || !window.docformacionValidation?.planMatrixState) {
      return { ready:false, total:0, complete:0, invalidRows:0, missing:['Estado no disponible'] };
    }
    return window.docformacionValidation.planMatrixState(ctx, kind);
  }

  function groupByCareer(source) {
    const groups = [];
    const map = new Map();
    (source || []).forEach(row => {
      const name = clean(row.career) || 'Sin carrera';
      if (!map.has(name)) {
        const group = { name, rows:[] };
        map.set(name, group);
        groups.push(group);
      }
      map.get(name).rows.push(row);
    });
    return groups;
  }

  function table(headers, bodyRows) {
    return `<div class="plan-svd-table-wrap"><table class="table plan-svd-table"><thead><tr>${headers.map(item => `<th>${html(item)}</th>`).join('')}</tr></thead><tbody>${bodyRows.map(cells => `<tr>${cells.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  function rowCells(kind, row) {
    if (kind === 'matrix') {
      return [
        `<strong>${html(row.dnfCode)}</strong>`,
        html(row.needText || '—'),
        html(row.priority || '—'),
        html(row.action || '—'),
        html(row.modality || '—'),
        html(row.plannedStart || '—'),
        html(row.plannedEnd || '—')
      ];
    }
    if (kind === 'indicators') {
      return [
        `<strong>${html(row.dnfCode)}</strong>`,
        html(row.needText || '—'),
        html(row.indicator || '—'),
        Number(row.targetPercent || 0) > 0 ? `${html(row.targetPercent)}%` : '—',
        html(row.evidence || '—'),
        html(row.responsibleRole || '—')
      ];
    }
    return [
      `<strong>${html(row.dnfCode)}</strong>`,
      html(row.needText || '—'),
      html(row.supportType || '—'),
      clean(row.supportType) === 'Económico' && Number(row.supportAmount || 0) > 0
        ? `USD ${Number(row.supportAmount || 0).toLocaleString('es-EC', { minimumFractionDigits:2, maximumFractionDigits:2 })}`
        : '—',
      html(row.observations || '—')
    ];
  }

  function headers(kind) {
    if (kind === 'matrix') return ['Código','Necesidad','Prioridad','Acción','Modalidad','Inicio','Fin'];
    if (kind === 'indicators') return ['Código','Necesidad','Indicador','Meta','Verificación','Responsable'];
    return ['Código','Necesidad','Tipo de apoyo','Monto','Observaciones'];
  }

  function careerBlock(kind, group, open) {
    const missing = group.rows.filter(row => window.docformacionValidation?.planMatrixRowMissing?.(row, kind)?.length).length;
    return `<details class="plan-svd-career"${open ? ' open' : ''}>
      <summary>
        <span><strong>${html(group.name)}</strong><small>${group.rows.length} necesidad(es)</small></span>
        <span class="status-badge ${missing ? 'pending' : 'ready'}">${missing ? `${missing} pendiente(s)` : 'Completa'}</span>
      </summary>
      <div class="plan-svd-career-body">${table(headers(kind), group.rows.map(row => rowCells(kind, row)))}</div>
    </details>`;
  }

  function sectionHtml(kind) {
    const source = rows();
    const groups = groupByCareer(source);
    const state = matrixState(kind);
    return `<div class="plan-svd-section-data" data-kind="${html(kind)}">
      <div class="plan-svd-section-summary">
        <div><strong>${html(KIND_LABEL[kind])}</strong><span>${state.complete} de ${state.total} completas · ${groups.length} carrera(s)</span></div>
        <span class="status-badge ${state.ready ? 'ready' : 'pending'}">${state.ready ? 'Completa' : `${state.invalidRows} pendiente(s)`}</span>
      </div>
      <div class="plan-svd-careers">${groups.length ? groups.map((group, index) => careerBlock(kind, group, index === 0)).join('') : '<div class="empty">No existen necesidades DNF para planificar.</div>'}</div>
    </div>`;
  }

  function decorateSections() {
    if (!isPlanView()) return;
    Object.entries(SECTION_KIND).forEach(([sectionId, kind]) => {
      const section = document.querySelector(`.document-section[data-section-id="${sectionId}"]`);
      if (!section) return;
      const source = rows();
      const key = JSON.stringify(source.map(row => [row.dnfCode, ...rowCells(kind, row).map(value => String(value).replace(/<[^>]+>/g, ''))]));
      let content = section.querySelector('.plan-svd-section-data');
      if (!content) {
        section.classList.add('plan-svd-specialized');
        section.insertAdjacentHTML('beforeend', sectionHtml(kind));
        content = section.querySelector('.plan-svd-section-data');
      } else if (content.dataset.renderKey !== key) {
        content.outerHTML = sectionHtml(kind);
        content = section.querySelector('.plan-svd-section-data');
      }
      if (content) content.dataset.renderKey = key;
    });
  }

  function progressRow(kind) {
    const state = matrixState(kind);
    const pct = state.total ? Math.round(state.complete * 100 / state.total) : 0;
    return `<div class="plan-info-progress-row">
      <div><strong>${html(KIND_LABEL[kind])}</strong><span>${state.complete}/${state.total}</span></div>
      <div class="plan-info-progress-bar"><span style="width:${pct}%"></span></div>
      <span class="status-badge ${state.ready ? 'ready' : 'pending'}">${state.ready ? 'Lista' : 'Pendiente'}</span>
    </div>`;
  }

  function bindPlanActions(root) {
    root.querySelectorAll('[data-plan-info-template]').forEach(button => button.onclick = () => exportTemplate('plan', false));
    root.querySelectorAll('[data-plan-info-current]').forEach(button => button.onclick = () => exportTemplate('plan', true));
    root.querySelectorAll('[data-plan-info-import]').forEach(button => button.onclick = () => importExcel('plan'));
  }

  function decorateInfo() {
    if (!isPlanView()) return;
    const card = document.querySelector('.canonical-template-card');
    if (!card) return;
    const source = rows();
    const groups = groupByCareer(source);
    const workflow = window.docformacionWorkflow?.state?.() || {};
    const key = JSON.stringify({
      rows:source.map(row => [row.dnfCode, row.action, row.indicator, row.supportType]),
      imported:workflow.planImported,
      file:workflow.planFileName
    });
    if (card.dataset.planInfoKey === key) return;
    card.dataset.planInfoKey = key;
    card.classList.add('plan-info-card');
    card.innerHTML = `
      <div class="plan-info-head">
        <div><strong>Datos del Plan</strong><span>${source.length} necesidades · ${groups.length} carreras</span></div>
        <span class="status-badge ${workflow.planImported ? 'ready' : 'pending'}">${workflow.planImported ? 'Carga confirmada' : 'Sin confirmar'}</span>
      </div>
      <div class="plan-info-progress">
        ${progressRow('matrix')}
        ${progressRow('indicators')}
        ${progressRow('resources')}
      </div>
      <div class="plan-info-actions">
        <button type="button" class="primary" data-plan-info-import>Subir Excel</button>
        <button type="button" class="secondary" data-plan-info-template>Plantilla</button>
        <button type="button" class="secondary" data-plan-info-current ${source.length ? '' : 'disabled'}>Datos actuales</button>
      </div>`;
    bindPlanActions(card);
  }

  function simplifyPlanStatus() {
    if (!isPlanView()) return;
    const card = document.querySelector('.single-document.canonical-doc-status');
    if (!card) return;
    const status = window.docformacionValidation?.documentReadiness?.('plan', context());
    if (!status || status.ready) return;
    const pendingKinds = ['matrix','indicators','resources'].filter(kind => !matrixState(kind).ready).map(kind => KIND_LABEL[kind]);
    const workflow = window.docformacionWorkflow?.state?.() || {};
    const message = [
      pendingKinds.length ? `Completa: ${pendingKinds.join(', ')}.` : '',
      workflow.planImported !== true ? 'Confirma la carga del Excel del Plan.' : ''
    ].filter(Boolean).join(' ');
    const missingNode = card.querySelector('.canonical-direct-missing');
    if (missingNode && missingNode.textContent !== message) missingNode.textContent = message || 'Hay información pendiente por completar.';
    const actions = card.querySelector('.canonical-doc-actions');
    if (actions && actions.dataset.planActions !== '1') {
      actions.dataset.planActions = '1';
      actions.innerHTML = `
        <button type="button" class="primary" data-plan-info-import>Subir Excel</button>
        <button type="button" class="secondary" data-plan-info-template>Plantilla</button>`;
      bindPlanActions(actions);
    }
  }

  function decorate() {
    if (!isPlanView()) return;
    decorateInfo();
    decorateSections();
    simplifyPlanStatus();
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      decorate();
    });
  }

  function overridePdfSections() {
    const previous = window.docformacionSectionRenderers;
    if (!previous?.render || previous.__planSvdIntegrated) return;
    const api = {
      __planSvdIntegrated:true,
      render(type, section, writer, ctx) {
        const kind = type === 'plan' ? SECTION_KIND[section?.id] : '';
        if (!kind) return previous.render(type, section, writer, ctx);
        const groups = groupByCareer(ctx.plan || []);
        groups.forEach(group => {
          writer.heading(group.name, 2);
          if (kind === 'matrix') {
            writer.table(
              ['Código','Necesidad','Prioridad','Acción','Modalidad','Inicio - Fin'],
              group.rows.map(row => [row.dnfCode,row.needText,row.priority,row.action || '—',row.modality || '—',(row.plannedStart || '—') + ' - ' + (row.plannedEnd || '—')]),
              [13,25,10,24,10,18]
            );
          } else if (kind === 'indicators') {
            writer.table(
              ['Código','Necesidad','Indicador','Meta','Verificación','Responsable'],
              group.rows.map(row => [row.dnfCode,row.needText,row.indicator || '—',row.targetPercent ? row.targetPercent + '%' : '—',row.evidence || '—',row.responsibleRole || '—']),
              [12,22,20,8,20,18]
            );
          } else {
            writer.table(
              ['Código','Necesidad','Tipo de apoyo','Monto','Observaciones'],
              group.rows.map(row => [row.dnfCode,row.needText,row.supportType || '—',row.supportType === 'Económico' ? 'USD ' + Number(row.supportAmount || 0).toLocaleString('es-EC',{minimumFractionDigits:2}) : '—',row.observations || '—']),
              [13,27,20,14,26]
            );
          }
        });
      }
    };
    window.docformacionSectionRenderers = Object.freeze(api);
  }

  function injectStyles() {
    if (document.getElementById('planSvdIntegrationStyles')) return;
    const style = document.createElement('style');
    style.id = 'planSvdIntegrationStyles';
    style.textContent = `
      .plan-info-card{padding:14px!important}.plan-info-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.plan-info-head>div{display:flex;flex-direction:column;gap:2px}.plan-info-head strong{font-size:12px}.plan-info-head span{font-size:9px;color:#7b8797}.plan-info-progress{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px}.plan-info-progress-row{border:1px solid #edf0f4;border-radius:9px;padding:10px;display:grid;grid-template-columns:1fr auto;gap:7px;align-items:center}.plan-info-progress-row>div:first-child{display:flex;justify-content:space-between;gap:8px;grid-column:1/-1}.plan-info-progress-row strong{font-size:10px}.plan-info-progress-row>div:first-child span{font-size:9px;color:#7b8797}.plan-info-progress-bar{height:4px;background:#edf1f5;border-radius:999px;overflow:hidden}.plan-info-progress-bar span{display:block;height:100%;background:#173b67}.plan-info-actions{display:flex;gap:5px;flex-wrap:wrap;margin-top:12px}.plan-info-actions button{font-size:9px!important;padding:7px 10px!important}
      .plan-svd-specialized>.section-direct-missing,.plan-svd-specialized>.section-details{display:none!important}.plan-svd-section-data{margin-top:12px}.plan-svd-section-summary{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:10px 0;border-top:1px solid #eef1f5}.plan-svd-section-summary>div{display:flex;flex-direction:column;gap:2px}.plan-svd-section-summary strong{font-size:11px}.plan-svd-section-summary span{font-size:9px;color:#7b8797}.plan-svd-careers{display:grid;gap:8px}.plan-svd-career{border:1px solid #e8edf2;border-radius:9px;background:#fff;overflow:hidden}.plan-svd-career>summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px}.plan-svd-career>summary::-webkit-details-marker{display:none}.plan-svd-career>summary>span:first-child{display:flex;flex-direction:column;gap:2px}.plan-svd-career summary strong{font-size:10px}.plan-svd-career summary small{font-size:8px;color:#8792a2}.plan-svd-career-body{padding:0 10px 10px;border-top:1px solid #f0f2f5}.plan-svd-table-wrap{overflow:auto;margin-top:9px}.plan-svd-table{min-width:760px!important;margin:0!important}.plan-svd-table th,.plan-svd-table td{font-size:9px!important;padding:7px 8px!important;vertical-align:top}.plan-svd-table th{white-space:nowrap}
      @media(max-width:800px){.plan-info-progress{grid-template-columns:1fr}.plan-svd-section-summary,.plan-svd-career>summary{align-items:flex-start}.plan-svd-table{min-width:700px!important}}
    `;
    document.head.appendChild(style);
  }

  injectStyles();
  overridePdfSections();
  const root = document.getElementById('content');
  if (root) {
    observer = new MutationObserver(schedule);
    observer.observe(root, { childList:true, subtree:true, characterData:true });
  }
  schedule();
})();