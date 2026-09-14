(() => {
  'use strict';

  const FOLLOW_STATUSES = ['No iniciado','En proceso','Finalizado','No ejecutado'];
  const clean = value => String(value ?? '').trim();
  const key = value => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ');

  const LEVEL_DURATIONS = Object.freeze({
    'Tecnología Superior':2.5,
    'Tecnología Universitaria':2.5,
    'Ingeniería':5.5,
    'Licenciatura':5.5,
    'Ingeniería / Licenciatura':5.5,
    'Maestría':2.5,
    'Doctorado':4
  });
  const INDICATOR = 'Porcentaje de docentes priorizados que acceden a programas de formación académica reconocidos u homologables en Ecuador.';
  const TARGET_PERCENT = 10;
  const EVIDENCE = 'Matrícula, certificado o documento oficial de respaldo de la formación académica.';
  const RESPONSIBLE_ROLE = 'Coordinador de Gestión de Procesos Académicos';
  const SUPPORT_TYPE = 'Financiamiento total del costo de la formación';
  const SUPPORT_AMOUNT_LABEL = 'Según costo institucional aprobado';
  const VALIDITY_CRITERION = 'Formación reconocida u homologable en Ecuador';

  function normalizeFormationLevel(value) {
    const raw = clean(value);
    if (!raw) return '';
    const normalized = key(raw);
    const aliases = new Map([
      ['tecnologia superior','Tecnología Superior'],
      ['tecnologias superiores','Tecnología Superior'],
      ['tecnologia universitaria','Tecnología Universitaria'],
      ['tecnologias universitarias','Tecnología Universitaria'],
      ['ingenieria','Ingeniería'],
      ['ingenierias','Ingeniería'],
      ['licenciatura','Licenciatura'],
      ['licenciaturas','Licenciatura'],
      ['ingenieria / licenciatura','Ingeniería / Licenciatura'],
      ['ingenieria/licenciatura','Ingeniería / Licenciatura'],
      ['maestria','Maestría'],
      ['maestrias','Maestría'],
      ['doctorado','Doctorado'],
      ['doctorados','Doctorado']
    ]);
    return aliases.get(normalized) || Object.keys(LEVEL_DURATIONS).find(item => key(item) === normalized) || '';
  }

  function durationForLevel(level) {
    const normalized = normalizeFormationLevel(level);
    return Number(LEVEL_DURATIONS[normalized] || 0);
  }

  function applyInstitutionalDefaults(row = {}) {
    const formationLevel = normalizeFormationLevel(row.formationLevel || row.level);
    return {
      ...row,
      formationLevel,
      projectedProgram:clean(row.projectedProgram || row.programTitle),
      durationYears:durationForLevel(formationLevel),
      validityCriterion:VALIDITY_CRITERION,
      indicator:INDICATOR,
      targetPercent:TARGET_PERCENT,
      evidence:EVIDENCE,
      responsibleRole:RESPONSIBLE_ROLE,
      supportType:SUPPORT_TYPE,
      supportAmountLabel:SUPPORT_AMOUNT_LABEL,
      supportAmount:0,
      observations:''
    };
  }

  window.docformacionPlanPolicy = Object.freeze({
    levels:Object.freeze({...LEVEL_DURATIONS}),
    normalizeLevel:normalizeFormationLevel,
    durationForLevel,
    applyDefaults:applyInstitutionalDefaults,
    indicator:INDICATOR,
    targetPercent:TARGET_PERCENT,
    evidence:EVIDENCE,
    responsibleRole:RESPONSIBLE_ROLE,
    supportType:SUPPORT_TYPE,
    supportAmountLabel:SUPPORT_AMOUNT_LABEL,
    validityCriterion:VALIDITY_CRITERION
  });

  function workflow() {
    state.workflowV3 = state.workflowV3 && typeof state.workflowV3 === 'object' ? state.workflowV3 : {};
    const value = state.workflowV3;
    const defaults = {
      version:5,
      planImported:false,
      planFileName:'',
      planImportedAt:'',
      planSourceFingerprint:'',
      reportImported:false,
      reportFileName:'',
      reportImportedAt:'',
      reportSourceFingerprint:''
    };
    Object.entries(defaults).forEach(([name, fallback]) => {
      if (!Object.prototype.hasOwnProperty.call(value, name)) value[name] = fallback;
    });
    value.version = 5;
    return value;
  }

  function needsFingerprint(rows = window.docformacionModel?.needs?.() || []) {
    return rows.map(row => [row.code,row.career,row.need,row.priority].map(clean).join('|'))
      .sort((a,b) => a.localeCompare(b, 'es')).join('||');
  }

  function planFingerprint(rows = window.docformacionModel?.planRows?.() || []) {
    return rows.map(row => [
      row.dnfCode,row.career,row.needText,row.priority,row.action,row.formationLevel,
      row.projectedProgram,Number(row.durationYears || 0),VALIDITY_CRITERION
    ].map(clean).join('|')).sort((a,b) => a.localeCompare(b, 'es')).join('||');
  }

  function syncPlanRows() {
    const needs = window.docformacionModel?.needs?.() || [];
    const existing = Array.isArray(state.needPlan) ? state.needPlan : (Array.isArray(state.plan) ? state.plan : []);
    if (!needs.length) return existing.map(applyInstitutionalDefaults);

    const byCode = new Map(existing.filter(row => clean(row?.dnfCode || row?.needKey || row?.code))
      .map(row => [clean(row.dnfCode || row.needKey || row.code), row]));
    const byText = new Map(existing.map(row => [key(row?.career) + '|' + key(row?.needText || row?.need), row]));

    state.needPlan = needs.map(source => {
      const old = byCode.get(source.code) || byText.get(key(source.career) + '|' + key(source.need)) || {};
      return applyInstitutionalDefaults({
        dnfCode:source.code,
        needKey:source.code,
        career:source.career,
        needText:source.need,
        priority:source.priority,
        action:clean(old.action || old.program),
        formationLevel:clean(old.formationLevel || old.level),
        projectedProgram:clean(old.projectedProgram || old.programTitle),
        // Compatibilidad histórica: estos campos se conservan, pero ya no se solicitan ni validan.
        modality:clean(old.modality),
        plannedStart:clean(old.plannedStart),
        plannedEnd:clean(old.plannedEnd)
      });
    });
    return state.needPlan;
  }

  function syncReportRows() {
    const plan = syncPlanRows();
    const existing = Array.isArray(state.needFollowup) ? state.needFollowup : (Array.isArray(state.followup) ? state.followup : []);
    if (!plan.length) return existing;

    const byCode = new Map(existing.filter(row => clean(row?.dnfCode || row?.needKey))
      .map(row => [clean(row.dnfCode || row.needKey), row]));
    state.needFollowup = plan.map(source => {
      const old = byCode.get(source.dnfCode) || {};
      return {
        dnfCode:source.dnfCode,
        needKey:source.dnfCode,
        career:source.career,
        needText:source.needText,
        action:source.action,
        status:clean(old.status),
        realStart:clean(old.realStart),
        progress:Number(old.progress || 0),
        evidenceTitle:clean(old.evidenceTitle),
        evidencePath:clean(old.evidencePath),
        observation:clean(old.observation)
      };
    });
    return state.needFollowup;
  }

  function periodSlug() {
    return window.docformacionModel?.periodId || 'periodo';
  }

  function simpleSheet(name, headers, descriptions, rows, widths) {
    return { name, headers, descriptions, rows:rows?.length ? rows : [headers.map(() => '')], widths };
  }

  const previousExcelTemplatePayload = excelTemplatePayload;
  excelTemplatePayload = function canonicalWorkflowTemplate(scope, includeData) {
    includeData = !!includeData;
    if (scope === 'informe' || scope === 'seguimiento') {
      const rows = syncReportRows();
      return {
        filename:(includeData ? 'UGPA_Datos_Actuales_Informe_' : 'UGPA_Plantilla_Informe_') + periodSlug() + '.xlsx',
        sheets:[simpleSheet('INFORME',
          ['CODIGO_DNF','CARRERA','NECESIDAD','ACCION_FORMACION','ESTADO','FECHA_INICIO_REAL','AVANCE_PORCENTAJE','EVIDENCIA','ARCHIVO_EVIDENCIA','RESULTADO_OBSERVACION'],
          ['Código heredado de DNF y Plan. No modificar.','Carrera heredada. No modificar.','Necesidad heredada. No modificar.','Acción del Plan. No modificar.','No iniciado, En proceso, Finalizado o No ejecutado.','Fecha AAAA-MM-DD cuando exista inicio.','Valor entre 0 y 100. Finalizado debe ser 100.','Nombre de la evidencia cuando la acción está En proceso o Finalizada.','Nombre o referencia del archivo de evidencia.','Resultado, observación o motivo de no ejecución.'],
          rows.map(row => [row.dnfCode,row.career,row.needText,row.action,includeData ? row.status : '',includeData ? row.realStart : '',includeData ? Number(row.progress || 0) : '',includeData ? row.evidenceTitle : '',includeData ? row.evidencePath : '',includeData ? row.observation : '']),
          [18,34,58,58,18,20,18,42,38,58]
        )]
      };
    }
    return previousExcelTemplatePayload(scope, includeData);
  };

  const previousAnalyzeExcelImport = analyzeExcelImport;
  analyzeExcelImport = function canonicalWorkflowAnalyze(scope, result, type = '', kind = '') {
    if (kind || !['informe','seguimiento'].includes(scope)) return previousAnalyzeExcelImport(scope, result, type, kind);
    const target = 'INFORME';
    const expected = syncReportRows();
    const sourceReady = window.docformacionValidation?.documentReadiness?.('plan')?.ready;
    const sheets = result?.sheets || {};
    const detected = Object.keys(sheets).filter(name => Array.isArray(sheets[name]) && sheets[name].length);
    const imported = Array.isArray(sheets[target]) ? sheets[target] : [];
    const expectedByCode = new Map(expected.map(row => [clean(row.dnfCode).toUpperCase(), row]));
    const seen = new Set();
    const preview = [];
    const safeRows = [];
    const errors = [];

    if (!sourceReady) errors.push('Primero debe estar completo el Plan de Formación del período.');
    if (!detected.includes(target)) errors.push('La plantilla debe contener la hoja ' + target + '.');
    const extras = detected.filter(name => name !== target);
    if (extras.length) errors.push('Esta carga es independiente. Retira las otras hojas: ' + extras.join(', ') + '.');

    imported.forEach((raw, index) => {
      if (!Object.values(raw || {}).some(value => clean(value))) return;
      const code = clean(raw.CODIGO_DNF).toUpperCase();
      const expectedRow = expectedByCode.get(code);
      let reason = '';
      let safe = null;

      if (!code) reason = 'Falta CODIGO_DNF';
      else if (!expectedRow) reason = 'CODIGO_DNF no pertenece al período activo';
      else if (seen.has(code)) reason = 'CODIGO_DNF duplicado';
      else if (key(raw.CARRERA) !== key(expectedRow.career)) reason = 'CARRERA no coincide con la trazabilidad del código';
      else if (key(raw.NECESIDAD) !== key(expectedRow.needText)) reason = 'NECESIDAD no coincide con la trazabilidad del código';
      else if (key(raw.ACCION_FORMACION) !== key(expectedRow.action)) reason = 'ACCION_FORMACION no coincide con el Plan';

      if (!reason) {
        const status = FOLLOW_STATUSES.find(value => key(value) === key(raw.ESTADO)) || '';
        const realStart = clean(raw.FECHA_INICIO_REAL);
        const progress = Number(String(raw.AVANCE_PORCENTAJE ?? '').replace(',', '.'));
        if (!status) reason = 'ESTADO debe ser No iniciado, En proceso, Finalizado o No ejecutado';
        else if (!(progress >= 0 && progress <= 100)) reason = 'AVANCE_PORCENTAJE debe estar entre 0 y 100';
        else if (['En proceso','Finalizado'].includes(status) && !/^\d{4}-\d{2}-\d{2}$/.test(realStart)) reason = 'FECHA_INICIO_REAL debe usar AAAA-MM-DD';
        else if (['En proceso','Finalizado'].includes(status) && !(progress > 0)) reason = 'Las acciones iniciadas deben registrar avance mayor a 0';
        else if (status === 'Finalizado' && progress !== 100) reason = 'Una acción Finalizada debe registrar 100% de avance';
        else if (['En proceso','Finalizado'].includes(status) && !clean(raw.EVIDENCIA)) reason = 'Falta EVIDENCIA';
        else if (status === 'No ejecutado' && !clean(raw.RESULTADO_OBSERVACION)) reason = 'Registra el motivo de no ejecución';
        else safe = {
          CODIGO_DNF:expectedRow.dnfCode,CARRERA:expectedRow.career,NECESIDAD:expectedRow.needText,ACCION_FORMACION:expectedRow.action,
          ESTADO:status,FECHA_INICIO_REAL:realStart,AVANCE_PORCENTAJE:progress,EVIDENCIA:clean(raw.EVIDENCIA),
          ARCHIVO_EVIDENCIA:clean(raw.ARCHIVO_EVIDENCIA),RESULTADO_OBSERVACION:clean(raw.RESULTADO_OBSERVACION)
        };
      }

      if (reason) preview.push({ id:'canonical-row-' + index, sheet:target, row:raw, status:'Error', valid:false, optional:false, reason });
      else {
        seen.add(code);
        safeRows.push(safe);
        preview.push({ id:'canonical-row-' + index, sheet:target, row:safe, status:'Aplicar', valid:true, optional:false, reason:'Registro válido' });
      }
    });

    const missing = expected.filter(row => !seen.has(clean(row.dnfCode).toUpperCase()));
    if (missing.length) errors.push('Faltan ' + missing.length + ' código(s) del período: ' + missing.slice(0, 12).map(row => row.dnfCode).join(', ') + (missing.length > 12 ? '…' : '') + '.');
    const bad = preview.filter(row => !row.valid).length;
    if (bad) errors.push('La plantilla contiene ' + bad + ' fila(s) con errores. No se aplicará parcialmente.');
    if (!safeRows.length && !errors.length) errors.push('No se encontraron filas válidas.');

    const validRows = preview.filter(row => row.valid).length;
    return {
      context:{ label:'Informe de Cumplimiento', scope:'informe', kind:'' },
      filePath:result?.filePath || 'Archivo Excel',detected,allowed:[target],
      compatibleSheets:detected.includes(target) ? [target] : [],incompatibleSheets:detected.filter(name => name !== target),
      totalRows:preview.length,validRows,optionalRows:0,ignoredRows:0,errorRows:bad,matchedRows:validRows,expectedCount:expected.length,
      statusCounts:{ Aplicar:validRows,Actualizar:0,'Actualizar opcional':0,'Ya completo':0,'Sin cambios':0,Omitir:0,Error:bad },
      errors,warnings:[],safeSheets:errors.length ? {} : { [target]:safeRows },optionalById:{},preview:preview.slice(0, 80),mismatch:false,detectedDestination:null
    };
  };

  const previousApplyExcel = applyExcel;
  applyExcel = function canonicalWorkflowApply(sheets) {
    const scope = window.__DOCFORMACION_TEMPLATE_IMPORT_SCOPE;
    if ((scope === 'informe' || scope === 'seguimiento') && Array.isArray(sheets?.INFORME)) {
      const rows = syncReportRows();
      const byCode = new Map(rows.map(row => [clean(row.dnfCode).toUpperCase(), row]));
      sheets.INFORME.forEach(raw => {
        const row = byCode.get(clean(raw.CODIGO_DNF).toUpperCase());
        if (!row) return;
        row.status = clean(raw.ESTADO);
        row.realStart = clean(raw.FECHA_INICIO_REAL);
        row.progress = Number(raw.AVANCE_PORCENTAJE || 0);
        row.evidenceTitle = clean(raw.EVIDENCIA);
        row.evidencePath = clean(raw.ARCHIVO_EVIDENCIA);
        row.observation = clean(raw.RESULTADO_OBSERVACION);
      });
      state.needFollowup = rows;
      const value = workflow();
      value.reportImported = true;
      value.reportFileName = window.__DOCFORMACION_TEMPLATE_IMPORT_FILE || 'Plantilla Informe';
      value.reportImportedAt = new Date().toISOString();
      value.reportSourceFingerprint = planFingerprint(syncPlanRows());
      return;
    }
    return previousApplyExcel(sheets);
  };

  function templateButtons(scope, enabled, hasCurrent, view) {
    return '<div class="toolbar excel-toolbar canonical-toolbar">' +
      '<button type="button" class="secondary" data-canonical-template="' + scope + '"' + (enabled ? '' : ' disabled') + '>Descargar plantilla vacía</button>' +
      '<button type="button" class="secondary" data-canonical-current="' + scope + '"' + (enabled && hasCurrent ? '' : ' disabled') + '>Descargar datos actuales</button>' +
      '<button type="button" class="primary" data-canonical-import="' + scope + '"' + (enabled ? '' : ' disabled') + '>Subir / reemplazar plantilla</button>' +
      (view ? '<button type="button" class="secondary" data-canonical-view="' + view + '"' + (hasCurrent ? '' : ' disabled') + '>Ver datos</button>' : '') +
      '</div>';
  }

  function bindButtons(root = document) {
    root.querySelectorAll('[data-canonical-template]').forEach(button => button.onclick = () => exportTemplate(button.dataset.canonicalTemplate, false));
    root.querySelectorAll('[data-canonical-current]').forEach(button => button.onclick = () => exportTemplate(button.dataset.canonicalCurrent, true));
    root.querySelectorAll('[data-canonical-import]').forEach(button => button.onclick = () => importExcel(button.dataset.canonicalImport));
    root.querySelectorAll('[data-canonical-view]').forEach(button => button.onclick = () => setView(button.dataset.canonicalView));
  }

  const previousDocumentStatus = documentStatus;
  documentStatus = function canonicalWorkflowStatus(type) {
    if (type === 'dnf') return previousDocumentStatus(type);
    if (type === 'plan') syncPlanRows();
    if (type === 'informe') syncReportRows();
    const result = window.docformacionValidation?.documentReadiness?.(type) || { ready:false, missing:['Validación no disponible'] };
    const issues = (result.missing || []).map(text => ({ kind:type === 'plan' ? 'plan-template' : 'report-template', text, view:type === 'plan' ? 'planificacion' : 'seguimiento' }));
    return { ready:!!result.ready, issues, warnings:[], missing:result.missing || [] };
  };

  const previousRenderDocumentView = renderDocumentView;
  renderDocumentView = function canonicalWorkflowDocumentView(type) {
    if (type === 'dnf') return previousRenderDocumentView(type);
    const rows = type === 'plan' ? syncPlanRows() : syncReportRows();
    const dependencyReady = type === 'plan'
      ? window.docformacionValidation?.documentReadiness?.('dnf')?.ready
      : window.docformacionValidation?.documentReadiness?.('plan')?.ready;
    const status = documentStatus(type);
    const value = workflow();
    const scope = type === 'plan' ? 'plan' : 'informe';
    const title = type === 'plan' ? 'Plan de Formación Docente' : 'Informe de Cumplimiento';
    const view = type === 'plan' ? 'planificacion' : 'seguimiento';
    const file = type === 'plan' ? value.planFileName : value.reportFileName;

    document.getElementById('content').innerHTML = `
      <div class="section-title"><div><h2>${esc(title)}</h2><p>La información variable se valida desde Excel y conserva la trazabilidad por CODIGO_DNF.</p></div></div>
      <div class="card canonical-template-card">
        <div class="dnf-template-card-head"><div><strong>${type === 'plan' ? 'Formación proyectada' : 'Plantilla del período'}</strong><span>${file ? 'Cargada' : 'Pendiente'}</span></div><span class="status-badge ${status.ready ? 'ready' : 'blocked'}">${status.ready ? 'Lista' : 'Pendiente'}</span></div>
        <p>${rows.length} registro(s) vinculados por CODIGO_DNF.</p>${file ? '<div class="small muted">Último archivo: ' + esc(file) + '</div>' : ''}
        ${templateButtons(scope, !!dependencyReady, rows.length > 0, view)}
      </div>
      <div class="status-card simple-doc-card single-document" style="margin-top:18px">
        <div class="status-head"><div class="missing-heading">${status.ready ? 'Documento completo' : 'Falta completar'}</div><span class="status-badge ${status.ready ? 'ready' : 'blocked'}">${status.ready ? 'Listo' : 'Pendiente'}</span></div>
        ${status.ready ? '<div class="ready-message">Toda la información necesaria está completa y validada para el período activo.</div><div class="doc-actions"><button class="primary" id="generateCurrent">Generar PDF</button></div>' : '<div class="issue-list">' + status.issues.map(issue => '<div class="issue-line"><div class="issue-line-text"><strong>' + esc(issue.text) + '</strong></div></div>').join('') + '</div>'}
      </div>`;
    bindButtons(document.getElementById('content'));
    const generate = document.getElementById('generateCurrent');
    if (generate) generate.onclick = () => generateDocument(type);
  };

  renderPlan = function canonicalWorkflowPlanView() {
    const rows = syncPlanRows();
    const status = documentStatus('plan');
    document.getElementById('content').innerHTML = `
      ${status.ready ? '<div class="alert-strip success"><div><strong>Plan listo</strong>Formación proyectada validada.</div></div>' : '<div class="alert-strip warning"><div><strong>Plan pendiente</strong>Completa o reemplaza la matriz de formación proyectada.</div></div>'}
      <div class="section-title"><div><h2>Formación proyectada</h2><p>La carrera, necesidad y prioridad se heredan de la DNF. Solo se define la formación proyectada.</p></div></div>
      <div class="card">${templateButtons('plan', !!window.docformacionValidation?.documentReadiness?.('dnf')?.ready, rows.length > 0, '')}</div>
      <div class="table-wrap" style="margin-top:16px">${rows.length ? '<table class="table"><thead><tr><th>Código DNF</th><th>Carrera</th><th>Necesidad</th><th>Prioridad</th><th>Acción</th><th>Nivel</th><th>Programa / título</th><th>Duración</th></tr></thead><tbody>' + rows.map(row => '<tr><td><strong>' + esc(row.dnfCode) + '</strong></td><td>' + esc(row.career) + '</td><td>' + esc(row.needText) + '</td><td>' + esc(row.priority) + '</td><td>' + esc(row.action || '—') + '</td><td>' + esc(row.formationLevel || '—') + '</td><td>' + esc(row.projectedProgram || '—') + '</td><td>' + (row.durationYears ? esc(String(row.durationYears).replace('.', ',')) + ' años' : '—') + '</td></tr>').join('') + '</tbody></table>' : '<div class="empty">No existen necesidades DNF para planificar.</div>'}</div>`;
    bindButtons(document.getElementById('content'));
  };

  renderFollowup = function canonicalWorkflowFollowupView() {
    const rows = syncReportRows();
    const status = documentStatus('informe');
    document.getElementById('content').innerHTML = `
      ${status.ready ? '<div class="alert-strip success"><div><strong>Informe listo</strong>Seguimiento validado mediante plantilla Excel.</div></div>' : '<div class="alert-strip warning"><div><strong>Informe pendiente</strong>Completa o reemplaza la plantilla Excel del Informe.</div></div>'}
      <div class="section-title"><div><h2>Seguimiento por necesidad</h2><p>Vista de consulta. Las correcciones se realizan en Excel y se vuelven a subir.</p></div></div>
      <div class="card">${templateButtons('informe', !!window.docformacionValidation?.documentReadiness?.('plan')?.ready, rows.length > 0, '')}</div>
      <div class="table-wrap" style="margin-top:16px">${rows.length ? '<table class="table"><thead><tr><th>Código DNF</th><th>Carrera</th><th>Acción</th><th>Estado</th><th>Inicio real</th><th>Avance</th><th>Evidencia</th><th>Resultado / observación</th></tr></thead><tbody>' + rows.map(row => '<tr><td><strong>' + esc(row.dnfCode) + '</strong></td><td>' + esc(row.career) + '</td><td>' + esc(row.action || '—') + '</td><td>' + esc(row.status || '—') + '</td><td>' + esc(row.realStart || '—') + '</td><td>' + esc(Number(row.progress || 0)) + '%</td><td>' + esc(row.evidenceTitle || '—') + (row.evidencePath ? '<br><span class="small muted">' + esc(row.evidencePath) + '</span>' : '') + '</td><td>' + esc(row.observation || '—') + '</td></tr>').join('') + '</tbody></table>' : '<div class="empty">No existen acciones del Plan para dar seguimiento.</div>'}</div>`;
    bindButtons(document.getElementById('content'));
  };

  function injectStyles() {
    if (document.getElementById('canonicalWorkflowStyles')) return;
    const style = document.createElement('style');
    style.id = 'canonicalWorkflowStyles';
    style.textContent = '.canonical-template-card{display:flex;flex-direction:column;gap:10px}.canonical-toolbar{flex-wrap:wrap;margin-top:8px}.canonical-toolbar button{white-space:nowrap}@media(max-width:900px){.canonical-toolbar{align-items:stretch}.canonical-toolbar button{flex:1 1 210px}}';
    document.head.appendChild(style);
  }

  injectStyles();
  workflow();
  window.docformacionWorkflow = Object.freeze({ syncPlanRows, syncReportRows, needsFingerprint, planFingerprint, state:workflow });
})();