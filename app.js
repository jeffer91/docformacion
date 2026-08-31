const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const DEFAULT_CAREERS = [
  { name: 'Enfermería', program: 'Técnico Superior' },
  { name: 'Mecánica Automotriz', program: 'Tecnología Superior' },
  { name: 'Diseño Multimedia', program: 'Tecnología Superior' },
  { name: 'Marketing Digital y Comercio Electrónico', program: 'Tecnología Superior' },
  { name: 'Ventas', program: 'Tecnología Superior' },
  { name: 'Desarrollo de Software', program: 'Tecnología Superior' },
  { name: 'Desarrollo de Software y Ciberseguridad', program: 'Tecnología Universitaria' },
  { name: 'Redes y Telecomunicaciones', program: 'Tecnología Superior' },
  { name: 'Estética Integral', program: 'Tecnología Superior' },
  { name: 'Educación Básica', program: 'Tecnología Superior' },
  { name: 'Educación Inicial', program: 'Tecnología Superior' },
  { name: 'Pedagogía', program: 'Tecnología Universitaria' },
  { name: 'Procesamiento de Alimentos', program: 'Tecnología Superior' },
  { name: 'Administración', program: 'Tecnología Superior' },
  { name: 'Administración de Empresas e inteligencia de negocios', program: 'Tecnología Universitaria' },
  { name: 'Administración del Talento Humano', program: 'Tecnología Universitaria' },
  { name: 'Contabilidad', program: 'Tecnología Superior' },
  { name: 'Contabilidad y Tributación', program: 'Tecnología Universitaria' },
  { name: 'Gestión del Talento Humano', program: 'Tecnología Superior' },
  { name: 'Seguridad y Prevención de Riesgos Laborales', program: 'Tecnología Superior' },
  { name: 'Seguridad Ciudadana y Orden Publico', program: 'Tecnología Superior' }
];

const GENERIC_LINES = [
  'Educación Superior, Pedagogía y Didáctica',
  'Evaluación del Aprendizaje y Formación por Competencias',
  'Investigación e Innovación Educativa',
  'Tecnología Educativa e Inteligencia Artificial',
  'Currículo y Gestión Académica',
  'Inclusión, Diversidad y Atención Educativa'
];

const DEFAULT_ACTIONS = [
  'Socializar el Plan de Formación Docente y las oportunidades disponibles.',
  'Priorizar docentes con brechas de formación de acuerdo con los resultados de la DNF.',
  'Gestionar convenios y alternativas de acceso a programas de tercer y cuarto nivel.',
  'Realizar seguimiento periódico a los docentes incluidos en el Plan.',
  'Verificar evidencias de avance y cumplimiento de la formación.'
];

const LEVELS = ['Tecnólogo Superior','Tecnólogo Universitario','Licenciatura / Ingeniería','Maestría / Maestría Tecnológica','Doctorado'];

function defaultState() {
  return {
    period: {
      start: '',
      end: '',
      elaborationDate: new Date().toISOString().slice(0,10),
      version: '1.0',
      preparedBy: 'MSc. Jefferson Villarreal',
      preparedRole: 'Gestor de Procesos Académicos',
      reviewedBy: 'Ing. Martha Tomalá',
      reviewedRole: 'Coordinación General de Carreras',
      approvedBy: 'Dr. Alex León T.',
      approvedRole: 'Vicerrector',
      targetPercent: 10,
      dnfCode: 'UGPA-RGI1-0X-PRO-31-AÑO-MES',
      planCode: 'UGPA-RGI2-0X-PRO-31-AÑO-MES',
      reportCode: 'UGPA-RGI3-0X-PRO-31-AÑO-MES'
    },
    careers: DEFAULT_CAREERS.map(x => ({ ...x })),
    teachers: [],
    coordinations: DEFAULT_CAREERS.map(({name}) => ({
      carrera: name,
      coordinador: '',
      priorityOverride: '',
      needsOverride: ''
    })),
    settings: {
      genericLines: [...GENERIC_LINES],
      planActions: [...DEFAULT_ACTIONS]
    },
    plan: [],
    followup: []
  };
}

let state = defaultState();
let currentView = 'inicio';
let editingTeacherId = null;

function id() {
  return 't_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}
function esc(v='') {
  return String(v).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
}
function n(v) { const x = Number(String(v).replace(',','.')); return Number.isFinite(x) ? x : 0; }
function yes(v) { return ['SI','SÍ','YES','TRUE','1','X'].includes(String(v).trim().toUpperCase()); }
function norm(v='') { return String(v).trim(); }
function pct(part,total) { return total ? (part*100/total) : 0; }
function fmtPct(v) { return Number(v || 0).toLocaleString('es-EC',{maximumFractionDigits:1}) + '%'; }
function todayLabel() { return new Date().toLocaleDateString('es-EC',{year:'numeric',month:'long',day:'numeric'}); }

async function save() {
  $('#saveState').textContent = 'Guardando…';
  const result = await window.docformacion.saveData(state);
  $('#saveState').textContent = result?.ok ? 'Guardado' : 'Error al guardar';
}
function toast(msg) {
  const el = $('#toast'); el.textContent = msg; el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),2400);
}
function field(label, name, value='', type='text', options=[], wide=false, hint='') {
  let control = '';
  if (type === 'select') {
    control = '<select name="'+name+'"><option value="">Seleccione…</option>' +
      options.map(o => '<option '+(String(o)===String(value)?'selected':'')+'>'+esc(o)+'</option>').join('') + '</select>';
  } else if (type === 'textarea') {
    control = '<textarea name="'+name+'">'+esc(value)+'</textarea>';
  } else {
    control = '<input type="'+type+'" name="'+name+'" value="'+esc(value)+'">';
  }
  return '<div class="field '+(wide?'wide':'')+'"><label>'+esc(label)+'</label>'+control+(hint?'<span class="hint">'+esc(hint)+'</span>':'')+'</div>';
}
function teacherById(teacherId){ return state.teachers.find(t=>t.id===teacherId); }
function planByTeacher(teacherId){ return state.plan.find(p=>p.teacherId===teacherId); }
function followByTeacher(teacherId){ return state.followup.find(f=>f.teacherId===teacherId); }
function careerNames(){ return (state.careers||[]).map(c=>c.name).filter(Boolean); }
function programForCareer(name){ return (state.careers||[]).find(c=>c.name===name)?.program || ''; }
function ensureCoordination(name){
  if(!name) return;
  if(!state.coordinations.some(c=>c.carrera===name)){
    state.coordinations.push({carrera:name,coordinador:'',priorityOverride:'',needsOverride:''});
  }
}
function ensureCareer(name, program=''){
  const clean=norm(name);
  if(!clean) return;
  if(!state.careers.some(c=>c.name===clean)){
    state.careers.push({name:clean,program:norm(program)||'Por definir'});
  }
  ensureCoordination(clean);
}

function setView(view) {
  currentView = view;
  $$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  const meta = {
    inicio:['Inicio','Completa primero los datos y luego genera los tres documentos.'],
    periodo:['Datos generales','Información institucional y del período.'],
    carreras:['Carreras','Catálogo inicial de carreras y tipo de programa; puedes agregar más.'],
    docentes:['Docentes','Base única de información para los tres documentos.'],
    necesidades:['Necesidades y líneas','Datos derivados para completar la Detección de Necesidades.'],
    planificacion:['Planificación','Selecciona docentes y completa los datos que requiere el Plan.'],
    seguimiento:['Seguimiento','Registra ejecución, avance y evidencias para el Informe.'],
    'doc-dnf':['Detección de Necesidades','Estado y generación del primer documento.'],
    'doc-plan':['Plan de Formación Docente','Estado y generación del segundo documento.'],
    'doc-informe':['Informe de Cumplimiento','Estado y generación del tercer documento.']
  }[view] || ['DocFormación',''];
  $('#viewTitle').textContent = meta[0];
  $('#viewSubtitle').textContent = meta[1];
  render();
}

