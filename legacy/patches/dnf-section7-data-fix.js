(() => {
  'use strict';

  const CAREER_STATUS = ['Activa','Inactiva'];
  const DEDICATIONS = ['Tiempo Completo','Medio Tiempo','Tiempo Parcial'];

  const clean = (value='') => String(value ?? '').trim();
  const keyFor = value => typeof careerKey === 'function' ? careerKey(value) : clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ');

  function normalizeDedication(value) {
    const raw = clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
    if (!raw) return '';
    if (raw === 'tc' || raw.includes('tiempo completo')) return 'Tiempo Completo';
    if (raw === 'mt' || raw.includes('medio tiempo')) return 'Medio Tiempo';
    if (raw === 'tp' || raw.includes('tiempo parcial')) return 'Tiempo Parcial';
    return '';
  }

  function teacherCareerKeys() {
    return new Set((state.teachers || []).map(t => keyFor(t.carrera)).filter(Boolean));
  }

  function ensureSection7() {
    state.period = state.period || {};
    if (!Object.prototype.hasOwnProperty.call(state.period,'surveyStart')) state.period.surveyStart = '';
    if (!Object.prototype.hasOwnProperty.call(state.period,'surveyEnd')) state.period.surveyEnd = '';

    state.section7 = state.section7 && typeof state.section7 === 'object' ? state.section7 : {};
    state.section7.careerStatus = state.section7.careerStatus && typeof state.section7.careerStatus === 'object' ? state.section7.careerStatus : {};

    const teacherKeys = teacherCareerKeys();
    const valid = new Set();
    (state.careers || []).forEach(cr => {
      const key = keyFor(cr.name);
      if (!key) return;
      valid.add(key);
      const current = state.section7.careerStatus[key];
      if (!current || typeof current !== 'object') {
        state.section7.careerStatus[key] = {status:teacherKeys.has(key)?'Activa':'Inactiva',manual:false};
      } else {
        current.status = CAREER_STATUS.includes(clean(current.status)) ? clean(current.status) : (teacherKeys.has(key)?'Activa':'Inactiva');
        current.manual = !!current.manual;
        if (!current.manual) current.status = teacherKeys.has(key)?'Activa':'Inactiva';
      }
    });
    Object.keys(state.section7.careerStatus).forEach(key => { if (!valid.has(key)) delete state.section7.careerStatus[key]; });
    return state.section7;
  }

  function careerStatus(name) {
    ensureSection7();
    return state.section7.careerStatus[keyFor(name)]?.status || 'Inactiva';
  }

  function setCareerStatus(name,status,manual=true) {
    ensureSection7();
    const key = keyFor(name);
    if (!key) return;
    state.section7.careerStatus[key] = {status:CAREER_STATUS.includes(status)?status:'Inactiva',manual:!!manual};
  }

  function activeCareerNames() {
    ensureSection7();
    return (state.careers || []).filter(cr => careerStatus(cr.name) === 'Activa').map(cr => cr.name).filter(Boolean);
  }

  function careerTeacherCount(name) {
    const key = keyFor(name);
    return (state.teachers || []).filter(t => keyFor(t.carrera) === key).length;
  }

  function dedicationStats() {
    const counts = {'Tiempo Completo':0,'Medio Tiempo':0,'Tiempo Parcial':0};
    const invalid = [];
    (state.teachers || []).forEach(t => {
      const value = normalizeDedication(t.dedicacion);
      if (!value) { invalid.push(t); return; }
      counts[value]++;
    });
    const total = counts['Tiempo Completo'] + counts['Medio Tiempo'] + counts['Tiempo Parcial'];
    const pct = value => total ? value * 100 / total : 0;
    return {
      counts,total,invalid,
      percentages:{
        'Tiempo Completo':pct(counts['Tiempo Completo']),
        'Medio Tiempo':pct(counts['Medio Tiempo']),
        'Tiempo Parcial':pct(counts['Tiempo Parcial'])
      }
    };
  }

  function monthRangeText() {
    const months=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const fmt=value=>{const m=clean(value).match(/^(\d{4})-(\d{2})/);return m?(months[Number(m[2])-1]||m[2])+' de '+m[1]:clean(value);};
    const a=fmt(state.period?.surveyStart),b=fmt(state.period?.surveyEnd);
    return a&&b?a+' a '+b:(a||b||'');
  }

  function syncSection6WithCoverage() {
    ensureSection7();
    if (!state.section6 || typeof state.section6 !== 'object') return;
    state.section6.careers = state.section6.careers && typeof state.section6.careers === 'object' ? state.section6.careers : {};
    const active = activeCareerNames();
    const previousOrder = Array.isArray(state.section6.careerOrder) ? state.section6.careerOrder : [];
    const next = previousOrder.filter(name => active.some(a => keyFor(a) === keyFor(name)));
    active.forEach(name => {
      if (!next.some(x => keyFor(x) === keyFor(name))) next.push(name);
      const key = keyFor(name);
      if (!state.section6.careers[key]) state.section6.careers[key] = {career:name,description:'',specificLines:[],academicSuggestions:[]};
      state.section6.careers[key].career = name;
    });
    state.section6.careerOrder = next;
  }

  function injectStyles() {
    if (document.getElementById('section7Styles')) return;
    const style=document.createElement('style');
    style.id='section7Styles';
    style.textContent=`
      .catalog-row.s7-catalog-row{grid-template-columns:minmax(260px,1fr) minmax(180px,240px) minmax(150px,190px) auto}
      .s7-summary-note{margin-top:12px;font-size:12px;color:#607086}
      @media(max-width:900px){.catalog-row.s7-catalog-row{grid-template-columns:1fr}.catalog-row.s7-catalog-row button{justify-self:start}}
    `;
    document.head.appendChild(style);
  }

  if (typeof renderPeriod === 'function') {
    const previousRenderPeriod = renderPeriod;
    renderPeriod = function renderPeriodSection7() {
      ensureSection7();
      previousRenderPeriod();
      const grid=document.querySelector('#content .form-grid');
      if (!grid || grid.querySelector('[name="surveyStart"]')) return;
      const holder=document.createElement('div');
      holder.innerHTML = field('Fecha de inicio del levantamiento','surveyStart',state.period.surveyStart || '','month',[],false,'Mes y año de inicio del formulario o encuesta institucional.') +
        field('Fecha de finalización del levantamiento','surveyEnd',state.period.surveyEnd || '','month',[],false,'Mes y año de cierre del levantamiento. Se reutiliza en la nota de Cobertura Institucional.');
      [...holder.children].forEach(child=>grid.appendChild(child));

      const start=grid.querySelector('[name="surveyStart"]');
      const end=grid.querySelector('[name="surveyEnd"]');
      const surveyPeriod=grid.querySelector('[name="surveyPeriod"]');
      const refresh=()=>{
        setMissingControl(start,!clean(start?.value));
        setMissingControl(end,!clean(end?.value));
        if (surveyPeriod && !clean(surveyPeriod.value) && clean(start?.value) && clean(end?.value)) surveyPeriod.value=monthRangeTextFromValues(start.value,end.value);
      };
      [start,end].forEach(el=>{el?.addEventListener('input',refresh);el?.addEventListener('change',refresh);});
      refresh();
    };
  }

  function monthRangeTextFromValues(start,end) {
    const months=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const fmt=value=>{const m=clean(value).match(/^(\d{4})-(\d{2})/);return m?(months[Number(m[2])-1]||m[2])+' de '+m[1]:clean(value);};
    return fmt(start)+' a '+fmt(end);
  }

  if (typeof periodMissing === 'function') {
    const previousPeriodMissing=periodMissing;
    periodMissing=function periodMissingSection7(type) {
      ensureSection7();
      const missing=previousPeriodMissing(type) || [];
      if (type==='dnf') {
        if (!clean(state.period.surveyStart)) missing.push('Fecha de inicio del levantamiento');
        if (!clean(state.period.surveyEnd)) missing.push('Fecha de finalización del levantamiento');
        if (clean(state.period.surveyStart) && clean(state.period.surveyEnd) && state.period.surveyStart > state.period.surveyEnd) missing.push('La fecha de inicio del levantamiento no puede ser posterior a la fecha de finalización');
      }
      return missing;
    };
  }

  if (typeof renderCareers === 'function') {
    const previousRenderCareers=renderCareers;
    renderCareers=function renderCareersSection7() {
      ensureSection7();injectStyles();
      previousRenderCareers();
      const rows=[...document.querySelectorAll('[data-career-row]')];
      rows.forEach(row=>{
        row.classList.add('s7-catalog-row');
        const index=Number(row.dataset.careerRow),career=state.careers?.[index];
        if (!career || row.querySelector('[data-s7-career-status]')) return;
        const select=document.createElement('select');
        select.dataset.s7CareerStatus=String(index);
        select.title='Estado de la carrera en el período';
        select.innerHTML=CAREER_STATUS.map(value=>'<option '+(careerStatus(career.name)===value?'selected':'')+'>'+value+'</option>').join('');
        row.insertBefore(select,row.querySelector('.remove-career'));
      });

      const notice=document.querySelector('#content .alert-strip.success div');
      if (notice) notice.innerHTML='<strong>Catálogo por período</strong>Define el nivel y el estado Activa/Inactiva. La Sección 7 incluirá únicamente las carreras activas del período.';

      const saveButton=document.getElementById('saveCareers');
      if (saveButton) saveButton.onclick=async()=>{
        [...document.querySelectorAll('[data-career-row]')].forEach(row=>{
          const i=Number(row.dataset.careerRow),current=state.careers[i];
          if (!current) return;
          const oldName=current.name,oldKey=keyFor(oldName);
          const name=clean(row.querySelector('[data-career-name]')?.value) || oldName;
          const program=clean(row.querySelector('[data-career-program]')?.value) || 'Por definir';
          const status=clean(row.querySelector('[data-s7-career-status]')?.value) || 'Inactiva';
          const oldStatus=state.section7.careerStatus[oldKey] || {status:'Inactiva',manual:false};
          if (oldName!==name) {
            (state.teachers||[]).filter(t=>keyFor(t.carrera)===oldKey).forEach(t=>t.carrera=name);
            const coord=(state.coordinations||[]).find(x=>keyFor(x.carrera)===oldKey);if(coord)coord.carrera=name;
            if (state.section6?.careers?.[oldKey]) {
              const profile=state.section6.careers[oldKey];delete state.section6.careers[oldKey];profile.career=name;state.section6.careers[keyFor(name)]=profile;
            }
            if (Array.isArray(state.section6?.careerOrder)) state.section6.careerOrder=state.section6.careerOrder.map(x=>keyFor(x)===oldKey?name:x);
            delete state.section7.careerStatus[oldKey];
          }
          state.careers[i]={...current,name,program};
          ensureCoordination(name);
          state.section7.careerStatus[keyFor(name)]={...oldStatus,status,manual:true};
        });
        ensureSection7();syncSection6WithCoverage();
        await save();
        toast('Carreras y cobertura del período actualizadas');
        renderCareers();
      };
    };
  }

  if (typeof openTeacher === 'function') {
    const previousOpenTeacher=openTeacher;
    openTeacher=function openTeacherSection7(teacherId=null,returnView=null,focusField='') {
      ensureSection7();
      previousOpenTeacher(teacherId,returnView,focusField);
      const select=document.querySelector('#teacherForm [name="dedicacion"]');
      if (!select) return;
      const label=select.closest('.field')?.querySelector('label');if(label)label.textContent='Tipo de dedicación institucional';
      [...select.options].forEach(option=>{
        if(option.value==='Tiempo Completo')option.textContent='Tiempo Completo (TC)';
        if(option.value==='Medio Tiempo')option.textContent='Medio Tiempo (MT)';
        if(option.value==='Tiempo Parcial')option.textContent='Tiempo Parcial (TP)';
      });
      if (!teacherId) {select.value='';refreshTeacherMissingStyles();}
    };
  }

  if (typeof documentStatus === 'function') {
    const previousDocumentStatus=documentStatus;
    documentStatus=function documentStatusSection7(type) {
      ensureSection7();syncSection6WithCoverage();
      const result=previousDocumentStatus(type);
      if (type!=='dnf') return result;
      ensureSection7();syncSection6WithCoverage();
      const issues=[...(result.issues||[])];
      const active=activeCareerNames();
      if (!active.length) issues.push({kind:'section7-careers-empty',text:'Definir al menos una carrera activa para Cobertura Institucional',view:'carreras'});

      const activeWithoutTeachers=active.filter(name=>careerTeacherCount(name)===0);
      if (activeWithoutTeachers.length) issues.push({kind:'section7-active-without-teachers',count:activeWithoutTeachers.length,text:activeWithoutTeachers.length+' carrera(s) marcadas como activas no tienen docentes asociados; revisa el estado o la base docente para mantener consistencia institucional',view:'carreras'});

      const inactiveWithTeachers=(state.careers||[]).filter(cr=>careerStatus(cr.name)==='Inactiva'&&careerTeacherCount(cr.name)>0).map(cr=>cr.name);
      if (inactiveWithTeachers.length) issues.push({kind:'section7-inactive-with-teachers',count:inactiveWithTeachers.length,text:inactiveWithTeachers.length+' carrera(s) marcadas como inactivas tienen docentes asociados; corrige el estado del período o la asignación docente',view:'carreras'});

      const d=dedicationStats();
      if (d.invalid.length) issues.push({kind:'section7-dedication',count:d.invalid.length,text:d.invalid.length+' docente(s) sin tipo de dedicación TC/MT/TP válido',view:'docentes'});
      return {...result,issues,ready:issues.length===0,missing:issues.map(x=>x.text)};
    };
  }

  if (typeof renderDNF === 'function') {
    const previousRenderDNF=renderDNF;
    renderDNF=function renderDNFSection7() {
      ensureSection7();syncSection6WithCoverage();
      previousRenderDNF();
      ensureSection7();syncSection6WithCoverage();
      const root=document.getElementById('content');if(!root)return;
      const d=dedicationStats(),active=activeCareerNames();
      const pctText=value=>Number(value||0).toLocaleString('es-EC',{maximumFractionDigits:1})+'%';
      root.insertAdjacentHTML('beforeend',`
        <div class="section-title" style="margin-top:30px"><div><h2>7. Cobertura Institucional</h2><p>Vista de control. El PDF se genera automáticamente con la misma base de carreras y docentes del período.</p></div></div>
        <div class="grid cards">
          ${metric('Carreras activas',active.length)}
          ${metric('Tiempo Completo (TC)',pctText(d.percentages['Tiempo Completo']))}
          ${metric('Medio Tiempo (MT)',pctText(d.percentages['Medio Tiempo']))}
          ${metric('Tiempo Parcial (TP)',pctText(d.percentages['Tiempo Parcial']))}
        </div>
        <div class="card s7-summary-note"><strong>Levantamiento:</strong> ${esc(monthRangeText()||'Pendiente de definir')} · <strong>Docentes válidos para dedicación:</strong> ${d.total}</div>`);
    };
  }

  function cloneSheet(sheet) {
    return {...sheet,headers:[...(sheet.headers||[])],descriptions:[...(sheet.descriptions||[])],rows:(sheet.rows||[]).map(row=>[...row]),widths:[...(sheet.widths||[])]};
  }

  function extendPeriodSheet(sheet,includeData) {
    if (!sheet || sheet.headers.includes('FECHA_INICIO_LEVANTAMIENTO')) return sheet;
    sheet.headers.push('FECHA_INICIO_LEVANTAMIENTO','FECHA_FIN_LEVANTAMIENTO');
    sheet.descriptions.push('Mes/año de inicio del levantamiento, formato AAAA-MM.','Mes/año de finalización del levantamiento, formato AAAA-MM.');
    sheet.widths.push(28,28);
    sheet.rows=(sheet.rows||[]).map(row=>[...row,includeData?(state.period.surveyStart||''):'',includeData?(state.period.surveyEnd||''):'']);
    return sheet;
  }

  function extendCareerSheet(sheet,includeData) {
    if (!sheet || sheet.headers.includes('ESTADO_PERIODO')) return sheet;
    sheet.headers.push('ESTADO_PERIODO');
    sheet.descriptions.push('Estado de la carrera en el período: Activa o Inactiva. Solo las activas se incluyen en Cobertura Institucional.');
    sheet.widths.push(22);
    sheet.rows=(sheet.rows||[]).map(row=>{
      const name=clean(row[0]);return [...row,includeData&&name?careerStatus(name):''];
    });
    return sheet;
  }

  if (typeof excelTemplatePayload === 'function') {
    const previousExcelTemplatePayload=excelTemplatePayload;
    excelTemplatePayload=function excelTemplatePayloadSection7(scope,includeData) {
      ensureSection7();
      const payload=previousExcelTemplatePayload(scope,includeData);
      payload.sheets=(payload.sheets||[]).map(sheet=>{
        const copy=cloneSheet(sheet);
        if(copy.name==='PERIODO')extendPeriodSheet(copy,!!includeData);
        if(copy.name==='CARRERAS')extendCareerSheet(copy,!!includeData);
        return copy;
      });
      if (scope==='dnf' && !payload.sheets.some(s=>s.name==='CARRERAS')) {
        const career=previousExcelTemplatePayload('carreras',includeData)?.sheets?.[0];
        if(career)payload.sheets.splice(1,0,extendCareerSheet(cloneSheet(career),!!includeData));
      }
      return payload;
    };
  }

  if (typeof excelImportContext === 'function') {
    const previousExcelImportContext=excelImportContext;
    excelImportContext=function excelImportContextSection7(scope,kind='') {
      const context=previousExcelImportContext(scope,kind);
      if (!kind && scope==='dnf' && Array.isArray(context.sheets)) {
        context.sheets=[...new Set([...context.sheets,'PERIODO','CARRERAS','DOCENTES'])];
      }
      return context;
    };
  }

  if (typeof applyExcel === 'function') {
    const previousApplyExcel=applyExcel;
    applyExcel=function applyExcelSection7(sheets) {
      previousApplyExcel(sheets);
      ensureSection7();
      const p=(sheets?.PERIODO||[])[0];
      if(p){
        if(Object.prototype.hasOwnProperty.call(p,'FECHA_INICIO_LEVANTAMIENTO'))state.period.surveyStart=clean(p.FECHA_INICIO_LEVANTAMIENTO);
        if(Object.prototype.hasOwnProperty.call(p,'FECHA_FIN_LEVANTAMIENTO'))state.period.surveyEnd=clean(p.FECHA_FIN_LEVANTAMIENTO);
        if(!clean(state.period.surveyPeriod)&&state.period.surveyStart&&state.period.surveyEnd)state.period.surveyPeriod=monthRangeTextFromValues(state.period.surveyStart,state.period.surveyEnd);
      }
      (sheets?.CARRERAS||[]).forEach(row=>{
        const name=clean(row.CARRERA||row.Carrera||row.carrera),status=clean(row.ESTADO_PERIODO);
        if(name&&CAREER_STATUS.includes(status))setCareerStatus(name,status,true);
      });
      (sheets?.DOCENTES||[]).forEach(row=>{
        const cedula=clean(row.CEDULA);if(!cedula||!Object.prototype.hasOwnProperty.call(row,'DEDICACION'))return;
        const teacher=(state.teachers||[]).find(t=>String(t.cedula||'')===cedula);if(!teacher)return;
        teacher.dedicacion=normalizeDedication(row.DEDICACION);
      });
      ensureSection7();syncSection6WithCoverage();
    };
  }

  ensureSection7();
  syncSection6WithCoverage();
  window.__DOCFORMACION_SECTION7_DATA_READY=true;
  window.__DOCFORMACION_SECTION7_ACTIVE_CAREERS=activeCareerNames;
  window.__DOCFORMACION_SECTION7_DEDICATION_STATS=dedicationStats;
})();