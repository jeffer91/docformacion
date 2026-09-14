(() => {
  'use strict';

  const SHEET = 'MATRIZ';
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

  function policy() {
    if (!window.docformacionPlanPolicy) throw new Error('No se cargó la política institucional del Plan.');
    return window.docformacionPlanPolicy;
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

  function planWorkbook(includeData) {
    const rows = planRows();
    const fill = !!includeData;
    return {
      filename:(fill ? 'UGPA_Datos_Actuales_Plan_' : 'UGPA_Plantilla_Plan_') + periodSlug() + '.xlsx',
      sheets:[simpleSheet(
        SHEET,
        ['CODIGO_DNF','CARRERA','NECESIDAD','PRIORIDAD','ACCION_FORMACION','NIVEL_FORMACION','PROGRAMA_TITULO'],
        [
          'Código heredado de la DNF. No modificar.',
          'Carrera heredada de la DNF. No modificar.',
          'Necesidad heredada de la DNF. No modificar.',
          'Prioridad heredada de la DNF. No modificar.',
          'Acción o formación académica proyectada para atender la necesidad.',
          'Tecnología Superior, Tecnología Universitaria, Ingeniería, Licenciatura, Maestría o Doctorado.',
          'Nombre del programa o título académico proyectado. Debe corresponder a formación reconocida u homologable en Ecuador.'
        ],
        rows.map(row => [
          row.dnfCode,
          row.career,
          row.needText,
          row.priority,
          fill ? row.action : '',
          fill ? row.formationLevel : '',
          fill ? row.projectedProgram : ''
        ]),
        [18,32,54,14,50,28,54]
      )]
    };
  }

  const previousExcelTemplatePayload = excelTemplatePayload;
  excelTemplatePayload = function simplifiedPlanTemplate(scope, includeData) {
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

  function traceError(raw, expected) {
    if (key(raw.CARRERA) !== key(expected.career)) return 'CARRERA no coincide con la DNF';
    if (key(raw.NECESIDAD) !== key(expected.needText)) return 'NECESIDAD no coincide con la DNF';
    if (key(raw.PRIORIDAD) !== key(expected.priority)) return 'PRIORIDAD no coincide con la DNF';
    return '';
  }

  const previousAnalyzeExcelImport = analyzeExcelImport;
  analyzeExcelImport = function simplifiedPlanAnalyze(scope, result, type = '', kind = '') {
    if (kind || scope !== 'plan') return previousAnalyzeExcelImport(scope, result, type, kind);

    const sheets = result?.sheets || {};
    const detected = Object.keys(sheets).filter(name => Array.isArray(sheets[name]) && sheets[name].length);
    const imported = meaningfulRows(sheets[SHEET]);
    const expected = planRows();
    const expectedByCode = new Map(expected.map(row => [clean(row.dnfCode).toUpperCase(), row]));
    const sourceReady = window.docformacionValidation?.documentReadiness?.('dnf')?.ready;
    const errors = [];
    const preview = [];
    const safeRows = [];
    const seen = new Set();

    if (!sourceReady) errors.push('Primero debe estar completa la DNF del período.');
    if (!detected.includes(SHEET)) errors.push('La plantilla debe contener la hoja MATRIZ.');
    const extras = detected.filter(name => name !== SHEET);
    if (extras.length) errors.push('El Plan utiliza una sola matriz. Retira las otras hojas: ' + extras.join(', ') + '.');

    imported.forEach((raw, index) => {
      const code = clean(raw.CODIGO_DNF).toUpperCase();
      const expectedRow = expectedByCode.get(code);
      let reason = '';
      let safe = null;

      if (!code) reason = 'Falta CODIGO_DNF';
      else if (!expectedRow) reason = 'CODIGO_DNF no pertenece al período activo';
      else if (seen.has(code)) reason = 'CODIGO_DNF duplicado';
      else reason = traceError(raw, expectedRow);

      if (!reason) {
        const action = clean(raw.ACCION_FORMACION);
        const level = policy().normalizeLevel(raw.NIVEL_FORMACION);
        const projectedProgram = clean(raw.PROGRAMA_TITULO);
        if (!action) reason = 'Falta ACCION_FORMACION';
        else if (!level) reason = 'NIVEL_FORMACION no es válido';
        else if (!projectedProgram) reason = 'Falta PROGRAMA_TITULO';
        else safe = {
          CODIGO_DNF:expectedRow.dnfCode,
          CARRERA:expectedRow.career,
          NECESIDAD:expectedRow.needText,
          PRIORIDAD:expectedRow.priority,
          ACCION_FORMACION:action,
          NIVEL_FORMACION:level,
          PROGRAMA_TITULO:projectedProgram
        };
      }

      if (reason) {
        preview.push({ id:'plan-row-' + index, sheet:SHEET, row:raw, status:'Error', valid:false, optional:false, reason });
      } else {
        seen.add(code);
        safeRows.push(safe);
        preview.push({ id:'plan-row-' + index, sheet:SHEET, row:safe, status:'Aplicar', valid:true, optional:false, reason:'Formación proyectada válida' });
      }
    });

    const missing = expected.filter(row => !seen.has(clean(row.dnfCode).toUpperCase()));
    if (missing.length) errors.push('Faltan ' + missing.length + ' código(s) del período: ' + missing.slice(0, 12).map(row => row.dnfCode).join(', ') + (missing.length > 12 ? '…' : '') + '.');
    const bad = preview.filter(item => !item.valid).length;
    if (bad) errors.push('La matriz contiene ' + bad + ' fila(s) con errores. No se aplicará parcialmente.');
    if (!safeRows.length && !errors.length) errors.push('No se encontraron registros válidos.');
    const validRows = preview.filter(item => item.valid).length;

    return {
      context:{ label:'Plan de Formación · Formación proyectada', scope:'plan', kind:'' },
      filePath:result?.filePath || 'Archivo Excel',
      detected,
      allowed:[SHEET],
      compatibleSheets:detected.includes(SHEET) ? [SHEET] : [],
      incompatibleSheets:detected.filter(name => name !== SHEET),
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
      safeSheets:errors.length ? {} : { [SHEET]:safeRows },
      optionalById:{},
      preview:preview.slice(0, 80),
      mismatch:false,
      detectedDestination:null
    };
  };

  const previousApplyExcel = applyExcel;
  applyExcel = function simplifiedPlanApply(sheets) {
    const scope = window.__DOCFORMACION_TEMPLATE_IMPORT_SCOPE;
    if (scope !== 'plan' || !Array.isArray(sheets?.[SHEET])) return previousApplyExcel(sheets);

    const rows = planRows();
    const byCode = new Map(rows.map(row => [clean(row.dnfCode).toUpperCase(), row]));
    sheets[SHEET].forEach(raw => {
      const row = byCode.get(clean(raw.CODIGO_DNF).toUpperCase());
      if (!row) return;
      row.action = clean(raw.ACCION_FORMACION);
      row.formationLevel = policy().normalizeLevel(raw.NIVEL_FORMACION);
      row.projectedProgram = clean(raw.PROGRAMA_TITULO);
      Object.assign(row, policy().applyDefaults(row));
      row.modality = '';
      row.plannedStart = '';
      row.plannedEnd = '';
      row.observations = '';
    });

    state.needPlan = rows;
    const value = workflowApi().state();
    value.planImported = true;
    value.planFileName = window.__DOCFORMACION_TEMPLATE_IMPORT_FILE || 'Matriz de Formación Proyectada';
    value.planImportedAt = new Date().toISOString();
    value.planSourceFingerprint = workflowApi().needsFingerprint();
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

  function durationText(row) {
    const value = Number(row.durationYears || policy().durationForLevel(row.formationLevel) || 0);
    return value ? String(value).replace('.', ',') + ' años' : '—';
  }

  function planTable(group) {
    return `<div class="plan-small-table table-wrap"><table class="table"><thead><tr>
      <th>Código</th><th>Necesidad</th><th>Prioridad</th><th>Acción</th><th>Nivel</th><th>Programa / título</th><th>Duración</th>
    </tr></thead><tbody>${group.rows.map(row => `<tr>
      <td><strong>${html(row.dnfCode)}</strong></td><td>${html(row.needText)}</td><td>${html(row.priority)}</td><td>${html(row.action || '—')}</td>
      <td>${html(row.formationLevel || '—')}</td><td>${html(row.projectedProgram || '—')}</td><td>${html(durationText(row))}</td>
    </tr>`).join('')}</tbody></table></div>`;
  }

  function bindPlanToolbar(root) {
    root.querySelector('[data-plan-template]')?.addEventListener('click', () => exportTemplate('plan', false));
    root.querySelector('[data-plan-current]')?.addEventListener('click', () => exportTemplate('plan', true));
    root.querySelector('[data-plan-import]')?.addEventListener('click', () => importExcel('plan'));
  }

  renderPlan = function simplifiedPlanView() {
    const rows = planRows();
    const groups = groupByCareer(rows);
    const matrix = window.docformacionValidation?.planMatrixState?.(window.docformacionDocumentContext?.build?.(), 'matrix') || { ready:false };
    const dnfReady = !!window.docformacionValidation?.documentReadiness?.('dnf')?.ready;
    const root = document.getElementById('content');
    root.innerHTML = `
      <div class="section-title"><div><h2>Formación proyectada</h2><p>Solo se cargan los datos académicos que cambian por necesidad. El resto es institucional y automático.</p></div></div>
      <div class="card plan-matrix-template-card">
        <div class="plan-matrix-template-summary"><div><strong>Matriz del Plan</strong><span>${rows.length} necesidades · ${groups.length} carreras</span></div><span class="status-badge ${matrix.ready ? 'ready' : 'pending'}">${matrix.ready ? 'Lista' : 'Pendiente'}</span></div>
        <div class="toolbar excel-toolbar plan-matrix-toolbar">
          <button type="button" class="secondary" data-plan-template ${dnfReady ? '' : 'disabled'}>Descargar plantilla</button>
          <button type="button" class="secondary" data-plan-current ${dnfReady && rows.length ? '' : 'disabled'}>Datos actuales</button>
          <button type="button" class="primary" data-plan-import ${dnfReady ? '' : 'disabled'}>Subir / reemplazar</button>
        </div>
      </div>
      <div class="plan-career-list">${groups.map((group, index) => `<details class="plan-career-group"${index === 0 ? ' open' : ''}><summary><span><strong>${html(group.name)}</strong><small>${group.rows.length} necesidad(es)</small></span></summary><div class="plan-career-content">${planTable(group)}</div></details>`).join('')}</div>`;
    bindPlanToolbar(root);
  };

  function injectStyles() {
    if (document.getElementById('planMatricesStyles')) return;
    const style = document.createElement('style');
    style.id = 'planMatricesStyles';
    style.textContent = `
      .plan-matrix-template-card{display:flex;flex-direction:column;gap:12px}.plan-matrix-template-summary{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}.plan-matrix-template-summary>div{display:flex;flex-direction:column;gap:3px}.plan-matrix-template-summary span{font-size:12px;color:var(--muted,#667085)}
      .plan-career-list{display:grid;gap:12px;margin-top:16px}.plan-career-group{background:#fff;border:1px solid #e5e9f0;border-radius:12px;overflow:hidden}.plan-career-group>summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px}.plan-career-group>summary::-webkit-details-marker{display:none}.plan-career-group summary small{display:block;color:var(--muted,#667085);font-size:11px;font-weight:400}.plan-career-content{padding:0 16px 16px;border-top:1px solid #eef1f5}.plan-small-table{margin-top:14px;border:1px solid #edf0f4;border-radius:9px;overflow:auto}.plan-small-table .table{margin:0;min-width:960px}.plan-small-table th,.plan-small-table td{font-size:11px;padding:8px 9px;vertical-align:top}.plan-matrix-toolbar{margin:0;flex-wrap:wrap}.plan-matrix-toolbar button{white-space:nowrap}
      @media(max-width:760px){.plan-matrix-template-summary,.plan-career-group>summary{align-items:flex-start}.plan-matrix-toolbar button{flex:1 1 180px}.plan-career-content{padding-left:10px;padding-right:10px}}
    `;
    document.head.appendChild(style);
  }

  injectStyles();
  window.docformacionPlanMatrices = Object.freeze({ sheet:SHEET, planWorkbook, groupByCareer, durationText });
})();