function render() {
  const renderers = {
    inicio:renderHome,
    periodo:renderPeriod,
    carreras:renderCareers,
    docentes:renderTeachers,
    necesidades:renderDNF,
    planificacion:renderPlan,
    seguimiento:renderFollowup,
    'doc-dnf':()=>renderDocumentView('dnf'),
    'doc-plan':()=>renderDocumentView('plan'),
    'doc-informe':()=>renderDocumentView('informe')
  };
  (renderers[currentView]||renderHome)();
}

function stats() {
  const total = state.teachers.length;
  const masters = state.teachers.filter(t=>String(t.nivelActual||'').includes('Maestr')).length;
  const doctors = state.teachers.filter(t=>t.nivelActual==='Doctorado').length;
  const willing = state.teachers.filter(t=>t.dispuesto==='Sí').length;
  const studying = state.teachers.filter(t=>t.estudiaActualmente==='Sí').length;
  const selected = state.plan.filter(p=>p.selected).length;
  const started = state.followup.filter(f=>['En proceso','Finalizado'].includes(f.status)).length;
  return {total,masters,doctors,willing,studying,selected,started};
}

function isPlaceholderCode(v){
  return !v || /0X|AÑO|MES/i.test(String(v));
}
function teacherMissing(t){
  const missing=[];
  const required=[
    ['cedula','Cédula'],['nombre','Nombre'],['carrera','Carrera principal'],['dedicacion','Dedicación'],
    ['nivelActual','Nivel académico actual'],['tituloActual','Título académico actual'],['afinidad','Afinidad del título'],
    ['estudiaActualmente','¿Estudia actualmente?'],['nivelDeseado','Nivel que desea alcanzar'],
    ['areaInteres','Área o programa de interés'],['dispuesto','Disposición para estudiar'],
    ['tipoFormacion','Tipo de formación'],['modalidadPreferida','Modalidad preferida'],
    ['inicioTentativo','Inicio tentativo'],['barrera','Barrera principal'],['actualizacionReciente','Actualización reciente']
  ];
  required.forEach(([k,label])=>{if(!norm(t[k])) missing.push(label);});
  if(t.estudiaActualmente==='Sí'){
    if(!norm(t.nivelCurso)) missing.push('Nivel de formación en curso');
    if(!norm(t.programaCurso)) missing.push('Programa en curso');
    if(!norm(t.institucionCurso)) missing.push('Institución de estudio');
  }
  return missing;
}
function periodMissing(type){
  const p=state.period, miss=[];
  if(!p.start) miss.push('Fecha de inicio del período');
  if(!p.end) miss.push('Fecha de fin del período');
  if(!p.elaborationDate) miss.push('Fecha de elaboración');
  if(!p.preparedBy) miss.push('Elaborado por');
  if(!p.reviewedBy) miss.push('Revisado por');
  if(!p.approvedBy) miss.push('Aprobado por');
  const code=type==='dnf'?p.dnfCode:type==='plan'?p.planCode:p.reportCode;
  if(isPlaceholderCode(code)) miss.push('Código documental definitivo');
  return miss;
}
function documentStatus(type){
  const missing=[...periodMissing(type)];
  const incompleteTeachers=state.teachers.filter(t=>teacherMissing(t).length);
  const careersInUse=[...new Set(state.teachers.map(t=>t.carrera).filter(Boolean))];

  if(!state.teachers.length) missing.push('Cargar al menos un docente');
  if(incompleteTeachers.length) missing.push(`${incompleteTeachers.length} docente(s) con campos obligatorios pendientes`);

  const noCoordinator=careersInUse.filter(name=>!norm(state.coordinations.find(c=>c.carrera===name)?.coordinador));
  if(type==='dnf' && noCoordinator.length) missing.push(`${noCoordinator.length} carrera(s) sin coordinador`);
  if(type==='dnf' && !(state.settings.genericLines||[]).filter(norm).length) missing.push('Definir al menos una línea genérica');

  if(type==='plan' || type==='informe'){
    ensurePlanRows();
    const selected=state.plan.filter(p=>p.selected);
    if(!selected.length) missing.push('Seleccionar al menos un docente en Planificación');
    const incomplete=selected.filter(p=>!p.level||!p.program||!p.modality||!p.plannedStart||!p.plannedEnd||!p.supportType||(p.supportType==='Económico'&&!n(p.supportAmount)));
    if(incomplete.length) missing.push(`${incomplete.length} docente(s) del Plan con planificación incompleta`);
  }

  if(type==='informe'){
    ensureFollowRows();
    const selected=state.plan.filter(p=>p.selected);
    const bad=selected.filter(p=>{
      const f=followByTeacher(p.teacherId);
      if(!f||!f.status||!f.plannedEnd) return true;
      if(['En proceso','Finalizado'].includes(f.status)){
        return !f.realStart || n(f.progress)<=0 || !norm(f.evidenceTitle) || !norm(f.evidencePath);
      }
      return false;
    });
    if(bad.length) missing.push(`${bad.length} seguimiento(s) incompleto(s) o sin evidencia`);
  }

  return { ready: missing.length===0, missing };
}
function statusCard(type,title,go){
  const s=documentStatus(type);
  const label=s.ready?'Completo':(s.missing.length<=2?'Casi listo':'Pendiente');
  const cls=s.ready?'ready':(s.missing.length<=2?'pending':'blocked');
  return `<div class="status-card">
    <div class="status-head"><h3>${esc(title)}</h3><span class="status-badge ${cls}">${label}</span></div>
    ${s.ready?'<div class="small muted">Ya tiene la información mínima necesaria.</div>':`<ul class="missing-list">${s.missing.slice(0,4).map(x=>'<li>'+esc(x)+'</li>').join('')}${s.missing.length>4?'<li>+'+(s.missing.length-4)+' pendiente(s) más</li>':''}</ul>`}
    <button class="${s.ready?'primary':'secondary'}" data-go="${go}">${s.ready?'Abrir documento':'Corregir pendientes'}</button>
  </div>`;
}
function completionAlert(type){
  const s=documentStatus(type);
  if(s.ready) return '<div class="alert-strip success"><div><strong>Documento completo</strong>Ya puedes generar el PDF con la información actual.</div></div>';
  return `<div class="alert-strip warning"><div><strong>Falta información para completar este documento</strong><ul class="missing-list">${s.missing.map(x=>'<li>'+esc(x)+'</li>').join('')}</ul></div></div>`;
}

