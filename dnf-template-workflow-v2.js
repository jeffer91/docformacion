(() => {
  'use strict';

  const FLOW_VERSION = 2;
  const CAREER_PROGRAMS = ['Técnico Superior','Tecnología Superior','Tecnología Universitaria'];
  const CAREER_STATUS = ['Activa','Inactiva'];
  const PRIORITIES = ['Alta','Media','Baja'];

  const clean = value => String(value ?? '').trim();
  const normKey = value => clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .toLowerCase()
    .replace(/\s+/g,' ');

  function periodSlug() {
    const start = clean(state?.period?.start).replace(/[^0-9-]/g,'');
    const end = clean(state?.period?.end).replace(/[^0-9-]/g,'');
    return [start,end].filter(Boolean).join('_a_') || 'periodo';
  }

  function ensureFlow() {
    state.dnfTemplateFlow = state.dnfTemplateFlow && typeof state.dnfTemplateFlow === 'object'
      ? state.dnfTemplateFlow
      : {};
    const flow = state.dnfTemplateFlow;
    if (!Object.prototype.hasOwnProperty.call(flow,'version')) flow.version = FLOW_VERSION;
    if (!Object.prototype.hasOwnProperty.call(flow,'careersImported')) flow.careersImported = false;
    if (!Object.prototype.hasOwnProperty.call(flow,'dnfImported')) flow.dnfImported = false;
    if (!Object.prototype.hasOwnProperty.call(flow,'careersFileName')) flow.careersFileName = '';
    if (!Object.prototype.hasOwnProperty.call(flow,'dnfFileName')) flow.dnfFileName = '';
    if (!Object.prototype.hasOwnProperty.call(flow,'careersImportedAt')) flow.careersImportedAt = '';
    if (!Object.prototype.hasOwnProperty.call(flow,'dnfImportedAt')) flow.dnfImportedAt = '';
    if (!Object.prototype.hasOwnProperty.call(flow,'careersFingerprint')) flow.careersFingerprint = '';
    if (!Object.prototype.hasOwnProperty.call(flow,'dnfCareerFingerprint')) flow.dnfCareerFingerprint = '';
    return flow;
  }

  function careerStatusValue(name) {
    const key = typeof careerKey === 'function' ? careerKey(name) : normKey(name);
    const value = clean(state?.section7?.careerStatus?.[key]?.status);
    return CAREER_STATUS.includes(value) ? value : 'Inactiva';
  }

  function activeCareers() {
    return (state.careers || []).filter(cr => careerStatusValue(cr.name) === 'Activa');
  }

  function careerFingerprint() {
    return (state.careers || [])
      .map(cr => [clean(cr.name),clean(cr.program),careerStatusValue(cr.name)].join('|'))
      .sort((a,b)=>a.localeCompare(b,'es'))
      .join('||');
  }

  function careerCatalogReady() {
    const flow = ensureFlow();
    return flow.careersImported === true && !!flow.careersFingerprint && flow.careersFingerprint === careerFingerprint();
  }

  function dnfTemplateReady() {
    const flow = ensureFlow();
    return careerCatalogReady() && flow.dnfImported === true && flow.dnfCareerFingerprint === careerFingerprint();
  }

  function activeCareerMap() {
    return new Map(activeCareers().map(cr => [normKey(cr.name),cr]));
  }

  function currentNeeds() {
    const rows = [];
    activeCareers().forEach((cr,careerIndex) => {
      const items = typeof ensureNeedItems === 'function' ? ensureNeedItems(cr.name) : [];
      items.filter(item => clean(item?.text)).forEach((item,needIndex) => {
        const code = clean(item.dnfCode) || ('DNF-'+String(careerIndex+1).padStart(2,'0')+'-'+String(needIndex+1).padStart(2,'0'));
        rows.push({
          code,
          career:cr.name,
          need:clean(item.text),
          priority:clean(item.priorityOverride)
        });
      });
    });
    return rows;
  }

  function simpleSheet(name,headers,descriptions,rows,widths) {
    return {name,headers,descriptions,rows:rows && rows.length ? rows : [headers.map(()=> '')],widths};
  }

  const previousExcelTemplatePayload = excelTemplatePayload;
  excelTemplatePayload = function dnfTemplatePayloadV2(scope, includeData) {
    includeData = !!includeData;
    if (scope === 'carreras') {
      const headers = ['CARRERA','PROGRAMA','ESTADO_PERIODO'];
      const descriptions = [
        'Nombre oficial de la carrera del ITSQMET.',
        'Técnico Superior, Tecnología Superior o Tecnología Universitaria.',
        'Activa o Inactiva para el período seleccionado.'
      ];
      const rows = includeData
        ? (state.careers || []).map(cr => [clean(cr.name),clean(cr.program),careerStatusValue(cr.name)])
        : [['','','']];
      return {
        filename:(includeData?'UGPA_Datos_Actuales_Carreras_':'UGPA_Plantilla_Carreras_')+periodSlug()+'.xlsx',
        sheets:[simpleSheet('CARRERAS',headers,descriptions,rows,[48,30,22])]
      };
    }

    if (scope === 'dnf') {
      const headers = ['CODIGO_DNF','CARRERA','NECESIDAD','PRIORIDAD_MANUAL'];
      const descriptions = [
        'Código automático. No es necesario llenarlo en una plantilla nueva.',
        'Carrera activa. Debe coincidir con la plantilla de Carreras del período.',
        'Necesidad concreta de formación. Puede registrar varias filas por carrera.',
        'Prioridad obligatoria: Alta, Media o Baja.'
      ];
      let rows;
      if (includeData) {
        rows = currentNeeds().map(row => [row.code,row.career,row.need,row.priority]);
      } else if (careerCatalogReady()) {
        rows = activeCareers().map(cr => ['',cr.name,'','']);
      } else {
        rows = [['','','','']];
      }
      return {
        filename:(includeData?'UGPA_Datos_Actuales_DNF_':'UGPA_Plantilla_DNF_')+periodSlug()+'.xlsx',
        sheets:[simpleSheet('NECESIDADES',headers,descriptions,rows,[18,48,62,22])]
      };
    }

    return previousExcelTemplatePayload(scope,includeData);
  };

  const previousAnalyzeExcelImport = analyzeExcelImport;
  analyzeExcelImport = function analyzeDnfTemplateV2(scope,result,type='',kind='') {
    if (kind || (scope !== 'carreras' && scope !== 'dnf')) {
      return previousAnalyzeExcelImport(scope,result,type,kind);
    }

    const target = scope === 'carreras' ? 'CARRERAS' : 'NECESIDADES';
    const sheets = result?.sheets || {};
    const detected = Object.keys(sheets).filter(name => Array.isArray(sheets[name]) && sheets[name].length);
    const rows = Array.isArray(sheets[target]) ? sheets[target] : [];
    const preview = [];
    const safeRows = [];
    const errors = [];
    const warnings = [];
    let errorRows = 0;
    let validRows = 0;
    const seen = new Set();

    if (!detected.length) errors.push('El archivo no contiene hojas con datos.');
    if (!detected.includes(target)) errors.push('Esta plantilla debe contener únicamente la hoja '+target+'.');
    const extraRecognized = detected.filter(name => name !== target);
    if (extraRecognized.length) errors.push('Esta carga es independiente. Retira las otras hojas: '+extraRecognized.join(', ')+'.');

    if (scope === 'dnf' && !careerCatalogReady()) {
      errors.push('Primero debes cargar y confirmar la plantilla de Carreras del período.');
    }

    const careerMap = activeCareerMap();
    const representedCareers = new Set();

    rows.forEach((raw,index) => {
      const nonEmpty = Object.values(raw || {}).some(value => clean(value));
      if (!nonEmpty) return;
      let row = {...raw};
      let reason = '';

      if (scope === 'carreras') {
        const career = clean(row.CARRERA ?? row.Carrera ?? row.carrera);
        const program = clean(row.PROGRAMA ?? row.Programa ?? row.programa);
        const statusRaw = clean(row.ESTADO_PERIODO ?? row.ESTADO ?? row.Estado);
        const status = CAREER_STATUS.find(value => normKey(value) === normKey(statusRaw)) || '';
        const programValue = CAREER_PROGRAMS.find(value => normKey(value) === normKey(program)) || '';
        const duplicateKey = normKey(career);

        if (!career) reason = 'Falta CARRERA';
        else if (!programValue) reason = 'PROGRAMA debe ser Técnico Superior, Tecnología Superior o Tecnología Universitaria';
        else if (!status) reason = 'ESTADO_PERIODO debe ser Activa o Inactiva';
        else if (seen.has(duplicateKey)) reason = 'Carrera duplicada dentro de la plantilla';
        else {
          seen.add(duplicateKey);
          row = {CARRERA:career,PROGRAMA:programValue,ESTADO_PERIODO:status};
        }
      } else {
        const careerRaw = clean(row.CARRERA ?? row.Carrera ?? row.carrera);
        const need = clean(row.NECESIDAD ?? row.NECESIDAD_DE_FORMACION ?? row.Necesidad);
        const priorityRaw = clean(row.PRIORIDAD_MANUAL ?? row.PRIORIDAD ?? row.Prioridad);
        const priority = PRIORITIES.find(value => normKey(value) === normKey(priorityRaw)) || '';
        const career = careerMap.get(normKey(careerRaw));
        const duplicateKey = normKey(careerRaw)+'|'+normKey(need);

        if (!careerRaw) reason = 'Falta CARRERA';
        else if (!career) reason = 'La carrera no está activa en la plantilla de Carreras del período';
        else if (!need) reason = 'Falta NECESIDAD';
        else if (!priority) reason = 'PRIORIDAD debe ser Alta, Media o Baja';
        else if (seen.has(duplicateKey)) reason = 'Necesidad duplicada para la misma carrera';
        else {
          seen.add(duplicateKey);
          representedCareers.add(normKey(career.name));
          row = {CODIGO_DNF:'',CARRERA:career.name,NECESIDAD:need,PRIORIDAD_MANUAL:priority};
        }
      }

      if (reason) {
        errorRows++;
        preview.push({id:'excel-row-'+index,sheet:target,row,status:'Error',valid:false,optional:false,reason});
      } else {
        validRows++;
        safeRows.push(row);
        preview.push({id:'excel-row-'+index,sheet:target,row,status:'Aplicar',valid:true,optional:false,reason:'Registro válido'});
      }
    });

    if (scope === 'carreras' && validRows && !safeRows.some(row => row.ESTADO_PERIODO === 'Activa')) {
      errors.push('Debe existir al menos una carrera Activa en el período.');
    }

    if (scope === 'dnf' && careerCatalogReady()) {
      const missing = activeCareers().filter(cr => !representedCareers.has(normKey(cr.name)));
      if (missing.length) {
        errors.push('Falta registrar al menos una necesidad para: '+missing.map(cr=>cr.name).join(', ')+'.');
      }
    }

    if (!validRows && !errors.length) errors.push('No se encontraron filas con datos válidos.');
    if (errorRows) errors.push('La plantilla contiene '+errorRows+' fila(s) con errores. Corrige el archivo completo y vuelve a subirlo. No se aplicará información parcialmente.');

    return {
      context:{label:scope === 'carreras' ? 'Carreras del período' : 'Detección de Necesidades del período',scope,kind:''},
      filePath:result?.filePath || 'Archivo Excel',
      detected,
      allowed:[target],
      compatibleSheets:detected.includes(target)?[target]:[],
      incompatibleSheets:detected.filter(name => name !== target),
      totalRows:preview.length,
      validRows,
      optionalRows:0,
      ignoredRows:0,
      errorRows,
      matchedRows:validRows,
      expectedCount:0,
      statusCounts:{Aplicar:validRows,Actualizar:0,'Actualizar opcional':0,'Ya completo':0,'Sin cambios':0,Omitir:0,Error:errorRows},
      errors,
      warnings,
      safeSheets:errors.length?{}:{[target]:safeRows},
      optionalById:{},
      preview:preview.slice(0,50),
      mismatch:false,
      detectedDestination:null
    };
  };

  const previousOpenExcelAnalysisDialog = openExcelAnalysisDialog;
  openExcelAnalysisDialog = function openExcelAnalysisDialogTemplateV2(scope,result,type='',kind='') {
    window.__DOCFORMACION_TEMPLATE_IMPORT_SCOPE = scope;
    window.__DOCFORMACION_TEMPLATE_IMPORT_FILE = String(result?.filePath || '').split(/[\\/]/).pop() || '';
    return previousOpenExcelAnalysisDialog(scope,result,type,kind);
  };

  const previousCloseExcelAnalysisDialog = closeExcelAnalysisDialog;
  closeExcelAnalysisDialog = function closeExcelAnalysisDialogTemplateV2() {
    const result = previousCloseExcelAnalysisDialog();
    window.__DOCFORMACION_TEMPLATE_IMPORT_SCOPE = '';
    window.__DOCFORMACION_TEMPLATE_IMPORT_FILE = '';
    return result;
  };

  function replaceCareers(rows) {
    const flow = ensureFlow();
    const oldFingerprint = flow.careersFingerprint || careerFingerprint();
    const oldCoords = new Map((state.coordinations || []).map(item => [normKey(item.carrera),item]));

    state.careers = rows.map(row => ({name:clean(row.CARRERA),program:clean(row.PROGRAMA)}));
    state.coordinations = state.careers.map(cr => {
      const old = oldCoords.get(normKey(cr.name));
      return old ? {...old,carrera:cr.name} : {carrera:cr.name,coordinador:'',priorityOverride:'',needsOverride:'',needItems:[]};
    });

    state.section7 = state.section7 && typeof state.section7 === 'object' ? state.section7 : {};
    state.section7.careerStatus = {};
    rows.forEach(row => {
      const key = typeof careerKey === 'function' ? careerKey(row.CARRERA) : normKey(row.CARRERA);
      state.section7.careerStatus[key] = {status:row.ESTADO_PERIODO,manual:true};
    });

    const newFingerprint = careerFingerprint();
    state.section7.catalogConfirmed = true;
    state.section7.confirmedFingerprint = newFingerprint;

    flow.version = FLOW_VERSION;
    flow.careersImported = true;
    flow.careersFileName = window.__DOCFORMACION_TEMPLATE_IMPORT_FILE || 'Plantilla Carreras';
    flow.careersImportedAt = new Date().toISOString();
    flow.careersFingerprint = newFingerprint;

    if (oldFingerprint !== newFingerprint) {
      flow.dnfImported = false;
      flow.dnfFileName = '';
      flow.dnfImportedAt = '';
      flow.dnfCareerFingerprint = '';
    }
  }

  function preservedNeedCodes() {
    const map = new Map();
    (state.coordinations || []).forEach(coord => {
      (coord.needItems || []).forEach(item => {
        if (!clean(item?.text)) return;
        const code = clean(item.dnfCode);
        if (code) map.set(normKey(coord.carrera)+'|'+normKey(item.text),code);
      });
    });
    return map;
  }

  function replaceNeeds(rows) {
    const flow = ensureFlow();
    const oldCodes = preservedNeedCodes();
    const careerOrder = activeCareers().map(cr => cr.name);
    const careerIndex = new Map(careerOrder.map((name,index)=>[normKey(name),index]));
    const grouped = new Map();

    rows.forEach(row => {
      const career = clean(row.CARRERA);
      const key = normKey(career);
      if (!grouped.has(key)) grouped.set(key,[]);
      grouped.get(key).push(row);
    });

    (state.coordinations || []).forEach(coord => {
      coord.needItems = [];
      coord.needsOverride = '';
      coord.priorityOverride = '';
    });

    careerOrder.forEach(career => {
      const key = normKey(career);
      const coord = typeof ensureCoordination === 'function' ? ensureCoordination(career) : null;
      if (!coord) return;
      const items = grouped.get(key) || [];
      coord.needItems = items.map((row,index) => {
        const lookup = key+'|'+normKey(row.NECESIDAD);
        const code = oldCodes.get(lookup) || ('DNF-'+String((careerIndex.get(key) ?? 0)+1).padStart(2,'0')+'-'+String(index+1).padStart(2,'0'));
        return {
          id:typeof needId === 'function' ? needId(career,index) : 'need_'+(careerIndex.get(key) ?? 0)+'_'+index,
          dnfCode:code,
          text:clean(row.NECESIDAD),
          priorityOverride:clean(row.PRIORIDAD_MANUAL)
        };
      });
    });

    flow.version = FLOW_VERSION;
    flow.dnfImported = true;
    flow.dnfFileName = window.__DOCFORMACION_TEMPLATE_IMPORT_FILE || 'Plantilla DNF';
    flow.dnfImportedAt = new Date().toISOString();
    flow.dnfCareerFingerprint = careerFingerprint();
  }

  const previousApplyExcel = applyExcel;
  applyExcel = function applyExcelTemplateV2(sheets) {
    const scope = window.__DOCFORMACION_TEMPLATE_IMPORT_SCOPE;
    if (scope === 'carreras' && Array.isArray(sheets?.CARRERAS)) {
      replaceCareers(sheets.CARRERAS);
      return;
    }
    if (scope === 'dnf' && Array.isArray(sheets?.NECESIDADES)) {
      replaceNeeds(sheets.NECESIDADES);
      return;
    }
    return previousApplyExcel(sheets);
  };

  const previousDocumentStatus = documentStatus;
  documentStatus = function documentStatusTemplateV2(type) {
    const result = previousDocumentStatus(type);
    if (type !== 'dnf') return result;

    const flow = ensureFlow();
    const removeKinds = new Set([
      'dnf-data-empty','section7-catalog-confirm','teachers-empty','teacher',
      'career-empty','career-program','career-needs','need-priority','coordinator','generic',
      'section6-careers','section6-generic','section7-careers-empty',
      'section7-active-without-teachers','section7-inactive-with-teachers','section7-dedication'
    ]);
    const issues = (result.issues || []).filter(issue => !removeKinds.has(issue.kind));

    if (!careerCatalogReady()) {
      issues.unshift({
        kind:'dnf-template-careers',
        text:'Cargar y confirmar las carreras del período',
        description:'Registra el catálogo completo de carreras, su nivel de formación y el estado Activa/Inactiva.',
        view:'carreras'
      });
    } else if (!dnfTemplateReady()) {
      issues.unshift({
        kind:'dnf-template-needs',
        text:'Cargar la plantilla DNF del período',
        description:'Registra las necesidades de formación y su prioridad para todas las carreras activas.',
        view:'necesidades'
      });
    }

    return {...result,issues,ready:issues.length===0,missing:issues.map(issue=>issue.text),templateFlow:flow};
  };

  function templateButtons(scope, enabled=true, hasCurrent=false) {
    const disabled = enabled ? '' : ' disabled';
    return '<div class="toolbar excel-toolbar">'+
      '<button type="button" class="secondary" data-v2-template="'+scope+'"'+disabled+'>Descargar plantilla vacía</button>'+
      '<button type="button" class="secondary" data-v2-current="'+scope+'"'+(enabled && hasCurrent?'':' disabled')+'>Descargar datos actuales</button>'+
      '<button type="button" class="primary" data-v2-import="'+scope+'"'+disabled+'>Subir / reemplazar plantilla</button>'+
    '</div>';
  }

  function bindTemplateButtons(root=document) {
    root.querySelectorAll('[data-v2-template]').forEach(btn => btn.onclick = () => exportTemplate(btn.dataset.v2Template,false));
    root.querySelectorAll('[data-v2-current]').forEach(btn => btn.onclick = () => exportTemplate(btn.dataset.v2Current,true));
    root.querySelectorAll('[data-v2-import]').forEach(btn => btn.onclick = () => importExcel(btn.dataset.v2Import));
  }

  function flowCardsHtml() {
    const flow = ensureFlow();
    const careersReady = careerCatalogReady();
    const dnfReady = dnfTemplateReady();
    const active = activeCareers().length;
    const needs = currentNeeds().length;
    return `
      <div class="section-title dnf-template-heading">
        <div><h2>Plantillas del período</h2><p>La información variable se carga mediante archivos Excel independientes. Las correcciones se realizan en Excel y se vuelven a subir.</p></div>
      </div>
      <div class="grid cards dnf-template-grid">
        <div class="card dnf-template-card">
          <div class="dnf-template-card-head"><div><strong>1. Carreras y cobertura</strong><span>${careersReady?'Cargada':'Pendiente'}</span></div><span class="status-badge ${careersReady?'ready':'blocked'}">${careersReady?'Lista':'Pendiente'}</span></div>
          <p>${careersReady?`${state.careers.length} carreras registradas · ${active} activas`:'Debe cargarse primero para habilitar la DNF.'}</p>
          ${flow.careersFileName?`<div class="small muted">Último archivo: ${esc(flow.careersFileName)}</div>`:''}
          ${templateButtons('carreras',true,(state.careers||[]).length>0)}
        </div>
        <div class="card dnf-template-card">
          <div class="dnf-template-card-head"><div><strong>2. Detección de Necesidades</strong><span>${dnfReady?'Cargada':(careersReady?'Pendiente':'Bloqueada hasta cargar Carreras')}</span></div><span class="status-badge ${dnfReady?'ready':'blocked'}">${dnfReady?'Lista':'Pendiente'}</span></div>
          <p>${dnfReady?`${needs} necesidades registradas`:(careersReady?'Completa las necesidades y prioridades de todas las carreras activas.':'Primero completa Carreras y cobertura.')}</p>
          ${flow.dnfFileName?`<div class="small muted">Último archivo: ${esc(flow.dnfFileName)}</div>`:''}
          ${templateButtons('dnf',careersReady,dnfReady && needs>0)}
        </div>
      </div>`;
  }

  function pendingHtml(issues) {
    if (!issues.length) return '<div class="ready-message">Toda la información requerida está completa.</div>';
    return '<div class="issue-count">'+issues.length+' pendiente(s) detectado(s)</div>'+issues.map(issue => {
      if (issue.kind === 'dnf-template-careers') {
        return '<div class="issue-line"><div class="issue-line-text"><strong>'+esc(issue.text)+'</strong><span class="small muted">'+esc(issue.description||'')+'</span></div><div class="issue-line-actions">'+templateButtons('carreras',true,(state.careers||[]).length>0)+'</div></div>';
      }
      if (issue.kind === 'dnf-template-needs') {
        return '<div class="issue-line"><div class="issue-line-text"><strong>'+esc(issue.text)+'</strong><span class="small muted">'+esc(issue.description||'')+'</span></div><div class="issue-line-actions">'+templateButtons('dnf',careerCatalogReady(),currentNeeds().length>0)+'</div></div>';
      }
      return typeof renderIssues === 'function' ? renderIssues('dnf',[issue]) : '<div class="issue-line"><div class="issue-line-text">'+esc(issue.text||'Pendiente')+'</div></div>';
    }).join('');
  }

  const previousRenderDocumentView = renderDocumentView;
  renderDocumentView = function renderDocumentViewTemplateV2(type) {
    if (type !== 'dnf') return previousRenderDocumentView(type);
    const status = documentStatus('dnf');
    const hasIssues = status.issues?.length > 0;
    document.getElementById('content').innerHTML = `
      ${flowCardsHtml()}
      <div class="status-card simple-doc-card single-document" style="margin-top:18px">
        <div class="status-head">
          <div class="missing-heading">${hasIssues?'Falta completar':'Documento completo'}</div>
          <span class="status-badge ${hasIssues?'blocked':'ready'}">${hasIssues?'Pendiente':'Listo'}</span>
        </div>
        ${hasIssues
          ? pendingHtml(status.issues)
          : '<div class="ready-message">Carreras y DNF están cargadas para el período activo.</div><div class="doc-actions"><button class="primary" id="generateCurrent">Generar PDF</button></div>'}
      </div>`;
    bindTemplateButtons(document.getElementById('content'));
    if (typeof bindCorrectionActions === 'function') bindCorrectionActions('dnf',document.getElementById('content'));
    const generate = document.getElementById('generateCurrent');
    if (generate) generate.onclick = () => generateDocument('dnf');
  };

  renderCareers = function renderCareersTemplateV2() {
    const ready = careerCatalogReady();
    const rows = (state.careers || []).map(cr => `
      <tr><td><strong>${esc(cr.name)}</strong></td><td>${esc(cr.program)}</td><td>${esc(careerStatusValue(cr.name))}</td></tr>`).join('');
    document.getElementById('content').innerHTML = `
      <div class="section-title"><div><h2>Carreras del período</h2><p>Vista de consulta. Para agregar, eliminar o corregir carreras, modifica el Excel y vuelve a subirlo.</p></div></div>
      <div class="card">
        ${templateButtons('carreras',true,(state.careers||[]).length>0)}
        <div class="small muted" style="margin-top:10px">${ready?'Catálogo confirmado para el período activo.':'El catálogo todavía no ha sido confirmado mediante plantilla.'}</div>
      </div>
      <div class="table-wrap" style="margin-top:16px">
        ${rows?'<table class="table"><thead><tr><th>Carrera</th><th>Nivel de formación</th><th>Estado del período</th></tr></thead><tbody>'+rows+'</tbody></table>':'<div class="empty">No hay carreras cargadas.</div>'}
      </div>`;
    bindTemplateButtons(document.getElementById('content'));
  };

  renderDNF = function renderDNFTemplateV2() {
    const careersReady = careerCatalogReady();
    const needs = currentNeeds();
    const generic = Array.isArray(state?.section6?.genericLines) && state.section6.genericLines.length
      ? state.section6.genericLines.map(item => clean(item?.name)).filter(Boolean)
      : (state.settings?.genericLines || []).map(clean).filter(Boolean);
    const rows = needs.map(item => `<tr><td><strong>${esc(item.code)}</strong></td><td>${esc(item.career)}</td><td>${esc(item.need)}</td><td>${esc(item.priority)}</td></tr>`).join('');

    document.getElementById('content').innerHTML = `
      <div class="section-title"><div><h2>Detección de Necesidades</h2><p>Vista de consulta. La información se corrige únicamente desde la plantilla Excel DNF.</p></div></div>
      <div class="card">
        ${templateButtons('dnf',careersReady,dnfTemplateReady() && needs.length>0)}
        <div class="small muted" style="margin-top:10px">${careersReady?'La plantilla se genera únicamente con las carreras activas del período.':'Primero carga la plantilla de Carreras.'}</div>
      </div>
      <div class="section-title" style="margin-top:24px"><div><h3>Necesidades específicas por carrera</h3><p>${needs.length} necesidad(es) registradas.</p></div></div>
      <div class="table-wrap">${rows?'<table class="table"><thead><tr><th>Código</th><th>Carrera</th><th>Necesidad</th><th>Prioridad</th></tr></thead><tbody>'+rows+'</tbody></table>':'<div class="empty">Todavía no se ha cargado una DNF válida para este período.</div>'}</div>
      <div class="section-title" style="margin-top:24px"><div><h3>Formación Intelectual Genérica</h3><p>Plantilla institucional precargada. No requiere carga Excel para habilitar el documento.</p></div></div>
      <div class="card">${generic.length?'<ul style="margin:0;padding-left:20px">'+generic.map(line=>'<li>'+esc(line)+'</li>').join('')+'</ul>':'<div class="small muted">Se utilizarán las líneas institucionales configuradas por defecto.</div>'}</div>`;
    bindTemplateButtons(document.getElementById('content'));
  };

  function injectStyles() {
    if (document.getElementById('dnfTemplateWorkflowV2Styles')) return;
    const style = document.createElement('style');
    style.id = 'dnfTemplateWorkflowV2Styles';
    style.textContent = `
      .dnf-template-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
      .dnf-template-card{display:flex;flex-direction:column;gap:10px}
      .dnf-template-card .toolbar{margin-top:auto;flex-wrap:wrap}
      .dnf-template-card-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
      .dnf-template-card-head>div{display:flex;flex-direction:column;gap:4px}
      .dnf-template-card-head>div>span{font-size:11px;color:#718096}
      .issue-line-actions .excel-toolbar{justify-content:flex-end;flex-wrap:wrap}
      button:disabled{opacity:.45;cursor:not-allowed}
      @media(max-width:900px){.dnf-template-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  injectStyles();
  ensureFlow();

  if (typeof currentView !== 'undefined' && ['doc-dnf','carreras','necesidades'].includes(currentView)) {
    render();
  }

  window.__DOCFORMACION_DNF_TEMPLATE_WORKFLOW = 'v2';
})();
