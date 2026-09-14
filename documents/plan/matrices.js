(() => {
  'use strict';

  const SHEETS = Object.freeze(['MATRIZ', 'INDICADORES', 'RECURSOS']);
  const MODALITIES = ['Presencial', 'Virtual', 'Híbrida'];
  const SUPPORTS = ['Sin apoyo económico', 'Económico', 'Convenio / beca', 'Gestión interna'];
  const clean = value => String(value ?? '').trim();
  const key = value => clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ');
  const html = value => typeof esc === 'function'
    ? esc(value)
    : clean(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));

  function workflowApi() {
    if (!window.docformacionWorkflow) throw new Error('No se cargó el flujo canónico del Plan.');
    return window.docformacionWorkflow;
  }

  function planRows() {
    return workflowApi().syncPlanRows();
  }

  function periodSlug() {
    return window.docformacionModel?.periodId || 'periodo';
  }

  function simpleSheet(name, headers, descriptions, rows, widths) {
    return { name, headers, descriptions, rows:rows?.length ? rows : [headers.map(() => '')], widths };
  }

  function trace(row) {
    return [row.dnfCode, row.career, row.needText, row.priority];
  }

  function planWorkbook(includeData) {
    const rows = planRows();
    const fill = !!includeData;
    return {
      filename:(fill ? 'UGPA_Datos_Actuales_Plan_' : 'UGPA_Plantilla_Plan_') + periodSlug() + '.xlsx',
      sheets:[
        simpleSheet(
          'MATRIZ',
          ['CODIGO_DNF','CARRERA','NECESIDAD','PRIORIDAD','ACCION_FORMACION','MODALIDAD','INICIO_PLANIFICADO','FIN_PLANIFICADO'],
          ['Código heredado de la DNF. No modificar.','Carrera heredada de la DNF. No modificar.','Necesidad heredada de la DNF. No modificar.','Prioridad heredada de la DNF. No modificar.','Acción institucional que atenderá la necesidad.','Presencial, Virtual o Híbrida.','Mes/año AAAA-MM.','Mes/año AAAA-MM.'],
          rows.map(row => [...trace(row), fill ? row.action : '', fill ? row.modality : '', fill ? row.plannedStart : '', fill ? row.plannedEnd : '']),
          [18,32,54,14,54,16,18,18]
        ),
        simpleSheet(
          'INDICADORES',
          ['CODIGO_DNF','CARRERA','NECESIDAD','PRIORIDAD','INDICADOR','META_PORCENTAJE','MEDIO_VERIFICACION','RESPONSABLE_INSTITUCIONAL'],
          ['Código heredado de la DNF. No modificar.','Carrera heredada de la DNF. No modificar.','Necesidad heredada de la DNF. No modificar.','Prioridad heredada de la DNF. No modificar.','Indicador de cumplimiento.','Meta entre 1 y 100.','Documento o evidencia de verificación.','Unidad, área o cargo institucional responsable.'],
          rows.map(row => [...trace(row), fill ? row.indicator : '', fill ? (row.targetPercent || '') : '', fill ? row.evidence : '', fill ? row.responsibleRole : '']),
          [18,32,54,14,42,16,46,38]
        ),
        simpleSheet(
          'RECURSOS',
          ['CODIGO_DNF','CARRERA','NECESIDAD','PRIORIDAD','TIPO_APOYO','MONTO_APOYO','OBSERVACIONES'],
          ['Código heredado de la DNF. No modificar.','Carrera heredada de la DNF. No modificar.','Necesidad heredada de la DNF. No modificar.','Prioridad heredada de la DNF. No modificar.','Sin apoyo económico, Económico, Convenio / beca o Gestión interna.','Monto numérico solo si TIPO_APOYO es Económico.','Observación opcional.'],
          rows.map(row => [...trace(row), fill ? row.supportType : '', fill ? (row.supportAmount || '') : '', fill ? row.observations : '']),
          [18,32,54,14,24,18,44]
        )
      ]
    };
  }

  const previousExcelTemplatePayload = excelTemplatePayload;
  excelTemplatePayload = function planMatricesTemplate(scope, includeData) {
    if (scope === 'plan') return planWorkbook(includeData);
    return previousExcelTemplatePayload(scope, includeData);
  };

  function meaningfulRows(rows) {
    return (Array.isArray(rows) ? rows : []).filter(raw => {
      if (!Object.values(raw || {}).some(value => clean(value))) return false;
      const code = clean(raw?.CODIGO_DNF);
      return code && !/^\[?INSTRUCCIONES/i.test(code);
    });
  }

  function buildSheetMap(sheetName, rows, expectedByCode, errors) {
    const map = new Map();
    meaningfulRows(rows).forEach((raw, index) => {
      const code = clean(raw.CODIGO_DNF).toUpperCase();
      if (!code) {
        errors.push(sheetName + ': fila ' + (index + 3) + ' sin CODIGO_DNF.');
        return;
      }
      if (!expectedByCode.has(code)) {
        errors.push(sheetName + ': ' + code + ' no pertenece al período activo.');
        return;
      }
      if (map.has(code)) {
        errors.push(sheetName + ': ' + code + ' está duplicado.');
        return;
      }
      map.set(code, raw);
    });
    return map;
  }

  function traceError(raw, expected) {
    if (key(raw.CARRERA) !== key(expected.career)) return 'CARRERA no coincide con la DNF';
    if (key(raw.NECESIDAD) !== key(expected.needText)) return 'NECESIDAD no coincide con la DNF';
    if (key(raw.PRIORIDAD) !== key(expected.priority)) return 'PRIORIDAD no coincide con la DNF';
    return '';
  }

  function normalizePlanRow(expected, matrix, indicators, resources) {
    const modality = MODALITIES.find(value => key(value) === key(matrix.MODALIDAD)) || '';
    const supportType = SUPPORTS.find(value => key(value) === key(resources.TIPO_APOYO)) || '';
    const targetPercent = Number(String(indicators.META_PORCENTAJE ?? '').replace(',', '.'));
    const supportAmount = Number(String(resources.MONTO_APOYO ?? '').replace(',', '.'));
    return {
      dnfCode:expected.dnfCode,
      career:expected.career,
      needText:expected.needText,
      priority:expected.priority,
      action:clean(matrix.ACCION_FORMACION),
      modality,
      plannedStart:clean(matrix.INICIO_PLANIFICADO),
      plannedEnd:clean(matrix.FIN_PLANIFICADO),
      indicator:clean(indicators.INDICADOR),
      targetPercent:Number.isFinite(targetPercent) ? targetPercent : 0,
      evidence:clean(indicators.MEDIO_VERIFICACION),
      responsibleRole:clean(indicators.RESPONSABLE_INSTITUCIONAL),
      supportType,
      supportAmount:supportType === 'Económico' && Number.isFinite(supportAmount) ? supportAmount : 0,
      observations:clean(resources.OBSERVACIONES)
    };
  }

  function safeSheets(rows) {
    return {
      MATRIZ: rows.map(row => ({
        CODIGO_DNF:row.dnfCode,CARRERA:row.career,NECESIDAD:row.needText,PRIORIDAD:row.priority,
        ACCION_FORMACION:row.action,MODALIDAD:row.modality,INICIO_PLANIFICADO:row.plannedStart,FIN_PLANIFICADO:row.plannedEnd
      })),
      INDICADORES: rows.map(row => ({
        CODIGO_DNF:row.dnfCode,CARRERA:row.career,NECESIDAD:row.needText,PRIORIDAD:row.priority,
        INDICADOR:row.indicator,META_PORCENTAJE:row.targetPercent,MEDIO_VERIFICACION:row.evidence,
        RESPONSABLE_INSTITUCIONAL:row.responsibleRole
      })),
      RECURSOS: rows.map(row => ({
        CODIGO_DNF:row.dnfCode,CARRERA:row.career,NECESIDAD:row.needText,PRIORIDAD:row.priority,
        TIPO_APOYO:row.supportType,MONTO_APOYO:row.supportAmount,OBSERVACIONES:row.observations
      }))
    };
  }

  const previousAnalyzeExcelImport = analyzeExcelImport;
  analyzeExcelImport = function planMatricesAnalyze(scope, result, type = '', kind = '') {
    if (kind || scope !== 'plan') return previousAnalyzeExcelImport(scope, result, type, kind);

    const sheets = result?.sheets || {};
    const detected = Object.keys(sheets).filter(name => Array.isArray(sheets[name]) && sheets[name].length);
    const hasSeparated = SHEETS.some(name => detected.includes(name));
    if (!hasSeparated && detected.includes('PLAN')) {
      // Compatibilidad con las plantillas antiguas de una sola matriz.
      return previousAnalyzeExcelImport(scope, result, type, kind);
    }

    const expected = planRows();
    const expectedByCode = new Map(expected.map(row => [clean(row.dnfCode).toUpperCase(), row]));
    const errors = [];
    const preview = [];
    const normalized = [];
    const sourceReady = window.docformacionValidation?.documentReadiness?.('dnf')?.ready;

    if (!sourceReady) errors.push('Primero debe estar completa la DNF del período.');
    SHEETS.forEach(name => {
      if (!detected.includes(name)) errors.push('Falta la matriz ' + name + '.');
    });
    const extras = detected.filter(name => !SHEETS.includes(name));
    if (extras.length) errors.push('La plantilla del Plan debe contener únicamente MATRIZ, INDICADORES y RECURSOS. Retira: ' + extras.join(', ') + '.');

    const maps = {};
    SHEETS.forEach(name => { maps[name] = buildSheetMap(name, sheets[name], expectedByCode, errors); });

    expected.forEach((expectedRow, index) => {
      const code = clean(expectedRow.dnfCode).toUpperCase();
      const matrix = maps.MATRIZ.get(code);
      const indicators = maps.INDICADORES.get(code);
      const resources = maps.RECURSOS.get(code);
      const missingSheets = [];
      if (!matrix) missingSheets.push('MATRIZ');
      if (!indicators) missingSheets.push('INDICADORES');
      if (!resources) missingSheets.push('RECURSOS');
      let reason = missingSheets.length ? 'Falta ' + missingSheets.join(', ') : '';

      if (!reason) {
        for (const raw of [matrix, indicators, resources]) {
          reason = traceError(raw, expectedRow);
          if (reason) break;
        }
      }

      let row = null;
      if (!reason) {
        row = normalizePlanRow(expectedRow, matrix, indicators, resources);
        const missing = window.docformacionValidation?.planRowMissing?.(row) || [];
        if (missing.length) reason = 'Completa o corrige: ' + missing.join(', ');
      }

      if (reason) {
        preview.push({
          id:'plan-matrix-' + index,
          sheet:'Plan',
          row:{ CODIGO_DNF:expectedRow.dnfCode, CARRERA:expectedRow.career, NECESIDAD:expectedRow.needText },
          status:'Error',valid:false,optional:false,reason
        });
      } else {
        normalized.push(row);
        preview.push({
          id:'plan-matrix-' + index,
          sheet:'Plan',
          row:{
            CODIGO_DNF:row.dnfCode,CARRERA:row.career,ACCION_FORMACION:row.action,
            INDICADOR:row.indicator,TIPO_APOYO:row.supportType
          },
          status:'Aplicar',valid:true,optional:false,reason:'Las tres matrices coinciden y están completas'
        });
      }
    });

    const bad = preview.filter(item => !item.valid).length;
    if (bad) errors.push('Hay ' + bad + ' necesidad(es) con datos faltantes o inconsistentes entre las tres matrices. No se aplicará parcialmente.');
    if (!normalized.length && !errors.length) errors.push('No se encontraron registros válidos.');
    const validRows = preview.filter(item => item.valid).length;

    return {
      context:{ label:'Plan de Formación · 3 matrices', scope:'plan', kind:'' },
      filePath:result?.filePath || 'Archivo Excel',
      detected,
      allowed:[...SHEETS],
      compatibleSheets:detected.filter(name => SHEETS.includes(name)),
      incompatibleSheets:detected.filter(name => !SHEETS.includes(name)),
      totalRows:preview.length,
      validRows,
      optionalRows:0,
      ignoredRows:0,
      errorRows:bad,
      matchedRows:validRows,
      expectedCount:expected.length,
      statusCounts:{ Aplicar:validRows,Actualizar:0,'Actualizar opcional':0,'Ya completo':0,'Sin cambios':0,Omitir:0,Error:bad },
      errors,
      warnings:[],
      safeSheets:errors.length ? {} : safeSheets(normalized),
      optionalById:{},
      preview:preview.slice(0, 80),
      mismatch:false,
      detectedDestination:null
    };
  };

  const previousApplyExcel = applyExcel;
  applyExcel = function planMatricesApply(sheets) {
    const scope = window.__DOCFORMACION_TEMPLATE_IMPORT_SCOPE;
    const hasSeparated = scope === 'plan' && SHEETS.every(name => Array.isArray(sheets?.[name]));
    if (!hasSeparated) return previousApplyExcel(sheets);

    const rows = planRows();
    const byCode = new Map(rows.map(row => [clean(row.dnfCode).toUpperCase(), row]));
    const matrixMap = new Map(sheets.MATRIZ.map(raw => [clean(raw.CODIGO_DNF).toUpperCase(), raw]));
    const indicatorMap = new Map(sheets.INDICADORES.map(raw => [clean(raw.CODIGO_DNF).toUpperCase(), raw]));
    const resourcesMap = new Map(sheets.RECURSOS.map(raw => [clean(raw.CODIGO_DNF).toUpperCase(), raw]));

    byCode.forEach((row, code) => {
      const matrix = matrixMap.get(code);
      const indicators = indicatorMap.get(code);
      const resources = resourcesMap.get(code);
      if (!matrix || !indicators || !resources) return;
      row.action = clean(matrix.ACCION_FORMACION);
      row.modality = clean(matrix.MODALIDAD);
      row.plannedStart = clean(matrix.INICIO_PLANIFICADO);
      row.plannedEnd = clean(matrix.FIN_PLANIFICADO);
      row.indicator = clean(indicators.INDICADOR);
      row.targetPercent = Number(indicators.META_PORCENTAJE || 0);
      row.evidence = clean(indicators.MEDIO_VERIFICACION);
      row.responsibleRole = clean(indicators.RESPONSABLE_INSTITUCIONAL);
      row.supportType = clean(resources.TIPO_APOYO);
      row.supportAmount = Number(resources.MONTO_APOYO || 0);
      row.observations = clean(resources.OBSERVACIONES);
    });

    state.needPlan = rows;
    const api = workflowApi();
    const value = api.state();
    value.planImported = true;
    value.planFileName = window.__DOCFORMACION_TEMPLATE_IMPORT_FILE || 'Plantilla Plan · 3 matrices';
    value.planImportedAt = new Date().toISOString();
    value.planSourceFingerprint = api.needsFingerprint();
    value.reportImported = false;
    value.reportFileName = '';
    value.reportImportedAt = '';
    value.reportSourceFingerprint = '';
    state.needFollowup = [];
  };

  function groupByCareer(rows) {
    const groups = [];
    const byName = new Map();
    rows.forEach(row => {
      const name = clean(row.career) || 'Sin carrera';
      if (!byName.has(name)) {
        const group = { name, rows:[] };
        groups.push(group);
        byName.set(name, group);
      }
      byName.get(name).rows.push(row);
    });
    return groups;
  }

  function table(headers, rows, className = '') {
    return '<div class="plan-small-table table-wrap ' + className + '"><table class="table"><thead><tr>' +
      headers.map(value => '<th>' + html(value) + '</th>').join('') +
      '</tr></thead><tbody>' + rows.map(cells => '<tr>' + cells.map(value => '<td>' + value + '</td>').join('') + '</tr>').join('') +
      '</tbody></table></div>';
  }

  function careerMatrices(group, open) {
    const rows = group.rows;
    const pending = rows.filter(row => (window.docformacionValidation?.planRowMissing?.(row) || []).length).length;
    const matrixRows = rows.map(row => [
      '<strong>' + html(row.dnfCode) + '</strong>', html(row.needText), html(row.priority), html(row.action || '—'),
      html(row.modality || '—'), html(row.plannedStart || '—'), html(row.plannedEnd || '—')
    ]);
    const indicatorRows = rows.map(row => [
      '<strong>' + html(row.dnfCode) + '</strong>', html(row.indicator || '—'), row.targetPercent ? html(row.targetPercent) + '%' : '—',
      html(row.evidence || '—'), html(row.responsibleRole || '—')
    ]);
    const resourceRows = rows.map(row => [
      '<strong>' + html(row.dnfCode) + '</strong>', html(row.supportType || '—'),
      row.supportType === 'Económico' && Number(row.supportAmount || 0) > 0
        ? 'USD ' + Number(row.supportAmount || 0).toLocaleString('es-EC', { minimumFractionDigits:2, maximumFractionDigits:2 })
        : '—',
      html(row.observations || '—')
    ]);

    return '<details class="plan-career-group"' + (open ? ' open' : '') + '>' +
      '<summary><span><strong>' + html(group.name) + '</strong><small>' + rows.length + ' necesidad(es)</small></span>' +
      '<span class="status-badge ' + (pending ? 'pending' : 'ready') + '">' + (pending ? pending + ' pendiente(s)' : 'Completa') + '</span></summary>' +
      '<div class="plan-career-content">' +
        '<section class="plan-matrix-block"><h3>Matriz del Plan</h3>' +
          table(['Código','Necesidad','Prioridad','Acción','Modalidad','Inicio','Fin'], matrixRows, 'plan-table-main') + '</section>' +
        '<section class="plan-matrix-block"><h3>Indicadores y verificación</h3>' +
          table(['Código','Indicador','Meta','Medio de verificación','Responsable'], indicatorRows) + '</section>' +
        '<section class="plan-matrix-block"><h3>Recursos y apoyos</h3>' +
          table(['Código','Tipo de apoyo','Monto','Observaciones'], resourceRows) + '</section>' +
      '</div></details>';
  }

  function planToolbar(enabled, hasCurrent) {
    return '<div class="toolbar excel-toolbar plan-matrix-toolbar">' +
      '<button type="button" class="secondary" data-plan-matrix-template' + (enabled ? '' : ' disabled') + '>Descargar plantilla</button>' +
      '<button type="button" class="secondary" data-plan-matrix-current' + (enabled && hasCurrent ? '' : ' disabled') + '>Descargar datos actuales</button>' +
      '<button type="button" class="primary" data-plan-matrix-import' + (enabled ? '' : ' disabled') + '>Subir / reemplazar</button>' +
    '</div>';
  }

  function bindPlanToolbar(root) {
    root.querySelector('[data-plan-matrix-template]')?.addEventListener('click', () => exportTemplate('plan', false));
    root.querySelector('[data-plan-matrix-current]')?.addEventListener('click', () => exportTemplate('plan', true));
    root.querySelector('[data-plan-matrix-import]')?.addEventListener('click', () => importExcel('plan'));
  }

  renderPlan = function planMatricesView() {
    const rows = planRows();
    const groups = groupByCareer(rows);
    const status = window.docformacionValidation?.documentReadiness?.('plan') || { ready:false, missing:[] };
    const dnfReady = !!window.docformacionValidation?.documentReadiness?.('dnf')?.ready;
    const root = document.getElementById('content');
    root.innerHTML = `
      <div class="section-title plan-matrix-title"><div><h2>Planificación por matrices</h2><p>Matriz, Indicadores y Recursos se gestionan por separado y se vinculan por CODIGO_DNF.</p></div></div>
      <div class="card plan-matrix-template-card">
        <div class="plan-matrix-template-summary"><div><strong>Plantilla Excel</strong><span>3 matrices · ${rows.length} necesidades · ${groups.length} carreras</span></div><span class="status-badge ${status.ready ? 'ready' : 'pending'}">${status.ready ? 'Lista' : 'Pendiente'}</span></div>
        ${planToolbar(dnfReady, rows.length > 0)}
      </div>
      <div class="plan-career-list">
        ${groups.length ? groups.map((group, index) => careerMatrices(group, index === 0)).join('') : '<div class="empty">No existen necesidades DNF para planificar.</div>'}
      </div>`;
    bindPlanToolbar(root);
  };

  const previousRenderers = window.docformacionSectionRenderers;
  if (previousRenderers?.render) {
    window.docformacionSectionRenderers = Object.freeze({
      render(type, section, writer, context) {
        if (type === 'plan' && section?.id === 'PLAN-04-matriz') {
          const rows = context.plan || [];
          writer.table(
            ['Código','Carrera','Necesidad','Prioridad','Acción','Modalidad','Inicio - Fin'],
            rows.map(row => [row.dnfCode,row.career,row.needText,row.priority,row.action,row.modality,(row.plannedStart || '—') + ' - ' + (row.plannedEnd || '—')]),
            [12,17,24,9,20,9,9]
          );
          return;
        }
        if (type === 'plan' && section?.id === 'PLAN-05-indicadores') {
          const rows = context.plan || [];
          writer.table(
            ['Código','Indicador','Meta','Medio de verificación','Responsable'],
            rows.map(row => [row.dnfCode,row.indicator || '—',row.targetPercent ? row.targetPercent + '%' : '—',row.evidence || '—',row.responsibleRole || '—']),
            [14,24,10,28,24]
          );
          return;
        }
        return previousRenderers.render(type, section, writer, context);
      }
    });
  }

  function injectStyles() {
    if (document.getElementById('planMatricesStyles')) return;
    const style = document.createElement('style');
    style.id = 'planMatricesStyles';
    style.textContent = `
      .plan-matrix-template-card{display:flex;flex-direction:column;gap:12px}.plan-matrix-template-summary{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.plan-matrix-template-summary>div{display:flex;flex-direction:column;gap:3px}.plan-matrix-template-summary span{font-size:12px;color:var(--muted,#667085)}
      .plan-career-list{display:grid;gap:12px;margin-top:16px}.plan-career-group{background:#fff;border:1px solid #e5e9f0;border-radius:12px;overflow:hidden}.plan-career-group>summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px}.plan-career-group>summary::-webkit-details-marker{display:none}.plan-career-group>summary>span:first-child{display:flex;flex-direction:column;gap:2px}.plan-career-group summary small{color:var(--muted,#667085);font-size:11px;font-weight:400}.plan-career-content{display:grid;gap:16px;padding:0 16px 16px;border-top:1px solid #eef1f5}.plan-matrix-block{padding-top:14px}.plan-matrix-block h3{font-size:13px;margin:0 0 8px}.plan-small-table{margin:0;border:1px solid #edf0f4;border-radius:9px;overflow:auto}.plan-small-table .table{margin:0;min-width:680px}.plan-small-table th,.plan-small-table td{font-size:11px;padding:8px 9px;vertical-align:top}.plan-table-main .table{min-width:880px}.plan-matrix-toolbar{margin:0;flex-wrap:wrap}.plan-matrix-toolbar button{white-space:nowrap}
      @media(max-width:760px){.plan-matrix-template-summary,.plan-career-group>summary{align-items:flex-start}.plan-matrix-toolbar button{flex:1 1 180px}.plan-career-content{padding-left:10px;padding-right:10px}}
    `;
    document.head.appendChild(style);
  }

  injectStyles();
  window.docformacionPlanMatrices = Object.freeze({ sheets:[...SHEETS], planWorkbook, groupByCareer });
})();