function renderHome() {
  const s = stats();
  const dnf=documentStatus('dnf'), plan=documentStatus('plan'), report=documentStatus('informe');
  const done=[dnf,plan,report].filter(x=>x.ready).length;
  $('#content').innerHTML = `
    <div class="grid cards">
      ${metric('Docentes',s.total)}
      ${metric('Carreras configuradas',(state.careers||[]).length)}
      ${metric('Incluidos en el Plan',s.selected)}
      ${metric('Documentos completos',done+' / 3')}
    </div>

    <div class="section-title"><div><h2>Qué falta para completar los documentos</h2><p>Estas alertas se actualizan automáticamente mientras llenas la información.</p></div></div>
    <div class="status-grid">
      ${statusCard('dnf','1. Detección de Necesidades','doc-dnf')}
      ${statusCard('plan','2. Plan de Formación','doc-plan')}
      ${statusCard('informe','3. Informe de Cumplimiento','doc-informe')}
    </div>

    <div class="section-title"><div><h2>Orden recomendado de trabajo</h2><p>Primero completas los datos. Después generas los documentos.</p></div></div>
    <div class="grid">
      <div class="card"><strong>1. Datos generales y carreras</strong><p class="muted">Revisa período, autoridades, códigos y catálogo de carreras/programas.</p><div class="toolbar"><button class="secondary" data-go="periodo">Datos generales</button><button class="secondary" data-go="carreras">Carreras</button></div></div>
      <div class="card"><strong>2. Docentes y necesidades</strong><p class="muted">Carga el Excel global o llena los formularios. La app calcula brechas y necesidades.</p><div class="toolbar"><button class="secondary" data-go="docentes">Docentes</button><button class="secondary" data-go="necesidades">Necesidades</button></div></div>
      <div class="card"><strong>3. Planificación y seguimiento</strong><p class="muted">Completa solo la información adicional que requiere el Plan y luego el Informe.</p><div class="toolbar"><button class="secondary" data-go="planificacion">Planificación</button><button class="secondary" data-go="seguimiento">Seguimiento</button></div></div>
    </div>

    <div class="section-title"><div><h2>Carga de información</h2><p>Formulario y Excel global escriben sobre la misma base.</p></div></div>
    <div class="split">
      <div class="card"><h3>Formulario</h3><p class="muted">Puedes editar cualquier dato manualmente después de importar.</p><button class="primary" data-go="docentes">Gestionar docentes</button></div>
      <div class="card"><h3>Excel global</h3><p class="muted">Incluye CARRERAS, PERIODO, DOCENTES, COORDINACIONES, PLAN y SEGUIMIENTO.</p><div class="toolbar"><button class="secondary" id="homeTemplate">Plantilla Excel</button><button class="primary" id="homeImport">Importar Excel</button></div></div>
    </div>`;
  $$('[data-go]').forEach(b=>b.onclick=()=>setView(b.dataset.go));
  $('#homeTemplate').onclick=exportTemplate;
  $('#homeImport').onclick=importExcel;
}
function metric(label,value){ return '<div class="card metric"><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong></div>'; }

function renderPeriod() {
  const p=state.period;
  $('#content').innerHTML = `
    <div class="card">
      <div class="notice">Estos valores vienen precargados cuando es posible. Puedes cambiarlos antes de generar cualquier PDF.</div>
      <div class="form-grid" style="margin-top:18px">
        ${field('Inicio del período','start',p.start,'date')}
        ${field('Fin del período','end',p.end,'date')}
        ${field('Fecha de elaboración','elaborationDate',p.elaborationDate,'date')}
        ${field('Versión','version',p.version)}
        ${field('Elaborado por','preparedBy',p.preparedBy)}
        ${field('Cargo','preparedRole',p.preparedRole)}
        ${field('Revisado por','reviewedBy',p.reviewedBy)}
        ${field('Cargo','reviewedRole',p.reviewedRole)}
        ${field('Aprobado por','approvedBy',p.approvedBy)}
        ${field('Cargo','approvedRole',p.approvedRole)}
        ${field('Meta de docentes en formación (%)','targetPercent',p.targetPercent,'number')}
        ${field('Código DNF','dnfCode',p.dnfCode)}
        ${field('Código Plan','planCode',p.planCode)}
        ${field('Código Informe','reportCode',p.reportCode)}
      </div>
      <div class="dialog-actions"><button class="primary" id="savePeriod">Guardar</button></div>
    </div>`;
  $('#savePeriod').onclick=async()=>{
    $('#content').querySelectorAll('[name]').forEach(el=>state.period[el.name]=el.name==='targetPercent'?n(el.value):el.value);
    await save(); toast('Período actualizado');
  };
}

function renderTeachers() {
  $('#content').innerHTML = `
    <div class="section-title">
      <div><h2>Base global de docentes</h2><p>${state.teachers.length} registros. Solo se usa carrera principal y función Docencia.</p></div>
      <div class="toolbar"><button class="secondary" id="importHere">Importar Excel</button><button class="primary" id="addTeacher">+ Nuevo docente</button></div>
    </div>
    <div class="table-wrap">
      ${state.teachers.length?teacherTable():'<div class="empty">Todavía no hay docentes. Puedes agregarlos por formulario o importar el Excel global.</div>'}
    </div>`;
  $('#addTeacher').onclick=()=>openTeacher();
  $('#importHere').onclick=importExcel;
  $$('.edit-teacher').forEach(b=>b.onclick=()=>openTeacher(b.dataset.id));
  $$('.delete-teacher').forEach(b=>b.onclick=async()=>{
    const t=teacherById(b.dataset.id);
    if(!confirm('¿Eliminar a '+t.nombre+'?')) return;
    state.teachers=state.teachers.filter(x=>x.id!==t.id);
    state.plan=state.plan.filter(x=>x.teacherId!==t.id);
    state.followup=state.followup.filter(x=>x.teacherId!==t.id);
    await save(); render();
  });
}
function teacherTable(){
  return `<table class="table"><thead><tr><th>Cédula</th><th>Nombre</th><th>Carrera principal</th><th>Dedicación</th><th>Nivel actual</th><th>Deseado</th><th>Tipo</th><th></th></tr></thead><tbody>${
    state.teachers.map(t=>`<tr><td>${esc(t.cedula)}</td><td><strong>${esc(t.nombre)}</strong></td><td>${esc(t.carrera)}</td><td>${esc(t.dedicacion)}</td><td>${esc(t.nivelActual)}</td><td>${esc(t.nivelDeseado)}</td><td>${esc(t.tipoFormacion)}</td><td class="right"><button class="ghost edit-teacher" data-id="${t.id}">Editar</button><button class="danger delete-teacher" data-id="${t.id}">Eliminar</button></td></tr>`).join('')
  }</tbody></table>`;
}

function openTeacher(teacherId=null) {
  editingTeacherId=teacherId;
  const t=teacherId?teacherById(teacherId):{
    cedula:'',nombre:'',carrera:'',dedicacion:'Tiempo Completo',
    nivelActual:'',tituloActual:'',afinidad:'Sí',estudiaActualmente:'No',
    nivelCurso:'',programaCurso:'',institucionCurso:'',nivelDeseado:'',
    areaInteres:'',dispuesto:'Sí',tipoFormacion:'Específica',
    modalidadPreferida:'Virtual',inicioTentativo:'',barrera:'Ninguna',
    actualizacionReciente:'Sí'
  };
  $('#teacherDialogTitle').textContent=teacherId?'Editar docente':'Nuevo docente';
  $('#teacherFields').innerHTML = [
    field('Cédula','cedula',t.cedula),
    field('Nombre completo','nombre',t.nombre),
    field('Carrera principal','carrera',t.carrera,'select',CAREERS),
    field('Dedicación','dedicacion',t.dedicacion,'select',['Tiempo Completo','Medio Tiempo','Tiempo Parcial']),
    field('Nivel académico actual','nivelActual',t.nivelActual,'select',LEVELS),
    field('Título académico actual','tituloActual',t.tituloActual),
    field('¿Título afín a la carrera?','afinidad',t.afinidad,'select',['Sí','No']),
    field('¿Estudia actualmente?','estudiaActualmente',t.estudiaActualmente,'select',['Sí','No']),
    field('Nivel de formación en curso','nivelCurso',t.nivelCurso,'select',LEVELS),
    field('Programa en curso','programaCurso',t.programaCurso),
    field('Institución de estudio','institucionCurso',t.institucionCurso),
    field('Nivel que desea alcanzar','nivelDeseado',t.nivelDeseado,'select',LEVELS),
    field('Área o programa de interés','areaInteres',t.areaInteres),
    field('¿Dispuesto a iniciar/continuar?','dispuesto',t.dispuesto,'select',['Sí','No']),
    field('Tipo de formación','tipoFormacion',t.tipoFormacion,'select',['Específica','Genérica']),
    field('Modalidad preferida','modalidadPreferida',t.modalidadPreferida,'select',['Presencial','Virtual','Híbrida']),
    field('Inicio tentativo','inicioTentativo',t.inicioTentativo,'month'),
    field('Barrera principal','barrera',t.barrera,'select',['Ninguna','Económica','Tiempo','Carga laboral','Falta de oferta','Personal','Otra']),
    field('Actualización reciente','actualizacionReciente',t.actualizacionReciente,'select',['Sí','No'])
  ].join('');
  $('#teacherDialog').showModal();
}

