(() => {
  'use strict';

  const SECTION_KIND = Object.freeze({
    'PLAN-04-matriz':'matrix',
    'PLAN-05-indicadores':'indicators',
    'PLAN-06-recursos':'resources'
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

  function policy() {
    return window.docformacionPlanPolicy || {};
  }

  function rows() {
    return window.docformacionWorkflow?.syncPlanRows?.() || [];
  }

  function context() {
    return window.docformacionDocumentContext?.build?.() || null;
  }

  function matrixState() {
    const ctx = context();
    if (!ctx || !window.docformacionValidation?.planMatrixState) {
      return { ready:false, total:0, complete:0, invalidRows:0, missing:['Estado no disponible'] };
    }
    return window.docformacionValidation.planMatrixState(ctx, 'matrix');
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

  function durationText(row) {
    const value = Number(row?.durationYears || policy().durationForLevel?.(row?.formationLevel) || 0);
    return value ? String(value).replace('.', ',') + ' años' : '—';
  }

  function table(headers, bodyRows, minWidth = 760) {
    return `<div class="plan-svd-table-wrap"><table class="table plan-svd-table" style="min-width:${minWidth}px"><thead><tr>${headers.map(item => `<th>${html(item)}</th>`).join('')}</tr></thead><tbody>${bodyRows.map(cells => `<tr>${cells.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }

  function matrixCareerBlock(group, open) {
    const missing = group.rows.filter(row => window.docformacionValidation?.planRowMissing?.(row)?.length).length;
    const body = group.rows.map(row => [
      `<strong>${html(row.dnfCode)}</strong>`,
      html(row.needText || '—'),
      html(row.priority || '—'),
      html(row.action || '—'),
      html(row.formationLevel || '—'),
      html(row.projectedProgram || '—'),
      html(durationText(row))
    ]);
    return `<details class="plan-svd-career"${open ? ' open' : ''}>
      <summary>
        <span><strong>${html(group.name)}</strong><small>${group.rows.length} necesidad(es)</small></span>
        <span class="status-badge ${missing ? 'pending' : 'ready'}">${missing ? `${missing} pendiente(s)` : 'Completa'}</span>
      </summary>
      <div class="plan-svd-career-body">${table(['Código','Necesidad','Prioridad','Acción','Nivel','Programa / título','Duración'], body, 980)}</div>
    </details>`;
  }

  function matrixSectionHtml() {
    const source = rows();
    const groups = groupByCareer(source);
    const state = matrixState();
    return `<div class="plan-svd-section-data" data-kind="matrix">
      <div class="plan-svd-section-summary">
        <div><strong>Formación proyectada</strong><span>${state.complete} de ${state.total} completas · ${groups.length} carrera(s)</span></div>
        <span class="status-badge ${state.ready ? 'ready' : 'pending'}">${state.ready ? 'Completa' : `${state.invalidRows} pendiente(s)`}</span>
      </div>
      <p class="plan-auto-note">Carrera, necesidad y prioridad provienen de la DNF. La duración se asigna automáticamente según el nivel de formación.</p>
      <div class="plan-svd-careers">${groups.length ? groups.map((group, index) => matrixCareerBlock(group, index === 0)).join('') : '<div class="empty">No existen necesidades DNF para planificar.</div>'}</div>
    </div>`;
  }

  function indicatorsSectionHtml() {
    return `<div class="plan-svd-section-data" data-kind="indicators">
      <div class="plan-svd-section-summary"><div><strong>Indicador institucional</strong><span>Se aplica automáticamente al Plan</span></div><span class="status-badge ready">Automático</span></div>
      <div class="plan-auto-card">
        <div><span>Indicador</span><strong>${html(policy().indicator)}</strong></div>
        <div><span>Meta</span><strong>${html(policy().targetPercent)}%</strong></div>
        <div><span>Medio de verificación</span><strong>${html(policy().evidence)}</strong></div>
        <div><span>Responsable</span><strong>${html(policy().responsibleRole)}</strong></div>
      </div>
    </div>`;
  }

  function resourcesSectionHtml() {
    return `<div class="plan-svd-section-data" data-kind="resources">
      <div class="plan-svd-section-summary"><div><strong>Recursos institucionales</strong><span>Configuración común para todas las acciones</span></div><span class="status-badge ready">Automático</span></div>
      <div class="plan-auto-card">
        <div><span>Tipo de apoyo</span><strong>${html(policy().supportType)}</strong></div>
        <div><span>Monto</span><strong>${html(policy().supportAmountLabel)}</strong></div>
        <div><span>Criterio de validez</span><strong>${html(policy().validityCriterion)}</strong></div>
      </div>
    </div>`;
  }

  function sectionHtml(kind) {
    if (kind === 'matrix') return matrixSectionHtml();
    if (kind === 'indicators') return indicatorsSectionHtml();
    return resourcesSectionHtml();
  }

  function decorateSections() {
    if (!isPlanView()) return;
    Object.entries(SECTION_KIND).forEach(([sectionId, kind]) => {
      const section = document.querySelector(`.document-section[data-section-id="${sectionId}"]`);
      if (!section) return;
      const source = rows();
      const renderKey = kind === 'matrix'
        ? JSON.stringify(source.map(row => [row.dnfCode,row.action,row.formationLevel,row.projectedProgram,row.durationYears]))
        : JSON.stringify({ kind, indicator:policy().indicator, meta:policy().targetPercent, support:policy().supportType });
      let content = section.querySelector('.plan-svd-section-data');
      if (!content) {
        section.classList.add('plan-svd-specialized');
        section.insertAdjacentHTML('beforeend', sectionHtml(kind));
        content = section.querySelector('.plan-svd-section-data');
      } else if (content.dataset.renderKey !== renderKey) {
        content.outerHTML = sectionHtml(kind);
        content = section.querySelector('.plan-svd-section-data');
      }
      if (content) content.dataset.renderKey = renderKey;
    });
  }

  function infoRow(label, value, status, actions = '') {
    return `<div class="plan-info-row">
      <div class="plan-info-row-copy"><strong>${html(label)}</strong><span>${html(value)}</span></div>
      <span class="status-badge ${status === 'ready' ? 'ready' : status === 'pending' ? 'pending' : 'ready'}">${status === 'ready' ? 'Cargado' : status === 'pending' ? 'Pendiente' : 'Automático'}</span>
      <div class="plan-info-row-actions">${actions}</div>
    </div>`;
  }

  function bindPlanActions(root) {
    root.querySelectorAll('[data-plan-info-template]').forEach(button => button.onclick = () => exportTemplate('plan', false));
    root.querySelectorAll('[data-plan-info-current]').forEach(button => button.onclick = () => exportTemplate('plan', true));
    root.querySelectorAll('[data-plan-info-import]').forEach(button => button.onclick = () => importExcel('plan'));
    root.querySelectorAll('[data-plan-generate]').forEach(button => button.onclick = () => window.docformacionDocumentPdf?.generate?.('plan'));
  }

  function decorateInfo() {
    if (!isPlanView()) return;
    const card = document.querySelector('.canonical-template-card');
    if (!card) return;
    const source = rows();
    const groups = groupByCareer(source);
    const workflow = window.docformacionWorkflow?.state?.() || {};
    const matrix = matrixState();
    const docState = window.docformacionValidation?.documentReadiness?.('plan', context()) || { ready:false };
    const renderKey = JSON.stringify({
      rows:source.map(row => [row.dnfCode,row.action,row.formationLevel,row.projectedProgram]),
      imported:workflow.planImported,
      file:workflow.planFileName,
      ready:docState.ready
    });
    if (card.dataset.planInfoKey === renderKey) return;
    card.dataset.planInfoKey = renderKey;
    card.classList.add('plan-info-card');

    const manualActions = `
      <button type="button" class="secondary" data-plan-info-template>Descargar plantilla</button>
      <button type="button" class="primary" data-plan-info-import>${workflow.planImported ? 'Reemplazar plantilla' : 'Subir plantilla'}</button>
      ${workflow.planImported ? '<button type="button" class="secondary" data-plan-info-current>Datos actuales</button>' : ''}`;

    card.innerHTML = `
      <div class="plan-info-head">
        <div><strong>Información del Plan</strong><span>${source.length} necesidades · ${groups.length} carreras</span></div>
        <span class="status-badge ${docState.ready ? 'ready' : 'pending'}">${docState.ready ? 'Listo' : 'Pendiente'}</span>
      </div>
      <div class="plan-info-list">
        ${infoRow('Formación proyectada', matrix.ready ? `${matrix.total} registros completos` : `${matrix.invalidRows} de ${matrix.total} pendientes`, matrix.ready && workflow.planImported ? 'ready' : 'pending', manualActions)}
        ${infoRow('Duración por nivel', 'Tecnologías 2,5 años · Ingeniería/Licenciatura 5,5 · Maestría 2,5 · Doctorado 4', 'auto')}
        ${infoRow('Indicador y meta', `${policy().indicator} · Meta ${policy().targetPercent}%`, 'auto')}
        ${infoRow('Responsable institucional', policy().responsibleRole, 'auto')}
        ${infoRow('Recursos institucionales', `${policy().supportType} · ${policy().supportAmountLabel}`, 'auto')}
        ${infoRow('Validez de la formación', policy().validityCriterion, 'auto')}
      </div>
      ${docState.ready ? '<div class="plan-info-generate"><button type="button" class="primary" data-plan-generate>Generar PDF</button></div>' : ''}`;
    bindPlanActions(card);
  }

  function hideDuplicateStatus() {
    if (!isPlanView()) return;
    const card = document.querySelector('.single-document.canonical-doc-status');
    if (card) card.style.display = 'none';
  }

  function decorate() {
    if (!isPlanView()) return;
    decorateInfo();
    decorateSections();
    hideDuplicateStatus();
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      decorate();
    });
  }

  function overrideDocumentRenderers() {
    const previous = window.docformacionSectionRenderers;
    if (!previous?.render || previous.__simplifiedAcademicPlan) return;
    const api = {
      __simplifiedAcademicPlan:true,
      render(type, section, writer, ctx) {
        if (type === 'dnf' && section?.id === 'DNF-10-recomendaciones') {
          [
            'Priorizar en el Plan de Formación las necesidades clasificadas como Alta.',
            'Mantener visible el CODIGO_DNF durante planificación, ejecución y seguimiento.',
            'Definir para cada necesidad la acción de formación proyectada, el nivel de formación y el programa o título académico previsto.',
            'Aplicar automáticamente las duraciones por nivel y los criterios institucionales de indicador, meta, responsable, recursos y validez en Ecuador.',
            'Utilizar los resultados del Informe de Cumplimiento como retroalimentación para el siguiente período.'
          ].forEach(writer.bullet);
          return;
        }
        if (type !== 'plan') return previous.render(type, section, writer, ctx);

        const planRows = ctx.plan || [];
        const byPriority = {};
        planRows.forEach(row => { byPriority[row.priority] = (byPriority[row.priority] || 0) + 1; });
        const careers = new Set(planRows.map(row => clean(row.career)).filter(Boolean)).size;

        switch (section.id) {
          case 'PLAN-01-introduccion':
            writer.paragraph('El Plan de Formación Docente del período ' + ctx.period.label + ' transforma las necesidades identificadas en la DNF en acciones de formación académica proyectadas, manteniendo la trazabilidad mediante CODIGO_DNF.');
            writer.paragraph('La planificación se concentra en la decisión académica que cambia por cada necesidad. Las duraciones, el indicador, la meta, el responsable institucional, los recursos y el criterio de validez se aplican de forma institucional y no se repiten por registro.');
            return;
          case 'PLAN-02-objetivo':
            writer.paragraph('Planificar acciones de formación académica pertinentes para atender las necesidades priorizadas, definiendo el nivel y el programa o título proyectado, con formación reconocida u homologable en Ecuador y criterios institucionales comunes de seguimiento.');
            return;
          case 'PLAN-03-diagnostico':
            writer.metricTable([
              ['Necesidades incorporadas', String(planRows.length)],
              ['Carreras con acciones', String(careers)],
              ['Prioridad Alta', String(byPriority.Alta || 0)],
              ['Prioridad Media', String(byPriority.Media || 0)],
              ['Prioridad Baja', String(byPriority.Baja || 0)],
              ['Meta institucional', String(policy().targetPercent || 10) + '%']
            ]);
            writer.table(
              ['Nivel de formación','Duración institucional'],
              Object.entries(policy().levels || {}).filter(([name]) => name !== 'Ingeniería / Licenciatura').map(([name, years]) => [name, String(years).replace('.', ',') + ' años']),
              [65,35]
            );
            return;
          case 'PLAN-04-matriz':
            groupByCareer(planRows).forEach(group => {
              writer.heading(group.name, 2);
              writer.table(
                ['Código','Necesidad','Prioridad','Acción','Nivel','Programa / título','Duración'],
                group.rows.map(row => [row.dnfCode,row.needText,row.priority,row.action || '—',row.formationLevel || '—',row.projectedProgram || '—',durationText(row)]),
                [11,24,9,18,12,20,6]
              );
            });
            return;
          case 'PLAN-05-indicadores':
            writer.paragraph('El Plan aplica un único criterio institucional de seguimiento para todas las acciones de formación proyectadas.');
            writer.table(
              ['Indicador','Meta','Medio de verificación','Responsable institucional'],
              [[policy().indicator, String(policy().targetPercent) + '%', policy().evidence, policy().responsibleRole]],
              [35,10,28,27]
            );
            return;
          case 'PLAN-06-recursos':
            writer.paragraph('El apoyo institucional se aplica como criterio común y no se individualiza por cada necesidad del Plan.');
            writer.table(
              ['Tipo de apoyo institucional','Monto'],
              [[policy().supportType, policy().supportAmountLabel]],
              [62,38]
            );
            writer.paragraph('Criterio de validez: ' + policy().validityCriterion + '.');
            return;
          case 'PLAN-07-seguimiento':
            writer.paragraph('El seguimiento posterior se realizará mediante CODIGO_DNF y la acción de formación proyectada. El Informe de Cumplimiento registrará el estado real, avance, evidencias y resultados de cada acción.');
            return;
          case 'PLAN-08-conclusiones':
            writer.bullet('El Plan incorpora ' + planRows.length + ' acción(es) de formación proyectada vinculadas directamente con necesidades de ' + careers + ' carrera(s).');
            writer.bullet('La duración se determina automáticamente según el nivel de formación y no requiere fechas individuales de inicio y fin en el Plan.');
            writer.bullet('El indicador, la meta del ' + policy().targetPercent + '%, el responsable y los recursos se aplican de forma institucional a todo el Plan.');
            writer.bullet('La formación proyectada debe ser reconocida u homologable en Ecuador.');
            return;
          default:
            return previous.render(type, section, writer, ctx);
        }
      }
    };
    window.docformacionSectionRenderers = Object.freeze(api);
  }

  function injectStyles() {
    if (document.getElementById('planSvdIntegrationStyles')) return;
    const style = document.createElement('style');
    style.id = 'planSvdIntegrationStyles';
    style.textContent = `
      .plan-info-card{padding:14px!important}.plan-info-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}.plan-info-head>div{display:flex;flex-direction:column;gap:2px}.plan-info-head strong{font-size:12px}.plan-info-head span{font-size:9px;color:#7b8797}.plan-info-list{display:grid;gap:0;margin-top:12px;border:1px solid #edf0f4;border-radius:10px;overflow:hidden}.plan-info-row{display:grid;grid-template-columns:minmax(220px,1fr) auto minmax(280px,auto);gap:10px;align-items:center;padding:11px 12px;border-top:1px solid #edf0f4;background:#fff}.plan-info-row:first-child{border-top:0}.plan-info-row-copy{display:flex;flex-direction:column;gap:2px;min-width:0}.plan-info-row-copy strong{font-size:10px}.plan-info-row-copy span{font-size:9px;color:#7b8797;line-height:1.4}.plan-info-row-actions{display:flex;gap:5px;justify-content:flex-end;flex-wrap:wrap}.plan-info-row-actions:empty{display:none}.plan-info-row-actions button{font-size:9px!important;padding:6px 8px!important}.plan-info-generate{display:flex;justify-content:flex-end;margin-top:12px}.plan-info-generate button{font-size:9px!important;padding:7px 11px!important}
      .plan-svd-specialized>.section-direct-missing,.plan-svd-specialized>.section-details{display:none!important}.plan-svd-section-data{margin-top:12px}.plan-svd-section-summary{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:10px 0;border-top:1px solid #eef1f5}.plan-svd-section-summary>div{display:flex;flex-direction:column;gap:2px}.plan-svd-section-summary strong{font-size:11px}.plan-svd-section-summary span{font-size:9px;color:#7b8797}.plan-auto-note{margin:0 0 10px;font-size:9px;color:#7b8797}.plan-auto-card{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.plan-auto-card>div{border:1px solid #e8edf2;border-radius:9px;padding:10px;display:flex;flex-direction:column;gap:3px;background:#fff}.plan-auto-card span{font-size:8px;color:#8792a2;text-transform:uppercase;letter-spacing:.03em}.plan-auto-card strong{font-size:10px;line-height:1.4;color:#263448}.plan-svd-careers{display:grid;gap:8px}.plan-svd-career{border:1px solid #e8edf2;border-radius:9px;background:#fff;overflow:hidden}.plan-svd-career>summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 12px}.plan-svd-career>summary::-webkit-details-marker{display:none}.plan-svd-career>summary>span:first-child{display:flex;flex-direction:column;gap:2px}.plan-svd-career summary strong{font-size:10px}.plan-svd-career summary small{font-size:8px;color:#8792a2}.plan-svd-career-body{padding:0 10px 10px;border-top:1px solid #f0f2f5}.plan-svd-table-wrap{overflow:auto;margin-top:9px}.plan-svd-table{margin:0!important}.plan-svd-table th,.plan-svd-table td{font-size:9px!important;padding:7px 8px!important;vertical-align:top!important}
      @media(max-width:860px){.plan-info-row{grid-template-columns:1fr auto}.plan-info-row-actions{grid-column:1/-1;justify-content:flex-start}.plan-auto-card{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  overrideDocumentRenderers();
  injectStyles();
  const content = document.getElementById('content');
  if (content) {
    observer = new MutationObserver(schedule);
    observer.observe(content, { childList:true, subtree:true });
  }
  schedule();
})();