(() => {
  'use strict';

  const SCOPE = 'dnf-metodologia';
  const SHEET = 'METODOLOGIA';
  const FLOW_VERSION = 3;
  const FIELDS = Object.freeze([
    { key:'method', header:'METODO_RECOLECCION', label:'método de recolección', description:'Método utilizado para recopilar la información del diagnóstico.' },
    { key:'dates', header:'FECHAS_LEVANTAMIENTO', label:'fechas de levantamiento', description:'Fecha o rango de fechas en que se realizó el levantamiento.' },
    { key:'participants', header:'PARTICIPANTES', label:'participantes', description:'Personas, cargos o grupos que participaron en el levantamiento.' },
    { key:'sources', header:'FUENTES_DIAGNOSTICO', label:'fuentes del diagnóstico', description:'Fuentes utilizadas para identificar las necesidades de formación académica.' },
    { key:'validationResponsible', header:'RESPONSABLE_VALIDACION', label:'responsable de validación', description:'Cargo, unidad o responsable que revisó y validó las necesidades.' },
    { key:'validationMechanism', header:'MECANISMO_VALIDACION', label:'mecanismo de validación', description:'Mecanismo mediante el cual se revisaron y validaron las necesidades.' },
    { key:'evidenceReference', header:'REFERENCIA_EVIDENCIAS', label:'referencia de evidencias', description:'Referencia, código, carpeta, acta o ubicación de los respaldos del proceso.' }
  ]);

  const clean = value => String(value ?? '').trim();

  function ensureFlow() {
    state.dnfTemplateFlow = state.dnfTemplateFlow && typeof state.dnfTemplateFlow === 'object'
      ? state.dnfTemplateFlow
      : {};
    const flow = state.dnfTemplateFlow;
    flow.version = Math.max(Number(flow.version || 0), FLOW_VERSION);
    if (!Object.prototype.hasOwnProperty.call(flow, 'methodologyImported')) flow.methodologyImported = false;
    if (!Object.prototype.hasOwnProperty.call(flow, 'methodologyFileName')) flow.methodologyFileName = '';
    if (!Object.prototype.hasOwnProperty.call(flow, 'methodologyImportedAt')) flow.methodologyImportedAt = '';
    if (!Object.prototype.hasOwnProperty.call(flow, 'methodologyNeedsFingerprint')) flow.methodologyNeedsFingerprint = '';
    return flow;
  }

  function methodologyData() {
    state.dnfMethodology = state.dnfMethodology && typeof state.dnfMethodology === 'object'
      ? state.dnfMethodology
      : {};
    const data = state.dnfMethodology;
    FIELDS.forEach(field => {
      if (!Object.prototype.hasOwnProperty.call(data, field.key)) data[field.key] = '';
    });
    return data;
  }

  function periodSlug() {
    const start = clean(state?.period?.start).replace(/[^0-9-]/g, '');
    const end = clean(state?.period?.end).replace(/[^0-9-]/g, '');
    return [start, end].filter(Boolean).join('_a_') || 'periodo';
  }

  function simpleSheet(name, headers, descriptions, rows, widths) {
    return { name, headers, descriptions, rows:rows?.length ? rows : [headers.map(() => '')], widths };
  }

  function currentNeedsFingerprint(ctxArg) {
    const ctx = ctxArg || window.docformacionDocumentContext?.build?.();
    return window.docformacionValidation?.needsFingerprint?.(ctx?.needs || []) || '';
  }

  function methodologyState(ctxArg) {
    const ctx = ctxArg || window.docformacionDocumentContext?.build?.();
    const flow = ensureFlow();
    const data = ctx?.methodology || methodologyData();
    const missingFields = FIELDS.filter(field => !clean(data?.[field.key])).map(field => field.label);
    const fingerprint = currentNeedsFingerprint(ctx);
    const stale = flow.methodologyImported === true && !!fingerprint && flow.methodologyNeedsFingerprint !== fingerprint;
    const missing = [];
    if (flow.methodologyImported !== true) missing.push('metodología del diagnóstico confirmada');
    if (missingFields.length) missing.push('datos metodológicos: ' + missingFields.join(', '));
    if (stale) missing.push('metodología actualizada respecto de la DNF vigente');
    return {
      ready:flow.methodologyImported === true && missingFields.length === 0 && !stale,
      imported:flow.methodologyImported === true,
      stale,
      missingFields,
      missing,
      data
    };
  }

  // Plantilla independiente: los totales, período y cobertura son automáticos y no se repiten en Excel.
  const previousExcelTemplatePayload = excelTemplatePayload;
  excelTemplatePayload = function dnfMethodologyTemplate(scope, includeData) {
    if (scope !== SCOPE) return previousExcelTemplatePayload(scope, includeData);
    const data = methodologyData();
    const headers = FIELDS.map(field => field.header);
    const descriptions = FIELDS.map(field => field.description);
    const rows = includeData ? [FIELDS.map(field => clean(data[field.key]))] : [headers.map(() => '')];
    return {
      filename:(includeData ? 'UGPA_Datos_Actuales_Metodologia_DNF_' : 'UGPA_Plantilla_Metodologia_DNF_') + periodSlug() + '.xlsx',
      sheets:[simpleSheet(SHEET, headers, descriptions, rows, [34,30,40,48,38,46,48])]
    };
  };

  const previousAnalyzeExcelImport = analyzeExcelImport;
  analyzeExcelImport = function dnfMethodologyAnalyze(scope, result, type = '', kind = '') {
    if (kind || scope !== SCOPE) return previousAnalyzeExcelImport(scope, result, type, kind);

    const sheets = result?.sheets || {};
    const detected = Object.keys(sheets).filter(name => Array.isArray(sheets[name]) && sheets[name].length);
    const rawRows = Array.isArray(sheets[SHEET]) ? sheets[SHEET] : [];
    const rows = rawRows.filter(raw => Object.values(raw || {}).some(value => clean(value)));
    const errors = [];
    const preview = [];
    const safeRows = [];
    const ctx = window.docformacionDocumentContext?.build?.();
    const dnfCore = window.docformacionValidation?.dnfCore?.(ctx);

    if (!dnfCore?.ready) errors.push('Primero completa y confirma Carreras y Detección de Necesidades del período.');
    if (!detected.includes(SHEET)) errors.push('La plantilla debe contener únicamente la hoja ' + SHEET + '.');
    const extras = detected.filter(name => name !== SHEET);
    if (extras.length) errors.push('Esta carga es independiente. Retira las otras hojas: ' + extras.join(', ') + '.');
    if (rows.length !== 1) errors.push('La metodología debe contener exactamente una fila de información para el período activo.');

    if (rows.length === 1) {
      const raw = rows[0];
      const normalized = {};
      const missing = [];
      FIELDS.forEach(field => {
        normalized[field.header] = clean(raw[field.header]);
        if (!normalized[field.header]) missing.push(field.label);
      });
      if (missing.length) {
        errors.push('Completa los campos metodológicos: ' + missing.join(', ') + '.');
        preview.push({ id:'dnf-methodology-0', sheet:SHEET, row:raw, status:'Error', valid:false, optional:false, reason:'Faltan: ' + missing.join(', ') });
      } else {
        safeRows.push(normalized);
        preview.push({ id:'dnf-methodology-0', sheet:SHEET, row:normalized, status:'Aplicar', valid:true, optional:false, reason:'Metodología completa' });
      }
    }

    const validRows = errors.length ? 0 : safeRows.length;
    return {
      context:{ label:'Metodología del diagnóstico', scope:SCOPE, kind:'' },
      filePath:result?.filePath || 'Archivo Excel',
      detected,
      allowed:[SHEET],
      compatibleSheets:detected.includes(SHEET) ? [SHEET] : [],
      incompatibleSheets:detected.filter(name => name !== SHEET),
      totalRows:preview.length,
      validRows,
      optionalRows:0,
      ignoredRows:0,
      errorRows:errors.length ? Math.max(1, preview.filter(row => !row.valid).length) : 0,
      matchedRows:validRows,
      expectedCount:1,
      statusCounts:{ Aplicar:validRows,Actualizar:0,'Actualizar opcional':0,'Ya completo':0,'Sin cambios':0,Omitir:0,Error:errors.length ? 1 : 0 },
      errors,
      warnings:[],
      safeSheets:errors.length ? {} : { [SHEET]:safeRows },
      optionalById:{},
      preview,
      mismatch:false,
      detectedDestination:null
    };
  };

  const previousApplyExcel = applyExcel;
  applyExcel = function dnfMethodologyApply(sheets) {
    const scope = window.__DOCFORMACION_TEMPLATE_IMPORT_SCOPE;
    if (scope !== SCOPE || !Array.isArray(sheets?.[SHEET])) return previousApplyExcel(sheets);
    const raw = sheets[SHEET][0] || {};
    const data = methodologyData();
    FIELDS.forEach(field => { data[field.key] = clean(raw[field.header]); });
    state.dnfMethodology = data;
    const flow = ensureFlow();
    flow.methodologyImported = true;
    flow.methodologyFileName = window.__DOCFORMACION_TEMPLATE_IMPORT_FILE || 'Plantilla Metodología DNF';
    flow.methodologyImportedAt = new Date().toISOString();
    flow.methodologyNeedsFingerprint = currentNeedsFingerprint();
  };

  // El contexto documental expone la metodología como dato único del período.
  const previousContext = window.docformacionDocumentContext;
  if (previousContext?.build) {
    const previousBuild = previousContext.build;
    window.docformacionDocumentContext = Object.freeze({
      ...previousContext,
      build() {
        const ctx = previousBuild();
        const flow = ensureFlow();
        return {
          ...ctx,
          methodology:{ ...methodologyData() },
          origins:{
            ...(ctx.origins || {}),
            methodology:flow.methodologyFileName || 'Metodología del diagnóstico pendiente'
          }
        };
      }
    });
  }

  // La sección Metodología y el documento DNF quedan bloqueados mientras esta fuente no esté confirmada.
  const previousValidation = window.docformacionValidation;
  if (previousValidation?.documentReadiness) {
    function sectionReadiness(type, section, ctxArg) {
      const ctx = ctxArg || window.docformacionDocumentContext?.build?.();
      const result = previousValidation.sectionReadiness(type, section, ctx);
      if (type !== 'dnf' || section?.id !== 'DNF-04-metodologia') return result;
      const methodology = methodologyState(ctx);
      return {
        ...result,
        ready:result.ready === true && methodology.ready,
        missing:[...new Set([...(result.missing || []), ...methodology.missing])],
        methodology
      };
    }

    function documentReadiness(type, ctxArg) {
      const ctx = ctxArg || window.docformacionDocumentContext?.build?.();
      const result = previousValidation.documentReadiness(type, ctx);
      const methodology = methodologyState(ctx);

      if (type === 'dnf') {
        const sections = (result.sections || []).map(item => item.id === 'DNF-04-metodologia'
          ? { ...item, ready:item.ready === true && methodology.ready, missing:[...new Set([...(item.missing || []), ...methodology.missing])] }
          : item);
        return {
          ...result,
          ready:result.ready === true && methodology.ready,
          missing:[...new Set([...(result.missing || []), ...methodology.missing])],
          sections,
          methodology
        };
      }

      if (type === 'plan' && !methodology.ready) {
        return { ...result, ready:false, missing:[...new Set([...(result.missing || []), 'DNF completa'])] };
      }
      if (type === 'informe' && !methodology.ready) {
        return { ...result, ready:false, missing:[...new Set([...(result.missing || []), 'Plan de Formación completo'])] };
      }
      return result;
    }

    window.docformacionValidation = Object.freeze({
      ...previousValidation,
      methodologyState,
      sectionReadiness,
      documentReadiness
    });
  }

  // Estado y acción directa en Información de DNF.
  const previousDocumentStatus = documentStatus;
  documentStatus = function dnfMethodologyDocumentStatus(type) {
    const result = previousDocumentStatus(type);
    if (type !== 'dnf') return result;
    const stateMethodology = methodologyState();
    if (stateMethodology.ready) return result;
    const issue = {
      kind:'dnf-template-methodology',
      text:stateMethodology.stale ? 'Actualizar la metodología del diagnóstico' : 'Cargar la metodología del diagnóstico',
      description:stateMethodology.stale
        ? 'La DNF cambió después de validar la metodología. Revisa y vuelve a cargar la plantilla metodológica.'
        : 'Registra cómo se recopiló, quién participó, qué fuentes se usaron, cómo se validó y dónde están las evidencias.',
      view:'doc-dnf'
    };
    const issues = [...(result.issues || [])];
    if (!issues.some(item => item.kind === issue.kind)) issues.push(issue);
    return { ...result, ready:false, issues, missing:[...new Set([...(result.missing || []), issue.text])] };
  };

  function methodologyButtons(enabled, hasCurrent) {
    return `<div class="toolbar excel-toolbar methodology-actions">
      <button type="button" class="secondary" data-methodology-template ${enabled ? '' : 'disabled'}>Descargar plantilla</button>
      <button type="button" class="secondary" data-methodology-current ${enabled && hasCurrent ? '' : 'disabled'}>Datos actuales</button>
      <button type="button" class="primary" data-methodology-import ${enabled ? '' : 'disabled'}>Subir plantilla</button>
    </div>`;
  }

  function bindMethodologyButtons(root = document) {
    root.querySelectorAll('[data-methodology-template]').forEach(button => button.onclick = () => exportTemplate(SCOPE, false));
    root.querySelectorAll('[data-methodology-current]').forEach(button => button.onclick = () => exportTemplate(SCOPE, true));
    root.querySelectorAll('[data-methodology-import]').forEach(button => button.onclick = () => importExcel(SCOPE));
  }

  function decorateDnfInfo() {
    const root = document.getElementById('content');
    const grid = root?.querySelector('.dnf-template-grid');
    if (!grid || grid.querySelector('[data-dnf-methodology-card]')) return;
    const ctx = window.docformacionDocumentContext?.build?.();
    const coreReady = window.docformacionValidation?.dnfCore?.(ctx)?.ready === true;
    const methodology = methodologyState(ctx);
    const flow = ensureFlow();
    const hasCurrent = FIELDS.some(field => clean(methodology.data?.[field.key]));
    const card = document.createElement('div');
    card.className = 'card dnf-template-card';
    card.dataset.dnfMethodologyCard = '1';
    card.innerHTML = `
      <div class="dnf-template-card-head">
        <div><strong>3. Metodología del diagnóstico</strong><span>${methodology.ready ? 'Cargada' : (coreReady ? 'Pendiente' : 'Bloqueada hasta completar DNF')}</span></div>
        <span class="status-badge ${methodology.ready ? 'ready' : 'blocked'}">${methodology.ready ? 'Lista' : 'Pendiente'}</span>
      </div>
      <p>${methodology.ready
        ? 'Levantamiento, participantes, fuentes, validación y evidencias registrados para el período.'
        : (coreReady ? 'Registra cómo se levantaron y validaron las necesidades del período.' : 'Primero completa Carreras y Detección de Necesidades.')}</p>
      ${flow.methodologyFileName ? `<div class="small muted">Último archivo: ${typeof esc === 'function' ? esc(flow.methodologyFileName) : clean(flow.methodologyFileName)}</div>` : ''}
      ${methodologyButtons(coreReady, hasCurrent)}`;
    grid.appendChild(card);

    root.querySelectorAll('.issue-line').forEach(line => {
      const text = clean(line.textContent).toLowerCase();
      if (!text.includes('metodología del diagnóstico') || line.querySelector('.methodology-issue-actions')) return;
      const actions = document.createElement('div');
      actions.className = 'issue-line-actions methodology-issue-actions';
      actions.innerHTML = methodologyButtons(coreReady, hasCurrent);
      line.appendChild(actions);
    });
    bindMethodologyButtons(root);
  }

  const previousRenderDocumentView = renderDocumentView;
  renderDocumentView = function dnfMethodologyDocumentView(type) {
    const result = previousRenderDocumentView(type);
    if (type === 'dnf') decorateDnfInfo();
    return result;
  };

  // Sustituye el antiguo párrafo genérico de metodología por la plantilla trazable solicitada.
  const previousRenderers = window.docformacionSectionRenderers;
  if (previousRenderers?.render) {
    window.docformacionSectionRenderers = Object.freeze({
      ...previousRenderers,
      __dnfMethodology:true,
      render(type, section, writer, ctx) {
        if (type !== 'dnf' || section?.id !== 'DNF-04-metodologia') {
          return previousRenderers.render(type, section, writer, ctx);
        }
        const metrics = window.docformacionDocumentCalculations?.dnf?.(ctx) || {};
        const totalActive = Number(ctx.careers?.length || 0);
        const diagnosed = Number(metrics.diagnosed || 0);
        const coverage = Number(metrics.coverage || 0);
        const coverageText = Number.isInteger(coverage)
          ? String(coverage)
          : coverage.toLocaleString('es-EC', { maximumFractionDigits:2 });
        const data = ctx.methodology || methodologyData();

        writer.paragraph('El diagnóstico adopta un enfoque institucional, descriptivo y de priorización. La unidad de análisis es cada necesidad concreta de formación asociada a una carrera activa.');
        writer.heading('Cobertura y fuentes', 2);
        writer.paragraph('El diagnóstico comprende ' + totalActive + ' carreras activas del período ' + ctx.period.label + '. Se registraron necesidades de formación académica en ' + diagnosed + ' carreras, lo que representa una cobertura del ' + coverageText + ' % de las carreras activas.');
        writer.paragraph('La información se recopiló mediante ' + (clean(data.method) || '—') + ', durante ' + (clean(data.dates) || '—') + ', con la participación de ' + (clean(data.participants) || '—') + '. Se utilizaron como fuentes ' + (clean(data.sources) || '—') + '.');
        writer.paragraph('La revisión y validación de las necesidades estuvo a cargo de ' + (clean(data.validationResponsible) || '—') + ', mediante ' + (clean(data.validationMechanism) || '—') + '. Los respaldos del proceso se identifican en ' + (clean(data.evidenceReference) || '—') + '.');
        writer.paragraph('La cobertura reportada corresponde a carreras con necesidades registradas; la participación docente se informa por separado.');
      }
    });
  }

  function injectStyles() {
    if (document.getElementById('dnfMethodologyStyles')) return;
    const style = document.createElement('style');
    style.id = 'dnfMethodologyStyles';
    style.textContent = `.methodology-actions{display:flex;gap:4px;flex-wrap:wrap}.methodology-actions button{font-size:9px!important;padding:7px 9px!important}.methodology-issue-actions{margin-top:6px}`;
    document.head.appendChild(style);
  }

  injectStyles();
  ensureFlow();
  methodologyData();
  window.docformacionDnfMethodology = Object.freeze({
    scope:SCOPE,
    fields:FIELDS,
    data:() => ({ ...methodologyData() }),
    readiness:methodologyState
  });
})();