$('#teacherForm').addEventListener('submit',async(e)=>{
  e.preventDefault();
  const fd=new FormData(e.target);
  const obj=Object.fromEntries(fd.entries());
  if(!obj.cedula || !obj.nombre || !obj.carrera){toast('Completa cédula, nombre y carrera');return;}
  const duplicate=state.teachers.find(t=>t.cedula===obj.cedula && t.id!==editingTeacherId);
  if(duplicate){toast('Ya existe un docente con esa cédula');return;}
  if(editingTeacherId) Object.assign(teacherById(editingTeacherId),obj);
  else state.teachers.push({id:id(),...obj});
  $('#teacherDialog').close();
  await save(); renderTeachers(); toast('Docente guardado');
});
$('#closeTeacher').onclick=$('#cancelTeacher').onclick=()=>$('#teacherDialog').close();

function needSummary(career) {
  const list=state.teachers.filter(t=>t.carrera===career);
  if(!list.length) return [];
  const counts={};
  list.forEach(t=>{
    const key=norm(t.areaInteres)||norm(t.programaCurso)||norm(t.nivelDeseado);
    if(key) counts[key]=(counts[key]||0)+1;
  });
  let needs=Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k])=>k);
  const below=list.filter(t=>!String(t.nivelActual).includes('Maestr') && t.nivelActual!=='Doctorado').length;
  const doctoral=list.filter(t=>t.nivelDeseado==='Doctorado').length;
  if(below && needs.length<3) needs.push('Fortalecimiento de formación de cuarto nivel');
  if(doctoral && needs.length<3) needs.push('Formación doctoral');
  return [...new Set(needs)].slice(0,3);
}
function autoPriority(career) {
  const list=state.teachers.filter(t=>t.carrera===career);
  if(!list.length) return 'Baja';
  const below=list.filter(t=>!String(t.nivelActual).includes('Maestr') && t.nivelActual!=='Doctorado').length;
  const noAffinity=list.filter(t=>t.afinidad==='No').length;
  const score=(below*2+noAffinity)/list.length;
  return score>=1?'Alta':score>=0.45?'Media':'Baja';
}
function needsFor(career){
  const c=state.coordinations.find(x=>x.carrera===career);
  if(c?.needsOverride) return c.needsOverride.split('|').map(x=>x.trim()).filter(Boolean).slice(0,3);
  return needSummary(career);
}
function priorityFor(career){
  const c=state.coordinations.find(x=>x.carrera===career);
  return c?.priorityOverride || autoPriority(career);
}

function renderDNF() {
  const s=stats();
  const specific=state.coordinations.filter(c=>state.teachers.some(t=>t.carrera===c.carrera));
  $('#content').innerHTML = `
    <div class="grid cards">
      ${metric('Total docentes',s.total)}
      ${metric('Con maestría',s.masters)}
      ${metric('Con doctorado',s.doctors)}
      ${metric('Dispuestos',s.willing)}
    </div>
    <div class="section-title"><div><h2>Líneas genéricas por defecto</h2><p>La app las propone; puedes editarlas, eliminarlas o agregar nuevas.</p></div><button class="secondary" id="addGeneric">+ Línea</button></div>
    <div class="card" id="genericList">
      ${state.settings.genericLines.map((g,i)=>`<div class="generic-line"><input data-generic="${i}" value="${esc(g)}"><button class="danger delete-generic" data-i="${i}">Eliminar</button></div>`).join('')}
    </div>
    <div class="section-title"><div><h2>Necesidades específicas por carrera</h2><p>Se generan automáticamente a partir de la base docente.</p></div></div>
    <div class="table-wrap">
      ${specific.length?`<table class="table"><thead><tr><th>Carrera</th><th>Coordinador</th><th>Necesidades propuestas / editables</th><th>Prioridad sugerida</th><th>Prioridad final</th></tr></thead><tbody>
      ${specific.map(c=>`<tr>
        <td><strong>${esc(c.carrera)}</strong></td>
        <td><input class="coord-input" data-career="${esc(c.carrera)}" value="${esc(c.coordinador)}" placeholder="Coordinador por defecto"></td>
        <td><input class="needs-input" data-career="${esc(c.carrera)}" value="${esc(c.needsOverride || needSummary(c.carrera).join(' | '))}" placeholder="Hasta 3 necesidades separadas por |"><div class="small muted">Se generan automáticamente; puedes cambiarlas.</div></td>
        <td><span class="pill ${autoPriority(c.carrera).toLowerCase()}">${autoPriority(c.carrera)}</span></td>
        <td><select class="priority-input" data-career="${esc(c.carrera)}"><option value="">Automática</option>${['Alta','Media','Baja'].map(x=>'<option '+(c.priorityOverride===x?'selected':'')+'>'+x+'</option>').join('')}</select></td>
      </tr>`).join('')}</tbody></table>`:'<div class="empty">Carga docentes para generar las necesidades por carrera.</div>'}
    </div>`;
  $('#addGeneric').onclick=()=>{state.settings.genericLines.push('Nueva línea genérica');save();renderDNF();};
  $$('.delete-generic').forEach(b=>b.onclick=()=>{state.settings.genericLines.splice(Number(b.dataset.i),1);save();renderDNF();});
  $$('[data-generic]').forEach(inp=>inp.onchange=()=>{state.settings.genericLines[Number(inp.dataset.generic)]=inp.value;save();});
  $('.coord-input').forEach(inp=>inp.onchange=()=>{state.coordinations.find(c=>c.carrera===inp.dataset.career).coordinador=inp.value;save();});
  $('.needs-input').forEach(inp=>inp.onchange=()=>{state.coordinations.find(c=>c.carrera===inp.dataset.career).needsOverride=inp.value;save();});
  $('.priority-input').forEach(sel=>sel.onchange=()=>{state.coordinations.find(c=>c.carrera===sel.dataset.career).priorityOverride=sel.value;save();});
}

