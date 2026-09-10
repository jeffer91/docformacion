(() => {
  'use strict';

  const clean = (value='') => String(value ?? '').trim();
  const key = value => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ');
  const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  let pendingDnfFilename = '';

  function ensureWorkflowState() {
    state.dnfSurveyMeta = state.dnfSurveyMeta && typeof state.dnfSurveyMeta === 'object' ? state.dnfSurveyMeta : {};
    state.section7 = state.section7 && typeof state.section7 === 'object' ? state.section7 : {};
    if (!Object.prototype.hasOwnProperty.call(state.section7,'catalogConfirmed')) state.section7.catalogConfirmed = false;
    if (!Object.prototype.hasOwnProperty.call(state.section7,'confirmedFingerprint')) state.section7.confirmedFingerprint = '';
    return state.dnfSurveyMeta;
  }

  function validResponses() {
    return (state.teachers || []).filter(t => t && t.estadoValido !== false && t.valid !== false && t.excluirDNF !== true);
  }

  function parseDate(value) {
    const raw = clean(value);
    if (!raw) return null;
    let m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      const d = new Date(Number(m[1]),Number(m[2])-1,Number(m[3]));
      return Number.isNaN(d.getTime()) ? null : d;
    }
    m = raw.match(/^(\d{2})[\/.-](\d{2})[\/.-](\d{4})/);
    if (m) {
      const d = new Date(Number(m[3]),Number(m[2])-1,Number(m[1]));
      return Number.isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function responseDate(teacher) {
    return parseDate(teacher?.fechaRespuestaEncuesta || teacher?.fechaRespuesta || teacher?.surveyResponseDate || teacher?.timestamp || teacher?.marcaTemporal || '');
  }

  function deriveSurveyMetadata() {
    ensureWorkflowState();
    const responses = validResponses();
    const dates = responses.map(responseDate).filter(Boolean).sort((a,b)=>a-b);
    const years = [...new Set(dates.map(d=>d.getFullYear()))].sort((a,b)=>a-b);
    const fallbackYear = Number(clean(state.period?.end).slice(0,4)) || new Date().getFullYear();
    const surveyYear = years.length === 1 ? String(years[0]) : years.length > 1 ? years[0]+'–'+years[years.length-1] : String(fallbackYear);
    const first = dates[0] || null;
    const last = dates.length ? dates[dates.length-1] : null;
    const toMonth = d => d ? d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0') : '';

    const meta = state.dnfSurveyMeta;
    meta.validResponses = responses.length;
    meta.applicationYear = surveyYear;
    meta.derivedStart = toMonth(first);
    meta.derivedEnd = toMonth(last);
    meta.hasTimestamps = !!dates.length;

    if (!clean(state.period?.surveyPeriod) || meta.autoSurveyPeriod === true) {
      state.period.surveyPeriod = surveyYear;
      meta.autoSurveyPeriod = true;
    }
    if (first && (!clean(state.period?.surveyStart) || meta.autoSurveyStart === true)) {
      state.period.surveyStart = meta.derivedStart;
      meta.autoSurveyStart = true;
    }
    if (last && (!clean(state.period?.surveyEnd) || meta.autoSurveyEnd === true)) {
      state.period.surveyEnd = meta.derivedEnd;
      meta.autoSurveyEnd = true;
    }
    return meta;
  }

  function monthLabel(value) {
    const m = clean(value).match(/^(\d{4})-(\d{2})/);
    if (!m) return clean(value) || 'No disponible';
    return (MONTHS[Number(m[2])-1] || m[2]) + ' de ' + m[1];
  }

  function careerStatus(name) {
    const k = typeof careerKey === 'function' ? careerKey(name) : key(name);
    const entry = state.section7?.careerStatus?.[k];
    return clean(entry?.status) || 'Inactiva';
  }

  function careerFingerprint() {
    ensureWorkflowState();
    return (state.careers || []).map(cr => [clean(cr.name),clean(cr.program),careerStatus(cr.name)].join('|')).sort().join('||');
  }

  function catalogConfirmed() {
    ensureWorkflowState();
    return state.section7.catalogConfirmed === true && state.section7.confirmedFingerprint === careerFingerprint();
  }

  function previousPeriodRecord() {
    const manager = state.periodManager;
    if (!manager || !Array.isArray(manager.periods)) return null;
    const currentId = manager.activeId;
    const current = manager.periods.find(p=>p.id===currentId);
    const currentStart = clean(current?.start || state.period?.start);
    return [...manager.periods]
      .filter(p=>p.id!==currentId && p.snapshot && clean(p.start) < currentStart)
      .sort((a,b)=>clean(b.start).localeCompare(clean(a.start)))[0] || null;
  }

  async function copyPreviousCareers() {
    const previous = previousPeriodRecord();
    if (!previous) { toast('No existe un período anterior disponible para copiar.'); return; }
    const source = previous.snapshot || {};
    state.careers = JSON.parse(JSON.stringify(source.careers || []));
    state.coordinations = JSON.parse(JSON.stringify(source.coordinations || []));
    state.section7 = state.section7 && typeof state.section7 === 'object' ? state.section7 : {};
    state.section7.careerStatus = JSON.parse(JSON.stringify(source.section7?.careerStatus || {}));
    state.section7.catalogConfirmed = false;
    state.section7.confirmedFingerprint = '';
    await save();
    toast('Carreras copiadas del período anterior. Revisa los cambios y confirma el catálogo.');
    renderCareers();
  }

  if (typeof periodMissing === 'function') {
    const previousPeriodMissing = periodMissing;
    periodMissing = function periodMissingDNFWorkflow(type) {
      const missing = previousPeriodMissing(type) || [];
      if (type !== 'dnf') return missing;
      deriveSurveyMetadata();
      return missing.filter(text => {
        const k = key(text);
        return !k.includes('periodo / ano de aplicacion de la encuesta') &&
          !k.includes('periodo / año de aplicacion de la encuesta') &&
          !k.includes('fecha de inicio del levantamiento') &&
          !k.includes('fecha de finalizacion del levantamiento') &&
          !k.includes('fecha de finalización del levantamiento');
      });
    };
  }

  if (typeof documentStatus === 'function') {
    const previousDocumentStatus = documentStatus;
    documentStatus = function documentStatusDNFWorkflow(type) {
      const result = previousDocumentStatus(type);
      if (type !== 'dnf') return result;
      const meta = deriveSurveyMetadata();
      const removedKinds = new Set(['teachers-empty','section6-generic','section7-careers-empty','section7-active-without-teachers','section7-inactive-with-teachers']);
      const issues = (result.issues || []).filter(issue => {
        if (removedKinds.has(issue.kind)) return false;
        const k = key(issue.text);
        if (k.includes('cargar al menos un docente para generar la caracterizacion del claustro')) return false;
        if (k.includes('completar la matriz de formacion intelectual generica')) return false;
        if (k.includes('definir al menos una carrera activa para cobertura institucional')) return false;
        if (k.includes('periodo / ano de aplicacion de la encuesta')) return false;
        if (k.includes('fecha de inicio del levantamiento')) return false;
        if (k.includes('fecha de finalizacion del levantamiento')) return false;
        return true;
      });

      if (!meta.validResponses) {
        issues.unshift({kind:'dnf-data-empty',text:'Cargar la encuesta DNF del período',view:'doc-dnf'});
      }
      if (!catalogConfirmed()) {
        issues.push({
          kind:'section7-catalog-confirm',
          text:'Registrar y confirmar las carreras activas del ITSQMET para el período',
          description:'La Cobertura Institucional requiere el listado completo de carreras vigentes y su nivel de formación.',
          view:'carreras'
        });
      }
      return {...result,issues,ready:issues.length===0,missing:issues.map(x=>x.text)};
    };
  }

  if (typeof renderIssues === 'function') {
    const previousRenderIssues = renderIssues;
    renderIssues = function renderIssuesDNFWorkflow(type,issues) {
      if (type !== 'dnf') return previousRenderIssues(type,issues);
      return (issues || []).map(issue => {
        let action='';
        if (issue.kind==='dnf-data-empty') {
          action='<button class="primary compact" data-excel-import="dnf">Subir plantilla DNF</button>';
        } else {
          const label = issue.view==='carreras' ? 'Corregir en Carreras' : issue.view==='periodo' ? 'Corregir en Datos generales' : issue.view==='necesidades' ? 'Corregir en Necesidades' : 'Corregir';
          action='<button class="secondary compact" data-correct-view="'+esc(issue.view||'doc-dnf')+'">'+esc(label)+'</button>';
        }
        return '<div class="issue-line"><div class="issue-line-text"><strong>'+esc(issue.text||'Pendiente')+'</strong>'+(issue.description?'<span class="small muted">'+esc(issue.description)+'</span>':'')+'</div><div class="issue-line-actions">'+action+'</div></div>';
      }).join('');
    };
  }

  if (typeof openExcelAnalysisDialog === 'function') {
    const previousOpenExcelAnalysisDialog = openExcelAnalysisDialog;
    openExcelAnalysisDialog = function openExcelAnalysisDialogDNFWorkflow(scope,result,type='',kind='') {
      if (scope==='dnf') pendingDnfFilename = String(result?.filePath || '').split(/[\\/]/).pop() || 'Plantilla DNF';
      return previousOpenExcelAnalysisDialog(scope,result,type,kind);
    };
  }

  if (typeof applyExcel === 'function') {
    const previousApplyExcel = applyExcel;
    applyExcel = function applyExcelDNFWorkflow(sheets) {
      const result = previousApplyExcel(sheets);
      if (pendingDnfFilename && sheets && (sheets.DOCENTES || sheets.PERIODO || sheets.NECESIDADES)) {
        ensureWorkflowState();
        state.dnfSurveyMeta.fileName = pendingDnfFilename;
        state.dnfSurveyMeta.importedAt = new Date().toISOString();
        deriveSurveyMetadata();
        pendingDnfFilename = '';
      }
      return result;
    };
  }

  if (typeof renderDNF === 'function') {
    const previousRenderDNF = renderDNF;
    renderDNF = function renderDNFWorkflow() {
      deriveSurveyMetadata();
      previousRenderDNF();
      const root = document.getElementById('content');
      if (!root) return;
      const meta = deriveSurveyMetadata();

      const titles = [...root.querySelectorAll('.section-title')];
      const uploadSection = titles.find(node => /carga excel de la dnf/i.test(node.querySelector('h2')?.textContent || ''));
      if (uploadSection) {
        uploadSection.innerHTML = '<div><h2>Datos de la encuesta DNF</h2><p>La encuesta se carga una sola vez y alimenta automáticamente la caracterización, resultados y anexos.</p></div>'+
          '<div class="toolbar excel-toolbar">'+
          '<button class="secondary" data-excel-template="dnf">Descargar plantilla DNF</button>'+
          '<button class="primary" data-excel-import="dnf">Subir / reemplazar plantilla DNF</button>'+
          '<button class="secondary" id="dnfViewImported">Ver datos importados</button></div>';
      }

      const existing = document.getElementById('dnfSurveySummary');
      if (existing) existing.remove();
      const block = document.createElement('div');
      block.id='dnfSurveySummary';
      block.className='card';
      const fileName = clean(meta.fileName) || (meta.validResponses ? 'Datos DNF cargados en el período' : 'No cargado');
      block.innerHTML = '<div class="grid cards">'+
        metric('Archivo DNF',fileName)+
        metric('Respuestas válidas',meta.validResponses || 0)+
        metric('Año de aplicación',meta.applicationYear || '—')+
        metric('Inicio del levantamiento',clean(state.period?.surveyStart)?monthLabel(state.period.surveyStart):'No disponible')+
        metric('Fin del levantamiento',clean(state.period?.surveyEnd)?monthLabel(state.period.surveyEnd):'No disponible')+
        '</div><div id="dnfImportedDetail" class="small muted" hidden style="margin-top:12px">'+
        'La DNF se interpreta como una base de respuestas: 1 respuesta válida = 1 participante del diagnóstico. No se requiere una base independiente de docentes para habilitar este documento.'+
        '</div>';
      if (uploadSection) uploadSection.insertAdjacentElement('afterend',block);

      const viewButton=document.getElementById('dnfViewImported');
      if (viewButton) viewButton.onclick=()=>{const detail=document.getElementById('dnfImportedDetail');if(detail)detail.hidden=!detail.hidden;};
    };
  }

  if (typeof renderCareers === 'function') {
    const previousRenderCareers = renderCareers;
    renderCareers = function renderCareersDNFWorkflow() {
      ensureWorkflowState();
      previousRenderCareers();
      const root=document.getElementById('content');
      if(!root || document.getElementById('dnfCareerConfirmation')) return;
      const section=document.createElement('div');
      section.id='dnfCareerConfirmation';
      section.className='card';
      const checked=catalogConfirmed();
      section.innerHTML='<div class="section-title" style="margin:0"><div><h2>Carreras del período</h2><p>Confirma que el catálogo de carreras activas e inactivas del período está completo.</p></div><div class="toolbar"><button type="button" class="secondary" id="copyPreviousCareers">Copiar del período anterior</button></div></div>'+
        '<label style="display:flex;gap:10px;align-items:center;margin-top:14px"><input type="checkbox" id="confirmCareerCatalog" '+(checked?'checked':'')+'> <strong>Confirmo que el listado de carreras activas está completo</strong></label>';
      const catalog=document.getElementById('careerCatalog');
      if(catalog) catalog.insertAdjacentElement('beforebegin',section); else root.prepend(section);
      const copy=document.getElementById('copyPreviousCareers');if(copy)copy.onclick=copyPreviousCareers;
      const confirm=document.getElementById('confirmCareerCatalog');
      if(confirm)confirm.onchange=async()=>{
        state.section7.catalogConfirmed=confirm.checked;
        state.section7.confirmedFingerprint=confirm.checked?careerFingerprint():'';
        await save();
        toast(confirm.checked?'Catálogo del período confirmado':'Confirmación del catálogo retirada');
      };
    };
  }

  deriveSurveyMetadata();
  window.__DOCFORMACION_DNF_WORKFLOW_READY = true;
})();