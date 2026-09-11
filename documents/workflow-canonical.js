(() => {
  'use strict';

  const MODALITIES = ['Presencial','Virtual','Híbrida'];
  const SUPPORTS = ['Sin apoyo económico','Económico','Convenio / beca','Gestión interna'];
  const FOLLOW_STATUSES = ['No iniciado','En proceso','Finalizado','No ejecutado'];
  const clean = value => String(value ?? '').trim();
  const key = value => clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ');

  function workflow() {
    state.workflowV3 = state.workflowV3 && typeof state.workflowV3 === 'object' ? state.workflowV3 : {};
    const w = state.workflowV3;
    if (!Object.prototype.hasOwnProperty.call(w, 'version')) w.version = 4;
    if (!Object.prototype.hasOwnProperty.call(w, 'planImported')) w.planImported = false;
    if (!Object.prototype.hasOwnProperty.call(w, 'planFileName')) w.planFileName = '';
    if (!Object.prototype.hasOwnProperty.call(w, 'planImportedAt')) w.planImportedAt = '';
    if (!Object.prototype.hasOwnProperty.call(w, 'planSourceFingerprint')) w.planSourceFingerprint = '';
    if (!Object.prototype.hasOwnProperty.call(w, 'reportImported')) w.reportImported = false;
    if (!Object.prototype.hasOwnProperty.call(w, 'reportFileName')) w.reportFileName = '';
    if (!Object.prototype.hasOwnProperty.call(w, 'reportImportedAt')) w.reportImportedAt = '';
    if (!Object.prototype.hasOwnProperty.call(w, 'reportSourceFingerprint')) w.reportSourceFingerprint = '';
    return w;
  }

  function needsFingerprint(rows = window.docformacionModel?.needs?.() || []) {
    return rows.map(row => [row.code,row.career,row.need,row.priority].map(clean).join('|'))
      .sort((a,b) => a.localeCompare(b, 'es'))
      .join('||');
  }

  function planFingerprint(rows = window.docformacionModel?.planRows?.() || []) {
    return rows.map(row => [
      row.dnfCode,row.career,row.needText,row.priority,row.action,row.modality,
      row.plannedStart,row.plannedEnd,row.indicator,Number(row.targetPercent || 0),
      row.evidence,row.responsibleRole,row.supportType,Number(row.supportAmount || 0),row.observations
    ].map(clean).join('|')).sort((a,b) => a.localeCompare(b, 'es')).join('||');
  }

  function syncPlanRows() {
    const needs = window.docformacionModel?.needs?.() || [];
    const existing = Array.isArray(state.needPlan) ? state.needPlan : [];
    const byCode = new Map(existing.filter(row => clean(row?.dnfCode || row?.needKey || row?.code)).map(row => [clean(row.dnfCode || row.needKey || row.code), row]));
    const byText = new Map(existing.map(row => [key(row?.career) + '|' + key(row?.needText || row?.need), row]));
    state.needPlan = needs.map(source => {
      const old = byCode.get(source.code) || byText.get(key(source.career) + '|' + key(source.need)) || {};
      return {
        dnfCode:source.code,
        needKey:source.code,
        career:source.career,
        needText:source.need,
        priority:source.priority,
        action:clean(old.action),
        modality:clean(old.modality),
        plannedStart:clean(old.plannedStart),
        plannedEnd:clean(old.plannedEnd),
        indicator:clean(old.indicator),
        targetPercent:Number(old.targetPercent || 0),
        evidence:clean(old.evidence),
        responsibleRole:clean(old.responsibleRole),
        supportType:clean(old.supportType),
        supportAmount:Number(old.supportAmount || 0),
        observations:clean(old.observations)
      };
    });
    return state.needPlan;
  }

  function syncReportRows() {
    const plan = syncPlanRows();
    const existing = Array.isArray(state.needFollowup) ? state.needFollowup : [];
    const byCode = new Map(existing.filter(row => clean(row?.dnfCode || row?.needKey)).map(row => [clean(row.dnfCode || row.needKey), row]));
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
    const id = window.docformacionModel?.periodId || '';
    return id || 'periodo';
  }

  function simpleSheet(name, headers, descriptions, rows, widths) {
    return { name, headers, descriptions, rows:rows?.length ? rows : [headers.map(() => '')], widths };
  }

  const previousExcelTemplatePayload = excelTemplatePayload;
  excelTemplatePayload = function canonicalWorkflowTemplate(scope, includeData) {
    includeData = !!includeData;
    if (scope === 'plan') {
      const rows = syncPlanRows();
      return {
        filename:(includeData ? 'UGPA_Datos_Actuales_Plan_' : 'UGPA_Plantilla_Plan_') + periodSlug() + '.xlsx',
        sheets:[simpleSheet(
          'PLAN',
          ['CODIGO_DNF','CARRERA','NECESIDAD','PRIORIDAD','ACCION_FORMACION','MODALIDAD','INICIO_PLANIFICADO','FIN_PLANIFICADO','INDICADOR','META_PORCENTAJE','MEDIO_VERIFICACION','RESPONSABLE_INSTITUCIONAL','TIPO_APOYO','MONTO_APOYO','OBSERVACIONES'],
          ['Código heredado de la DNF. No modificar.','Carrera heredada de la DNF. No modificar.','Necesidad heredada de la DNF. No modificar.','Prioridad heredada de la DNF. No modificar.','Acción institucional que atenderá la necesidad.','Presencial, Virtual o Híbrida.','Mes/año AAAA-MM.','Mes/año AAAA-MM.','Indicador de cumplimiento.','Meta entre 1 y 100.','Documento o evidencia de verificación.','Unidad, área o cargo institucional responsable.','Sin apoyo económico, Económico, Convenio / beca o Gestión interna.','Monto numérico solo si TIPO_APOYO es Económico.','Observación opcional.'],
          rows.map(row => [row.dnfCode,row.career,row.needText,row.priority,includeData ? row.action : '',includeData ? row.modality : '',includeData ? row.plannedStart : '',includeData ? row.plannedEnd : '',includeData ? row.indicator : '',includeData ? (row.targetPercent || '') : '',includeData ? row.evidence : '',includeData ? row.responsibleRole : '',includeData ? row.supportType : '',includeData ? (row.supportAmount || '') : '',includeData ? row.observations : '']),
          [18,34,58,14,58,16,18,18,42,16,46,38,24,18,42]
        )]
      };
    }

    if (scope === 'informe' || scope === 'seguimiento') {
      const rows = syncReportRows();
      return {
        filename:(includeData ? 'UGPA_Datos_Actuales_Informe_' : 'UGPA_Plantilla_Informe_') + periodSlug() + '.xlsx',
        sheets:[simpleSheet(
          'INFORME',
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
    if (kind || !['plan','informe','seguimiento'].includes(scope)) return previousAnalyzeExcelImport(scope, result, type, kind);
    const isPlan = scope === 'plan';
    const target = isPlan ? 'PLAN' : 'INFORME';
    const expected = isPlan ? syncPlanRows() : syncReportRows();
    const sourceReady = isPlan
      ? window.docformacionValidation?.documentReadiness?.('dnf')?.ready
      : window.docformacionValidation?.documentReadiness?.('plan')?.ready;
    const sheets = result?.sheets || {};
    const detected = Object.keys(sheets).filter(name => Array.isArray(sheets[name]) && sheets[name].length);
    const imported = Array.isArray(sheets[target]) ? sheets[target] : [];
    const expectedByCode = new Map(expected.map(row => [clean(row.dnfCode).toUpperCase(), row]));
    const seen = new Set();
    const preview = [];
    const safeRows = [];
    const errors = [];

    if (!sourceReady) errors.push(isPlan ? 'Primero debe estar completa la DNF del período.' : 'Primero debe estar completo el Plan de Formación del período.');
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
      else if (isPlan && key(raw.PRIORIDAD) !== key(expectedRow.priority)) reason = 'PRIORIDAD no coincide con la DNF';
      else if (!isPlan && key(raw.ACCION_FORMACION) !== key(expectedRow.action)) reason = 'ACCION_FORMACION no coincide con el Plan';

      if (!reason && isPlan) {
        const modality = MODALITIES.find(value => key(value) === key(raw.MODALIDAD)) || '';
        const support = SUPPORTS.find(value => key(value) === key(raw.TIPO_APOYO)) || '';
        const start = clean(raw.INICIO_PLANIFICADO);
        const end = clean(raw.FIN_PLANIFICADO);
        const meta = Number(String(raw.META_PORCENTAJE ?? '').replace(',', '.'));
        const amount = Number(String(raw.MONTO_APOYO ?? '').replace(',', '.'));
        if (!clean(raw.ACCION_FORMACION)) reason = 'Falta ACCION_FORMACION';
        else if (!modality) reason = 'MODALIDAD debe ser Presencial, Virtual o Híbrida';
        else if (!/^\d{4}-\d{2}$/.test(start)) reason = 'INICIO_PLANIFICADO debe usar AAAA-MM';
        else if (!/^\d{4}-\d{2}$/.test(end)) reason = 'FIN_PLANIFICADO debe usar AAAA-MM';
        else if (end < start) reason = 'FIN_PLANIFICADO no puede ser anterior al inicio';
        else if (!clean(raw.INDICADOR)) reason = 'Falta INDICADOR';
        else if (!(meta > 0 && meta <= 100)) reason = 'META_PORCENTAJE debe estar entre 1 y 100';
        else if (!clean(raw.MEDIO_VERIFICACION)) reason = 'Falta MEDIO_VERIFICACION';
        else if (!clean(raw.RESPONSABLE_INSTITUCIONAL)) reason = 'Falta RESPONSABLE_INSTITUCIONAL';
        else if (!support) reason = 'TIPO_APOYO no es válido';
        else if (support === 'Económico' && !(amount > 0)) reason = 'MONTO_APOYO debe ser mayor a 0 cuando el apoyo es Económico';
        else safe = {
          CODIGO_DNF:expectedRow.dnfCode,CARRERA:expectedRow.career,NECESIDAD:expectedRow.needText,PRIORIDAD:expectedRow.priority,
          ACCION_FORMACION:clean(raw.ACCION_FORMACION),MODALIDAD:modality,INICIO_PLANIFICADO:start,FIN_PLANIFICADO:end,
          INDICADOR:clean(raw.INDICADOR),META_PORCENTAJE:meta,MEDIO_VERIFICACION:clean(raw.MEDIO_VERIFICACION),
          RESPONSABLE_INSTITUCIONAL:clean(raw.RESPONSABLE_INSTITUCIONAL),TIPO_APOYO:support,
          MONTO_APOYO:support === 'Económico' ? amount : 0,OBSERVACIONES:clean(raw.OBSERVACIONES)
        };
      }

      if (!reason && !isPlan) {
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

      if (reason) {
        preview.push({ id:'canonical-row-' + index, sheet:target, row:raw, status:'Error', valid:false, optional:false, reason });
      } else {
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

    return {
      context:{ label:isPlan ? 'Plan de Formación' : 'Informe de Cumplimiento', scope:isPlan ? 'plan' : 'informe', kind:'' },
      filePath:result?.filePath || 'Archivo Excel',
      detected,
      allowed:[target],
      compatibleSheets:detected.includes(target) ? [target] : [],
      incompatibleSheets:detected.filter(name => name !== target),
      totalRows:preview.length,
      validRows:preview.filter(row => row.valid).length,
      optionalRows:0,
      ignoredRows:0,
      errorRows:bad,
      matchedRows:preview.filter(row => row.valid).length,
      expectedCount:expected.length,
      statusCounts:{ Aplicar:preview.filter(row => row.valid).length, Actualizar:0, 'Actualizar opcional':0, 'Ya completo':0, 'Sin cambios':0, Omitir:0, Error:bad },
      errors,
      warnings:[],
      safeSheets:errors.length ? {} : { [target]:safeRows },
      optionalById:{},
      preview:preview.slice(0, 80),
      mismatch:false,
      detectedDestination:null
    };
  };

  const previousApplyExcel = applyExcel;
  applyExcel = function canonicalWorkflowApply(sheets) {
    const scope = window.__DOCFORMACION_TEMPLATE_IMPORT_SCOPE;
    if (scope === 'plan' && Array.isArray(sheets?.PLAN)) {
      const rows = syncPlanRows();
      const byCode = new Map(rows.map(row => [clean(row.dnfCode).toUpperCase(), row]));
      sheets.PLAN.forEach(raw => {
        const row = byCode.get(clean(raw.CODIGO_DNF).toUpperCase());
        if (!row) return;
        row.action = clean(raw.ACCION_FORMACION);
        row.modality = clean(raw.MODALIDAD);
        row.plannedStart = clean(raw.INICIO_PLANIFICADO);
        row.plannedEnd = clean(raw.FIN_PLANIFICADO);
        row.indicator = clean(raw.INDICADOR);
        row.targetPercent = Number(raw.META_PORCENTAJE || 0);
        row.evidence = clean(raw.MEDIO_VERIFICACION);
        row.responsibleRole = clean(raw.RESPONSABLE_INSTITUCIONAL);
        row.supportType = clean(raw.TIPO_APOYO);
        row.supportAmount = Number(raw.MONTO_APOYO || 0);
        row.observations = clean(raw.OBSERVACIONES);
      });
      state.needPlan = rows;
      const w = workflow();
      w.version = 4;
      w.planImported = true;
      w.planFileName = window.__DOCFORMACION_TEMPLATE_IMPORT_FILE || 'Plantilla Plan';
      w.planImportedAt = new Date().toISOString();
      w.planSourceFingerprint = needsFingerprint();
      w.reportImported = false;
      w.reportFileName = '';
      w.reportImportedAt = '';
      w.reportSourceFingerprint = '';
      state.needFollowup = [];
      return;
    }

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
      const w = workflow();
      w.version = 4;
      w.reportImported = true;
      w.reportFileName = window.__DOCFORMACION_TEMPLATE_IMPORT_FILE || 'Plantilla Informe';
      w.reportImportedAt = new Date().toISOString();
      w.reportSourceFingerprint = planFingerprint(rows.length ? state.needPlan : []);
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
    const issues = (result.missing || []).map(text => ({
      kind:type === 'plan' ? 'plan-template' : 'report-template',
      text,
      view:type === 'plan' ? 'planificacion' : 'seguimiento'
    }));
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
    const w = workflow();
    const scope = type === 'plan' ? 'plan' : 'informe';
    const title = type === 'plan' ? 'Plan de Formación Docente' : 'Informe de Cumplimiento';
    const view = type === 'plan' ? 'planificacion' : 'seguimiento';
    const file = type === 'plan' ? w.planFileName : w.reportFileName;
    document.getElementById('content').innerHTML = `
      <div class="section-title"><div><h2>${esc(title)}</h2><p>La información variable se valida desde Excel y conserva la trazabilidad por CODIGO_DNF.</p></div></div>
      <div class="card canonical-template-card">
        <div class="dnf-template-card-head"><div><strong>Plantilla del período</strong><span>${file ? 'Cargada' : 'Pendiente'}</span></div><span class="status-badge ${status.ready ? 'ready' : 'blocked'}">${status.ready ? 'Lista' : 'Pendiente'}</span></div>
        <p>${rows.length} registro(s) vinculados por CODIGO_DNF.</p>
        ${file ? '<div class="small muted">Último archivo: ' + esc(file) + '</div>' : ''}
        ${templateButtons(scope, !!dependencyReady, rows.length > 0, view)}
      </div>
      <div class="status-card simple-doc-card single-document" style="margin-top:18px">
        <div class="status-head"><div class="missing-heading">${status.ready ? 'Documento completo' : 'Falta completar'}</div><span class="status-badge ${status.ready ? 'ready' : 'blocked'}">${status.ready ? 'Listo' : 'Pendiente'}</span></div>
        ${status.ready
          ? '<div class="ready-message">Toda la información necesaria está completa y validada para el período activo.</div><div class="doc-actions"><button class="primary" id="generateCurrent">Generar PDF</button></div>'
          : '<div class="issue-list">' + status.issues.map(issue => '<div class="issue-line"><div class="issue-line-text"><strong>' + esc(issue.text) + '</strong></div></div>').join('') + '</div>'}
      </div>`;
    bindButtons(document.getElementById('content'));
    const generate = document.getElementById('generateCurrent');
    if (generate) generate.onclick = () => generateDocument(type);
  };

  renderPlan = function canonicalWorkflowPlanView() {
    const rows = syncPlanRows();
    const status = documentStatus('plan');
    document.getElementById('content').innerHTML = `
      ${status.ready ? '<div class="alert-strip success"><div><strong>Plan listo</strong>Datos validados mediante plantilla Excel.</div></div>' : '<div class="alert-strip warning"><div><strong>Plan pendiente</strong>Completa o reemplaza la plantilla Excel del Plan.</div></div>'}
      <div class="section-title"><div><h2>Planificación por necesidades</h2><p>Vista de consulta. Las correcciones se realizan en Excel y se vuelven a subir.</p></div></div>
      <div class="card">${templateButtons('plan', window.docformacionValidation?.documentReadiness?.('dnf')?.ready, rows.length > 0, '')}</div>
      <div class="table-wrap" style="margin-top:16px">${rows.length ? '<table class="table"><thead><tr><th>Código DNF</th><th>Carrera</th><th>Necesidad</th><th>Prioridad</th><th>Acción</th><th>Modalidad</th><th>Cronograma</th><th>Indicador / Meta</th><th>Responsable / Apoyo</th></tr></thead><tbody>' + rows.map(row => '<tr><td><strong>' + esc(row.dnfCode) + '</strong></td><td>' + esc(row.career) + '</td><td>' + esc(row.needText) + '</td><td>' + esc(row.priority) + '</td><td>' + esc(row.action || '—') + '</td><td>' + esc(row.modality || '—') + '</td><td>' + esc((row.plannedStart || '—') + ' → ' + (row.plannedEnd || '—')) + '</td><td>' + esc(row.indicator || '—') + (row.targetPercent ? ' · ' + esc(row.targetPercent) + '%' : '') + '</td><td>' + esc(row.responsibleRole || '—') + '<br>' + esc(row.supportType || '—') + '</td></tr>').join('') + '</tbody></table>' : '<div class="empty">No existen necesidades DNF para planificar.</div>'}</div>`;
    bindButtons(document.getElementById('content'));
  };

  renderFollowup = function canonicalWorkflowFollowupView() {
    const rows = syncReportRows();
    const status = documentStatus('informe');
    document.getElementById('content').innerHTML = `
      ${status.ready ? '<div class="alert-strip success"><div><strong>Informe listo</strong>Seguimiento validado mediante plantilla Excel.</div></div>' : '<div class="alert-strip warning"><div><strong>Informe pendiente</strong>Completa o reemplaza la plantilla Excel del Informe.</div></div>'}
      <div class="section-title"><div><h2>Seguimiento por necesidad</h2><p>Vista de consulta. Las correcciones se realizan en Excel y se vuelven a subir.</p></div></div>
      <div class="card">${templateButtons('informe', window.docformacionValidation?.documentReadiness?.('plan')?.ready, rows.length > 0, '')}</div>
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
  syncPlanRows();
  syncReportRows();
  window.docformacionWorkflow = Object.freeze({
    syncPlanRows,
    syncReportRows,
    needsFingerprint,
    planFingerprint,
    state:workflow
  });
})();