function ensurePlanRows(){
  state.teachers.forEach(t=>{
    if(!planByTeacher(t.id)){
      state.plan.push({
        teacherId:t.id,
        selected:false,
        level:t.estudiaActualmente==='Sí'?t.nivelCurso:t.nivelDeseado,
        program:t.estudiaActualmente==='Sí'?t.programaCurso:t.areaInteres,
        institution:t.estudiaActualmente==='Sí'?t.institucionCurso:'',
        modality:t.modalidadPreferida||'Virtual',
        plannedStart:t.inicioTentativo? t.inicioTentativo+'-01':'',
        plannedEnd:'',
        supportType:'Sin apoyo',
        supportAmount:'',
        convenio:'',
        multiplier:'Aplicación de conocimientos en la práctica docente'
      });
    }
  });
}
function renderPlan() {
  ensurePlanRows();
  const candidates=state.teachers.filter(t=>t.dispuesto==='Sí' || t.estudiaActualmente==='Sí');
  $('#content').innerHTML = `
    <div class="notice">Los candidatos y datos vienen de la DNF. Selecciona quién entra al Plan y cambia únicamente lo que sea necesario.</div>
    <div class="section-title"><div><h2>Meta institucional</h2><p>Valor precargado y editable desde Período.</p></div><span class="pill">${esc(state.period.targetPercent)}%</span></div>
    <div class="table-wrap">${candidates.length?`<table class="table"><thead><tr><th>Incluir</th><th>Docente</th><th>Nivel</th><th>Programa</th><th>Institución</th><th>Modalidad</th><th>Inicio</th><th>Fin</th><th>Apoyo</th><th>Monto</th></tr></thead><tbody>
    ${candidates.map(t=>{const p=planByTeacher(t.id); return `<tr data-plan-row="${t.id}">
      <td><input type="checkbox" data-p="selected" ${p.selected?'checked':''}></td>
      <td><strong>${esc(t.nombre)}</strong><div class="small muted">${esc(t.carrera)}</div></td>
      <td><select data-p="level">${optionList(LEVELS,p.level)}</select></td>
      <td><input data-p="program" value="${esc(p.program)}"></td>
      <td><input data-p="institution" value="${esc(p.institution)}"></td>
      <td><select data-p="modality">${optionList(['Presencial','Virtual','Híbrida'],p.modality)}</select></td>
      <td><input type="date" data-p="plannedStart" value="${esc(p.plannedStart)}"></td>
      <td><input type="date" data-p="plannedEnd" value="${esc(p.plannedEnd)}"></td>
      <td><select data-p="supportType">${optionList(['Sin apoyo','Económico','Tiempo','Ambos'],p.supportType)}</select></td>
      <td><input type="number" data-p="supportAmount" value="${esc(p.supportAmount)}" min="0" step="0.01"></td>
    </tr>`}).join('')}</tbody></table>`:'<div class="empty">No hay docentes dispuestos o en formación actualmente.</div>'}</div>
    <div class="dialog-actions"><button class="primary" id="savePlan">Guardar Plan</button></div>`;
  $('#savePlan').onclick=async()=>{
    $$('[data-plan-row]').forEach(row=>{
      const p=planByTeacher(row.dataset.planRow);
      row.querySelectorAll('[data-p]').forEach(el=>{
        p[el.dataset.p]=el.type==='checkbox'?el.checked:el.value;
      });
    });
    await save(); toast('Plan actualizado');
  };
}
function optionList(list,value){return '<option value="">—</option>'+list.map(x=>'<option '+(x===value?'selected':'')+'>'+esc(x)+'</option>').join('');}

function ensureFollowRows(){
  state.plan.filter(p=>p.selected).forEach(p=>{
    if(!followByTeacher(p.teacherId)){
      state.followup.push({
        teacherId:p.teacherId,status:'No iniciado',realStart:'',plannedEnd:p.plannedEnd||'',
        progress:0,evidenceTitle:'',evidencePath:'',abandoned:false
      });
    }
  });
}
function renderFollowup() {
  ensureFollowRows();
  const rows=state.plan.filter(p=>p.selected);
  $('#content').innerHTML = `
    <div class="notice">Seguimiento mínimo: estado + porcentaje de avance. El porcentaje restante se calcula automáticamente. Solo se registra abandono cuando ocurra.</div>
    <div class="table-wrap" style="margin-top:16px">${rows.length?`<table class="table"><thead><tr><th>Docente</th><th>Estado</th><th>Inicio real</th><th>Fin previsto</th><th>Avance</th><th>Restante</th><th>Título evidencia</th><th>Evidencia</th><th>Abandono</th></tr></thead><tbody>
    ${rows.map(p=>{const t=teacherById(p.teacherId),f=followByTeacher(p.teacherId);return`<tr data-follow-row="${t.id}">
      <td><strong>${esc(t.nombre)}</strong><div class="small muted">${esc(p.program)}</div></td>
      <td><select data-f="status">${optionList(['No iniciado','En proceso','Finalizado','Suspendido'],f.status)}</select></td>
      <td><input type="date" data-f="realStart" value="${esc(f.realStart)}"></td>
      <td><input type="date" data-f="plannedEnd" value="${esc(f.plannedEnd)}"></td>
      <td><input type="number" min="0" max="100" data-f="progress" value="${esc(f.progress)}"></td>
      <td><strong>${Math.max(0,100-n(f.progress))}%</strong></td>
      <td><input data-f="evidenceTitle" value="${esc(f.evidenceTitle)}" placeholder="Ej.: Récord académico"></td>
      <td><button class="secondary evidence-btn" data-id="${t.id}">${f.evidencePath?'Cambiar':'Cargar'}</button><div class="small muted">${esc(f.evidencePath?f.evidencePath.split(/[\\/]/).pop():'')}</div></td>
      <td><input type="checkbox" data-f="abandoned" ${f.abandoned?'checked':''}></td>
    </tr>`}).join('')}</tbody></table>`:'<div class="empty">Selecciona docentes en el Plan para habilitar su seguimiento.</div>'}</div>
    <div class="dialog-actions"><button class="primary" id="saveFollow">Guardar seguimiento</button></div>`;
  $$('.evidence-btn').forEach(b=>b.onclick=async()=>{
    const picked=await window.docformacion.pickEvidence();
    if(!picked)return;
    const f=followByTeacher(b.dataset.id);
    f.evidencePath=picked.path;
    if(!f.evidenceTitle) f.evidenceTitle=picked.name;
    await save(); renderFollowup(); toast('Evidencia cargada');
  });
  if($('#saveFollow')) $('#saveFollow').onclick=async()=>{
    $$('[data-follow-row]').forEach(row=>{
      const f=followByTeacher(row.dataset.followRow);
      row.querySelectorAll('[data-f]').forEach(el=>{f[el.dataset.f]=el.type==='checkbox'?el.checked:(el.dataset.f==='progress'?n(el.value):el.value);});
    });
    await save(); renderFollowup(); toast('Seguimiento actualizado');
  };
}

function renderDocuments() {
  const s=stats();
  $('#content').innerHTML = `
    <div class="success-box">Los PDF se generan directamente desde Electron en formato A4. Antes de guardar se usan los datos actuales de la base.</div>
    <div class="section-title"><div><h2>Documentos del proceso</h2><p>Una sola base, tres salidas coherentes.</p></div></div>
    <div class="card doc-card"><div><h3>1. Detección de Necesidades de Formación</h3><p>${s.total} docentes disponibles para el diagnóstico.</p></div><button class="primary" id="pdfDNF">Generar PDF</button></div>
    <div class="card doc-card"><div><h3>2. Plan de Formación Docente</h3><p>${s.selected} docentes seleccionados.</p></div><button class="primary" id="pdfPlan">Generar PDF</button></div>
    <div class="card doc-card"><div><h3>3. Informe de Cumplimiento del Plan</h3><p>${s.started} docentes con ejecución registrada.</p></div><button class="primary" id="pdfInforme">Generar PDF</button></div>`;
  $('#pdfDNF').onclick=()=>generateDocument('dnf');
  $('#pdfPlan').onclick=()=>generateDocument('plan');
  $('#pdfInforme').onclick=()=>generateDocument('informe');
}

