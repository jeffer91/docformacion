(() => {
  'use strict';

  const SCOPE = 'dnf-metodologia';
  const SHEET = 'METODOLOGIA';
  const FLOW_VERSION = 4;
  const SCHEMA_VERSION = 4;
  const HEADERS = Object.freeze([
    'BLOQUE',
    'CAMPO',
    'SELECCION',
    'PORCENTAJE',
    'VALOR_DETALLE',
    'DESCRIPCION_APLICACION'
  ]);
  const DESCRIPTIONS = Object.freeze([
    'No modificar. Identifica el bloque metodológico de cada fila.',
    'No modificar en filas precargadas. En filas “Otro/Otra”, especifica el nombre en VALOR_DETALLE.',
    'Para TÉCNICAS y FUENTES escribe SI cuando se utilizó. Puede quedar vacío cuando no aplique.',
    'Solo para PARTICIPANTES. Registra porcentajes, no cantidades. La suma debe ser exactamente 100%.',
    'Escribe aquí el contenido solicitado, fechas, nombre de Otro/Otra o texto metodológico.',
    'Obligatoria para cada técnica seleccionada: explica brevemente cómo se aplicó durante la detección de necesidades.'
  ]);

  const PARTICIPANT_PRESETS = Object.freeze(['Docentes', 'Coordinadores', 'Autoridades', 'UGPA']);
  const TECHNIQUE_PRESETS = Object.freeze([
    'Encuesta',
    'Reuniones académicas',
    'Focus group',
    'Entrevistas',
    'Revisión documental',
    'Mesa técnica'
  ]);
  const SOURCE_PRESETS = Object.freeze([
    'Resultados de encuestas',
    'Reuniones académicas',
    'Documentos curriculares',
    'Informes académicos y de seguimiento',
    'Planificación institucional (PEDI/POA)',
    'Resultados de evaluación y calidad'
  ]);

  const DETECTION_CRITERIA = 'Se reconoce una necesidad de formación cuando la evidencia del diagnóstico muestra una brecha o requerimiento de fortalecimiento vinculado con una carrera activa, pertinente para el desarrollo académico y susceptible de atención mediante formación docente. La necesidad debe formularse de manera concreta, evitar duplicidades y mantener correspondencia con la realidad académica identificada.';
  const PRIORITY_CRITERIA = 'La prioridad institucional se registra como Alta, Media o Baja. Alta corresponde a necesidades de atención preferente para el Plan de Formación; Media a necesidades que pueden programarse progresivamente o articularse con acciones transversales; y Baja a necesidades complementarias que pueden atenderse en una etapa posterior.';

  const clean = value => String(value ?? '').trim();
  const norm = value => clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ');
  const upperKey = value => clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, '_');
  const uniqueText = values => {
    const seen = new Set();
    return (values || []).map(clean).filter(value => {
      const key = norm(value);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  function cloneMethodology(data) {
    return {
      ...data,
      participants:(data.participants || []).map(item => ({ ...item })),
      techniques:(data.techniques || []).map(item => ({ ...item })),
      sources:[...(data.sources || [])]
    };
  }

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

  function emptyData() {
    return {
      schemaVersion:SCHEMA_VERSION,
      approach:'',
      startDate:'',
      endDate:'',
      instruments:'',
      participants:[],
      techniques:[],
      sources:[],
      liftingProcedure:'',
      analysisProcedure:'',
      validationResponsible:'',
      validationMechanism:'',
      evidenceDescription:''
    };
  }

  function normalizeParticipant(item) {
    const actor = clean(item?.actor ?? item?.name);
    const percentage = Number(item?.percentage ?? item?.percent ?? 0);
    return actor && Number.isFinite(percentage) && percentage > 0 ? { actor, percentage } : null;
  }

  function normalizeTechnique(item) {
    if (typeof item === 'string') return clean(item) ? { name:clean(item), description:'' } : null;
    const name = clean(item?.name ?? item?.technique);
    const description = clean(item?.description ?? item?.application);
    return name ? { name, description } : null;
  }

  function normalizeStoredData(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const data = emptyData();
    data.approach = clean(source.approach);
    data.startDate = clean(source.startDate);
    data.endDate = clean(source.endDate);
    data.instruments = clean(source.instruments);
    data.participants = Array.isArray(source.participants)
      ? source.participants.map(normalizeParticipant).filter(Boolean)
      : [];
    data.techniques = Array.isArray(source.techniques)
      ? source.techniques.map(normalizeTechnique).filter(Boolean)
      : [];
    data.sources = Array.isArray(source.sources)
      ? uniqueText(source.sources)
      : (clean(source.sources) ? [clean(source.sources)] : []);
    data.liftingProcedure = clean(source.liftingProcedure || source.method);
    data.analysisProcedure = clean(source.analysisProcedure);
    data.validationResponsible = clean(source.validationResponsible);
    data.validationMechanism = clean(source.validationMechanism);
    data.evidenceDescription = clean(source.evidenceDescription || source.evidenceReference);
    return data;
  }

  function methodologyData() {
    state.dnfMethodology = normalizeStoredData(state.dnfMethodology);
    return state.dnfMethodology;
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

  function parsePercentage(value) {
    if (value === null || value === undefined || clean(value) === '') return 0;
    const raw = clean(value).replace(',', '.');
    const hasPercent = raw.includes('%');
    const numeric = Number(raw.replace('%', ''));
    if (!Number.isFinite(numeric)) return NaN;
    if (!hasPercent && numeric > 0 && numeric < 1) return numeric * 100;
    return numeric;
  }

  function normalizeDate(value) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
    if (typeof value === 'number' && Number.isFinite(value) && value > 20000) {
      const date = new Date(Math.round((value - 25569) * 86400 * 1000));
      if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
    }
    const text = clean(value);
    if (!text) return '';
    let match = text.match(/^(\d{4})[-\/]([01]?\d)[-\/]([0-3]?\d)$/);
    if (match) return [match[1], String(match[2]).padStart(2, '0'), String(match[3]).padStart(2, '0')].join('-');
    match = text.match(/^([0-3]?\d)[-\/]([01]?\d)[-\/](\d{4})$/);
    if (match) return [match[3], String(match[2]).padStart(2, '0'), String(match[1]).padStart(2, '0')].join('-');
    return text;
  }

  function selectedFlag(value) {
    return ['si', 'sí', 's', 'x', '1', 'true', 'seleccionado', 'seleccionada'].includes(norm(value));
  }

  function dateIsValid(value) {
    const text = clean(value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
    const date = new Date(text + 'T00:00:00');
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === text;
  }

  function validateMethodologyData(dataArg) {
    const data = normalizeStoredData(dataArg);
    const errors = [];
    const required = [
      ['approach', 'enfoque metodológico'],
      ['startDate', 'fecha de inicio del levantamiento'],
      ['endDate', 'fecha de fin del levantamiento'],
      ['instruments', 'instrumentos utilizados'],
      ['liftingProcedure', 'procedimiento de levantamiento'],
      ['analysisProcedure', 'procedimiento de análisis'],
      ['validationResponsible', 'responsable de validación'],
      ['validationMechanism', 'mecanismo de validación'],
      ['evidenceDescription', 'evidencias del diagnóstico']
    ];
    required.forEach(([key, label]) => {
      if (!clean(data[key])) errors.push('Falta ' + label + '.');
    });

    if (clean(data.startDate) && !dateIsValid(data.startDate)) errors.push('La fecha de inicio del levantamiento no es válida.');
    if (clean(data.endDate) && !dateIsValid(data.endDate)) errors.push('La fecha de fin del levantamiento no es válida.');
    if (dateIsValid(data.startDate) && dateIsValid(data.endDate) && data.startDate > data.endDate) {
      errors.push('La fecha de inicio del levantamiento no puede ser posterior a la fecha de fin.');
    }

    const participantTotal = data.participants.reduce((sum, item) => sum + Number(item.percentage || 0), 0);
    if (!data.participants.length) errors.push('Registra la participación porcentual de al menos un tipo de actor.');
    data.participants.forEach(item => {
      if (!Number.isFinite(Number(item.percentage)) || Number(item.percentage) <= 0 || Number(item.percentage) > 100) {
        errors.push('El porcentaje de ' + (item.actor || 'participante') + ' debe ser mayor que 0 y máximo 100%.');
      }
    });
    if (data.participants.length && Math.abs(participantTotal - 100) > 0.01) {
      errors.push('Los porcentajes de participantes suman ' + participantTotal.toLocaleString('es-EC', { maximumFractionDigits:2 }) + '%. Deben sumar exactamente 100%.');
    }

    if (!data.techniques.length) errors.push('Selecciona al menos una técnica de levantamiento.');
    data.techniques.forEach(item => {
      if (!clean(item.description)) errors.push('La técnica “' + item.name + '” está seleccionada pero falta describir cómo se aplicó.');
    });
    if (!data.sources.length) errors.push('Selecciona al menos una fuente de información.');

    return { ready:errors.length === 0, errors, participantTotal, data };
  }

  function row(block, field, selection = '', percentage = '', value = '', description = '') {
    return [block, field, selection, percentage, value, description];
  }

  function currentParticipantMap(data) {
    return new Map((data.participants || []).map(item => [norm(item.actor), item]));
  }

  function currentTechniqueMap(data) {
    return new Map((data.techniques || []).map(item => [norm(item.name), item]));
  }

  function currentSourceSet(data) {
    return new Set((data.sources || []).map(norm));
  }

  function templateRows(includeData) {
    const data = methodologyData();
    const rows = [
      row('GENERAL', 'ENFOQUE_METODOLOGICO', '', '', includeData ? data.approach : ''),
      row('GENERAL', 'FECHA_INICIO_LEVANTAMIENTO', '', '', includeData ? data.startDate : ''),
      row('GENERAL', 'FECHA_FIN_LEVANTAMIENTO', '', '', includeData ? data.endDate : ''),
      row('GENERAL', 'INSTRUMENTOS_UTILIZADOS', '', '', includeData ? data.instruments : '')
    ];

    const participantMap = currentParticipantMap(data);
    PARTICIPANT_PRESETS.forEach(actor => {
      const current = participantMap.get(norm(actor));
      rows.push(row('PARTICIPANTE', actor, '', includeData && current ? current.percentage : ''));
    });
    const customParticipants = includeData
      ? (data.participants || []).filter(item => !PARTICIPANT_PRESETS.some(preset => norm(preset) === norm(item.actor)))
      : [];
    customParticipants.forEach(item => rows.push(row('PARTICIPANTE', 'Otro', '', item.percentage, item.actor)));
    rows.push(row('PARTICIPANTE', 'Otro', '', '', ''));

    const techniqueMap = currentTechniqueMap(data);
    TECHNIQUE_PRESETS.forEach(name => {
      const current = techniqueMap.get(norm(name));
      rows.push(row('TECNICA', name, includeData && current ? 'SI' : '', '', '', includeData && current ? current.description : ''));
    });
    const customTechniques = includeData
      ? (data.techniques || []).filter(item => !TECHNIQUE_PRESETS.some(preset => norm(preset) === norm(item.name)))
      : [];
    customTechniques.forEach(item => rows.push(row('TECNICA', 'Otra', 'SI', '', item.name, item.description)));
    rows.push(row('TECNICA', 'Otra', '', '', '', ''));

    const sourceSet = currentSourceSet(data);
    SOURCE_PRESETS.forEach(name => rows.push(row('FUENTE', name, includeData && sourceSet.has(norm(name)) ? 'SI' : '')));
    const customSources = includeData
      ? (data.sources || []).filter(item => !SOURCE_PRESETS.some(preset => norm(preset) === norm(item)))
      : [];
    customSources.forEach(item => rows.push(row('FUENTE', 'Otra', 'SI', '', item)));
    rows.push(row('FUENTE', 'Otra', '', '', ''));

    rows.push(
      row('PROCEDIMIENTO', 'PROCEDIMIENTO_LEVANTAMIENTO', '', '', includeData ? data.liftingProcedure : ''),
      row('PROCEDIMIENTO', 'PROCEDIMIENTO_ANALISIS', '', '', includeData ? data.analysisProcedure : ''),
      row('VALIDACION', 'RESPONSABLE_VALIDACION', '', '', includeData ? data.validationResponsible : ''),
      row('VALIDACION', 'MECANISMO_VALIDACION', '', '', includeData ? data.validationMechanism : ''),
      row('EVIDENCIA', 'EVIDENCIAS_DIAGNOSTICO', '', '', includeData ? data.evidenceDescription : '')
    );
    return rows;
  }

  function isInstructionRow(raw) {
    const block = norm(raw?.BLOQUE);
    const field = norm(raw?.CAMPO);
    return block.includes('identifica el bloque') || field.includes('no modificar en filas');
  }

  function parseRows(rawRows) {
    const data = emptyData();
    const structuralErrors = [];
    const warnings = [];
    const recognizedRows = [];
    const validBlocks = new Set(['GENERAL', 'PARTICIPANTE', 'TECNICA', 'FUENTE', 'PROCEDIMIENTO', 'VALIDACION', 'EVIDENCIA']);

    (rawRows || []).forEach((raw, index) => {
      if (!raw || isInstructionRow(raw)) return;
      const block = upperKey(raw.BLOQUE);
      const field = clean(raw.CAMPO);
      if (!block && !field) return;
      if (!validBlocks.has(block)) {
        structuralErrors.push('Fila ' + (index + 2) + ': BLOQUE no reconocido (' + (clean(raw.BLOQUE) || 'vacío') + ').');
        return;
      }
      recognizedRows.push(raw);
      const fieldKey = upperKey(field);
      const value = clean(raw.VALOR_DETALLE);
      const description = clean(raw.DESCRIPCION_APLICACION);

      if (block === 'GENERAL') {
        if (fieldKey === 'ENFOQUE_METODOLOGICO') data.approach = value;
        else if (fieldKey === 'FECHA_INICIO_LEVANTAMIENTO') data.startDate = normalizeDate(value);
        else if (fieldKey === 'FECHA_FIN_LEVANTAMIENTO') data.endDate = normalizeDate(value);
        else if (fieldKey === 'INSTRUMENTOS_UTILIZADOS') data.instruments = value;
        else structuralErrors.push('Fila ' + (index + 2) + ': campo GENERAL no reconocido (' + field + ').');
        return;
      }

      if (block === 'PARTICIPANTE') {
        const percentage = parsePercentage(raw.PORCENTAJE);
        const isOther = norm(field).startsWith('otro');
        const actor = isOther ? value : field;
        if (Number.isNaN(percentage)) {
          structuralErrors.push('Fila ' + (index + 2) + ': porcentaje inválido para ' + (actor || field || 'participante') + '.');
          return;
        }
        if (percentage > 0 && !actor) {
          structuralErrors.push('Fila ' + (index + 2) + ': especifica el nombre del participante “Otro” en VALOR_DETALLE.');
          return;
        }
        if (percentage > 0) data.participants.push({ actor, percentage });
        return;
      }

      if (block === 'TECNICA') {
        if (!selectedFlag(raw.SELECCION)) return;
        const isOther = norm(field).startsWith('otra');
        const name = isOther ? value : field;
        if (!name) {
          structuralErrors.push('Fila ' + (index + 2) + ': especifica la técnica “Otra” en VALOR_DETALLE.');
          return;
        }
        data.techniques.push({ name, description });
        return;
      }

      if (block === 'FUENTE') {
        if (!selectedFlag(raw.SELECCION)) return;
        const isOther = norm(field).startsWith('otra');
        const name = isOther ? value : field;
        if (!name) {
          structuralErrors.push('Fila ' + (index + 2) + ': especifica la fuente “Otra” en VALOR_DETALLE.');
          return;
        }
        data.sources.push(name);
        return;
      }

      if (block === 'PROCEDIMIENTO') {
        if (fieldKey === 'PROCEDIMIENTO_LEVANTAMIENTO') data.liftingProcedure = value;
        else if (fieldKey === 'PROCEDIMIENTO_ANALISIS') data.analysisProcedure = value;
        else structuralErrors.push('Fila ' + (index + 2) + ': procedimiento no reconocido (' + field + ').');
        return;
      }

      if (block === 'VALIDACION') {
        if (fieldKey === 'RESPONSABLE_VALIDACION') data.validationResponsible = value;
        else if (fieldKey === 'MECANISMO_VALIDACION') data.validationMechanism = value;
        else structuralErrors.push('Fila ' + (index + 2) + ': campo de validación no reconocido (' + field + ').');
        return;
      }

      if (block === 'EVIDENCIA') {
        if (fieldKey === 'EVIDENCIAS_DIAGNOSTICO') data.evidenceDescription = value;
        else structuralErrors.push('Fila ' + (index + 2) + ': campo de evidencia no reconocido (' + field + ').');
      }
    });

    data.sources = uniqueText(data.sources);
    data.techniques = data.techniques.filter((item, index, list) => list.findIndex(other => norm(other.name) === norm(item.name)) === index);
    data.participants = data.participants.filter((item, index, list) => list.findIndex(other => norm(other.actor) === norm(item.actor)) === index);
    const validation = validateMethodologyData(data);
    return {
      data:validation.data,
      participantTotal:validation.participantTotal,
      errors:[...structuralErrors, ...validation.errors],
      warnings,
      recognizedRows
    };
  }

  function methodologyState(ctxArg) {
    const ctx = ctxArg || window.docformacionDocumentContext?.build?.();
    const flow = ensureFlow();
    const data = normalizeStoredData(ctx?.methodology || methodologyData());
    const validation = validateMethodologyData(data);
    const fingerprint = currentNeedsFingerprint(ctx);
    const stale = flow.methodologyImported === true && !!fingerprint && flow.methodologyNeedsFingerprint !== fingerprint;
    const missing = [...validation.errors];
    if (flow.methodologyImported !== true) missing.unshift('Carga y confirma la plantilla metodológica de la Detección de Necesidades.');
    if (stale) missing.push('La DNF cambió después de validar la metodología; vuelve a revisar y cargar la plantilla metodológica.');
    return {
      ready:flow.methodologyImported === true && validation.ready && !stale,
      imported:flow.methodologyImported === true,
      stale,
      missingFields:validation.errors,
      missing,
      participantTotal:validation.participantTotal,
      data
    };
  }

  const previousExcelTemplatePayload = excelTemplatePayload;
  excelTemplatePayload = function dnfMethodologyTemplate(scope, includeData) {
    if (scope !== SCOPE) return previousExcelTemplatePayload(scope, includeData);
    return {
      filename:(includeData ? 'UGPA_Datos_Actuales_Metodologia_DNF_' : 'UGPA_Plantilla_Metodologia_DNF_') + periodSlug() + '.xlsx',
      sheets:[simpleSheet(SHEET, HEADERS, DESCRIPTIONS, templateRows(includeData), [18,34,14,16,58,72])]
    };
  };

  const previousAnalyzeExcelImport = analyzeExcelImport;
  analyzeExcelImport = function dnfMethodologyAnalyze(scope, result, type = '', kind = '') {
    if (kind || scope !== SCOPE) return previousAnalyzeExcelImport(scope, result, type, kind);

    const sheets = result?.sheets || {};
    const detected = Object.keys(sheets).filter(name => Array.isArray(sheets[name]) && sheets[name].length);
    const rawRows = Array.isArray(sheets[SHEET]) ? sheets[SHEET] : [];
    const errors = [];
    const warnings = [];
    const ctx = window.docformacionDocumentContext?.build?.();
    const dnfCore = window.docformacionValidation?.dnfCore?.(ctx);

    if (!dnfCore?.ready) errors.push('Primero completa y confirma Carreras y Detección de Necesidades del período.');
    if (!detected.includes(SHEET)) errors.push('La plantilla debe contener únicamente la hoja ' + SHEET + '.');
    const extras = detected.filter(name => name !== SHEET);
    if (extras.length) errors.push('Esta carga es independiente. Retira las otras hojas: ' + extras.join(', ') + '.');

    const legacy = rawRows.some(raw => Object.prototype.hasOwnProperty.call(raw || {}, 'METODO_RECOLECCION'));
    if (legacy) errors.push('Esta es una versión anterior de la plantilla metodológica. Descarga la plantilla nueva y registra la metodología por bloques.');

    const parsed = legacy ? { data:emptyData(), errors:[], warnings:[], recognizedRows:[] } : parseRows(rawRows);
    errors.push(...parsed.errors);
    warnings.push(...parsed.warnings);

    const preview = (parsed.recognizedRows || []).map((raw, index) => ({
      id:'dnf-methodology-' + index,
      sheet:SHEET,
      row:raw,
      status:errors.length ? 'Error' : 'Aplicar',
      valid:errors.length === 0,
      optional:false,
      reason:clean(raw.BLOQUE) + ' · ' + clean(raw.CAMPO)
    }));

    const validRows = errors.length ? 0 : (parsed.recognizedRows || []).length;
    return {
      context:{ label:'Metodología de la Detección de Necesidades', scope:SCOPE, kind:'' },
      filePath:result?.filePath || 'Archivo Excel',
      detected,
      allowed:[SHEET],
      compatibleSheets:detected.includes(SHEET) ? [SHEET] : [],
      incompatibleSheets:detected.filter(name => name !== SHEET),
      totalRows:preview.length,
      validRows,
      optionalRows:0,
      ignoredRows:0,
      errorRows:errors.length ? Math.max(1, preview.length || 1) : 0,
      matchedRows:validRows,
      expectedCount:validRows,
      statusCounts:{ Aplicar:validRows,Actualizar:0,'Actualizar opcional':0,'Ya completo':0,'Sin cambios':0,Omitir:0,Error:errors.length ? Math.max(1, preview.length || 1) : 0 },
      errors,
      warnings,
      safeSheets:errors.length ? {} : { [SHEET]:rawRows },
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
    const parsed = parseRows(sheets[SHEET]);
    if (parsed.errors.length) throw new Error('La metodología contiene errores: ' + parsed.errors.join(' '));
    state.dnfMethodology = cloneMethodology(parsed.data);
    const flow = ensureFlow();
    flow.methodologyImported = true;
    flow.methodologyFileName = window.__DOCFORMACION_TEMPLATE_IMPORT_FILE || 'Plantilla Metodología DNF';
    flow.methodologyImportedAt = new Date().toISOString();
    flow.methodologyNeedsFingerprint = currentNeedsFingerprint();
  };

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
          methodology:cloneMethodology(methodologyData()),
          origins:{
            ...(ctx.origins || {}),
            methodology:flow.methodologyFileName || 'Metodología de la Detección de Necesidades pendiente'
          }
        };
      }
    });
  }

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

  const previousDocumentStatus = documentStatus;
  documentStatus = function dnfMethodologyDocumentStatus(type) {
    const result = previousDocumentStatus(type);
    if (type !== 'dnf') return result;
    const stateMethodology = methodologyState();
    if (stateMethodology.ready) return result;
    const issue = {
      kind:'dnf-template-methodology',
      text:stateMethodology.stale ? 'Actualizar la metodología de la Detección de Necesidades' : 'Cargar la metodología de la Detección de Necesidades',
      description:stateMethodology.stale
        ? 'La DNF cambió después de validar la metodología. Revisa y vuelve a cargar la plantilla metodológica.'
        : 'Registra enfoque, participación porcentual, técnicas, fuentes, procedimientos, validación y evidencias del diagnóstico.',
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

  function hasCurrentData(dataArg) {
    const data = normalizeStoredData(dataArg);
    return !!(
      clean(data.approach) || clean(data.startDate) || clean(data.endDate) || clean(data.instruments) ||
      data.participants.length || data.techniques.length || data.sources.length ||
      clean(data.liftingProcedure) || clean(data.analysisProcedure) || clean(data.validationResponsible) ||
      clean(data.validationMechanism) || clean(data.evidenceDescription)
    );
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
    const hasCurrent = hasCurrentData(methodology.data);
    const card = document.createElement('div');
    card.className = 'card dnf-template-card';
    card.dataset.dnfMethodologyCard = '1';
    card.innerHTML = `
      <div class="dnf-template-card-head">
        <div><strong>3. Metodología de la Detección de Necesidades</strong><span>${methodology.ready ? 'Cargada' : (coreReady ? 'Pendiente' : 'Bloqueada hasta completar DNF')}</span></div>
        <span class="status-badge ${methodology.ready ? 'ready' : 'blocked'}">${methodology.ready ? 'Lista' : 'Pendiente'}</span>
      </div>
      <p>${methodology.ready
        ? 'Metodología del diagnóstico registrada: participantes 100%, técnicas, fuentes, procedimientos, validación y evidencias.'
        : (coreReady ? 'Completa la metodología real con la que se detectaron y validaron las necesidades del período.' : 'Primero completa Carreras y Detección de Necesidades.')}</p>
      ${flow.methodologyFileName ? `<div class="small muted">Último archivo: ${typeof esc === 'function' ? esc(flow.methodologyFileName) : clean(flow.methodologyFileName)}</div>` : ''}
      ${methodologyButtons(coreReady, hasCurrent)}`;
    grid.appendChild(card);

    root.querySelectorAll('.issue-line').forEach(line => {
      const text = clean(line.textContent).toLowerCase();
      if (!text.includes('metodología') || line.querySelector('.methodology-issue-actions')) return;
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

  function humanDate(value) {
    const text = clean(value);
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? match[3] + '/' + match[2] + '/' + match[1] : text;
  }

  function percentageText(value) {
    return Number(value || 0).toLocaleString('es-EC', { maximumFractionDigits:2 }) + '%';
  }

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
        const data = normalizeStoredData(ctx.methodology || methodologyData());
        const totalActive = Number(ctx.careers?.length || 0);
        const diagnosed = Number(metrics.diagnosed || 0);
        const coverage = Number(metrics.coverage || 0);
        const coverageText = Number.isInteger(coverage)
          ? String(coverage)
          : coverage.toLocaleString('es-EC', { maximumFractionDigits:2 });

        writer.heading('Enfoque metodológico', 2);
        writer.paragraph(data.approach);

        writer.heading('Participantes del diagnóstico', 2);
        writer.paragraph('La participación se registra exclusivamente en términos porcentuales; no se incorporan cantidades individuales de personas en esta sección.');
        writer.table(
          ['Actor','Participación'],
          data.participants.map(item => [item.actor, percentageText(item.percentage)]),
          [72,28]
        );

        writer.heading('Técnicas de levantamiento', 2);
        writer.table(
          ['Técnica','Aplicación durante la detección'],
          data.techniques.map(item => [item.name, item.description]),
          [30,70]
        );

        writer.heading('Fuentes de información', 2);
        data.sources.forEach(writer.bullet);

        writer.heading('Período e instrumentos de levantamiento', 2);
        writer.paragraph('El levantamiento se desarrolló entre el ' + humanDate(data.startDate) + ' y el ' + humanDate(data.endDate) + '. Los instrumentos utilizados fueron: ' + data.instruments + '.');

        writer.heading('Procedimiento de levantamiento', 2);
        writer.paragraph(data.liftingProcedure);

        writer.heading('Procedimiento de análisis e identificación de necesidades', 2);
        writer.paragraph(data.analysisProcedure);

        writer.heading('Criterios institucionales de identificación y priorización', 2);
        writer.paragraph(DETECTION_CRITERIA);
        writer.paragraph(PRIORITY_CRITERIA);

        writer.heading('Validación institucional', 2);
        writer.paragraph('La validación estuvo a cargo de ' + data.validationResponsible + '. El mecanismo aplicado fue: ' + data.validationMechanism + '.');
        writer.paragraph('Como control técnico adicional, DocFormación verifica la estructura de los archivos, la correspondencia con carreras activas, campos obligatorios, duplicidades y valores de prioridad antes de consolidar la información.');

        writer.heading('Evidencias del diagnóstico', 2);
        writer.paragraph(data.evidenceDescription);

        writer.heading('Procesamiento, consolidación y trazabilidad', 2);
        writer.paragraph('La aplicación consolida únicamente registros válidos y calcula los indicadores desde una fuente única de datos. Para el período ' + ctx.period.label + ', se registraron necesidades en ' + diagnosed + ' de ' + totalActive + ' carreras activas, equivalente a una cobertura diagnóstica de ' + coverageText + '%. La trazabilidad entre diagnóstico, Plan e Informe se conserva mediante identificadores internos persistentes y el análisis de convergencia temática se calcula a partir del contenido de las necesidades registradas.');
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
    sheet:SHEET,
    headers:HEADERS,
    participantPresets:PARTICIPANT_PRESETS,
    techniquePresets:TECHNIQUE_PRESETS,
    sourcePresets:SOURCE_PRESETS,
    detectionCriteria:DETECTION_CRITERIA,
    priorityCriteria:PRIORITY_CRITERIA,
    data:() => cloneMethodology(methodologyData()),
    readiness:methodologyState,
    validate:validateMethodologyData,
    parseRows,
    templateRows
  });
})();