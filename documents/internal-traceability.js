(() => {
  'use strict';

  const clean = value => String(value ?? '').trim();
  const key = value => clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ');

  function traceKey(career, need) {
    return key(career) + '|' + key(need);
  }

  function stableNeedId(career, need) {
    const source = traceKey(career, need);
    let hash = 2166136261;
    for (let i = 0; i < source.length; i += 1) {
      hash ^= source.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return 'need_' + (hash >>> 0).toString(36);
  }

  function simpleSheet(name, headers, descriptions, rows, widths) {
    return { name, headers, descriptions, rows:rows?.length ? rows : [headers.map(() => '')], widths };
  }

  function periodSlug() {
    return window.docformacionModel?.periodId || 'periodo';
  }

  function planRows() {
    return window.docformacionWorkflow?.syncPlanRows?.() || [];
  }

  function reportRows() {
    return window.docformacionWorkflow?.syncReportRows?.() || [];
  }

  function policy() {
    return window.docformacionPlanPolicy || {};
  }

  function stripCodeField(row) {
    if (!row || typeof row !== 'object') return row;
    const copy = { ...row };
    delete copy.CODIGO_DNF;
    delete copy.CODIGO;
    delete copy.Codigo;
    delete copy.codigo;
    return copy;
  }

  function stripCodeColumn(sheet) {
    if (!sheet?.headers?.length) return sheet;
    const index = sheet.headers.findIndex(header => key(header).replace(/_/g, ' ') === 'codigo dnf');
    if (index < 0) return sheet;
    const removeAt = values => (values || []).filter((_value, position) => position !== index);
    return {
      ...sheet,
      headers:removeAt(sheet.headers),
      descriptions:removeAt(sheet.descriptions),
      rows:(sheet.rows || []).map(removeAt),
      widths:removeAt(sheet.widths)
    };
  }

  // El código DNF deja de formar parte del contrato visible de Excel. Archivos antiguos
  // que todavía lo incluyan siguen siendo compatibles, pero las nuevas plantillas no lo exponen.
  const previousExcelTemplatePayload = excelTemplatePayload;
  excelTemplatePayload = function internalTraceabilityTemplate(scope, includeData) {
    if (scope === 'plan') {
      const rows = planRows();
      return {
        filename:(includeData ? 'UGPA_Datos_Actuales_Plan_' : 'UGPA_Plantilla_Plan_') + periodSlug() + '.xlsx',
        sheets:[simpleSheet(
          'MATRIZ',
          ['CARRERA','NECESIDAD','PRIORIDAD','ACCION_FORMACION','NIVEL_FORMACION','PROGRAMA_TITULO'],
          [
            'Carrera heredada de la DNF. No modificar.',
            'Necesidad heredada de la DNF. No modificar.',
            'Prioridad heredada de la DNF. No modificar.',
            'Acción o formación académica proyectada para atender la necesidad.',
            'Tecnología Superior, Tecnología Universitaria, Ingeniería, Licenciatura, Maestría o Doctorado.',
            'Nombre del programa o título académico proyectado. Debe corresponder a formación reconocida u homologable en Ecuador.'
          ],
          rows.map(row => [
            row.career,
            row.needText,
            row.priority,
            includeData ? row.action : '',
            includeData ? row.formationLevel : '',
            includeData ? row.projectedProgram : ''
          ]),
          [34,58,16,52,30,56]
        )]
      };
    }

    if (scope === 'informe' || scope === 'seguimiento') {
      const rows = reportRows();
      return {
        filename:(includeData ? 'UGPA_Datos_Actuales_Informe_' : 'UGPA_Plantilla_Informe_') + periodSlug() + '.xlsx',
        sheets:[simpleSheet(
          'INFORME',
          ['CARRERA','NECESIDAD','ACCION_FORMACION','ESTADO','FECHA_INICIO_REAL','AVANCE_PORCENTAJE','EVIDENCIA','ARCHIVO_EVIDENCIA','RESULTADO_OBSERVACION'],
          [
            'Carrera heredada de la DNF. No modificar.',
            'Necesidad heredada de la DNF. No modificar.',
            'Acción heredada del Plan. No modificar.',
            'No iniciado, En proceso, Finalizado o No ejecutado.',
            'Fecha AAAA-MM-DD cuando exista inicio.',
            'Valor entre 0 y 100. Finalizado debe ser 100.',
            'Nombre de la evidencia cuando la acción está En proceso o Finalizada.',
            'Nombre o referencia del archivo de evidencia.',
            'Resultado, observación o motivo de no ejecución.'
          ],
          rows.map(row => [
            row.career,row.needText,row.action,
            includeData ? row.status : '',
            includeData ? row.realStart : '',
            includeData ? Number(row.progress || 0) : '',
            includeData ? row.evidenceTitle : '',
            includeData ? row.evidencePath : '',
            includeData ? row.observation : ''
          ]),
          [34,58,58,18,20,18,42,38,58]
        )]
      };
    }

    const payload = previousExcelTemplatePayload(scope, includeData);
    if (scope !== 'dnf' || !payload?.sheets) return payload;
    return {
      ...payload,
      sheets:payload.sheets.map(sheet => sheet?.name === 'NECESIDADES' ? stripCodeColumn(sheet) : sheet)
    };
  };

  function meaningfulRows(rows) {
    return (Array.isArray(rows) ? rows : []).filter(raw => {
      if (!Object.values(raw || {}).some(value => clean(value))) return false;
      const career = clean(raw.CARRERA ?? raw.Carrera ?? raw.carrera);
      if (/^\[?INSTRUCCIONES/i.test(career)) return false;
      if (/^Carrera heredada/i.test(career) || /^Carrera activa/i.test(career)) return false;
      return true;
    });
  }

  function planAnalysis(result) {
    const sheets = result?.sheets || {};
    const detected = Object.keys(sheets).filter(name => Array.isArray(sheets[name]) && sheets[name].length);
    const imported = meaningfulRows(sheets.MATRIZ);
    const expected = planRows();
    const expectedByTrace = new Map(expected.map(row => [traceKey(row.career, row.needText), row]));
    const sourceReady = !!window.docformacionValidation?.documentReadiness?.('dnf')?.ready;
    const errors = [];
    const preview = [];
    const safeRows = [];
    const seen = new Set();

    if (!sourceReady) errors.push('Primero debe estar completa la DNF del período.');
    if (!detected.includes('MATRIZ')) errors.push('La plantilla debe contener la hoja MATRIZ.');
    const extras = detected.filter(name => name !== 'MATRIZ');
    if (extras.length) errors.push('El Plan utiliza una sola matriz. Retira las otras hojas: ' + extras.join(', ') + '.');

    imported.forEach((raw, index) => {
      const career = clean(raw.CARRERA);
      const need = clean(raw.NECESIDAD);
      const trace = traceKey(career, need);
      const expectedRow = expectedByTrace.get(trace);
      let reason = '';
      let safe = null;

      if (!career) reason = 'Falta CARRERA';
      else if (!need) reason = 'Falta NECESIDAD';
      else if (!expectedRow) reason = 'La combinación CARRERA + NECESIDAD no pertenece a la DNF del período activo';
      else if (seen.has(trace)) reason = 'La necesidad está duplicada dentro de la matriz';
      else if (key(raw.PRIORIDAD) !== key(expectedRow.priority)) reason = 'PRIORIDAD no coincide con la DNF';

      if (!reason) {
        const action = clean(raw.ACCION_FORMACION);
        const level = policy().normalizeLevel?.(raw.NIVEL_FORMACION) || '';
        const projectedProgram = clean(raw.PROGRAMA_TITULO);
        if (!action) reason = 'Falta ACCION_FORMACION';
        else if (!level) reason = 'NIVEL_FORMACION no es válido';
        else if (!projectedProgram) reason = 'Falta PROGRAMA_TITULO';
        else safe = {
          CARRERA:expectedRow.career,
          NECESIDAD:expectedRow.needText,
          PRIORIDAD:expectedRow.priority,
          ACCION_FORMACION:action,
          NIVEL_FORMACION:level,
          PROGRAMA_TITULO:projectedProgram
        };
      }

      if (reason) {
        preview.push({ id:'plan-visible-' + index, sheet:'MATRIZ', row:stripCodeField(raw), status:'Error', valid:false, optional:false, reason });
      } else {
        seen.add(trace);
        safeRows.push(safe);
        preview.push({ id:'plan-visible-' + index, sheet:'MATRIZ', row:safe, status:'Aplicar', valid:true, optional:false, reason:'Formación proyectada válida' });
      }
    });

    const missing = expected.filter(row => !seen.has(traceKey(row.career, row.needText)));
    if (missing.length) errors.push('Faltan ' + missing.length + ' necesidad(es) de la DNF en la matriz del Plan.');
    const bad = preview.filter(item => !item.valid).length;
    if (bad) errors.push('La matriz contiene ' + bad + ' fila(s) con errores. No se aplicará parcialmente.');
    if (!safeRows.length && !errors.length) errors.push('No se encontraron registros válidos.');
    const validRows = preview.filter(item => item.valid).length;

    return {
      context:{ label:'Plan de Formación · Formación proyectada', scope:'plan', kind:'' },
      filePath:result?.filePath || 'Archivo Excel',
      detected,allowed:['MATRIZ'],compatibleSheets:detected.includes('MATRIZ') ? ['MATRIZ'] : [],
      incompatibleSheets:detected.filter(name => name !== 'MATRIZ'),
      totalRows:preview.length,validRows,optionalRows:0,ignoredRows:0,errorRows:bad,matchedRows:validRows,expectedCount:expected.length,
      statusCounts:{ Aplicar:validRows,Actualizar:0,'Actualizar opcional':0,'Ya completo':0,'Sin cambios':0,Omitir:0,Error:bad },
      errors,warnings:[],safeSheets:errors.length ? {} : { MATRIZ:safeRows },optionalById:{},preview:preview.slice(0,80),mismatch:false,detectedDestination:null
    };
  }

  const FOLLOW_STATUSES = ['No iniciado','En proceso','Finalizado','No ejecutado'];

  function reportAnalysis(result) {
    const sheets = result?.sheets || {};
    const detected = Object.keys(sheets).filter(name => Array.isArray(sheets[name]) && sheets[name].length);
    const imported = meaningfulRows(sheets.INFORME);
    const expected = reportRows();
    const expectedByTrace = new Map(expected.map(row => [traceKey(row.career, row.needText), row]));
    const sourceReady = !!window.docformacionValidation?.documentReadiness?.('plan')?.ready;
    const errors = [];
    const preview = [];
    const safeRows = [];
    const seen = new Set();

    if (!sourceReady) errors.push('Primero debe estar completo el Plan de Formación del período.');
    if (!detected.includes('INFORME')) errors.push('La plantilla debe contener la hoja INFORME.');
    const extras = detected.filter(name => name !== 'INFORME');
    if (extras.length) errors.push('Esta carga es independiente. Retira las otras hojas: ' + extras.join(', ') + '.');

    imported.forEach((raw, index) => {
      const career = clean(raw.CARRERA);
      const need = clean(raw.NECESIDAD);
      const trace = traceKey(career, need);
      const expectedRow = expectedByTrace.get(trace);
      let reason = '';
      let safe = null;

      if (!career) reason = 'Falta CARRERA';
      else if (!need) reason = 'Falta NECESIDAD';
      else if (!expectedRow) reason = 'La combinación CARRERA + NECESIDAD no pertenece al Plan del período activo';
      else if (seen.has(trace)) reason = 'La necesidad está duplicada dentro del Informe';
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
          CARRERA:expectedRow.career,NECESIDAD:expectedRow.needText,ACCION_FORMACION:expectedRow.action,
          ESTADO:status,FECHA_INICIO_REAL:realStart,AVANCE_PORCENTAJE:progress,EVIDENCIA:clean(raw.EVIDENCIA),
          ARCHIVO_EVIDENCIA:clean(raw.ARCHIVO_EVIDENCIA),RESULTADO_OBSERVACION:clean(raw.RESULTADO_OBSERVACION)
        };
      }

      if (reason) preview.push({ id:'report-visible-' + index, sheet:'INFORME', row:stripCodeField(raw), status:'Error', valid:false, optional:false, reason });
      else {
        seen.add(trace);
        safeRows.push(safe);
        preview.push({ id:'report-visible-' + index, sheet:'INFORME', row:safe, status:'Aplicar', valid:true, optional:false, reason:'Registro válido' });
      }
    });

    const missing = expected.filter(row => !seen.has(traceKey(row.career, row.needText)));
    if (missing.length) errors.push('Faltan ' + missing.length + ' necesidad(es) del Plan en el Informe.');
    const bad = preview.filter(item => !item.valid).length;
    if (bad) errors.push('La plantilla contiene ' + bad + ' fila(s) con errores. No se aplicará parcialmente.');
    if (!safeRows.length && !errors.length) errors.push('No se encontraron filas válidas.');
    const validRows = preview.filter(item => item.valid).length;

    return {
      context:{ label:'Informe de Cumplimiento', scope:'informe', kind:'' },
      filePath:result?.filePath || 'Archivo Excel',detected,allowed:['INFORME'],
      compatibleSheets:detected.includes('INFORME') ? ['INFORME'] : [],incompatibleSheets:detected.filter(name => name !== 'INFORME'),
      totalRows:preview.length,validRows,optionalRows:0,ignoredRows:0,errorRows:bad,matchedRows:validRows,expectedCount:expected.length,
      statusCounts:{ Aplicar:validRows,Actualizar:0,'Actualizar opcional':0,'Ya completo':0,'Sin cambios':0,Omitir:0,Error:bad },
      errors,warnings:[],safeSheets:errors.length ? {} : { INFORME:safeRows },optionalById:{},preview:preview.slice(0,80),mismatch:false,detectedDestination:null
    };
  }

  const previousAnalyzeExcelImport = analyzeExcelImport;
  analyzeExcelImport = function internalTraceabilityAnalyze(scope, result, type = '', kind = '') {
    if (kind) return previousAnalyzeExcelImport(scope, result, type, kind);
    if (scope === 'plan') return planAnalysis(result);
    if (scope === 'informe' || scope === 'seguimiento') return reportAnalysis(result);
    const analysis = previousAnalyzeExcelImport(scope, result, type, kind);
    if (scope !== 'dnf') return analysis;
    const safe = Array.isArray(analysis?.safeSheets?.NECESIDADES)
      ? analysis.safeSheets.NECESIDADES.map(stripCodeField)
      : analysis?.safeSheets?.NECESIDADES;
    return {
      ...analysis,
      safeSheets:{ ...(analysis.safeSheets || {}), ...(safe ? { NECESIDADES:safe } : {}) },
      preview:(analysis.preview || []).map(item => ({ ...item, row:stripCodeField(item.row) }))
    };
  };

  const previousApplyExcel = applyExcel;
  applyExcel = function internalTraceabilityApply(sheets) {
    const scope = window.__DOCFORMACION_TEMPLATE_IMPORT_SCOPE;

    if (scope === 'plan' && Array.isArray(sheets?.MATRIZ)) {
      const rows = planRows();
      const byTrace = new Map(rows.map(row => [traceKey(row.career, row.needText), row]));
      sheets.MATRIZ.forEach(raw => {
        const row = byTrace.get(traceKey(raw.CARRERA, raw.NECESIDAD));
        if (!row) return;
        row.needId = stableNeedId(row.career, row.needText);
        row.action = clean(raw.ACCION_FORMACION);
        row.formationLevel = policy().normalizeLevel?.(raw.NIVEL_FORMACION) || '';
        row.projectedProgram = clean(raw.PROGRAMA_TITULO);
        Object.assign(row, policy().applyDefaults?.(row) || row);
        row.modality = '';
        row.plannedStart = '';
        row.plannedEnd = '';
        row.observations = '';
      });
      state.needPlan = rows;
      const flow = window.docformacionWorkflow?.state?.();
      if (flow) {
        flow.planImported = true;
        flow.planFileName = window.__DOCFORMACION_TEMPLATE_IMPORT_FILE || 'Matriz de Formación Proyectada';
        flow.planImportedAt = new Date().toISOString();
        flow.planSourceFingerprint = window.docformacionWorkflow?.needsFingerprint?.() || '';
        flow.reportImported = false;
        flow.reportFileName = '';
        flow.reportImportedAt = '';
        flow.reportSourceFingerprint = '';
      }
      state.needFollowup = [];
      return;
    }

    if ((scope === 'informe' || scope === 'seguimiento') && Array.isArray(sheets?.INFORME)) {
      const rows = reportRows();
      const byTrace = new Map(rows.map(row => [traceKey(row.career, row.needText), row]));
      sheets.INFORME.forEach(raw => {
        const row = byTrace.get(traceKey(raw.CARRERA, raw.NECESIDAD));
        if (!row) return;
        row.needId = stableNeedId(row.career, row.needText);
        row.status = clean(raw.ESTADO);
        row.realStart = clean(raw.FECHA_INICIO_REAL);
        row.progress = Number(raw.AVANCE_PORCENTAJE || 0);
        row.evidenceTitle = clean(raw.EVIDENCIA);
        row.evidencePath = clean(raw.ARCHIVO_EVIDENCIA);
        row.observation = clean(raw.RESULTADO_OBSERVACION);
      });
      state.needFollowup = rows;
      const flow = window.docformacionWorkflow?.state?.();
      if (flow) {
        flow.reportImported = true;
        flow.reportFileName = window.__DOCFORMACION_TEMPLATE_IMPORT_FILE || 'Plantilla Informe';
        flow.reportImportedAt = new Date().toISOString();
        flow.reportSourceFingerprint = window.docformacionWorkflow?.planFingerprint?.(planRows()) || '';
      }
      return;
    }

    return previousApplyExcel(sheets);
  };

  // El modelo ofrece un identificador interno opaco. El código histórico se conserva
  // únicamente por compatibilidad de datos antiguos y nunca se solicita ni se muestra.
  const previousModel = window.docformacionModel;
  if (previousModel?.needs) {
    window.docformacionModel = Object.freeze({
      ...previousModel,
      needs() {
        return previousModel.needs().map(row => ({ ...row, needId:stableNeedId(row.career, row.need) }));
      },
      planRows() {
        return previousModel.planRows().map(row => ({ ...row, needId:row.needId || stableNeedId(row.career, row.needText) }));
      },
      reportRows() {
        return previousModel.reportRows().map(row => ({ ...row, needId:row.needId || stableNeedId(row.career, row.needText) }));
      }
    });
  }

  function removeCodeColumns(root) {
    if (!root) return;
    root.querySelectorAll('table').forEach(table => {
      const headers = [...table.querySelectorAll('thead th')];
      const indexes = headers
        .map((th, index) => ({ index, label:key(th.textContent).replace(/_/g, ' ') }))
        .filter(item => item.label === 'codigo' || item.label === 'codigo dnf')
        .map(item => item.index)
        .sort((a,b) => b - a);
      if (!indexes.length) return;
      table.querySelectorAll('tr').forEach(tr => {
        const cells = [...tr.children];
        indexes.forEach(index => cells[index]?.remove());
      });
    });
  }

  const previousRenderDNF = renderDNF;
  renderDNF = function internalTraceabilityDnfView() {
    const result = previousRenderDNF();
    removeCodeColumns(document.getElementById('content'));
    return result;
  };

  const previousRenderPlan = renderPlan;
  renderPlan = function internalTraceabilityPlanView() {
    const result = previousRenderPlan();
    removeCodeColumns(document.getElementById('content'));
    return result;
  };

  let observer = null;
  function watchVisibleTables() {
    const root = document.getElementById('content');
    if (!root || observer) return;
    observer = new MutationObserver(() => removeCodeColumns(root));
    observer.observe(root, { childList:true, subtree:true });
    removeCodeColumns(root);
  }

  function groupByCareer(rows) {
    const groups = [];
    const map = new Map();
    (rows || []).forEach(row => {
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
    const years = Number(row?.durationYears || policy().durationForLevel?.(row?.formationLevel) || 0);
    return years ? String(years).replace('.', ',') + ' años' : '—';
  }

  const previousRenderers = window.docformacionSectionRenderers;
  if (previousRenderers?.render) {
    window.docformacionSectionRenderers = Object.freeze({
      ...previousRenderers,
      __internalTraceability:true,
      render(type, section, writer, ctx) {
        if (type === 'dnf') {
          const coverage = window.docformacionDnfCoverage?.state?.(ctx);
          const metrics = window.docformacionDocumentCalculations?.dnf?.(ctx) || {};
          const byPriority = metrics.byPriority || {};

          if (section?.id === 'DNF-01-introduccion') {
            writer.paragraph('La formación y el desarrollo profesional del personal académico constituyen componentes permanentes de la calidad de la educación superior. La Detección de Necesidades de Formación organiza evidencia por carrera para orientar decisiones de planificación, priorización y seguimiento.');
            writer.paragraph('Para el período ' + ctx.period.label + ', la aplicación mantiene una fuente única de datos y conserva internamente la relación de cada necesidad con el Plan de Formación y el Informe de Cumplimiento, sin requerir códigos manuales.');
            writer.metricTable([
              ['Carreras activas del período', String(coverage?.active ?? (ctx.careers || []).length)],
              ['Carreras con necesidades registradas', String(coverage?.withNeeds ?? 0)],
              ['Cobertura de registro por carreras', coverage?.text || 'No aplica'],
              ['Necesidades registradas', String((ctx.needs || []).length)]
            ]);
            return;
          }

          if (section?.id === 'DNF-06-lineas') {
            (ctx.careers || []).forEach(career => {
              const rows = (ctx.needs || []).filter(row => key(row.career) === key(career.name));
              writer.heading(career.name, 2);
              writer.table(
                ['Necesidad específica','Prioridad','Justificación de prioridad'],
                rows.map(row => [row.need,row.priority,row.priorityJustification || '—']),
                [45,15,40]
              );
            });
            writer.heading('Formación Intelectual Genérica', 2);
            (ctx.genericLines || []).forEach(writer.bullet);
            return;
          }

          if (section?.id === 'DNF-08-resumen') {
            writer.paragraph('El diagnóstico del período ' + ctx.period.label + ' registra necesidades en ' + (coverage?.withNeeds ?? 0) + ' de ' + (coverage?.active ?? 0) + ' carreras activas y consolida ' + (ctx.needs || []).length + ' necesidades específicas.');
            writer.metricTable([
              ['Cobertura de registro por carreras', coverage?.text || 'No aplica'],
              ['Prioridad Alta', String(byPriority.Alta || 0)],
              ['Prioridad Media', String(byPriority.Media || 0)],
              ['Prioridad Baja', String(byPriority.Baja || 0)],
              ['Líneas genéricas', String((ctx.genericLines || []).length)]
            ]);
            writer.paragraph('La cobertura de registro por carreras no representa participación docente ni beneficiarios del Plan de Formación. La aplicación conserva la trazabilidad de cada necesidad de forma interna.');
            return;
          }

          if (section?.id === 'DNF-09-conclusiones') {
            writer.bullet(coverage?.applicable
              ? 'La cobertura de registro por carreras alcanza ' + coverage.text + ': ' + coverage.withNeeds + ' de ' + coverage.active + ' carreras activas cuentan con al menos una necesidad registrada.'
              : 'La cobertura de registro por carreras es No aplica porque el período no registra carreras activas.');
            writer.bullet('Se identificaron ' + (ctx.needs || []).length + ' necesidades específicas, de las cuales ' + (byPriority.Alta || 0) + ' son de prioridad Alta.');
            writer.bullet('La cobertura de registro por carreras no mide el porcentaje de docentes participantes ni de beneficiarios del Plan de Formación.');
            writer.bullet('La aplicación conserva internamente la relación entre diagnóstico, planificación y seguimiento sin exigir identificadores al usuario.');
            writer.bullet('Las líneas genéricas complementan las necesidades específicas sin sustituirlas.');
            return;
          }

          if (section?.id === 'DNF-10-recomendaciones') {
            [
              'Priorizar en el Plan de Formación las necesidades clasificadas como Alta.',
              'Definir para cada necesidad la acción de formación proyectada, el nivel de formación y el programa o título académico previsto.',
              'Aplicar automáticamente las duraciones por nivel y los criterios institucionales de indicador, meta, responsable, recursos y validez en Ecuador.',
              'Mantener la trazabilidad DNF → Plan → Informe de forma interna, sin solicitar códigos manuales al usuario.',
              'Utilizar los resultados del Informe de Cumplimiento como retroalimentación para el siguiente período.'
            ].forEach(writer.bullet);
            return;
          }

          if (section?.id === 'DNF-12-anexos') {
            const rows = ctx.needs || [];
            writer.heading('Matriz de necesidades de formación', 2);
            writer.table(
              ['Carrera','Necesidad','Prioridad','Justificación de prioridad'],
              rows.map(row => [row.career,row.need,row.priority,row.priorityJustification || '—']),
              [24,36,12,28]
            );
            writer.heading('Matriz de Formación Intelectual Genérica', 2);
            writer.table(['Línea genérica'], (ctx.genericLines || []).map(line => [line]), [100]);
            writer.barChart('Distribución de necesidades por prioridad', ['Alta','Media','Baja'].map(priority => ({ label:priority, value:byPriority[priority] || 0 })));
            return;
          }
        }

        if (type === 'plan') {
          const rows = ctx.plan || [];
          const careers = new Set(rows.map(row => clean(row.career)).filter(Boolean)).size;
          if (section?.id === 'PLAN-01-introduccion') {
            writer.paragraph('El Plan de Formación Docente del período ' + ctx.period.label + ' transforma las necesidades identificadas en la DNF en acciones de formación académica proyectadas. La relación entre diagnóstico y planificación se conserva internamente en la aplicación y no requiere códigos manuales.');
            writer.paragraph('La planificación se concentra en la decisión académica que cambia por cada necesidad. Las duraciones, el indicador, la meta, el responsable institucional, los recursos y el criterio de validez se aplican de forma institucional y no se repiten por registro.');
            return;
          }
          if (section?.id === 'PLAN-04-matriz') {
            groupByCareer(rows).forEach(group => {
              writer.heading(group.name, 2);
              writer.table(
                ['Necesidad','Prioridad','Acción','Nivel','Programa / título','Duración'],
                group.rows.map(row => [row.needText,row.priority,row.action || '—',row.formationLevel || '—',row.projectedProgram || '—',durationText(row)]),
                [27,10,19,14,23,7]
              );
            });
            return;
          }
          if (section?.id === 'PLAN-07-seguimiento') {
            writer.paragraph('El seguimiento posterior se vinculará internamente con cada necesidad y con su acción de formación proyectada. El Informe de Cumplimiento registrará el estado real, avance, evidencias y resultados sin solicitar códigos de trazabilidad al usuario.');
            return;
          }
          if (section?.id === 'PLAN-08-conclusiones') {
            writer.bullet('El Plan incorpora ' + rows.length + ' acción(es) de formación proyectada vinculadas directamente con necesidades de ' + careers + ' carrera(s).');
            writer.bullet('La duración se determina automáticamente según el nivel de formación y no requiere fechas individuales de inicio y fin en el Plan.');
            writer.bullet('El indicador, la meta del ' + (policy().targetPercent || 10) + '%, el responsable y los recursos se aplican de forma institucional a todo el Plan.');
            writer.bullet('La aplicación conserva la relación DNF → Plan → Informe mediante trazabilidad interna no visible para el usuario.');
            return;
          }
        }

        if (type === 'informe') {
          const rows = ctx.report || [];
          const metrics = window.docformacionDocumentCalculations?.report?.(ctx) || {};
          if (section?.id === 'INF-01-objeto') {
            writer.paragraph('Presentar el nivel de cumplimiento del Plan de Formación Docente correspondiente al período ' + ctx.period.label + ', conservando internamente la relación entre la necesidad diagnosticada, la acción planificada y su resultado.');
            return;
          }
          if (section?.id === 'INF-04-seguimiento') {
            writer.table(
              ['Carrera','Necesidad','Acción','Estado','Inicio real','Avance','Evidencia'],
              rows.map(row => [row.career || '—',row.needText || '—',row.action || '—',row.status || '—',row.realStart || '—',Number(row.progress || 0) + '%',row.evidenceTitle || '—']),
              [16,23,24,12,10,7,8]
            );
            return;
          }
          if (section?.id === 'INF-05-evidencias') {
            writer.table(
              ['Carrera','Necesidad','Archivo / referencia','Resultado u observación'],
              rows.map(row => [row.career || '—',row.needText || '—',row.evidencePath || row.evidenceTitle || '—',row.observation || '—']),
              [18,26,24,32]
            );
            return;
          }
          if (section?.id === 'INF-07-conclusiones') {
            writer.bullet('La relación DNF → Plan → Informe se conserva mediante trazabilidad interna de la aplicación.');
            writer.bullet('Se finalizaron ' + Number(metrics.finished || 0) + ' de ' + rows.length + ' acciones planificadas para el período.');
            writer.bullet('El avance promedio registrado es ' + Number(metrics.averageProgress || 0).toLocaleString('es-EC',{maximumFractionDigits:1}) + '%.');
            return;
          }
        }

        return previousRenderers.render(type, section, writer, ctx);
      }
    });
  }

  watchVisibleTables();

  window.docformacionInternalTraceability = Object.freeze({
    traceKey,
    stableNeedId,
    removeCodeColumns
  });
})();
