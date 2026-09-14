(() => {
  'use strict';

  const SCOPE = 'dnf';
  const SHEET = 'NECESIDADES';
  const HEADER = 'JUSTIFICACION_PRIORIDAD';
  const clean = value => String(value ?? '').trim();
  const normKey = value => clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ');

  const PRIORITY_CRITERIA = Object.freeze({
    Alta:'La brecha afecta directamente la formación académica requerida para las funciones docentes y requiere atención preferente.',
    Media:'La formación contribuye al fortalecimiento del perfil académico y puede atenderse de manera progresiva.',
    Baja:'La formación complementa el desarrollo académico y puede programarse posteriormente.'
  });

  function needKey(career, need) {
    return normKey(career) + '|' + normKey(need);
  }

  function readJustification(item) {
    return clean(item?.priorityJustification || item?.priorityReason || item?.justification);
  }

  function justificationMap() {
    const map = new Map();
    (state?.coordinations || []).forEach(coord => {
      (coord?.needItems || []).forEach(item => {
        if (!clean(item?.text)) return;
        map.set(needKey(coord.carrera, item.text), readJustification(item));
      });
    });
    return map;
  }

  function currentJustification(career, need) {
    return justificationMap().get(needKey(career, need)) || '';
  }

  // Expone la justificación junto con cada necesidad canónica, sin duplicar otra fuente de datos.
  const previousModel = window.docformacionModel;
  if (previousModel?.needs) {
    window.docformacionModel = Object.freeze({
      ...previousModel,
      needs() {
        const map = justificationMap();
        return previousModel.needs().map(row => ({
          ...row,
          priorityJustification:map.get(needKey(row.career, row.need)) || ''
        }));
      }
    });
  }

  // La misma plantilla DNF incorpora una columna obligatoria; no se crea un Excel adicional.
  const previousExcelTemplatePayload = excelTemplatePayload;
  excelTemplatePayload = function dnfPriorityTemplate(scope, includeData) {
    const payload = previousExcelTemplatePayload(scope, includeData);
    if (scope !== SCOPE || !payload?.sheets) return payload;
    return {
      ...payload,
      sheets:payload.sheets.map(sheet => {
        if (sheet?.name !== SHEET) return sheet;
        return {
          ...sheet,
          headers:[...(sheet.headers || []), HEADER],
          descriptions:[
            ...(sheet.descriptions || []),
            'Justificación obligatoria de la prioridad asignada, sustentada en la información del diagnóstico.'
          ],
          rows:(sheet.rows || []).map(row => [
            ...row,
            includeData ? currentJustification(row?.[1], row?.[2]) : ''
          ]),
          widths:[...(sheet.widths || []), 62]
        };
      })
    };
  };

  const previousAnalyzeExcelImport = analyzeExcelImport;
  analyzeExcelImport = function dnfPriorityAnalyze(scope, result, type = '', kind = '') {
    const analysis = previousAnalyzeExcelImport(scope, result, type, kind);
    if (kind || scope !== SCOPE) return analysis;

    const rawRows = Array.isArray(result?.sheets?.[SHEET]) ? result.sheets[SHEET] : [];
    const byNeed = new Map();
    const missing = [];
    rawRows.forEach((raw, index) => {
      if (!Object.values(raw || {}).some(value => clean(value))) return;
      const career = clean(raw.CARRERA ?? raw.Carrera ?? raw.carrera);
      const need = clean(raw.NECESIDAD ?? raw.NECESIDAD_DE_FORMACION ?? raw.Necesidad);
      if (!career || !need) return;
      const justification = clean(raw[HEADER] ?? raw.JUSTIFICACION ?? raw.justificacion);
      byNeed.set(needKey(career, need), justification);
      if (!justification) missing.push({ index:index + 2, career, need });
    });

    const preview = (analysis.preview || []).map(item => {
      const row = item.row || {};
      const justification = byNeed.get(needKey(row.CARRERA, row.NECESIDAD)) || '';
      return { ...item, row:{ ...row, [HEADER]:justification } };
    });

    if (missing.length) {
      const errors = [...(analysis.errors || [])];
      errors.push('JUSTIFICACION_PRIORIDAD es obligatoria para todas las necesidades. Faltan ' + missing.length + ' fila(s).');
      return {
        ...analysis,
        errors,
        safeSheets:{},
        errorRows:Math.max(Number(analysis.errorRows || 0), missing.length),
        statusCounts:{ ...(analysis.statusCounts || {}), Error:Math.max(Number(analysis.statusCounts?.Error || 0), missing.length) },
        preview
      };
    }

    const safeRows = Array.isArray(analysis.safeSheets?.[SHEET])
      ? analysis.safeSheets[SHEET].map(row => ({
          ...row,
          [HEADER]:byNeed.get(needKey(row.CARRERA, row.NECESIDAD)) || ''
        }))
      : [];

    return {
      ...analysis,
      safeSheets:analysis.errors?.length ? analysis.safeSheets : { ...(analysis.safeSheets || {}), [SHEET]:safeRows },
      preview
    };
  };

  const previousApplyExcel = applyExcel;
  applyExcel = function dnfPriorityApply(sheets) {
    const scope = window.__DOCFORMACION_TEMPLATE_IMPORT_SCOPE;
    const rows = scope === SCOPE && Array.isArray(sheets?.[SHEET]) ? sheets[SHEET] : null;
    const result = previousApplyExcel(sheets);
    if (!rows) return result;

    const byNeed = new Map(rows.map(row => [
      needKey(row.CARRERA, row.NECESIDAD),
      clean(row[HEADER] ?? row.JUSTIFICACION ?? row.justificacion)
    ]));
    (state?.coordinations || []).forEach(coord => {
      (coord?.needItems || []).forEach(item => {
        const lookup = needKey(coord.carrera, item.text);
        if (byNeed.has(lookup)) item.priorityJustification = byNeed.get(lookup);
      });
    });
    return result;
  };

  function priorityJustificationState(ctxArg) {
    const ctx = ctxArg || window.docformacionDocumentContext?.build?.();
    const rows = ctx?.needs || [];
    const incomplete = rows.filter(row => !clean(row.priorityJustification));
    const missing = [];
    if (!rows.length) missing.push('necesidades DNF');
    else if (incomplete.length) missing.push('justificación de prioridad para ' + incomplete.length + ' necesidad(es)');
    return {
      ready:rows.length > 0 && incomplete.length === 0,
      total:rows.length,
      complete:Math.max(0, rows.length - incomplete.length),
      incomplete:incomplete.length,
      missing
    };
  }

  // La DNF y los documentos que dependen de ella no se consideran completos sin justificación.
  const previousValidation = window.docformacionValidation;
  if (previousValidation?.documentReadiness) {
    function dnfCore(ctx) {
      const base = previousValidation.dnfCore(ctx);
      const priority = priorityJustificationState(ctx);
      return {
        ...base,
        ready:base.ready === true && priority.ready,
        missing:[...new Set([...(base.missing || []), ...priority.missing])],
        priorityJustification:priority
      };
    }

    function dnf(ctx) {
      const base = previousValidation.dnf(ctx);
      const priority = priorityJustificationState(ctx);
      return {
        ...base,
        ready:base.ready === true && priority.ready,
        missing:[...new Set([...(base.missing || []), ...priority.missing])],
        priorityJustification:priority
      };
    }

    function sectionReadiness(type, section, ctxArg) {
      const ctx = ctxArg || window.docformacionDocumentContext?.build?.();
      const result = previousValidation.sectionReadiness(type, section, ctx);
      if (type !== 'dnf' || !(section?.data || []).includes('necesidades')) return result;
      const priority = priorityJustificationState(ctx);
      return {
        ...result,
        ready:result.ready === true && priority.ready,
        missing:[...new Set([...(result.missing || []), ...priority.missing])],
        priorityJustification:priority
      };
    }

    function documentReadiness(type, ctxArg) {
      const ctx = ctxArg || window.docformacionDocumentContext?.build?.();
      const result = previousValidation.documentReadiness(type, ctx);
      const priority = priorityJustificationState(ctx);
      if (type === 'dnf') {
        return {
          ...result,
          ready:result.ready === true && priority.ready,
          missing:[...new Set([...(result.missing || []), ...priority.missing])],
          priorityJustification:priority
        };
      }
      if (type === 'plan' && !priority.ready) {
        return { ...result, ready:false, missing:[...new Set([...(result.missing || []), 'DNF completa'])] };
      }
      if (type === 'informe' && !priority.ready) {
        return { ...result, ready:false, missing:[...new Set([...(result.missing || []), 'Plan de Formación completo'])] };
      }
      return result;
    }

    window.docformacionValidation = Object.freeze({
      ...previousValidation,
      dnfCore,
      dnf,
      priorityJustificationState,
      sectionReadiness,
      documentReadiness
    });
  }

  const previousDocumentStatus = documentStatus;
  documentStatus = function dnfPriorityDocumentStatus(type) {
    const result = previousDocumentStatus(type);
    if (type !== 'dnf') return result;
    const priority = priorityJustificationState();
    if (priority.ready || !priority.total) return result;
    const issue = {
      kind:'dnf-priority-justification',
      text:'Completar la justificación de prioridad',
      description:'Cada necesidad debe explicar por qué su prioridad es Alta, Media o Baja. Corrige la misma plantilla de Detección de Necesidades y vuelve a subirla.',
      view:'necesidades'
    };
    const issues = [...(result.issues || [])];
    if (!issues.some(item => item.kind === issue.kind)) issues.push(issue);
    return { ...result, ready:false, issues, missing:[...new Set([...(result.missing || []), issue.text])] };
  };

  function decorateDnfInfo() {
    const cards = document.querySelectorAll('#content .dnf-template-card');
    const dnfCard = cards?.[1];
    if (!dnfCard || dnfCard.querySelector('[data-priority-help]')) return;
    const note = document.createElement('div');
    note.dataset.priorityHelp = '1';
    note.className = 'small muted';
    note.textContent = 'Cada necesidad requiere prioridad y una justificación sustentada en el diagnóstico.';
    const toolbar = dnfCard.querySelector('.excel-toolbar');
    if (toolbar) dnfCard.insertBefore(note, toolbar);
    else dnfCard.appendChild(note);
  }

  const previousRenderDocumentView = renderDocumentView;
  renderDocumentView = function dnfPriorityDocumentView(type) {
    const result = previousRenderDocumentView(type);
    if (type === 'dnf') decorateDnfInfo();
    return result;
  };

  // La vista de datos de la DNF también muestra la justificación de cada necesidad.
  const previousRenderDNF = renderDNF;
  renderDNF = function dnfPriorityDataView() {
    const result = previousRenderDNF();
    const root = document.getElementById('content');
    const table = [...(root?.querySelectorAll('table') || [])].find(item => {
      const headers = [...item.querySelectorAll('thead th')].map(th => clean(th.textContent));
      return headers.includes('Código') && headers.includes('Necesidad') && headers.includes('Prioridad');
    });
    if (!table || table.querySelector('th[data-priority-justification]')) return result;

    const th = document.createElement('th');
    th.dataset.priorityJustification = '1';
    th.textContent = 'Justificación de prioridad';
    table.querySelector('thead tr')?.appendChild(th);
    const map = justificationMap();
    table.querySelectorAll('tbody tr').forEach(tr => {
      const cells = tr.querySelectorAll('td');
      const career = clean(cells?.[1]?.textContent);
      const need = clean(cells?.[2]?.textContent);
      const td = document.createElement('td');
      td.textContent = map.get(needKey(career, need)) || '—';
      tr.appendChild(td);
    });
    return result;
  };

  // Criterios institucionales fijos + justificación variable por necesidad en el documento final.
  const previousRenderers = window.docformacionSectionRenderers;
  if (previousRenderers?.render) {
    window.docformacionSectionRenderers = Object.freeze({
      ...previousRenderers,
      __dnfPriorityJustification:true,
      render(type, section, writer, ctx) {
        if (type !== 'dnf') return previousRenderers.render(type, section, writer, ctx);

        if (section?.id === 'DNF-04-metodologia') {
          previousRenderers.render(type, section, writer, ctx);
          writer.heading('Criterios de priorización', 2);
          writer.paragraph('Las necesidades de formación académica se clasifican según la relevancia de la brecha identificada y su incidencia en las funciones del personal docente:');
          writer.bullet('Alta: ' + PRIORITY_CRITERIA.Alta);
          writer.bullet('Media: ' + PRIORITY_CRITERIA.Media);
          writer.bullet('Baja: ' + PRIORITY_CRITERIA.Baja);
          writer.paragraph('Cada necesidad incorpora una justificación de la prioridad asignada, sustentada en la información del diagnóstico.');
          return;
        }

        if (section?.id === 'DNF-06-lineas') {
          const rows = ctx.needs || [];
          const key = value => normKey(value);
          (ctx.careers || []).forEach(career => {
            const careerRows = rows.filter(row => key(row.career) === key(career.name));
            writer.heading(career.name, 2);
            writer.table(
              ['Código','Necesidad específica','Prioridad','Justificación de prioridad'],
              careerRows.map(row => [row.code, row.need, row.priority, row.priorityJustification || '—']),
              [14,38,12,36]
            );
          });
          writer.heading('Formación Intelectual Genérica', 2);
          (ctx.genericLines || []).forEach(writer.bullet);
          return;
        }

        if (section?.id === 'DNF-12-anexos') {
          const rows = ctx.needs || [];
          const metrics = window.docformacionDocumentCalculations?.dnf?.(ctx) || {};
          const byPriority = metrics.byPriority || {};
          writer.heading('Matriz de trazabilidad DNF', 2);
          writer.table(
            ['Código','Carrera','Necesidad','Prioridad','Justificación de prioridad'],
            rows.map(row => [row.code,row.career,row.need,row.priority,row.priorityJustification || '—']),
            [12,20,30,10,28]
          );
          writer.heading('Matriz de Formación Intelectual Genérica', 2);
          writer.table(['Línea genérica'], (ctx.genericLines || []).map(line => [line]), [100]);
          writer.barChart('Distribución de necesidades por prioridad', ['Alta','Media','Baja'].map(priority => ({ label:priority, value:byPriority[priority] || 0 })));
          return;
        }

        return previousRenderers.render(type, section, writer, ctx);
      }
    });
  }

  window.docformacionDnfPriority = Object.freeze({
    criteria:PRIORITY_CRITERIA,
    readiness:priorityJustificationState
  });
})();