async function exportTemplate(){
  const r=await window.docformacion.exportExcelTemplate();
  if(r?.ok) toast('Plantilla Excel creada');
  else if(r?.error) toast('Error: '+r.error);
}
async function importExcel(){
  const r=await window.docformacion.importExcel();
  if(!r) return;
  if(!r.ok){toast('Error al importar: '+r.error);return;}
  applyExcel(r.sheets||{});
  await save(); render(); toast('Excel global importado');
}
function applyExcel(sheets){
  const p=(sheets.PERIODO||[])[0];
  if(p){
    state.period.start=p.PERIODO_INICIO||state.period.start;
    state.period.end=p.PERIODO_FIN||state.period.end;
    state.period.elaborationDate=p.FECHA_ELABORACION||state.period.elaborationDate;
    state.period.version=p.VERSION||state.period.version;
    state.period.preparedBy=p.ELABORADO_POR||state.period.preparedBy;
    state.period.preparedRole=p.CARGO_ELABORADO||state.period.preparedRole;
    state.period.reviewedBy=p.REVISADO_POR||state.period.reviewedBy;
    state.period.reviewedRole=p.CARGO_REVISADO||state.period.reviewedRole;
    state.period.approvedBy=p.APROBADO_POR||state.period.approvedBy;
    state.period.approvedRole=p.CARGO_APROBADO||state.period.approvedRole;
    state.period.targetPercent=n(p.META_FORMACION_PORCENTAJE)||state.period.targetPercent;
  }
  if(sheets.DOCENTES?.length){
    const existing=new Map(state.teachers.map(t=>[t.cedula,t]));
    sheets.DOCENTES.forEach(r=>{
      const cedula=norm(r.CEDULA); if(!cedula)return;
      const obj={
        cedula,nombre:norm(r.NOMBRE_COMPLETO),carrera:norm(r.CARRERA_PRINCIPAL),
        dedicacion:norm(r.DEDICACION)||'Tiempo Completo',
        nivelActual:norm(r.NIVEL_ACADEMICO_ACTUAL),tituloActual:norm(r.TITULO_ACADEMICO_ACTUAL),
        afinidad:yes(r.AFIN_TITULO_CARRERA)?'Sí':'No',
        estudiaActualmente:yes(r.ESTUDIA_ACTUALMENTE)?'Sí':'No',
        nivelCurso:norm(r.NIVEL_FORMACION_EN_CURSO),programaCurso:norm(r.PROGRAMA_EN_CURSO),
        institucionCurso:norm(r.INSTITUCION_ESTUDIO),nivelDeseado:norm(r.NIVEL_QUE_DESEA_ALCANZAR),
        areaInteres:norm(r.AREA_O_PROGRAMA_INTERES),dispuesto:yes(r.DISPUESTO_A_ESTUDIAR)?'Sí':'No',
        tipoFormacion:norm(r.TIPO_FORMACION)||'Específica',modalidadPreferida:norm(r.MODALIDAD_PREFERIDA)||'Virtual',
        inicioTentativo:norm(r.INICIO_TENTATIVO_MES_ANIO),barrera:norm(r.BARRERA_PRINCIPAL)||'Ninguna',
        actualizacionReciente:yes(r.ACTUALIZACION_RECIENTE)?'Sí':'No'
      };
      if(existing.has(cedula)) Object.assign(existing.get(cedula),obj);
      else {const t={id:id(),...obj}; state.teachers.push(t);existing.set(cedula,t);}
    });
  }
  if(sheets.COORDINACIONES?.length){
    sheets.COORDINACIONES.forEach(r=>{
      const c=state.coordinations.find(x=>x.carrera===norm(r.CARRERA)); if(!c)return;
      c.coordinador=norm(r.COORDINADOR)||c.coordinador;c.priorityOverride=norm(r.PRIORIDAD_MANUAL)||c.priorityOverride;
    });
  }
  ensurePlanRows();
  if(sheets.PLAN?.length){
    sheets.PLAN.forEach(r=>{
      const t=state.teachers.find(x=>x.cedula===norm(r.CEDULA)); if(!t)return;
      const p=planByTeacher(t.id);
      Object.assign(p,{
        selected:yes(r.INCLUIR_EN_PLAN),level:norm(r.NIVEL_PLANIFICADO)||p.level,
        program:norm(r.PROGRAMA_PLANIFICADO)||p.program,institution:norm(r.INSTITUCION)||p.institution,
        modality:norm(r.MODALIDAD)||p.modality,plannedStart:norm(r.FECHA_INICIO_PLANIFICADA)||p.plannedStart,
        plannedEnd:norm(r.FECHA_FIN_PLANIFICADA)||p.plannedEnd,supportType:norm(r.TIPO_APOYO)||p.supportType,
        supportAmount:norm(r.MONTO_APOYO)||p.supportAmount,convenio:norm(r.CONVENIO)||p.convenio,
        multiplier:norm(r.EFECTO_MULTIPLICADOR_PREVISTO)||p.multiplier
      });
    });
  }
  ensureFollowRows();
  if(sheets.SEGUIMIENTO?.length){
    sheets.SEGUIMIENTO.forEach(r=>{
      const t=state.teachers.find(x=>x.cedula===norm(r.CEDULA)); if(!t)return;
      let f=followByTeacher(t.id);
      if(!f){f={teacherId:t.id,status:'No iniciado',realStart:'',plannedEnd:'',progress:0,evidenceTitle:'',evidencePath:'',abandoned:false};state.followup.push(f);}
      Object.assign(f,{
        status:norm(r.ESTADO)||f.status,realStart:norm(r.FECHA_REAL_INICIO)||f.realStart,
        plannedEnd:norm(r.FECHA_PREVISTA_FINALIZACION)||f.plannedEnd,progress:n(r.PORCENTAJE_AVANCE),
        evidenceTitle:norm(r.TITULO_EVIDENCIA)||f.evidenceTitle,evidencePath:norm(r.RUTA_EVIDENCIA)||f.evidencePath,
        abandoned:yes(r.ABANDONO)
      });
    });
  }
}

function basePdfCss(){
  return `<style>
  @page{size:A4;margin:18mm 16mm 18mm 16mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#111;font-size:10.5pt;line-height:1.45;margin:0}.page-break{page-break-before:always}.avoid{page-break-inside:avoid}.header{border:1px solid #333;display:grid;grid-template-columns:22% 58% 20%;align-items:stretch;margin-bottom:18px}.header>div{padding:8px;border-right:1px solid #333;text-align:center}.header>div:last-child{border-right:0}.logo{font-weight:800;font-size:18px}.doc-title{font-weight:700}.meta{font-size:8.5pt}.cover{min-height:245mm;display:flex;flex-direction:column;justify-content:space-between}.cover h1{text-align:center;margin-top:75mm;font-size:23pt}.sign{width:100%;border-collapse:collapse}.sign td{border:1px solid #333;padding:10px;vertical-align:top;height:70px}.sign small{display:block}.h1{font-size:17pt;margin:18px 0 10px}.h2{font-size:13pt;margin:18px 0 7px}.h3{font-size:11pt;margin:14px 0 6px}table.data{width:100%;border-collapse:collapse;margin:8px 0 12px}table.data th,table.data td{border:1px solid #666;padding:6px 7px;font-size:9.2pt}table.data th{background:#e9edf2}.note{font-size:8.5pt;color:#555}.analysis{margin:8px 0 14px}.bar{display:grid;grid-template-columns:190px 1fr 55px;gap:8px;align-items:center;margin:6px 0}.track{height:12px;background:#e8edf3}.fill{height:100%;background:#365f86}.footer{position:fixed;bottom:-10mm;left:0;right:0;text-align:center;font-size:8pt;color:#666}
  </style>`;
}
function pdfHeader(title,code){
  return `<div class="header"><div class="logo">ITSQMET</div><div><div>UNIDAD DE GESTIÓN DE PROCESOS ACADÉMICOS</div><div class="doc-title">${esc(title)}</div></div><div class="meta">Código:<br>${esc(code)}<br>Versión: ${esc(state.period.version)}</div></div>`;
}
function cover(title,code){
  const p=state.period;
  return `<section class="cover">${pdfHeader(title,code)}<h1>${esc(title)}<br><small>${esc(periodLabel())}</small></h1>
  <table class="sign"><tr><td>ELABORADO POR:<br><br><small>NOMBRE: ${esc(p.preparedBy)}<br>CARGO: ${esc(p.preparedRole)}</small></td><td>REVISADO POR:<br><br><small>NOMBRE: ${esc(p.reviewedBy)}<br>CARGO: ${esc(p.reviewedRole)}</small></td><td>APROBADO POR:<br><br><small>NOMBRE: ${esc(p.approvedBy)}<br>CARGO: ${esc(p.approvedRole)}</small></td></tr></table></section>`;
}
function periodLabel(){
  const p=state.period;
  if(!p.start&&!p.end)return 'Período de Formación Docente';
  return [p.start,p.end].filter(Boolean).join(' a ');
}
function dist(field,filter=()=>true){
  const map={};state.teachers.filter(filter).forEach(t=>{const k=t[field]||'Sin información';map[k]=(map[k]||0)+1;});return map;
}
function distRows(map,total){
  return Object.entries(map).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<tr><td>${esc(k)}</td><td>${v}</td><td>${fmtPct(pct(v,total))}</td></tr>`).join('');
}
function bars(map,total){
  return Object.entries(map).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="bar"><div>${esc(k)}</div><div class="track"><div class="fill" style="width:${pct(v,total)}%"></div></div><div>${fmtPct(pct(v,total))}</div></div>`).join('');
}

