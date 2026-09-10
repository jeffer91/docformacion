(() => {
  'use strict';

  const BUILD = '20260910-1505';
  const PROGRAMS = ['Técnico Superior','Tecnología Superior','Tecnología Universitaria'];
  const PRIORITIES = ['Alta','Media','Baja'];
  const MODALITIES = ['Presencial','Virtual','Híbrida'];
  const SUPPORTS = ['Sin apoyo económico','Económico','Convenio / beca','Gestión interna'];
  const FOLLOW_STATUSES = ['No iniciado','En proceso','Finalizado','No ejecutado'];
  const RESPONSIBLE = {
    preparedBy: 'Mgs. Jefferson Villarreal',
    preparedRole: 'Gestor de Procesos Académicos',
    reviewedBy: 'Ing. Martha Tomalá',
    reviewedRole: 'Coordinadora General de Carreras',
    approvedBy: 'Dr. Alex León',
    approvedRole: 'Vicerrector'
  };

  const clean = value => String(value ?? '').trim();
  const key = value => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ');
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const pctValue = (part,total) => total ? part * 100 / total : 0;
  const pctLabel = value => Number(value || 0).toLocaleString('es-EC',{maximumFractionDigits:1}) + '%';

  function periodSlug() {
    const a = clean(state?.period?.start).replace(/[^0-9-]/g,'');
    const b = clean(state?.period?.end).replace(/[^0-9-]/g,'');
    return [a,b].filter(Boolean).join('_a_') || 'periodo';
  }

  function periodLabelText() {
    const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const fmt = value => {
      const m = clean(value).match(/^(\d{4})-(\d{2})/);
      if (!m) return clean(value);
      return (months[Number(m[2])-1] || m[2]) + ' ' + m[1];
    };
    const a = fmt(state?.period?.start), b = fmt(state?.period?.end);
    return a && b ? a + ' a ' + b : (a || b || 'Período seleccionado');
  }

  function ensureInstitutionalPeriodData() {
    if (!state.period) state.period = {};
    Object.assign(state.period, RESPONSIBLE);
    if (typeof syncPeriodCodes === 'function') syncPeriodCodes(state.period);
  }

  function careerStatus(name) {
    const k = typeof careerKey === 'function' ? careerKey(name) : key(name);
    const raw = clean(state?.section7?.careerStatus?.[k]?.status);
    return raw === 'Activa' || raw === 'Inactiva' ? raw : 'Inactiva';
  }

  function activeCareers() {
    return (state.careers || []).filter(c => careerStatus(c.name) === 'Activa');
  }

  function careerFingerprint() {
    return (state.careers || [])
      .map(c => [clean(c.name),clean(c.program),careerStatus(c.name)].join('|'))
      .sort((a,b)=>a.localeCompare(b,'es'))
      .join('||');
  }

  function dnfFlow() {
    state.dnfTemplateFlow = state.dnfTemplateFlow && typeof state.dnfTemplateFlow === 'object' ? state.dnfTemplateFlow : {};
    return state.dnfTemplateFlow;
  }

  function workflow() {
    state.workflowV3 = state.workflowV3 && typeof state.workflowV3 === 'object' ? state.workflowV3 : {};
    const w = state.workflowV3;
    if (!Object.prototype.hasOwnProperty.call(w,'version')) w.version = 3;
    if (!Object.prototype.hasOwnProperty.call(w,'planImported')) w.planImported = false;
    if (!Object.prototype.hasOwnProperty.call(w,'planFileName')) w.planFileName = '';
    if (!Object.prototype.hasOwnProperty.call(w,'planImportedAt')) w.planImportedAt = '';
    if (!Object.prototype.hasOwnProperty.call(w,'planSourceFingerprint')) w.planSourceFingerprint = '';
    if (!Object.prototype.hasOwnProperty.call(w,'reportImported')) w.reportImported = false;
    if (!Object.prototype.hasOwnProperty.call(w,'reportFileName')) w.reportFileName = '';
    if (!Object.prototype.hasOwnProperty.call(w,'reportImportedAt')) w.reportImportedAt = '';
    if (!Object.prototype.hasOwnProperty.call(w,'reportSourceFingerprint')) w.reportSourceFingerprint = '';
    return w;
  }

  function careerCatalogReady() {
    const flow = dnfFlow();
    const fp = careerFingerprint();
    return flow.careersImported === true && !!fp && flow.careersFingerprint === fp && activeCareers().length > 0;
  }

  function allocateCode(careerIndex, needIndex, used) {
    let n = needIndex + 1;
    let candidate = '';
    do {
      candidate = 'DNF-' + String(careerIndex + 1).padStart(2,'0') + '-' + String(n).padStart(2,'0');
      n++;
    } while (used.has(candidate));
    return candidate;
  }

  function needs() {
    const used = new Set();
    const rows = [];
    let changed = false;
    activeCareers().forEach((career, careerIndex) => {
      const items = typeof ensureNeedItems === 'function' ? ensureNeedItems(career.name) : [];
      items.filter(item => clean(item?.text)).forEach((item, needIndex) => {
        let code = clean(item.dnfCode);
        if (!code || used.has(code)) {
          code = allocateCode(careerIndex,needIndex,used);
          item.dnfCode = code;
          changed = true;
        }
        used.add(code);
        rows.push({
          code,
          career: clean(career.name),
          program: clean(career.program),
          need: clean(item.text),
          priority: PRIORITIES.includes(clean(item.priorityOverride)) ? clean(item.priorityOverride) : ''
        });
      });
    });
    if (changed) queueSave();
    return rows;
  }

  let saveQueued = false;
  function queueSave() {
    if (saveQueued || typeof save !== 'function') return;
    saveQueued = true;
    setTimeout(async () => {
      try { await save(); } catch (_e) {} finally { saveQueued = false; }
    }, 0);
  }

  function needsFingerprint() {
    return needs().map(r => [r.code,r.career,r.need,r.priority].join('|')).sort((a,b)=>a.localeCompare(b,'es')).join('||');
  }

  function dnfReady() {
    if (!careerCatalogReady()) return false;
    const flow = dnfFlow();
    const rows = needs();
    if (!rows.length || flow.dnfImported !== true || flow.dnfCareerFingerprint !== careerFingerprint()) return false;
    const byCareer = new Map(activeCareers().map(c => [key(c.name),0]));
    rows.forEach(r => { if (byCareer.has(key(r.career))) byCareer.set(key(r.career),byCareer.get(key(r.career))+1); });
    return rows.every(r => PRIORITIES.includes(r.priority)) && [...byCareer.values()].every(v => v > 0);
  }

  function planRows() {
    const source = needs();
    const existing = Array.isArray(state.needPlan) ? state.needPlan : [];
    const byCode = new Map(existing.filter(r=>clean(r.dnfCode || r.code)).map(r=>[clean(r.dnfCode || r.code),r]));
    const byText = new Map(existing.map(r=>[key(r.career)+'|'+key(r.needText || r.need),r]));
    const rows = source.map(src => {
      const old = byCode.get(src.code) || byText.get(key(src.career)+'|'+key(src.need)) || {};
      return {
        dnfCode: src.code,
        needKey: src.code,
        career: src.career,
        program: src.program,
        needText: src.need,
        priority: src.priority,
        action: clean(old.action),
        modality: clean(old.modality),
        plannedStart: clean(old.plannedStart),
        plannedEnd: clean(old.plannedEnd),
        indicator: clean(old.indicator),
        targetPercent: Number(old.targetPercent || 0),
        evidence: clean(old.evidence),
        responsibleRole: clean(old.responsibleRole),
        supportType: clean(old.supportType),
        supportAmount: Number(old.supportAmount || 0),
        observations: clean(old.observations)
      };
    });
    state.needPlan = rows;
    return rows;
  }

  function planMissing(row) {
    const missing = [];
    if (!clean(row.action)) missing.push('acción');
    if (!MODALITIES.includes(clean(row.modality))) missing.push('modalidad');
    if (!/^\d{4}-\d{2}$/.test(clean(row.plannedStart))) missing.push('inicio');
    if (!/^\d{4}-\d{2}$/.test(clean(row.plannedEnd))) missing.push('fin');
    if (!clean(row.indicator)) missing.push('indicador');
    if (!(Number(row.targetPercent) > 0 && Number(row.targetPercent) <= 100)) missing.push('meta');
    if (!clean(row.evidence)) missing.push('medio de verificación');
    if (!clean(row.responsibleRole)) missing.push('responsable institucional');
    if (!SUPPORTS.includes(clean(row.supportType))) missing.push('tipo de apoyo');
    if (row.supportType === 'Económico' && !(Number(row.supportAmount) > 0)) missing.push('monto');
    return missing;
  }

  function planDataFingerprint() {
    return planRows().map(r => [
      r.dnfCode,r.action,r.modality,r.plannedStart,r.plannedEnd,r.indicator,
      Number(r.targetPercent || 0),r.evidence,r.responsibleRole,r.supportType,
      Number(r.supportAmount || 0),r.observations
    ].join('|')).sort((a,b)=>a.localeCompare(b,'es')).join('||');
  }

  function planReady() {
    const w = workflow();
    const rows = planRows();
    return dnfReady() && rows.length > 0 && w.planImported === true &&
      w.planSourceFingerprint === needsFingerprint() && rows.every(r => !planMissing(r).length);
  }

  function reportRows() {
    const source = planRows();
    const existing = Array.isArray(state.needFollowup) ? state.needFollowup : [];
    const byCode = new Map(existing.filter(r=>clean(r.dnfCode || r.needKey)).map(r=>[clean(r.dnfCode || r.needKey),r]));
    const byText = new Map(existing.map(r=>[key(r.career)+'|'+key(r.needText || r.need),r]));
    const rows = source.map(src => {
      const old = byCode.get(src.dnfCode) || byText.get(key(src.career)+'|'+key(src.needText)) || {};
      return {
        dnfCode: src.dnfCode,
        needKey: src.dnfCode,
        career: src.career,
        needText: src.needText,
        action: src.action,
        status: clean(old.status),
        realStart: clean(old.realStart),
        progress: Number(old.progress || 0),
        evidenceTitle: clean(old.evidenceTitle),
        evidencePath: clean(old.evidencePath),
        observation: clean(old.observation)
      };
    });
    state.needFollowup = rows;
    return rows;
  }

  function reportMissing(row) {
    const missing = [];
    if (!FOLLOW_STATUSES.includes(clean(row.status))) missing.push('estado');
    if (['En proceso','Finalizado'].includes(row.status)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(clean(row.realStart))) missing.push('inicio real');
      if (!(Number(row.progress) > 0 && Number(row.progress) <= 100)) missing.push('avance');
      if (!clean(row.evidenceTitle)) missing.push('evidencia');
    }
    if (row.status === 'Finalizado' && Number(row.progress) !== 100) missing.push('avance 100%');
    if (row.status === 'No ejecutado' && !clean(row.observation)) missing.push('motivo');
    return missing;
  }

  function reportReady() {
    const w = workflow();
    const rows = reportRows();
    return planReady() && rows.length > 0 && w.reportImported === true &&
      w.reportSourceFingerprint === planDataFingerprint() && rows.every(r => !reportMissing(r).length);
  }

  function migrateExistingCurrentPeriod() {
    const w = workflow();
    const pRows = planRows();
    if (!w.planImported && dnfReady() && pRows.length && pRows.every(r => !planMissing(r).length)) {
      w.planImported = true;
      w.planFileName = 'Datos existentes migrados al flujo por plantilla';
      w.planImportedAt = new Date().toISOString();
      w.planSourceFingerprint = needsFingerprint();
    }
    const rRows = reportRows();
    if (!w.reportImported && w.planImported && rRows.length && rRows.every(r => !reportMissing(r).length)) {
      w.reportImported = true;
      w.reportFileName = 'Datos existentes migrados al flujo por plantilla';
      w.reportImportedAt = new Date().toISOString();
      w.reportSourceFingerprint = planDataFingerprint();
    }
  }

  function makeStatus(type) {
    const issues = [];
    if (!clean(state?.period?.start) || !clean(state?.period?.end)) {
      issues.push({kind:'period-v3',text:'Definir el período activo',view:'periodo'});
    }

    if (type === 'dnf') {
      if (!careerCatalogReady()) {
        issues.push({kind:'dnf-template-careers',text:'Cargar y confirmar las carreras del período',description:'Registra el catálogo completo, nivel de formación y estado Activa/Inactiva.',view:'carreras'});
      } else if (!dnfReady()) {
        issues.push({kind:'dnf-template-needs',text:'Cargar la plantilla DNF del período',description:'Registra al menos una necesidad y su prioridad para cada carrera activa.',view:'necesidades'});
      }
    }

    if (type === 'plan') {
      if (!dnfReady()) {
        issues.push({kind:'plan-dnf-dependency',text:'Completar primero la Detección de Necesidades del período',view:'doc-dnf'});
      } else {
        const rows = planRows();
        const w = workflow();
        if (!rows.length) issues.push({kind:'plan-template',text:'No existen necesidades DNF para construir el Plan',view:'doc-dnf'});
        else if (!w.planImported || w.planSourceFingerprint !== needsFingerprint() || rows.some(r=>planMissing(r).length)) {
          issues.push({kind:'plan-template',text:'Cargar la plantilla del Plan de Formación',description:'Completa acciones, modalidad, cronograma, indicador, meta, verificación, responsable y recursos.',view:'planificacion'});
        }
      }
    }

    if (type === 'informe') {
      if (!planReady()) {
        issues.push({kind:'report-plan-dependency',text:'Completar primero el Plan de Formación del período',view:'doc-plan'});
      } else {
        const rows = reportRows();
        const w = workflow();
        if (!rows.length || !w.reportImported || w.reportSourceFingerprint !== planDataFingerprint() || rows.some(r=>reportMissing(r).length)) {
          issues.push({kind:'report-template',text:'Cargar la plantilla del Informe de Cumplimiento',description:'Registra estado, avance, evidencia y resultado de cada acción planificada.',view:'seguimiento'});
        }
      }
    }

    return {ready:issues.length===0,issues,missing:issues.map(i=>i.text),warnings:[]};
  }

  documentStatus = function documentStatusCanonical(type) {
    return makeStatus(type);
  };

  const previousExcelTemplatePayload = excelTemplatePayload;
  excelTemplatePayload = function canonicalExcelPayload(scope,includeData) {
    includeData = !!includeData;
    if (scope === 'plan') {
      const rows = planRows();
      return {
        filename:(includeData?'UGPA_Datos_Actuales_Plan_':'UGPA_Plantilla_Plan_')+periodSlug()+'.xlsx',
        sheets:[{
          name:'PLAN',
          headers:['CODIGO_DNF','CARRERA','NECESIDAD','PRIORIDAD','ACCION_FORMACION','MODALIDAD','INICIO_PLANIFICADO','FIN_PLANIFICADO','INDICADOR','META_PORCENTAJE','MEDIO_VERIFICACION','RESPONSABLE_INSTITUCIONAL','TIPO_APOYO','MONTO_APOYO','OBSERVACIONES'],
          descriptions:[
            'Código heredado de la DNF. No modificar.','Carrera heredada de la DNF. No modificar.','Necesidad heredada de la DNF. No modificar.','Prioridad heredada de la DNF. No modificar.',
            'Acción institucional que atenderá la necesidad.','Presencial, Virtual o Híbrida.','Mes/año AAAA-MM.','Mes/año AAAA-MM.','Indicador de cumplimiento.','Meta entre 1 y 100.','Documento o evidencia de verificación.','Unidad, área o cargo institucional responsable.','Sin apoyo económico, Económico, Convenio / beca o Gestión interna.','Monto numérico solo si TIPO_APOYO es Económico.','Observación opcional.'
          ],
          rows:rows.length ? rows.map(r => [
            r.dnfCode,r.career,r.needText,r.priority,
            includeData?r.action:'',includeData?r.modality:'',includeData?r.plannedStart:'',includeData?r.plannedEnd:'',
            includeData?r.indicator:'',includeData?(r.targetPercent||''):'',includeData?r.evidence:'',
            includeData?r.responsibleRole:'',includeData?r.supportType:'',includeData?(r.supportAmount||''):'',includeData?r.observations:''
          ]) : [['','','','','','','','','','','','','','','']],
          widths:[18,34,58,14,58,16,18,18,42,16,46,38,24,18,42]
        }]
      };
    }
    if (scope === 'informe' || scope === 'seguimiento') {
      const rows = reportRows();
      return {
        filename:(includeData?'UGPA_Datos_Actuales_Informe_':'UGPA_Plantilla_Informe_')+periodSlug()+'.xlsx',
        sheets:[{
          name:'INFORME',
          headers:['CODIGO_DNF','CARRERA','NECESIDAD','ACCION_FORMACION','ESTADO','FECHA_INICIO_REAL','AVANCE_PORCENTAJE','EVIDENCIA','ARCHIVO_EVIDENCIA','RESULTADO_OBSERVACION'],
          descriptions:[
            'Código heredado de DNF y Plan. No modificar.','Carrera heredada. No modificar.','Necesidad heredada. No modificar.','Acción del Plan. No modificar.',
            'No iniciado, En proceso, Finalizado o No ejecutado.','Fecha AAAA-MM-DD cuando exista inicio.','Valor entre 0 y 100. Finalizado debe ser 100.','Nombre de la evidencia cuando la acción está En proceso o Finalizada.','Nombre o referencia del archivo de evidencia.','Resultado, observación o motivo de no ejecución.'
          ],
          rows:rows.length ? rows.map(r => [
            r.dnfCode,r.career,r.needText,r.action,
            includeData?r.status:'',includeData?r.realStart:'',includeData?(r.progress||0):'',includeData?r.evidenceTitle:'',includeData?r.evidencePath:'',includeData?r.observation:''
          ]) : [['','','','','','','','','','']],
          widths:[18,34,58,58,18,20,18,42,38,58]
        }]
      };
    }
    return previousExcelTemplatePayload(scope,includeData);
  };

  const previousAnalyzeExcelImport = analyzeExcelImport;
  function analysisResult(scope,target,result,preview,safeRows,errors,warnings,expectedCount) {
    const validRows = preview.filter(x=>x.valid).length;
    const errorRows = preview.filter(x=>!x.valid).length;
    return {
      context:{label:scope==='plan'?'Plan de Formación':'Informe de Cumplimiento',scope,kind:''},
      filePath:result?.filePath || 'Archivo Excel',
      detected:Object.keys(result?.sheets||{}).filter(name=>Array.isArray(result.sheets[name])&&result.sheets[name].length),
      allowed:[target],compatibleSheets:[target],incompatibleSheets:Object.keys(result?.sheets||{}).filter(name=>name!==target),
      totalRows:preview.length,validRows,optionalRows:0,ignoredRows:0,errorRows,matchedRows:validRows,expectedCount,
      statusCounts:{Aplicar:validRows,Actualizar:0,'Actualizar opcional':0,'Ya completo':0,'Sin cambios':0,Omitir:0,Error:errorRows},
      errors,warnings,safeSheets:errors.length?{}:{[target]:safeRows},optionalById:{},preview:preview.slice(0,80),mismatch:false,detectedDestination:null
    };
  }

  analyzeExcelImport = function canonicalAnalyze(scope,result,type='',kind='') {
    if (kind || !['plan','informe','seguimiento'].includes(scope)) return previousAnalyzeExcelImport(scope,result,type,kind);
    const isPlan = scope === 'plan';
    const normalizedScope = isPlan ? 'plan' : 'informe';
    const target = isPlan ? 'PLAN' : 'INFORME';
    const expected = isPlan ? planRows() : reportRows();
    const sourceReady = isPlan ? dnfReady() : planReady();
    const sheets = result?.sheets || {};
    const detected = Object.keys(sheets).filter(name=>Array.isArray(sheets[name])&&sheets[name].length);
    const imported = Array.isArray(sheets[target]) ? sheets[target] : [];
    const expectedByCode = new Map(expected.map(r=>[clean(r.dnfCode).toUpperCase(),r]));
    const seen = new Set();
    const preview = [], safeRows = [], errors = [], warnings = [];

    if (!sourceReady) errors.push(isPlan?'Primero debe estar completa la DNF del período.':'Primero debe estar completo el Plan de Formación del período.');
    if (!detected.includes(target)) errors.push('La plantilla debe contener la hoja '+target+'.');
    const extras = detected.filter(name=>name!==target);
    if (extras.length) errors.push('Esta carga es independiente. Retira las otras hojas: '+extras.join(', ')+'.');

    imported.forEach((raw,index) => {
      if (!Object.values(raw||{}).some(v=>clean(v))) return;
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
        const modality = MODALITIES.find(v=>key(v)===key(raw.MODALIDAD)) || '';
        const support = SUPPORTS.find(v=>key(v)===key(raw.TIPO_APOYO)) || '';
        const start = clean(raw.INICIO_PLANIFICADO), end = clean(raw.FIN_PLANIFICADO);
        const meta = Number(String(raw.META_PORCENTAJE ?? '').replace(',','.'));
        const amount = Number(String(raw.MONTO_APOYO ?? '').replace(',','.'));
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
          MONTO_APOYO:support==='Económico'?amount:0,OBSERVACIONES:clean(raw.OBSERVACIONES)
        };
      }

      if (!reason && !isPlan) {
        const status = FOLLOW_STATUSES.find(v=>key(v)===key(raw.ESTADO)) || '';
        const realStart = clean(raw.FECHA_INICIO_REAL);
        const progress = Number(String(raw.AVANCE_PORCENTAJE ?? '').replace(',','.'));
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

      if (!reason) {
        seen.add(code); safeRows.push(safe);
        preview.push({id:'canonical-row-'+index,sheet:target,row:safe,status:'Aplicar',valid:true,optional:false,reason:'Registro válido'});
      } else {
        preview.push({id:'canonical-row-'+index,sheet:target,row:raw,status:'Error',valid:false,optional:false,reason});
      }
    });

    const missing = expected.filter(r=>!seen.has(clean(r.dnfCode).toUpperCase()));
    if (missing.length) errors.push('Faltan '+missing.length+' código(s) del período: '+missing.slice(0,12).map(r=>r.dnfCode).join(', ')+(missing.length>12?'…':'')+'.');
    const bad = preview.filter(r=>!r.valid).length;
    if (bad) errors.push('La plantilla contiene '+bad+' fila(s) con errores. No se aplicará parcialmente.');
    if (!safeRows.length && !errors.length) errors.push('No se encontraron filas válidas.');

    return analysisResult(normalizedScope,target,result,preview,safeRows,errors,warnings,expected.length);
  };

  const previousApplyExcel = applyExcel;
  applyExcel = function canonicalApplyExcel(sheets) {
    const scope = window.__DOCFORMACION_TEMPLATE_IMPORT_SCOPE;
    if (scope === 'plan' && Array.isArray(sheets?.PLAN)) {
      const rows = planRows();
      const byCode = new Map(rows.map(r=>[clean(r.dnfCode).toUpperCase(),r]));
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
      const rows = reportRows();
      const byCode = new Map(rows.map(r=>[clean(r.dnfCode).toUpperCase(),r]));
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
      w.reportImported = true;
      w.reportFileName = window.__DOCFORMACION_TEMPLATE_IMPORT_FILE || 'Plantilla Informe';
      w.reportImportedAt = new Date().toISOString();
      w.reportSourceFingerprint = planDataFingerprint();
      return;
    }
    return previousApplyExcel(sheets);
  };

  function templateButtons(scope,enabled,current,view) {
    const dis = enabled ? '' : ' disabled';
    const cur = enabled && current ? '' : ' disabled';
    return '<div class="toolbar excel-toolbar canonical-toolbar">'+
      '<button type="button" class="secondary" data-c3-template="'+scope+'"'+dis+'>Descargar plantilla vacía</button>'+
      '<button type="button" class="secondary" data-c3-current="'+scope+'"'+cur+'>Descargar datos actuales</button>'+
      '<button type="button" class="primary" data-c3-import="'+scope+'"'+dis+'>Subir / reemplazar plantilla</button>'+
      (view?'<button type="button" class="secondary" data-c3-view="'+view+'"'+cur+'>Ver datos</button>':'')+
    '</div>';
  }

  function bindCanonicalButtons(root=document) {
    root.querySelectorAll('[data-c3-template]').forEach(btn=>btn.onclick=()=>exportTemplate(btn.dataset.c3Template,false));
    root.querySelectorAll('[data-c3-current]').forEach(btn=>btn.onclick=()=>exportTemplate(btn.dataset.c3Current,true));
    root.querySelectorAll('[data-c3-import]').forEach(btn=>btn.onclick=()=>importExcel(btn.dataset.c3Import));
    root.querySelectorAll('[data-c3-view]').forEach(btn=>btn.onclick=()=>setView(btn.dataset.c3View));
  }

  const previousRenderIssues = renderIssues;
  renderIssues = function canonicalRenderIssues(type,issues) {
    if (type === 'dnf') return previousRenderIssues(type,issues);
    const html = (issues||[]).map(issue => {
      let actions = '';
      if (issue.kind === 'plan-template') actions = templateButtons('plan',dnfReady(),planRows().length>0,'planificacion');
      else if (issue.kind === 'report-template') actions = templateButtons('informe',planReady(),reportRows().length>0,'seguimiento');
      else actions = '<button type="button" class="secondary compact" data-correct-view="'+esc(issue.view || 'inicio')+'">Ir a revisar</button>';
      return '<div class="issue-line"><div class="issue-line-text"><strong>'+esc(issue.text||'Pendiente')+'</strong>'+
        (issue.description?'<span class="small muted">'+esc(issue.description)+'</span>':'')+'</div><div class="issue-line-actions">'+actions+'</div></div>';
    }).join('');
    return '<div class="issue-list">'+html+'</div>';
  };

  const previousRenderHome = renderHome;
  renderHome = function canonicalRenderHome() {
    const result = previousRenderHome();
    bindCanonicalButtons(document.getElementById('content'));
    return result;
  };

  const previousRenderDocumentView = renderDocumentView;
  renderDocumentView = function canonicalRenderDocumentView(type) {
    if (type === 'dnf') return previousRenderDocumentView(type);
    const isPlan = type === 'plan';
    const status = documentStatus(type);
    const rows = isPlan ? planRows() : reportRows();
    const dependencyReady = isPlan ? dnfReady() : planReady();
    const w = workflow();
    const imported = isPlan ? w.planImported : w.reportImported;
    const file = isPlan ? w.planFileName : w.reportFileName;
    const scope = isPlan ? 'plan' : 'informe';
    const view = isPlan ? 'planificacion' : 'seguimiento';
    const title = isPlan ? 'Plan de Formación Docente' : 'Informe de Cumplimiento';
    const description = isPlan
      ? 'La información variable se carga únicamente mediante la plantilla del Plan. La DNF aporta automáticamente códigos, carreras, necesidades y prioridades.'
      : 'La información variable se carga únicamente mediante la plantilla del Informe. El Plan aporta automáticamente códigos, necesidades y acciones.';

    document.getElementById('content').innerHTML = `
      <div class="section-title"><div><h2>Plantilla del período</h2><p>${esc(description)}</p></div></div>
      <div class="card canonical-template-card">
        <div class="dnf-template-card-head"><div><strong>${esc(title)}</strong><span>${imported?'Cargada':'Pendiente'}</span></div><span class="status-badge ${status.ready?'ready':'blocked'}">${status.ready?'Lista':'Pendiente'}</span></div>
        <p>${rows.length} registro(s) vinculados por CODIGO_DNF.</p>
        ${file?'<div class="small muted">Último archivo: '+esc(file)+'</div>':''}
        ${templateButtons(scope,dependencyReady,rows.length>0,view)}
      </div>
      <div class="status-card simple-doc-card single-document" style="margin-top:18px">
        <div class="status-head"><div class="missing-heading">${status.ready?'Documento completo':'Falta completar'}</div><span class="status-badge ${status.ready?'ready':'blocked'}">${status.ready?'Listo':'Pendiente'}</span></div>
        ${status.ready
          ? '<div class="ready-message">Toda la información necesaria está completa y validada para el período activo.</div><div class="doc-actions"><button class="primary" id="generateCurrent">Generar PDF</button></div>'
          : renderIssues(type,status.issues)}
      </div>`;
    bindCanonicalButtons(document.getElementById('content'));
    if (typeof bindCorrectionActions === 'function') bindCorrectionActions(type,document.getElementById('content'));
    const button = document.getElementById('generateCurrent');
    if (button) button.onclick=()=>generateDocument(type);
  };

  renderPlan = function canonicalRenderPlan() {
    const rows = planRows();
    const status = documentStatus('plan');
    document.getElementById('content').innerHTML = `
      ${status.ready?'<div class="alert-strip success"><div><strong>Plan listo</strong>Datos validados mediante plantilla Excel.</div></div>':'<div class="alert-strip warning"><div><strong>Plan pendiente</strong>Completa o reemplaza la plantilla Excel del Plan.</div></div>'}
      <div class="section-title"><div><h2>Planificación por necesidades</h2><p>Vista de consulta. Las correcciones se realizan únicamente en Excel.</p></div></div>
      <div class="card">${templateButtons('plan',dnfReady(),rows.length>0,'')}</div>
      <div class="table-wrap" style="margin-top:16px">${rows.length?'<table class="table"><thead><tr><th>Código DNF</th><th>Carrera</th><th>Necesidad</th><th>Prioridad</th><th>Acción</th><th>Modalidad</th><th>Cronograma</th><th>Indicador / Meta</th><th>Responsable / Apoyo</th></tr></thead><tbody>'+rows.map(r=>'<tr><td><strong>'+esc(r.dnfCode)+'</strong></td><td>'+esc(r.career)+'</td><td>'+esc(r.needText)+'</td><td>'+esc(r.priority)+'</td><td>'+esc(r.action||'—')+'</td><td>'+esc(r.modality||'—')+'</td><td>'+esc((r.plannedStart||'—')+' → '+(r.plannedEnd||'—'))+'</td><td>'+esc(r.indicator||'—')+(r.targetPercent?' · '+esc(r.targetPercent)+'%':'')+'</td><td>'+esc(r.responsibleRole||'—')+'<br>'+esc(r.supportType||'—')+'</td></tr>').join('')+'</tbody></table>':'<div class="empty">No existen necesidades DNF para planificar.</div>'}</div>`;
    bindCanonicalButtons(document.getElementById('content'));
  };

  renderFollowup = function canonicalRenderFollowup() {
    const rows = reportRows();
    const status = documentStatus('informe');
    document.getElementById('content').innerHTML = `
      ${status.ready?'<div class="alert-strip success"><div><strong>Informe listo</strong>Seguimiento validado mediante plantilla Excel.</div></div>':'<div class="alert-strip warning"><div><strong>Informe pendiente</strong>Completa o reemplaza la plantilla Excel del Informe.</div></div>'}
      <div class="section-title"><div><h2>Seguimiento por necesidad</h2><p>Vista de consulta. Las correcciones se realizan únicamente en Excel.</p></div></div>
      <div class="card">${templateButtons('informe',planReady(),rows.length>0,'')}</div>
      <div class="table-wrap" style="margin-top:16px">${rows.length?'<table class="table"><thead><tr><th>Código DNF</th><th>Carrera</th><th>Acción</th><th>Estado</th><th>Inicio real</th><th>Avance</th><th>Evidencia</th><th>Resultado / observación</th></tr></thead><tbody>'+rows.map(r=>'<tr><td><strong>'+esc(r.dnfCode)+'</strong></td><td>'+esc(r.career)+'</td><td>'+esc(r.action||'—')+'</td><td>'+esc(r.status||'—')+'</td><td>'+esc(r.realStart||'—')+'</td><td>'+esc(Number(r.progress||0))+'%</td><td>'+esc(r.evidenceTitle||'—')+(r.evidencePath?'<br><span class="small muted">'+esc(r.evidencePath)+'</span>':'')+'</td><td>'+esc(r.observation||'—')+'</td></tr>').join('')+'</tbody></table>':'<div class="empty">No existen acciones del Plan para dar seguimiento.</div>'}</div>`;
    bindCanonicalButtons(document.getElementById('content'));
  };

  function genericLines() {
    const s6 = Array.isArray(state?.section6?.genericLines) ? state.section6.genericLines : [];
    const fromS6 = s6.map(v=>typeof v==='string'?clean(v):clean(v?.name)).filter(Boolean);
    if (fromS6.length) return fromS6;
    return (state?.settings?.genericLines || []).map(clean).filter(Boolean);
  }

  function counts(rows,getter) {
    const out = {};
    rows.forEach(r=>{const k=clean(getter(r))||'Sin información';out[k]=(out[k]||0)+1;});
    return out;
  }

  function naturalList(items) {
    const list=(items||[]).filter(Boolean);
    if(!list.length)return'';
    if(list.length===1)return list[0];
    if(list.length===2)return list[0]+' y '+list[1];
    return list.slice(0,-1).join(', ')+' y '+list[list.length-1];
  }

  function pdfCode(type) {
    ensureInstitutionalPeriodData();
    if (type==='dnf') return clean(state.period.dnfCode);
    if (type==='plan') return clean(state.period.planCode);
    return clean(state.period.reportCode);
  }

  function pdfTitle(type) {
    if(type==='dnf')return'Detección de Necesidades de Formación';
    if(type==='plan')return'Plan de Formación Docente';
    return'Informe de Cumplimiento del Plan de Formación Docente';
  }

  function pdfFilename(type) {
    const code=pdfCode(type)||type.toUpperCase();
    const title=pdfTitle(type);
    if(typeof documentPdfFilename==='function') return documentPdfFilename(code,title);
    return code+' - '+title+'.pdf';
  }

  function emitProgress(type,percent,phase,extra={}) {
    window.dispatchEvent(new CustomEvent('docformacion-pdf-progress',{detail:{type,percent,phase,build:BUILD,...extra}}));
  }

  function downloadBlob(blob,filename) {
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=filename;a.style.display='none';document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
  }

  function createPdfWriter(type) {
    if (!window.jspdf?.jsPDF) throw new Error('No se cargó el motor PDF. Recarga la aplicación.');
    const {jsPDF}=window.jspdf;
    const doc=new jsPDF({unit:'mm',format:'a4',orientation:'portrait',compress:false,putOnlyUsedFonts:true});
    const pageW=210,pageH=297,left=18,right=18,top=44,bottom=18,bodyW=pageW-left-right;
    let y=top;

    function logoData(){try{return typeof INSTITUTION_LOGO_DATA==='string'?INSTITUTION_LOGO_DATA:'';}catch(_e){return'';}}
    function drawHeader() {
      const x=15,w=180,h=27,a=45,b=90,c=45,yy=12;
      doc.setDrawColor(60);doc.setLineWidth(.25);doc.rect(x,yy,w,h);doc.line(x+a,yy,x+a,yy+h);doc.line(x+a+b,yy,x+a+b,yy+h);doc.line(x+a,yy+8,x+a+b,yy+8);
      const logo=logoData();
      if(logo){try{doc.addImage(logo,'JPEG',x+8,yy+7,a-16,h-14,undefined,'FAST');}catch(_e){doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text('ITSQMET',x+a/2,yy+h/2,{align:'center'});}}
      else{doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text('ITSQMET',x+a/2,yy+h/2,{align:'center'});}
      doc.setTextColor(25);doc.setFont('helvetica','normal');doc.setFontSize(7.3);doc.text('UNIDAD DE GESTIÓN DE PROCESOS ACADÉMICOS',x+a+b/2,yy+5.2,{align:'center'});
      doc.setFont('helvetica','bold');doc.setFontSize(7.2);const tl=doc.splitTextToSize(pdfTitle(type),b-8);doc.text(tl,x+a+b/2,yy+14,{align:'center',lineHeightFactor:1.05});
      doc.setFontSize(6.8);doc.text(periodLabelText(),x+a+b/2,yy+22.8,{align:'center'});
      doc.setFont('helvetica','bold');doc.setFontSize(7);doc.text('Código:',x+a+b+c/2,yy+11,{align:'center'});doc.setFont('helvetica','normal');doc.setFontSize(6.7);doc.text(doc.splitTextToSize(pdfCode(type),c-6),x+a+b+c/2,yy+16,{align:'center'});
    }
    function newPage() { doc.addPage();drawHeader();y=top; }
    function ensure(h) { if(y+h>pageH-bottom)newPage(); }
    function heading(text,level=1) { const size=level===1?12:level===2?10.5:9.5;const before=level===1?4:3;const after=level===1?3:2;doc.setFont('helvetica','bold');doc.setFontSize(size);const lines=doc.splitTextToSize(clean(text),bodyW);ensure(before+lines.length*(size*.42)+after+4);y+=before;doc.text(lines,left,y);y+=lines.length*(size*.42)+after; }
    function paragraph(text,opts={}) { doc.setFont('helvetica',opts.bold?'bold':'normal');doc.setFontSize(opts.size||9.5);const indent=opts.indent===false?0:5;const lines=doc.splitTextToSize(clean(text),bodyW-indent);for(let i=0;i<lines.length;i++){ensure(4.7);doc.text(lines[i],left+(i===0?indent:0),y,{maxWidth:bodyW-(i===0?indent:0)});y+=4.7;}y+=opts.after==null?2:opts.after; }
    function bullet(text){doc.setFont('helvetica','normal');doc.setFontSize(9.2);const lines=doc.splitTextToSize(clean(text),bodyW-8);for(let i=0;i<lines.length;i++){ensure(4.6);if(i===0)doc.text('•',left+1,y);doc.text(lines[i],left+6,y);y+=4.6;}y+=1;}
    function table(headers,rows,weights,opts={}) {
      const total=(weights||headers.map(()=>1)).reduce((a,b)=>a+b,0);const widths=(weights||headers.map(()=>1)).map(v=>bodyW*v/total);const fontSize=opts.fontSize||7.2,pad=1.3,lineH=3.2;
      const wrap=(text,w,style='normal')=>{doc.setFont('helvetica',style);doc.setFontSize(fontSize);return doc.splitTextToSize(clean(text)||' ',Math.max(4,w-pad*2));};
      const rowHeight=(row,style='normal')=>Math.max(...row.map((cell,i)=>wrap(cell,widths[i],style).length))*lineH+pad*2;
      const drawRow=(row,isHead=false,bold=false)=>{const h=rowHeight(row,isHead||bold?'bold':'normal');ensure(h);let x=left;if(isHead){doc.setFillColor(55,55,55);doc.rect(left,y,bodyW,h,'F');}doc.setDrawColor(125);doc.setLineWidth(.18);row.forEach((cell,i)=>{doc.rect(x,y,widths[i],h);doc.setFont('helvetica',isHead||bold?'bold':'normal');doc.setFontSize(fontSize);doc.setTextColor(isHead?255:20);doc.text(wrap(cell,widths[i],isHead||bold?'bold':'normal'),x+pad,y+pad+2.5,{lineHeightFactor:1.05});x+=widths[i];});doc.setTextColor(20);y+=h;};
      drawRow(headers,true,true);
      rows.forEach((row,index)=>{const h=rowHeight(row.cells||row,row.bold?'bold':'normal');if(y+h>pageH-bottom){newPage();drawRow(headers,true,true);}drawRow(row.cells||row,false,!!row.bold);});y+=2.5;
    }
    function cover() {
      drawHeader();doc.setFont('helvetica','bold');doc.setTextColor(25);doc.setFontSize(18);const lines=doc.splitTextToSize(pdfTitle(type),150);doc.text(lines,pageW/2,118,{align:'center',lineHeightFactor:1.15});doc.setFontSize(14);doc.text(periodLabelText(),pageW/2,118+lines.length*8+8,{align:'center'});
      const x=15,w=180,col=60,yy=239,row1=20,row2=10,row3=13,total=row1+row2+row3;doc.setDrawColor(70);doc.rect(x,yy,w,total);doc.line(x,yy+row1,x+w,yy+row1);doc.line(x,yy+row1+row2,x+w,yy+row1+row2);doc.line(x+col,yy,x+col,yy+total);doc.line(x+col*2,yy,x+col*2,yy+total);
      const entries=[['ELABORADO POR:',RESPONSIBLE.preparedBy,RESPONSIBLE.preparedRole],['REVISADO POR:',RESPONSIBLE.reviewedBy,RESPONSIBLE.reviewedRole],['APROBADO POR:',RESPONSIBLE.approvedBy,RESPONSIBLE.approvedRole]];
      entries.forEach((r,i)=>{const cx=x+i*col;doc.setFont('helvetica','bold');doc.setFontSize(7.2);doc.text(r[0],cx+3,yy+5);doc.setFontSize(6.8);doc.text('ÁREA DE FIRMA / QR DIGITAL',cx+col/2,yy+13,{align:'center'});doc.setFont('helvetica','normal');doc.text('NOMBRE: '+r[1],cx+3,yy+row1+6);doc.text(doc.splitTextToSize('CARGO: '+r[2],col-6),cx+3,yy+row1+row2+5,{lineHeightFactor:1.05});});
      newPage();
    }
    function finish(filename) { const total=doc.getNumberOfPages();for(let p=1;p<=total;p++){doc.setPage(p);doc.setTextColor(100);doc.setFont('helvetica','normal');doc.setFontSize(6.7);doc.text('ITSQMET · Unidad de Gestión de Procesos Académicos · '+periodLabelText()+' · Página '+p+' de '+total,pageW/2,pageH-8,{align:'center'});}doc.setProperties({title:pdfTitle(type),subject:periodLabelText(),author:'ITSQMET'});const blob=doc.output('blob');if(!blob?.size)throw new Error('El PDF se generó vacío.');downloadBlob(blob,filename);return{ok:true,downloaded:true,pages:total,size:blob.size,filePath:filename};}
    return{doc,cover,heading,paragraph,bullet,table,newPage,finish};
  }

  function genericLines() {
    const s6 = Array.isArray(state?.section6?.genericLines) ? state.section6.genericLines : [];
    const fromS6 = s6.map(v=>typeof v==='string'?clean(v):clean(v?.name)).filter(Boolean);
    if (fromS6.length) return fromS6;
    return (state?.settings?.genericLines || []).map(clean).filter(Boolean);
  }

  function counts(rows,getter) {
    const out = {};
    rows.forEach(r=>{const k=clean(getter(r))||'Sin información';out[k]=(out[k]||0)+1;});
    return out;
  }

  function naturalList(items) {
    const list=(items||[]).filter(Boolean);
    if(!list.length)return'';
    if(list.length===1)return list[0];
    if(list.length===2)return list[0]+' y '+list[1];
    return list.slice(0,-1).join(', ')+' y '+list[list.length-1];
  }

  function renderDnfPdf(writer) {
    const rows=needs(),active=activeCareers(),generic=genericLines(),priority=counts(rows,r=>r.priority),programs=counts(active,r=>r.program);
    const diagnosed=new Set(rows.map(r=>key(r.career))).size,coverage=pctValue(diagnosed,active.length);
    const byCareer=counts(rows,r=>r.career);const ranked=Object.entries(byCareer).sort((a,b)=>b[1]-a[1]);const top=ranked.length?ranked.filter(x=>x[1]===ranked[0][1]).map(x=>x[0]):[];

    writer.heading('1. Introducción');
    writer.paragraph('El presente documento consolida la Detección de Necesidades de Formación correspondiente al período '+periodLabelText()+'. La unidad de análisis es la necesidad de formación identificada por carrera. La información variable procede de las plantillas institucionales de Carreras y DNF, validadas antes de su incorporación al documento.');
    writer.paragraph('El diagnóstico permite priorizar necesidades específicas, reconocer requerimientos transversales y establecer una trazabilidad mediante códigos DNF que posteriormente se conservan en el Plan de Formación y en el Informe de Cumplimiento. Esta lógica evita duplicidades y permite que cada período mantenga información independiente.');

    writer.heading('2. Base Legal');
    const legal=(Array.isArray(state.baseLegal)&&state.baseLegal.length?state.baseLegal:[
      {name:'Constitución de la República del Ecuador',provision:'Art. 350',application:'Finalidades del Sistema de Educación Superior y fortalecimiento de capacidades institucionales.'},
      {name:'Ley Orgánica de Educación Superior (LOES)',provision:'Arts. 93, 94, 95 y 156',application:'Calidad, aseguramiento de la calidad y perfeccionamiento permanente del personal académico.'},
      {name:'Reglamento de Carrera y Escalafón del Personal Académico del Sistema de Educación Superior',provision:'Arts. 311 y 312',application:'Planificación del perfeccionamiento y actividades de capacitación y actualización.'},
      {name:'Modelo de Evaluación Externa 2024 para Institutos Superiores Técnicos y Tecnológicos',provision:'Indicador 3.2.4',application:'Planificación de formación académica y capacitación sustentada en necesidades institucionales.'}
    ]).slice(0,10);
    legal.forEach(item=>writer.bullet(clean(item.name)+(item.provision?' — '+clean(item.provision):'')+'. '+clean(item.application||item.content||'')));

    writer.heading('3. Alineación Estratégica');
    writer.paragraph('La DNF se articula con el PEDI, el POA, los procesos académicos institucionales y los referentes de aseguramiento de la calidad. Sus resultados constituyen el insumo técnico para transformar necesidades priorizadas en acciones del Plan de Formación Docente y, posteriormente, evaluar su cumplimiento.');
    writer.bullet('PEDI: orienta las prioridades de desarrollo y fortalecimiento del talento humano.');
    writer.bullet('POA: traduce las prioridades del período en actividades, responsables, metas e indicadores.');
    writer.bullet('Procesos académicos: vinculan la formación con las necesidades de las carreras y la mejora continua.');
    writer.bullet('Aseguramiento de la calidad: exige evidencia de diagnóstico, planificación, ejecución y seguimiento.');

    writer.heading('4. Metodología y Enfoque');
    writer.heading('4.1. Objetivo General',2);writer.paragraph('Identificar y priorizar las necesidades de formación del ITSQMET por carrera, consolidando información trazable que permita estructurar el Plan de Formación Docente del período.');
    writer.heading('4.2. Unidad de análisis',2);writer.paragraph('La unidad de análisis es cada necesidad concreta de formación asociada a una carrera activa. No se utilizan nombres, cédulas ni expedientes individuales de docentes como requisito para generar este documento.');
    writer.heading('4.3. Cobertura',2);writer.paragraph('La cobertura comprende '+active.length+' carrera(s) activa(s). Se registraron necesidades en '+diagnosed+' carrera(s), equivalente a '+pctLabel(coverage)+' de cobertura diagnóstica.');
    writer.heading('4.4. Fuentes e instrumento',2);writer.paragraph('Se utilizan dos plantillas independientes: Carreras y cobertura, seguida por la plantilla DNF. La segunda solo se habilita una vez validado el catálogo de carreras del período.');
    writer.heading('4.5. Variables',2);writer.bullet('Carrera y nivel de formación.');writer.bullet('Necesidad concreta de formación.');writer.bullet('Prioridad institucional: Alta, Media o Baja.');writer.bullet('Código DNF persistente para trazabilidad.');
    writer.heading('4.6. Validación y consolidación',2);writer.paragraph('La aplicación valida estructura, carreras activas, duplicados, necesidades, prioridades y cobertura antes de reemplazar los datos del período. Los archivos con errores no se aplican parcialmente.');

    writer.heading('5. Caracterización del Diagnóstico');
    writer.paragraph('La caracterización se construye a partir de la cobertura de carreras y de la distribución de necesidades registradas, sin depender de una base nominal de docentes.');
    writer.table(['Indicador','Resultado'],[
      ['Carreras activas',String(active.length)],['Carreras diagnosticadas',String(diagnosed)],['Cobertura diagnóstica',pctLabel(coverage)],['Necesidades registradas',String(rows.length)],['Prioridad Alta',String(priority.Alta||0)],['Prioridad Media',String(priority.Media||0)],['Prioridad Baja',String(priority.Baja||0)],['Líneas genéricas institucionales',String(generic.length)]
    ],[65,35],{fontSize:8.5});
    writer.heading('5.1. Distribución por nivel de programa',2);writer.table(['Nivel de formación','Carreras activas','Porcentaje'],Object.entries(programs).map(([name,count])=>[name,String(count),pctLabel(pctValue(count,active.length))]),[55,22,23],{fontSize:8.2});
    writer.heading('5.2. Distribución de necesidades por prioridad',2);writer.table(['Prioridad','Necesidades','Porcentaje'],PRIORITIES.map(p=>[p,String(priority[p]||0),pctLabel(pctValue(priority[p]||0,rows.length))]),[45,25,30],{fontSize:8.2});

    writer.heading('6. Líneas de Formación por Coordinación Académica');
    active.forEach((career,index)=>{const cr=rows.filter(r=>key(r.career)===key(career.name));writer.heading('6.'+(index+1)+'. '+career.name,2);writer.paragraph('Necesidades específicas identificadas para la carrera durante el período '+periodLabelText()+'.');writer.table(['Código','Necesidad','Prioridad'],cr.map(r=>[r.code,r.need,r.priority]),[18,64,18],{fontSize:7.8});});
    writer.heading('6.'+(active.length+1)+'. Formación Intelectual Genérica',2);writer.paragraph('Las siguientes líneas institucionales son transversales y se mantienen precargadas para orientar acciones comunes de formación:');generic.forEach(line=>writer.bullet(line));

    writer.heading('7. Cobertura Institucional');
    writer.paragraph('La cobertura institucional considera exclusivamente las carreras marcadas como activas en la plantilla del período.');
    writer.table(['Carrera','Nivel de formación','Estado'],active.map(c=>[c.name,c.program,'Activa']),[50,35,15],{fontSize:7.8});

    writer.heading('8. Síntesis de Resultados');
    writer.paragraph('Durante el período '+periodLabelText()+' se consolidaron '+rows.length+' necesidad(es) de formación en '+diagnosed+' carrera(s) de un total de '+active.length+' carrera(s) activa(s). La cobertura resultante es '+pctLabel(coverage)+'.');
    if(top.length)writer.paragraph('La mayor cantidad de necesidades se concentra en '+naturalList(top)+', con '+(ranked[0]?.[1]||0)+' necesidad(es) registrada(s) por carrera en el nivel máximo observado.');
    writer.table(['Resultado clave','Valor'],[['Necesidades Alta',String(priority.Alta||0)],['Necesidades Media',String(priority.Media||0)],['Necesidades Baja',String(priority.Baja||0)],['Líneas genéricas',String(generic.length)]],[65,35],{fontSize:8.5});

    writer.heading('9. Conclusiones');
    writer.bullet('La DNF alcanzó una cobertura de '+pctLabel(coverage)+' sobre las carreras activas registradas para el período.');
    writer.bullet('Se identificaron '+rows.length+' necesidades específicas: '+(priority.Alta||0)+' de prioridad Alta, '+(priority.Media||0)+' Media y '+(priority.Baja||0)+' Baja.');
    writer.bullet('La trazabilidad mediante CODIGO_DNF permite conservar la relación entre diagnóstico, planificación, seguimiento e informe final.');
    if(top.length)writer.bullet('Las carreras con mayor concentración de necesidades son '+naturalList(top)+'.');

    writer.heading('10. Recomendaciones');
    writer.bullet('Priorizar en el Plan de Formación las necesidades clasificadas como Alta y mantener visible su CODIGO_DNF durante todo el ciclo.');
    writer.bullet('Transformar cada necesidad validada en una acción institucional con cronograma, indicador, meta, responsable, medio de verificación y recursos definidos.');
    writer.bullet('Mantener las líneas genéricas como componente transversal, sin sustituir las necesidades específicas de cada carrera.');
    writer.bullet('Utilizar los resultados del Informe de Cumplimiento como retroalimentación para la DNF del siguiente período.');

    writer.heading('11. Bibliografía');
    const refs=[...new Set(legal.map(i=>clean(i.name)).filter(Boolean))];
    refs.forEach(r=>writer.bullet(r+'.'));
    ['Plan Estratégico de Desarrollo Institucional (PEDI) del ITSQMET.','Plan Operativo Anual (POA) del ITSQMET.','Reglamento institucional de formación docente vigente.','Manual institucional del proceso de formación académica.'].forEach(r=>writer.bullet(r));

    writer.heading('12. Anexos');
    writer.heading('12.1. Matriz de trazabilidad DNF',2);writer.table(['Código','Carrera','Necesidad resumida','Prioridad'],rows.map(r=>[r.code,r.career,r.need,r.priority]),[18,28,39,15],{fontSize:7.2});
    writer.heading('12.2. Líneas genéricas institucionales',2);generic.forEach(line=>writer.bullet(line));
  }

  function renderPlanPdf(writer) {
    const rows=planRows(),byPriority=counts(rows,r=>r.priority),byModality=counts(rows,r=>r.modality),careers=new Set(rows.map(r=>key(r.career))).size;
    const economic=rows.filter(r=>r.supportType==='Económico').reduce((sum,r)=>sum+Number(r.supportAmount||0),0);
    writer.heading('1. Introducción');writer.paragraph('El presente Plan de Formación Docente del período '+periodLabelText()+' transforma las necesidades validadas en la DNF en acciones institucionales planificadas. La unidad de trazabilidad es el CODIGO_DNF, que se conserva sin modificaciones.');
    writer.heading('2. Objetivo General');writer.paragraph('Planificar acciones de formación pertinentes y verificables para atender las necesidades priorizadas, definiendo modalidad, cronograma, indicadores, metas, responsables, medios de verificación y recursos.');
    writer.heading('3. Diagnóstico y trazabilidad');writer.table(['Indicador','Resultado'],[['Necesidades incorporadas',String(rows.length)],['Carreras con acciones',String(careers)],['Prioridad Alta',String(byPriority.Alta||0)],['Prioridad Media',String(byPriority.Media||0)],['Prioridad Baja',String(byPriority.Baja||0)],['Apoyo económico previsto',economic?'USD '+economic.toLocaleString('es-EC',{minimumFractionDigits:2,maximumFractionDigits:2}):'No registrado']],[65,35],{fontSize:8.5});
    writer.heading('3.1. Distribución por modalidad',2);writer.table(['Modalidad','Acciones','Porcentaje'],Object.entries(byModality).map(([m,c])=>[m,String(c),pctLabel(pctValue(c,rows.length))]),[50,22,28],{fontSize:8.2});
    writer.heading('4. Matriz del Plan');writer.table(['Código','Carrera','Necesidad','Prioridad','Acción','Modalidad','Inicio–Fin','Meta'],rows.map(r=>[r.dnfCode,r.career,r.needText,r.priority,r.action,r.modality,r.plannedStart+' – '+r.plannedEnd,r.targetPercent+'%']),[12,18,23,10,20,10,15,8],{fontSize:6.4});
    writer.heading('5. Indicadores y verificación');writer.table(['Código','Indicador','Medio de verificación','Responsable'],rows.map(r=>[r.dnfCode,r.indicator,r.evidence,r.responsibleRole]),[16,29,30,25],{fontSize:7.2});
    writer.heading('6. Recursos y apoyos');writer.table(['Código','Tipo de apoyo','Monto','Observaciones'],rows.map(r=>[r.dnfCode,r.supportType,r.supportType==='Económico'?'USD '+Number(r.supportAmount||0).toLocaleString('es-EC',{minimumFractionDigits:2,maximumFractionDigits:2}):'—',r.observations||'—']),[18,25,17,40],{fontSize:7.4});
    writer.heading('7. Seguimiento previsto');writer.paragraph('El seguimiento se realizará por CODIGO_DNF y acción planificada. El Informe de Cumplimiento deberá registrar para cada acción su estado, fecha de inicio real cuando corresponda, porcentaje de avance, evidencia y resultado u observación.');
    writer.heading('8. Conclusiones');writer.bullet('El Plan incorpora '+rows.length+' acción(es) vinculadas directamente con necesidades validadas de '+careers+' carrera(s).');writer.bullet('La trazabilidad se mantiene desde la DNF mediante un código único y persistente.');writer.bullet('Las acciones cuentan con criterios mínimos de ejecución y verificación antes de habilitar la generación del PDF.');
  }

  function renderReportPdf(writer) {
    const rows=reportRows(),byStatus=counts(rows,r=>r.status);const started=rows.filter(r=>['En proceso','Finalizado'].includes(r.status)).length,finished=byStatus.Finalizado||0,notExecuted=byStatus['No ejecutado']||0,avg=rows.length?rows.reduce((s,r)=>s+Number(r.progress||0),0)/rows.length:0;
    writer.heading('1. Objeto del Informe');writer.paragraph('Presentar el nivel de cumplimiento del Plan de Formación Docente correspondiente al período '+periodLabelText()+', manteniendo la trazabilidad con la DNF mediante el CODIGO_DNF.');
    writer.heading('2. Alcance y trazabilidad');writer.paragraph('El informe consolida resultados por necesidad y acción institucional. No utiliza nombres, cédulas ni fichas individuales como unidad de seguimiento.');
    writer.heading('3. Resumen de Cumplimiento');writer.table(['Indicador','Resultado'],[['Acciones planificadas',String(rows.length)],['Iniciadas o finalizadas',String(started)],['Finalizadas',String(finished)],['No ejecutadas',String(notExecuted)],['Avance promedio',pctLabel(avg)],['Cumplimiento final',pctLabel(pctValue(finished,rows.length))]],[65,35],{fontSize:8.5});
    writer.heading('3.1. Distribución por estado',2);writer.table(['Estado','Acciones','Porcentaje'],FOLLOW_STATUSES.map(s=>[s,String(byStatus[s]||0),pctLabel(pctValue(byStatus[s]||0,rows.length))]),[50,22,28],{fontSize:8.2});
    writer.heading('4. Seguimiento por necesidad');writer.table(['Código','Carrera','Acción','Estado','Inicio real','Avance','Evidencia'],rows.map(r=>[r.dnfCode,r.career,r.action,r.status,r.realStart||'—',r.progress+'%',r.evidenceTitle||'—']),[13,18,27,13,12,8,19],{fontSize:6.8});
    writer.heading('5. Evidencias y resultados');writer.table(['Código','Archivo / referencia','Resultado u observación'],rows.map(r=>[r.dnfCode,r.evidencePath||r.evidenceTitle||'—',r.observation||'—']),[18,32,50],{fontSize:7.4});
    writer.heading('6. Análisis');writer.paragraph('De '+rows.length+' acciones planificadas, '+started+' registran inicio o finalización y '+finished+' se encuentran finalizadas. El avance promedio institucional es '+pctLabel(avg)+' y el cumplimiento final por acciones finalizadas es '+pctLabel(pctValue(finished,rows.length))+'.');
    writer.heading('7. Conclusiones');writer.bullet('La trazabilidad DNF → Plan → Informe se mantiene mediante CODIGO_DNF.');writer.bullet('Se finalizaron '+finished+' de '+rows.length+' acciones planificadas para el período.');writer.bullet('El avance promedio registrado es '+pctLabel(avg)+'.');
    writer.heading('8. Recomendaciones');writer.bullet('Priorizar el cierre y la evidencia de las acciones que permanezcan En proceso o No iniciadas.');writer.bullet('Documentar el motivo de las acciones No ejecutadas y utilizarlo como insumo para el siguiente ciclo de DNF.');writer.bullet('Retroalimentar el siguiente período con los resultados consolidados y conservar la trazabilidad documental.');
  }

  async function buildCanonicalPdf(type) {
    emitProgress(type,2,'starting');
    await new Promise(resolve=>setTimeout(resolve,0));
    emitProgress(type,8,'preparing');
    const writer=createPdfWriter(type);writer.cover();
    emitProgress(type,18,'render',{stage:'content'});
    if(type==='dnf')renderDnfPdf(writer);else if(type==='plan')renderPlanPdf(writer);else renderReportPdf(writer);
    emitProgress(type,90,'assembling');
    await new Promise(resolve=>setTimeout(resolve,0));
    const result=writer.finish(pdfFilename(type));
    emitProgress(type,100,'done');
    return result;
  }

  generateDocument = async function canonicalGenerateDocument(type) {
    ensureInstitutionalPeriodData();migrateExistingCurrentPeriod();
    const status=documentStatus(type);
    if(!status.ready){toast('Completa la plantilla pendiente antes de generar el PDF');return;}
    const button=document.getElementById('generateCurrent')||document.querySelector('[data-generate="'+type+'"]');
    const previous=button?.textContent||'Generar PDF';
    if(button){button.disabled=true;button.textContent='Generando PDF…';}
    window.__DOCFORMACION_ACTIVE_PDF_TYPE=type;
    try{
      const result=await buildCanonicalPdf(type);
      if(result?.ok)toast('PDF descargado correctamente');
      else toast('No se pudo generar el PDF');
    }catch(error){console.error('[DocFormación] PDF canónico:',error);emitProgress(type,0,'error',{message:error?.message||String(error)});toast('Error al generar PDF: '+(error?.message||error));}
    finally{if(button){button.disabled=false;button.textContent=previous;}setTimeout(()=>{if(window.__DOCFORMACION_ACTIVE_PDF_TYPE===type)window.__DOCFORMACION_ACTIVE_PDF_TYPE='';},1000);}
  };

  function injectStyles() {
    if(document.getElementById('canonicalWorkflowV3Styles'))return;
    const style=document.createElement('style');style.id='canonicalWorkflowV3Styles';style.textContent=`
      .canonical-template-card{display:flex;flex-direction:column;gap:10px}
      .canonical-toolbar{flex-wrap:wrap;margin-top:8px}
      .canonical-toolbar button{white-space:nowrap}
      @media(max-width:900px){.canonical-toolbar{align-items:stretch}.canonical-toolbar button{flex:1 1 210px}}
    `;document.head.appendChild(style);
  }

  function hideLegacyGlobalControls() {
    ['btnTemplate','btnImport'].forEach(id=>{const el=document.getElementById(id);if(el)el.hidden=true;});
  }

  ensureInstitutionalPeriodData();
  injectStyles();
  hideLegacyGlobalControls();
  migrateExistingCurrentPeriod();
  queueSave();

  const previousRender = render;
  render = function canonicalRender() {
    ensureInstitutionalPeriodData();migrateExistingCurrentPeriod();
    const result=previousRender();hideLegacyGlobalControls();bindCanonicalButtons(document.getElementById('content'));return result;
  };

  if (typeof currentView !== 'undefined') render();
  window.__DOCFORMACION_CANONICAL_WORKFLOW = 'v3';
  window.__DOCFORMACION_BUILD_CANONICAL = BUILD;
})();