function dnfHtml(){
  const total=state.teachers.length,s=stats();
  const level=dist('nivelActual'),ded=dist('dedicacion'),wish=dist('nivelDeseado'),type=dist('tipoFormacion'),mod=dist('modalidadPreferida'),barrier=dist('barrera');
  const intro=`La Detección de Necesidades de Formación consolida la situación académica del claustro docente, sus aspiraciones de desarrollo y las brechas que deben orientar la planificación institucional. Para el período analizado se consideran ${total} docentes, todos asociados a su carrera principal y a la función de docencia.`;
  return htmlDoc('Detección de Necesidades de Formación',`
    ${cover('Detección de Necesidades de Formación',state.period.dnfCode)}
    <div class="page-break"></div>${pdfHeader('Detección de Necesidades de Formación',state.period.dnfCode)}
    <div class="h1">1. Introducción</div><p>${intro}</p>
    <div class="h1">2. Metodología y enfoque</div><p>La información procede de la base institucional cargada mediante formulario o Excel global. La aplicación utiliza únicamente datos registrados y cálculos derivados; no modifica las cifras de origen.</p>
    <div class="h1">3. Caracterización del claustro docente</div>
    <div class="h2">3.1 Nivel académico actual</div><p>El nivel académico constituye la línea base para identificar brechas y proyectar rutas de formación.</p>
    <table class="data"><tr><th>Nivel</th><th>Docentes</th><th>Porcentaje</th></tr>${distRows(level,total)}</table>${bars(level,total)}
    <p class="analysis">El ${fmtPct(pct(s.masters+s.doctors,total))} del claustro registra maestría o doctorado. La planificación deberá concentrarse en los docentes con niveles inferiores y en quienes proyectan continuidad doctoral.</p>
    <div class="h2">3.2 Dedicación</div><p>La dedicación permite contextualizar la disponibilidad y las condiciones de acceso a procesos formativos.</p>
    <table class="data"><tr><th>Dedicación</th><th>Docentes</th><th>Porcentaje</th></tr>${distRows(ded,total)}</table>
    <div class="h2">3.3 Disposición para iniciar o continuar estudios</div>
    <table class="data"><tr><th>Condición</th><th>Docentes</th><th>Porcentaje</th></tr><tr><td>Sí</td><td>${s.willing}</td><td>${fmtPct(pct(s.willing,total))}</td></tr><tr><td>No</td><td>${Math.max(0,total-s.willing)}</td><td>${fmtPct(pct(total-s.willing,total))}</td></tr></table>
    <p class="analysis">La disposición declarada constituye el principal insumo para seleccionar candidatos viables dentro del Plan de Formación.</p>
    <div class="h2">3.4 Nivel académico que desean alcanzar</div><table class="data"><tr><th>Nivel deseado</th><th>Docentes</th><th>Porcentaje</th></tr>${distRows(wish,total)}</table>
    <div class="h2">3.5 Formación específica y genérica</div><table class="data"><tr><th>Tipo</th><th>Docentes</th><th>Porcentaje</th></tr>${distRows(type,total)}</table>
    <div class="h2">3.6 Modalidad preferida</div><table class="data"><tr><th>Modalidad</th><th>Docentes</th><th>Porcentaje</th></tr>${distRows(mod,total)}</table>
    <div class="h2">3.7 Barreras principales</div><table class="data"><tr><th>Barrera</th><th>Docentes</th><th>Porcentaje</th></tr>${distRows(barrier,total)}</table>
    <div class="page-break"></div>${pdfHeader('Detección de Necesidades de Formación',state.period.dnfCode)}
    <div class="h1">4. Líneas de formación por carrera</div><p>Las necesidades específicas se generan automáticamente a partir de la información de cada carrera y pueden ser priorizadas institucionalmente.</p>
    <table class="data"><tr><th>Carrera</th><th>Coordinador</th><th>Necesidades específicas</th><th>Prioridad</th></tr>${
      state.coordinations.filter(c=>state.teachers.some(t=>t.carrera===c.carrera)).map(c=>`<tr><td>${esc(c.carrera)}</td><td>${esc(c.coordinador||'Por definir')}</td><td>${esc(needsFor(c.carrera).join(' · ')||'Sin información suficiente')}</td><td>${esc(priorityFor(c.carrera))}</td></tr>`).join('')
    }</table>
    <div class="h2">4.1 Formación genérica institucional</div><p>Las siguientes líneas transversales se mantienen como catálogo editable para el período:</p><ul>${state.settings.genericLines.map(x=>'<li>'+esc(x)+'</li>').join('')}</ul>
    <div class="h1">5. Conclusiones</div>
    <p>El diagnóstico evidencia una base de ${total} docentes y permite diferenciar brechas por nivel académico, carrera, disposición y tipo de formación. Las prioridades generadas deben utilizarse como insumo directo para la selección y planificación del Plan de Formación Docente.</p>
    <div class="h1">6. Recomendaciones</div><p>Priorizar las carreras con brecha Alta, aprovechar la disposición declarada de los docentes y mantener rutas diferenciadas para formación específica y genérica, evitando duplicar información entre el diagnóstico y el Plan.</p>
    <div class="h1">7. Anexo: Base consolidada</div>
    <table class="data"><tr><th>Docente</th><th>Carrera</th><th>Nivel actual</th><th>Nivel deseado</th><th>Tipo</th><th>Modalidad</th></tr>${
      state.teachers.map(t=>`<tr><td>${esc(t.nombre)}</td><td>${esc(t.carrera)}</td><td>${esc(t.nivelActual)}</td><td>${esc(t.nivelDeseado)}</td><td>${esc(t.tipoFormacion)}</td><td>${esc(t.modalidadPreferida)}</td></tr>`).join('')
    }</table>
  `);
}
function planHtml(){
  ensurePlanRows();
  const rows=state.plan.filter(p=>p.selected);
  const total=state.teachers.length;
  const coverage=pct(rows.length,total);
  return htmlDoc('Plan de Formación Docente',`
    ${cover('Plan de Formación Docente',state.period.planCode)}
    <div class="page-break"></div>${pdfHeader('Plan de Formación Docente',state.period.planCode)}
    <div class="h1">1. Introducción</div><p>El presente Plan se construye a partir de la Detección de Necesidades de Formación del mismo período. La información de los docentes no se vuelve a ingresar: se hereda de la base institucional y se complementa únicamente con decisiones de planificación.</p>
    <div class="h1">2. Objetivo</div><p>Orientar la formación académica del personal docente mediante rutas pertinentes y verificables, alineadas con las brechas identificadas y las prioridades institucionales.</p>
    <div class="h1">3. Diagnóstico resumido</div><p>La base institucional contiene ${total} docentes. El Plan incluye ${rows.length}, equivalente al ${fmtPct(coverage)}. La meta configurada para el período es ${fmtPct(state.period.targetPercent)}.</p>
    <div class="h1">4. Docentes incluidos en el Plan</div>
    <table class="data"><tr><th>Docente</th><th>Carrera</th><th>Nivel</th><th>Programa</th><th>Institución</th><th>Modalidad</th><th>Inicio</th><th>Fin</th><th>Apoyo</th><th>Monto</th></tr>${
      rows.map(p=>{const t=teacherById(p.teacherId);return`<tr><td>${esc(t?.nombre)}</td><td>${esc(t?.carrera)}</td><td>${esc(p.level)}</td><td>${esc(p.program)}</td><td>${esc(p.institution||'Por definir')}</td><td>${esc(p.modality)}</td><td>${esc(p.plannedStart)}</td><td>${esc(p.plannedEnd)}</td><td>${esc(p.supportType)}</td><td>${esc(p.supportAmount||'—')}</td></tr>`}).join('')
    }</table>
    <div class="h1">5. Acciones institucionales</div><ol>${state.settings.planActions.map(x=>'<li>'+esc(x)+'</li>').join('')}</ol>
    <div class="h1">6. Metas e indicadores</div>
    <table class="data"><tr><th>Indicador</th><th>Meta / referencia</th></tr><tr><td>Docentes incluidos en formación</td><td>${rows.length} docentes</td></tr><tr><td>Cobertura del Plan</td><td>${fmtPct(coverage)}</td></tr><tr><td>Meta institucional configurada</td><td>${fmtPct(state.period.targetPercent)}</td></tr></table>
    <div class="h1">7. Seguimiento</div><p>El seguimiento se efectuará sobre la misma base, registrando estado, fecha real de inicio, fecha prevista de finalización, porcentaje de avance, evidencia y abandono cuando corresponda.</p>
    <div class="h1">8. Conclusión</div><p>El Plan traduce las prioridades del diagnóstico en una selección concreta de docentes y rutas formativas, manteniendo trazabilidad entre DNF, planificación y resultados.</p>
  `);
}
function informeHtml(){
  ensureFollowRows();
  const planned=state.plan.filter(p=>p.selected);
  const fs=planned.map(p=>({p,t:teacherById(p.teacherId),f:followByTeacher(p.teacherId)}));
  const started=fs.filter(x=>['En proceso','Finalizado'].includes(x.f?.status)).length;
  const finished=fs.filter(x=>x.f?.status==='Finalizado').length;
  const abandoned=fs.filter(x=>x.f?.abandoned).length;
  const avg=fs.length?fs.reduce((a,x)=>a+n(x.f?.progress),0)/fs.length:0;
  return htmlDoc('Informe de Cumplimiento del Plan de Formación Docente',`
    ${cover('Informe de Cumplimiento del Plan de Formación Docente',state.period.reportCode)}
    <div class="page-break"></div>${pdfHeader('Informe de Cumplimiento del Plan de Formación Docente',state.period.reportCode)}
    <div class="h1">1. Objeto del informe</div><p>Presentar el resultado del seguimiento de los docentes incluidos en el Plan de Formación Docente del período, contrastando la planificación con la ejecución registrada.</p>
    <div class="h1">2. Resumen de cumplimiento</div>
    <table class="data"><tr><th>Indicador</th><th>Resultado</th></tr><tr><td>Docentes planificados</td><td>${planned.length}</td></tr><tr><td>Docentes que iniciaron o continúan</td><td>${started}</td></tr><tr><td>Docentes finalizados</td><td>${finished}</td></tr><tr><td>Abandonos registrados</td><td>${abandoned}</td></tr><tr><td>Avance promedio</td><td>${fmtPct(avg)}</td></tr><tr><td>Cumplimiento de inicio</td><td>${fmtPct(pct(started,planned.length))}</td></tr></table>
    <div class="h1">3. Seguimiento individual</div>
    <table class="data"><tr><th>Docente</th><th>Programa</th><th>Estado</th><th>Inicio real</th><th>Fin previsto</th><th>Avance</th><th>Restante</th><th>Abandono</th></tr>${
      fs.map(x=>`<tr><td>${esc(x.t?.nombre)}</td><td>${esc(x.p.program)}</td><td>${esc(x.f?.status)}</td><td>${esc(x.f?.realStart)}</td><td>${esc(x.f?.plannedEnd)}</td><td>${fmtPct(x.f?.progress)}</td><td>${fmtPct(Math.max(0,100-n(x.f?.progress)))}</td><td>${x.f?.abandoned?'Sí':'No'}</td></tr>`).join('')
    }</table>
    <div class="h1">4. Evidencias</div><p>Las evidencias se registran mediante título y archivo asociado en la aplicación.</p>
    <table class="data"><tr><th>Docente</th><th>Título de evidencia</th><th>Archivo</th></tr>${
      fs.filter(x=>x.f?.evidenceTitle||x.f?.evidencePath).map(x=>`<tr><td>${esc(x.t?.nombre)}</td><td>${esc(x.f?.evidenceTitle)}</td><td>${esc(x.f?.evidencePath?x.f.evidencePath.split(/[\\/]/).pop():'')}</td></tr>`).join('')
    }</table>
    <div class="h1">5. Análisis</div><p>De ${planned.length} docentes planificados, ${started} registran inicio o continuidad, equivalente al ${fmtPct(pct(started,planned.length))}. El avance promedio registrado es ${fmtPct(avg)}. Se identifican ${abandoned} abandonos.</p>
    <div class="h1">6. Conclusiones</div><p>El informe consolida la evidencia disponible y permite verificar la trazabilidad desde la DNF hasta la ejecución. Los registros pendientes deberán actualizarse antes de cerrar formalmente el período.</p>
    <div class="h1">7. Recomendaciones</div><p>Mantener el seguimiento periódico, exigir evidencia de avance en los hitos definidos y utilizar los resultados para retroalimentar la Detección de Necesidades del siguiente período.</p>
  `);
}
function htmlDoc(title,body){
  return `<!doctype html><html><head><meta charset="UTF-8"><title>${esc(title)}</title>${basePdfCss()}</head><body>${body}<div class="footer">ITSQMET · Unidad de Gestión de Procesos Académicos</div></body></html>`;
}
async function generateDocument(type){
  if(type==='dnf' && !state.teachers.length){toast('Carga docentes antes de generar la DNF');return;}
  if(type==='plan' && !state.plan.some(p=>p.selected)){toast('Selecciona docentes en el Plan');return;}
  if(type==='informe' && !state.plan.some(p=>p.selected)){toast('No hay docentes planificados');return;}
  const payload = type==='dnf'
    ? {filename:'Deteccion_Necesidades_Formacion.pdf',html:dnfHtml()}
    : type==='plan'
    ? {filename:'Plan_Formacion_Docente.pdf',html:planHtml()}
    : {filename:'Informe_Cumplimiento_Plan_Formacion.pdf',html:informeHtml()};
  const r=await window.docformacion.generatePDF(payload);
  if(r?.ok) toast('PDF generado correctamente');
  else if(r?.error) toast('Error al generar PDF: '+r.error);
}

$$('.nav-item').forEach(b=>b.onclick=()=>setView(b.dataset.view));
$('#btnTemplate').onclick=exportTemplate;
$('#btnImport').onclick=importExcel;

(async function init(){
  const loaded=await window.docformacion.loadData();
  if(loaded && !loaded.__error){
    state={...defaultState(),...loaded};
    state.period={...defaultState().period,...(loaded.period||{})};
    state.settings={...defaultState().settings,...(loaded.settings||{})};
    state.coordinations=defaultState().coordinations.map(c=>({
      ...c,
      ...(loaded.coordinations||[]).find(x=>x.carrera===c.carrera)
    }));
    state.teachers=loaded.teachers||[];
    state.plan=loaded.plan||[];
    state.followup=loaded.followup||[];
  }
  render();
})();
