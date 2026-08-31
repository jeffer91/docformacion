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
      needsOverride: '',
      needItems: []
    })),
    settings: {
      genericLines: [...GENERIC_LINES],
      planActions: [...DEFAULT_ACTIONS]
    },
    integrations: {
      firebase: {
        source: 'Repaso-Fire',
        url: 'https://repaso-fire-d8ceb-default-rtdb.firebaseio.com/',
        mode: 'read-only',
        lastReadAt: '',
        lastAppliedAt: '',
        lastStats: null
      }
    },
    plan: [],
    followup: []
  };
}

let state = defaultState();
let currentView = 'inicio';
let editingTeacherId = null;
let teacherReturnView = null;

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

function setMissingControl(el,missing,message='Campo obligatorio pendiente'){
  if(!el) return;
  el.classList.toggle('is-missing-control',!!missing);
  const wrapper=el.closest('.field');
  if(!wrapper) return;
  wrapper.classList.toggle('is-missing',!!missing);
  let note=wrapper.querySelector('.missing-note');
  if(missing && !note){
    note=document.createElement('span');
    note.className='missing-note';
    note.textContent=message;
    wrapper.appendChild(note);
  }else if(!missing && note){
    note.remove();
  }
}

function refreshTeacherMissingStyles(){
  const form=$('#teacherForm');
  if(!form) return;
  const draft=Object.fromEntries(new FormData(form).entries());
  const type=teacherReturnView==='doc-dnf'?'dnf':teacherReturnView==='doc-plan'?'plan':teacherReturnView==='doc-informe'?'informe':'full';
  const entries=type==='full'?teacherMissingEntries(draft):teacherMissingEntriesForDocument(type,draft);
  const missing=new Set(entries.map(x=>x.key));
  form.querySelectorAll('[name]').forEach(el=>setMissingControl(el,missing.has(el.name)));
}

function refreshPeriodMissingStyles(){
  const root=$('#content');
  if(!root) return;
  const required={
    start:!norm(root.querySelector('[name="start"]')?.value),
    end:!norm(root.querySelector('[name="end"]')?.value),
    elaborationDate:!norm(root.querySelector('[name="elaborationDate"]')?.value),
    preparedBy:!norm(root.querySelector('[name="preparedBy"]')?.value),
    reviewedBy:!norm(root.querySelector('[name="reviewedBy"]')?.value),
    approvedBy:!norm(root.querySelector('[name="approvedBy"]')?.value),
    dnfCode:isPlaceholderCode(root.querySelector('[name="dnfCode"]')?.value),
    planCode:isPlaceholderCode(root.querySelector('[name="planCode"]')?.value),
    reportCode:isPlaceholderCode(root.querySelector('[name="reportCode"]')?.value)
  };
  Object.entries(required).forEach(([name,missing])=>setMissingControl(root.querySelector('[name="'+name+'"]'),missing));
}

function refreshCareerMissingStyles(){
  $$('[data-career-row]').forEach(row=>{
    const name=row.querySelector('[data-career-name]');
    const program=row.querySelector('[data-career-program]');
    setMissingControl(name,!norm(name?.value));
    setMissingControl(program,!norm(program?.value)||program?.value==='Por definir');
  });
}

function refreshDNFMissingStyles(){
  $$('.coord-input').forEach(inp=>setMissingControl(inp,!norm(inp.value)));
  $$('.need-item-input').forEach(inp=>setMissingControl(inp,!norm(inp.value)));
}

function refreshPlanMissingStyles(){
  $$('[data-plan-row]').forEach(row=>{
    const selected=row.querySelector('[data-p="selected"]')?.checked;
    const supportType=row.querySelector('[data-p="supportType"]')?.value;
    row.querySelectorAll('[data-p]').forEach(el=>{
      if(el.dataset.p==='selected'){ setMissingControl(el,false); return; }
      let missing=false;
      if(selected && ['level','program','modality','plannedStart','plannedEnd','supportType'].includes(el.dataset.p)){
        missing=!norm(el.value);
      }
      if(selected && el.dataset.p==='supportAmount' && supportType==='Económico'){
        missing=n(el.value)<=0;
      }
      setMissingControl(el,missing);
    });
  });
}

function refreshFollowupMissingStyles(){
  $$('[data-follow-row]').forEach(row=>{
    const teacherId=row.dataset.followRow;
    const status=row.querySelector('[data-f="status"]')?.value||'';
    const active=['En proceso','Finalizado'].includes(status);
    row.querySelectorAll('[data-f]').forEach(el=>{
      let missing=false;
      if(el.dataset.f==='status') missing=!norm(el.value);
      if(el.dataset.f==='plannedEnd') missing=!norm(el.value);
      if(active && el.dataset.f==='realStart') missing=!norm(el.value);
      if(active && el.dataset.f==='progress') missing=n(el.value)<=0;
      if(active && el.dataset.f==='evidenceTitle') missing=!norm(el.value);
      setMissingControl(el,missing);
    });
    const evidenceButton=row.querySelector('.evidence-btn');
    const follow=followByTeacher(teacherId);
    setMissingControl(evidenceButton,active&&!norm(follow?.evidencePath));
  });
}

function teacherById(teacherId){ return state.teachers.find(t=>t.id===teacherId); }
function planByTeacher(teacherId){ return state.plan.find(p=>p.teacherId===teacherId); }
function followByTeacher(teacherId){ return state.followup.find(f=>f.teacherId===teacherId); }
function careerNames(){ return (state.careers||[]).map(c=>c.name).filter(Boolean); }
function programForCareer(name){ return (state.careers||[]).find(c=>c.name===name)?.program || ''; }
function careerKey(name){
  return norm(name).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ');
}
function coordinationFor(name){
  const key=careerKey(name);
  return state.coordinations.find(c=>careerKey(c.carrera)===key);
}
function ensureCoordination(name){
  if(!name) return null;
  let coord=coordinationFor(name);
  if(!coord){
    coord={carrera:name,coordinador:'',priorityOverride:'',needsOverride:'',needItems:[]};
    state.coordinations.push(coord);
  }
  if(!Array.isArray(coord.needItems)) coord.needItems=[];
  return coord;
}
function dedupeCareerState(){
  let changed=false;
  const canonical=new Map();
  const uniqueCareers=[];
  (state.careers||[]).forEach(cr=>{
    const name=norm(cr.name);
    if(!name) return;
    const key=careerKey(name);
    if(!canonical.has(key)){
      const item={...cr,name};
      canonical.set(key,item);
      uniqueCareers.push(item);
    }else{
      const kept=canonical.get(key);
      if((!kept.program||kept.program==='Por definir') && cr.program && cr.program!=='Por definir') kept.program=cr.program;
      changed=true;
    }
  });
  state.careers=uniqueCareers;

  const coordMap=new Map();
  const uniqueCoords=[];
  (state.coordinations||[]).forEach(raw=>{
    const name=norm(raw.carrera);
    if(!name) return;
    const key=careerKey(name);
    if(!coordMap.has(key)){
      const item={carrera:canonical.get(key)?.name||name,coordinador:'',priorityOverride:'',needsOverride:'',needItems:[],...raw};
      if(!Array.isArray(item.needItems)) item.needItems=[];
      coordMap.set(key,item);
      uniqueCoords.push(item);
    }else{
      const kept=coordMap.get(key);
      if(!norm(kept.coordinador)&&norm(raw.coordinador)) kept.coordinador=raw.coordinador;
      if(!norm(kept.needsOverride)&&norm(raw.needsOverride)) kept.needsOverride=raw.needsOverride;
      if(!norm(kept.priorityOverride)&&norm(raw.priorityOverride)) kept.priorityOverride=raw.priorityOverride;
      if((!kept.needItems||!kept.needItems.length)&&Array.isArray(raw.needItems)&&raw.needItems.length) kept.needItems=raw.needItems;
      changed=true;
    }
  });
  state.coordinations=uniqueCoords;

  (state.teachers||[]).forEach(t=>{
    const key=careerKey(t.carrera);
    const canonicalCareer=canonical.get(key);
    if(canonicalCareer && t.carrera!==canonicalCareer.name){
      t.carrera=canonicalCareer.name;
      changed=true;
    }
  });

  (state.careers||[]).forEach(cr=>ensureCoordination(cr.name));
  return changed;
}
function specificCareerNames(){
  const seen=new Set();
  const out=[];
  (state.teachers||[]).forEach(t=>{
    if(!validCareerName(t.carrera)) return;
    const key=careerKey(t.carrera);
    if(seen.has(key)) return;
    seen.add(key);
    const canonical=(state.careers||[]).find(cr=>careerKey(cr.name)===key)?.name||t.carrera;
    out.push(canonical);
  });
  return out;
}

function ensureCareer(name, program=''){
  const clean=norm(name);
  if(!clean || !validCareerName(clean)) return;
  if(!state.careers.some(c=>c.name===clean)){
    state.careers.push({name:clean,program:norm(program)||'Por definir'});
  }
  ensureCoordination(clean);
}

const FIREBASE_FIELD_ALIASES = {
  "cedula": [
    "cedula",
    "identificacion",
    "documento",
    "dni",
    "iddocente",
    "documentodocente"
  ],
  "nombre": [
    "nombrecompleto",
    "nombre",
    "docente",
    "nombresapellidos",
    "nombres"
  ],
  "carrera": [
    "carreraprincipal",
    "carrera",
    "unidadcarrera",
    "unidadcarreradondelabora",
    "carreradondelabora"
  ],
  "dedicacion": [
    "dedicacion",
    "tiempodedicacion",
    "tipodedicacion"
  ],
  "nivelActual": [
    "nivelacademicoactual",
    "nivelacademico",
    "nivelactual",
    "gradoacademico"
  ],
  "tituloActual": [
    "tituloacademicoactual",
    "tituloacademico",
    "tituloactual"
  ],
  "afinidad": [
    "afintitulocarrera",
    "afinidad",
    "tituloafin"
  ],
  "estudiaActualmente": [
    "estudiaactualmente",
    "enformacion",
    "estudiando",
    "formacionactiva"
  ],
  "nivelCurso": [
    "nivelformacionencurso",
    "nivelcurso",
    "nivelencurso",
    "nivelformacionactual"
  ],
  "programaCurso": [
    "programaencurso",
    "carreraprogramaquecursa",
    "programaacademico",
    "programaestudio",
    "programaformacion"
  ],
  "institucionCurso": [
    "institucionestudio",
    "institucionacademica",
    "universidad",
    "ies",
    "institucionformacion"
  ],
  "nivelDeseado": [
    "nivelquedeseaalcanzar",
    "niveldeseado",
    "formaciondeseada"
  ],
  "areaInteres": [
    "areaoprogramainteres",
    "areainteres",
    "programainteres",
    "interesformacion"
  ],
  "dispuesto": [
    "dispuestoaestudiar",
    "dispuesto",
    "continuarestudios"
  ],
  "modalidadPreferida": [
    "modalidadpreferida",
    "modalidadformacion",
    "modalidad"
  ],
  "tipoFormacion": [
    "tipoformacion"
  ],
  "barrera": [
    "barreraprincipal",
    "barrera"
  ],
  "inicioTentativo": [
    "iniciotentativo",
    "fechainicioformacion",
    "fechainicioacademica"
  ]
};

function firebaseKey(value=''){
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .toLowerCase().replace(/[^a-z0-9]/g,'');
}

function firebasePrimitiveMap(record){
  const map={};
  if(!record||typeof record!=='object'||Array.isArray(record)) return map;
  Object.entries(record).forEach(([key,value])=>{
    if(value===null||['string','number','boolean'].includes(typeof value)) map[firebaseKey(key)]=value;
  });
  return map;
}

function firebasePick(map,aliases){
  for(const alias of aliases||[]){
    const key=firebaseKey(alias);
    if(Object.prototype.hasOwnProperty.call(map,key) && norm(map[key])!=='') return map[key];
  }
  return '';
}

function firebaseId(value=''){
  return String(value).replace(/[^0-9A-Za-z]/g,'').toUpperCase();
}

function firebaseYesNo(value){
  if(value===true) return 'Sí';
  if(value===false) return 'No';
  const v=norm(value).toLowerCase();
  if(['si','sí','yes','true','1','activo','activa'].includes(v)) return 'Sí';
  if(['no','false','0','inactivo','inactiva'].includes(v)) return 'No';
  return '';
}

function firebaseLevel(value=''){
  const v=norm(value), k=firebaseKey(v);
  if(!v) return '';
  if(k.includes('doctor')||k==='phd') return 'Doctorado';
  if(k.includes('maestr')||k.includes('master')) return 'Maestría / Maestría Tecnológica';
  if(k.includes('licenci')||k.includes('ingenier')) return 'Licenciatura / Ingeniería';
  if(k.includes('universitari')) return 'Tecnólogo Universitario';
  if(k.includes('tecnolog')||k.includes('tecnic')) return 'Tecnólogo Superior';
  return v;
}

function firebaseMonth(value=''){
  const v=norm(value), m=v.match(/^(\d{4})-(\d{2})/);
  return m?m[1]+'-'+m[2]:'';
}

function firebaseExcluded(path,record){
  const excluded=new Set(['capacitacion','capacitaciones','capacitacionesgenericas','taller','talleres','seminario','seminarios','webinar','webinars']);
  if(path.map(firebaseKey).some(x=>excluded.has(x))) return true;
  const map=firebasePrimitiveMap(record);
  if(Object.prototype.hasOwnProperty.call(map,'capacitacion')) return true;
  if(Object.prototype.hasOwnProperty.call(map,'horas') &&
     (Object.prototype.hasOwnProperty.call(map,'curso')||Object.prototype.hasOwnProperty.call(map,'taller'))) return true;
  return false;
}

function firebaseFormalText(value=''){
  const k=firebaseKey(value);
  return /(maestr|master|doctor|phd|especializ|licenci|ingenier|tecnolog|universidad|universitari)/.test(k);
}

function firebaseAcademicSignal(map){
  const keys=[
    ...FIREBASE_FIELD_ALIASES.nivelActual,
    ...FIREBASE_FIELD_ALIASES.tituloActual,
    ...FIREBASE_FIELD_ALIASES.nivelCurso,
    ...FIREBASE_FIELD_ALIASES.programaCurso,
    ...FIREBASE_FIELD_ALIASES.institucionCurso,
    ...FIREBASE_FIELD_ALIASES.nivelDeseado,
    ...FIREBASE_FIELD_ALIASES.areaInteres
  ].map(firebaseKey);
  if(keys.some(key=>Object.prototype.hasOwnProperty.call(map,key)&&norm(map[key])!=='')) return true;
  return Object.values(map).some(value=>typeof value==='string'&&firebaseFormalText(value));
}

function firebaseContext(record,parent={}){
  const map=firebasePrimitiveMap(record);
  return {
    cedula:norm(firebasePick(map,FIREBASE_FIELD_ALIASES.cedula))||parent.cedula||'',
    nombre:norm(firebasePick(map,FIREBASE_FIELD_ALIASES.nombre))||parent.nombre||'',
    carrera:norm(firebasePick(map,FIREBASE_FIELD_ALIASES.carrera))||parent.carrera||''
  };
}

function firebaseCandidate(record,path,context){
  const map=firebasePrimitiveMap(record);
  const candidate={
    cedula:context.cedula,
    nombre:context.nombre,
    carrera:context.carrera,
    dedicacion:norm(firebasePick(map,FIREBASE_FIELD_ALIASES.dedicacion)),
    nivelActual:firebaseLevel(firebasePick(map,FIREBASE_FIELD_ALIASES.nivelActual)),
    tituloActual:norm(firebasePick(map,FIREBASE_FIELD_ALIASES.tituloActual)),
    afinidad:firebaseYesNo(firebasePick(map,FIREBASE_FIELD_ALIASES.afinidad)),
    estudiaActualmente:firebaseYesNo(firebasePick(map,FIREBASE_FIELD_ALIASES.estudiaActualmente)),
    nivelCurso:firebaseLevel(firebasePick(map,FIREBASE_FIELD_ALIASES.nivelCurso)),
    programaCurso:norm(firebasePick(map,FIREBASE_FIELD_ALIASES.programaCurso)),
    institucionCurso:norm(firebasePick(map,FIREBASE_FIELD_ALIASES.institucionCurso)),
    nivelDeseado:firebaseLevel(firebasePick(map,FIREBASE_FIELD_ALIASES.nivelDeseado)),
    areaInteres:norm(firebasePick(map,FIREBASE_FIELD_ALIASES.areaInteres)),
    dispuesto:firebaseYesNo(firebasePick(map,FIREBASE_FIELD_ALIASES.dispuesto)),
    modalidadPreferida:norm(firebasePick(map,FIREBASE_FIELD_ALIASES.modalidadPreferida)),
    tipoFormacion:norm(firebasePick(map,FIREBASE_FIELD_ALIASES.tipoFormacion)),
    barrera:norm(firebasePick(map,FIREBASE_FIELD_ALIASES.barrera)),
    inicioTentativo:firebaseMonth(firebasePick(map,FIREBASE_FIELD_ALIASES.inicioTentativo)),
    _path:'/'+path.join('/')
  };
  if(!candidate.estudiaActualmente && (candidate.nivelCurso||candidate.programaCurso||candidate.institucionCurso)) candidate.estudiaActualmente='Sí';
  if(!['Específica','Genérica'].includes(candidate.tipoFormacion)) candidate.tipoFormacion='';
  if(!['Presencial','Virtual','Híbrida'].includes(candidate.modalidadPreferida)) candidate.modalidadPreferida='';
  return candidate;
}

function mergeFirebaseCandidateObjects(target,source){
  const fields=['nombre','carrera','dedicacion','nivelActual','tituloActual','afinidad','estudiaActualmente','nivelCurso','programaCurso','institucionCurso','nivelDeseado','areaInteres','dispuesto','modalidadPreferida','tipoFormacion','barrera','inicioTentativo'];
  fields.forEach(field=>{if(!norm(target[field])&&norm(source[field])) target[field]=source[field];});
  target._paths=[...new Set([...(target._paths||[]),source._path].filter(Boolean))];
}

function analyzeFirebaseFormation(root){
  const candidates=new Map();
  const stats={visitedObjects:0,ignoredTrainingBranches:0,candidateRecords:0};
  function walk(node,path=[],parentContext={}){
    if(node===null||typeof node!=='object') return;
    if(Array.isArray(node)){ node.forEach((child,index)=>walk(child,path.concat(String(index)),parentContext)); return; }
    stats.visitedObjects++;
    if(firebaseExcluded(path,node)){ stats.ignoredTrainingBranches++; return; }
    const context=firebaseContext(node,parentContext), map=firebasePrimitiveMap(node);
    if(context.cedula && firebaseAcademicSignal(map)){
      const candidate=firebaseCandidate(node,path,context), key=firebaseId(candidate.cedula);
      if(key){
        stats.candidateRecords++;
        if(!candidates.has(key)) candidates.set(key,{...candidate,_paths:[candidate._path]});
        else mergeFirebaseCandidateObjects(candidates.get(key),candidate);
      }
    }
    Object.entries(node).forEach(([key,value])=>{if(value&&typeof value==='object') walk(value,path.concat(key),context);});
  }
  walk(root,[],{});
  return {candidates:[...candidates.values()],stats};
}

function firebaseEmpty(value){
  return value===null||value===undefined||norm(value)==='';
}

function applyFirebaseFormation(analysis,readAt){
  const stats={...analysis.stats,teachersFound:analysis.candidates.length,teachersCreated:0,teachersUpdated:0,fieldsFilled:0,conflicts:0,unchanged:0,conflictItems:[]};
  const fields=['nombre','carrera','dedicacion','nivelActual','tituloActual','afinidad','estudiaActualmente','nivelCurso','programaCurso','institucionCurso','nivelDeseado','areaInteres','dispuesto','modalidadPreferida','tipoFormacion','barrera','inicioTentativo'];
  analysis.candidates.forEach(candidate=>{
    const key=firebaseId(candidate.cedula);
    let teacher=state.teachers.find(t=>firebaseId(t.cedula)===key), created=false, changed=false;
    if(!teacher){
      teacher={id:id(),cedula:candidate.cedula,nombre:'',carrera:'',dedicacion:'',nivelActual:'',tituloActual:'',afinidad:'',estudiaActualmente:'',nivelCurso:'',programaCurso:'',institucionCurso:'',nivelDeseado:'',areaInteres:'',dispuesto:'',tipoFormacion:'',modalidadPreferida:'',inicioTentativo:'',barrera:'',actualizacionReciente:'Sí'};
      state.teachers.push(teacher); stats.teachersCreated++; created=true;
    }
    teacher._sourceMeta=teacher._sourceMeta||{};
    teacher._firebasePaths=[...new Set([...(teacher._firebasePaths||[]),...(candidate._paths||[])])];
    teacher._firebaseLastSeenAt=readAt;
    fields.forEach(field=>{
      const incoming=candidate[field];
      if(firebaseEmpty(incoming)) return;
      if(firebaseEmpty(teacher[field])){
        teacher[field]=incoming;
        teacher._sourceMeta[field]={source:'firebase',readAt,path:candidate._paths?.[0]||candidate._path||''};
        stats.fieldsFilled++; changed=true;
      } else if(norm(teacher[field])===norm(incoming)) {
        stats.unchanged++;
      } else {
        stats.conflicts++;
        if(stats.conflictItems.length<30) stats.conflictItems.push({docente:teacher.nombre||candidate.nombre||teacher.cedula,field,local:teacher[field],firebase:incoming,path:candidate._paths?.[0]||candidate._path||''});
      }
    });
    if(validCareerName(teacher.carrera)) ensureCareer(teacher.carrera);
    if(!created&&changed) stats.teachersUpdated++;
  });
  dedupeCareerState();
  return stats;
}

function firebaseFieldLabel(field){
  return ({nombre:'Nombre',carrera:'Carrera principal',dedicacion:'Dedicación',nivelActual:'Nivel académico actual',tituloActual:'Título académico actual',afinidad:'Afinidad del título',estudiaActualmente:'Estudia actualmente',nivelCurso:'Nivel en curso',programaCurso:'Programa en curso',institucionCurso:'Institución de estudio',nivelDeseado:'Nivel deseado',areaInteres:'Área/programa de interés',dispuesto:'Disposición para estudiar',modalidadPreferida:'Modalidad',tipoFormacion:'Tipo de formación',barrera:'Barrera',inicioTentativo:'Inicio tentativo'})[field]||field;
}

function firebaseSummaryHtml(stats,error=''){
  if(error){
    return '<div class="alert-strip danger"><div><strong>No se pudo leer Firebase</strong>'+esc(error)+'</div></div><div class="firebase-rule-note">No se realizó ningún cambio en DocFormación ni en Firebase.</div>';
  }
  const conflicts=stats.conflictItems||[];
  return '<div class="alert-strip success"><div><strong>Lectura completada</strong>Firebase se consultó en modo solo lectura. Ningún dato externo fue modificado.</div></div>'+
    '<div class="firebase-summary-grid">'+
      '<div><strong>'+(stats.teachersFound||0)+'</strong><span>docentes de formación encontrados</span></div>'+
      '<div><strong>'+(stats.teachersCreated||0)+'</strong><span>docentes nuevos</span></div>'+
      '<div><strong>'+(stats.teachersUpdated||0)+'</strong><span>docentes completados</span></div>'+
      '<div><strong>'+(stats.fieldsFilled||0)+'</strong><span>campos faltantes completados</span></div>'+
      '<div><strong>'+(stats.conflicts||0)+'</strong><span>conflictos: dato local conservado</span></div>'+
      '<div><strong>'+(stats.ignoredTrainingBranches||0)+'</strong><span>ramas de capacitación ignoradas</span></div>'+
    '</div>'+
    '<div class="firebase-rule-note"><strong>Regla:</strong> Firebase solo completa campos vacíos. No reemplaza datos existentes y no crea necesidades ni prioridades.</div>'+
    (conflicts.length?'<details class="issue-group" style="margin-top:14px"><summary><span>Revisar '+(stats.conflicts||0)+' conflicto(s)</span><span class="issue-group-hint">Dato local conservado</span></summary><div class="issue-group-body">'+conflicts.map(x=>'<div class="firebase-conflict"><strong>'+esc(x.docente)+'</strong><span>'+esc(firebaseFieldLabel(x.field))+': local “'+esc(x.local)+'” · Firebase “'+esc(x.firebase)+'”</span></div>').join('')+'</div></details>':'');
}

function showFirebaseSummary(stats,error=''){
  $('#firebaseSummary').innerHTML=firebaseSummaryHtml(stats,error);
  $('#firebaseDialog').showModal();
}

async function updateFromFirebase(){
  const btn=$('#btnFirebase'), original=btn.textContent;
  btn.disabled=true; btn.textContent='Leyendo Firebase…';
  try{
    const response=await window.docformacion.readFirebase();
    if(!response?.ok){ showFirebaseSummary({},response?.error||'No fue posible acceder a la base.'); return; }
    const readAt=new Date().toISOString(), analysis=analyzeFirebaseFormation(response.data), stats=applyFirebaseFormation(analysis,readAt);
    state.integrations=state.integrations||defaultState().integrations;
    state.integrations.firebase={...defaultState().integrations.firebase,...(state.integrations.firebase||{}),lastReadAt:readAt,lastAppliedAt:readAt,lastStats:stats};
    await save(); render(); showFirebaseSummary(stats);
  }catch(error){ showFirebaseSummary({},error.message); }
  finally{ btn.disabled=false; btn.textContent=original; }
}

function setView(view) {
  currentView = view;
  $$('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
  const meta = {
    inicio:['Inicio','Documentos de Formación Docente.'],
    periodo:['Datos generales','Corrige la información institucional requerida.'],
    carreras:['Carreras','Corrige el catálogo de carreras y programas.'],
    docentes:['Docentes','Corrige la información del docente seleccionado.'],
    necesidades:['Necesidades y líneas','Corrige coordinadores y líneas de formación.'],
    planificacion:['Planificación','Corrige los datos necesarios para el Plan.'],
    seguimiento:['Seguimiento','Corrige los datos necesarios para el Informe.'],
    'doc-dnf':['Detección de Necesidades de Formación','Revisa lo pendiente y genera el documento cuando esté listo.'],
    'doc-plan':['Plan de Formación Docente','Revisa lo pendiente y genera el documento cuando esté listo.'],
    'doc-informe':['Informe de Cumplimiento del Plan de Formación','Revisa lo pendiente y genera el documento cuando esté listo.']
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
function looksLikeStudyProgram(name){
  const value=norm(name).toLowerCase();
  if(!value) return false;
  return /\b(master|máster|maestria|maestría|doctorado|phd|especializacion|especialización|diplomado)\b/i.test(value);
}

function validCareerName(name){
  return !!norm(name) && !looksLikeStudyProgram(name);
}

function cleanupInvalidCareers(){
  const invalid=new Set((state.careers||[])
    .filter(cr=>looksLikeStudyProgram(cr.name) && (!norm(cr.program) || cr.program==='Por definir'))
    .map(cr=>cr.name));
  if(!invalid.size) return false;
  state.careers=(state.careers||[]).filter(cr=>!invalid.has(cr.name));
  state.coordinations=(state.coordinations||[]).filter(co=>!invalid.has(co.carrera));
  return true;
}

function teacherMissingEntries(t){
  const missing=[];
  const required=[
    ['cedula','Cédula'],['nombre','Nombre'],['dedicacion','Dedicación'],
    ['nivelActual','Nivel académico actual'],['tituloActual','Título académico actual'],['afinidad','Afinidad del título'],
    ['estudiaActualmente','¿Estudia actualmente?'],['nivelDeseado','Nivel que desea alcanzar'],
    ['areaInteres','Área o programa de interés'],['dispuesto','Disposición para estudiar'],
    ['tipoFormacion','Tipo de formación'],['modalidadPreferida','Modalidad preferida'],
    ['barrera','Barrera principal']
  ];
  required.forEach(([key,label])=>{if(!norm(t[key])) missing.push({key,label});});
  if(!norm(t.carrera)) missing.push({key:'carrera',label:'Carrera principal'});
  else if(!validCareerName(t.carrera)) missing.push({key:'carrera',label:'Carrera principal válida'});
  if(t.estudiaActualmente==='Sí'){
    if(!norm(t.nivelCurso)) missing.push({key:'nivelCurso',label:'Nivel de formación en curso'});
    if(!norm(t.programaCurso)) missing.push({key:'programaCurso',label:'Programa en curso'});
    if(!norm(t.institucionCurso)) missing.push({key:'institucionCurso',label:'Institución de estudio'});
  }
  return missing;
}

function teacherMissingEntriesForDNF(t){
  const missing=[];
  const required=[
    ['nivelActual','Nivel académico actual'],
    ['nivelDeseado','Nivel que desea alcanzar'],
    ['areaInteres','Área o programa de interés'],
    ['tipoFormacion','Tipo de formación']
  ];
  required.forEach(([key,label])=>{if(!norm(t[key])) missing.push({key,label});});
  if(!norm(t.carrera)) missing.push({key:'carrera',label:'Carrera principal'});
  else if(!validCareerName(t.carrera)) missing.push({key:'carrera',label:'Carrera principal válida'});
  return missing;
}

function teacherMissingEntriesForDocument(type,t){
  if(type==='dnf') return teacherMissingEntriesForDNF(t);
  return teacherMissingEntries(t);
}


function teacherMissing(t){
  return teacherMissingEntries(t).map(x=>x.label);
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
  const issues=periodMissing(type).map(text=>({kind:'period',text,view:'periodo'}));
  const careersInUse=[...new Set(state.teachers.map(t=>t.carrera).filter(validCareerName))];

  if(!state.teachers.length){
    issues.push({kind:'teachers-empty',text:'Cargar al menos un docente',view:'docentes'});
  }

  if(type!=='dnf'){
    state.teachers.forEach(t=>{
      const entries=teacherMissingEntriesForDocument(type,t);
      if(entries.length){
        issues.push({
          kind:'teacher',
          teacherId:t.id,
          name:t.nombre||t.cedula||'Docente',
          fields:entries,
          text:(t.nombre||t.cedula||'Docente')+': falta '+entries.map(x=>x.label).join(', '),
          view:'docentes'
        });
      }
    });
  }

  const withoutProgram=careersInUse.filter(name=>{
    const p=programForCareer(name);
    return !p || p==='Por definir';
  });
  if(withoutProgram.length){
    issues.push({
      kind:'career-program',
      names:withoutProgram,
      text:withoutProgram.length+' carrera(s) sin programa definido',
      view:'carreras'
    });
  }

  if(type==='dnf'){
    const withoutNeeds=careersInUse.filter(name=>!needsFor(name).filter(norm).length);
    if(withoutNeeds.length){
      issues.push({
        kind:'career-needs',
        names:withoutNeeds,
        text:withoutNeeds.length+' carrera(s) sin necesidad de formación definida',
        view:'necesidades'
      });
    }
  }

  const noCoordinator=careersInUse.filter(name=>!norm(state.coordinations.find(c=>c.carrera===name)?.coordinador));
  if(type==='dnf' && noCoordinator.length){
    issues.push({
      kind:'coordinator',
      names:noCoordinator,
      text:noCoordinator.length+' carrera(s) sin coordinador definido',
      view:'necesidades'
    });
  }

  if(type==='dnf' && !(state.settings.genericLines||[]).filter(norm).length){
    issues.push({kind:'generic',text:'Definir al menos una línea genérica',view:'necesidades'});
  }

  if(type==='plan' || type==='informe'){
    ensurePlanRows();
    const selected=state.plan.filter(p=>p.selected);
    if(!selected.length){
      issues.push({kind:'plan-empty',text:'Seleccionar al menos un docente en Planificación',view:'planificacion'});
    }

    selected.forEach(p=>{
      const fields=[];
      if(!p.level) fields.push('nivel');
      if(!p.program) fields.push('programa');
      if(!p.modality) fields.push('modalidad');
      if(!p.plannedStart) fields.push('inicio');
      if(!p.plannedEnd) fields.push('fin');
      if(!p.supportType) fields.push('tipo de apoyo');
      if(p.supportType==='Económico'&&!n(p.supportAmount)) fields.push('monto');
      if(fields.length){
        const t=teacherById(p.teacherId);
        issues.push({
          kind:'plan-teacher',
          teacherId:p.teacherId,
          name:t?.nombre||'Docente',
          fields,
          text:(t?.nombre||'Docente')+': planificación sin '+fields.join(', '),
          view:'planificacion'
        });
      }
    });
  }

  if(type==='informe'){
    ensureFollowRows();
    const selected=state.plan.filter(p=>p.selected);
    selected.forEach(p=>{
      const f=followByTeacher(p.teacherId), fields=[];
      if(!f||!f.status) fields.push('estado');
      if(!f||!f.plannedEnd) fields.push('fecha prevista de finalización');
      if(f&&['En proceso','Finalizado'].includes(f.status)){
        if(!f.realStart) fields.push('fecha real de inicio');
        if(n(f.progress)<=0) fields.push('avance');
        if(!norm(f.evidenceTitle)) fields.push('título de evidencia');
        if(!norm(f.evidencePath)) fields.push('evidencia');
      }
      if(fields.length){
        const t=teacherById(p.teacherId);
        issues.push({
          kind:'follow-teacher',
          teacherId:p.teacherId,
          name:t?.nombre||'Docente',
          fields,
          text:(t?.nombre||'Docente')+': seguimiento sin '+fields.join(', '),
          view:'seguimiento'
        });
      }
    });
  }

  return {ready:issues.length===0,missing:issues.map(x=>x.text),issues};
}

function correctionLabel(view){
  return ({
    periodo:'Datos generales',
    carreras:'Carreras',
    docentes:'Docentes',
    necesidades:'Necesidades',
    planificacion:'Planificación',
    seguimiento:'Seguimiento'
  })[view] || 'Corregir';
}

function issueButton(issue,label='Corregir'){
  const teacher=issue.teacherId?` data-teacher-id="${esc(issue.teacherId)}"`:'';
  const focus=issue.fields?.[0]?.key?` data-focus-field="${esc(issue.fields[0].key)}"`:'';
  const career=issue.careerName?` data-career-name="${esc(issue.careerName)}"`:'';
  return `<button class="secondary compact" data-correct-view="${esc(issue.view)}"${teacher}${focus}${career}>${esc(label)}</button>`;
}

function issueGroup(title,items){
  return `<details class="issue-group">
    <summary><span>${esc(title)}</span><span class="issue-group-hint">Ver y corregir</span></summary>
    <div class="issue-group-body">${items.join('')}</div>
  </details>`;
}

function issueLine(issue,description,buttonLabel='Corregir'){
  return `<div class="issue-line">
    <div class="issue-line-text">${description}</div>
    ${issueButton(issue,buttonLabel)}
  </div>`;
}

function renderIssues(type,issues){
  const out=[];
  const teachers=issues.filter(x=>x.kind==='teacher');
  const planTeachers=issues.filter(x=>x.kind==='plan-teacher');
  const followTeachers=issues.filter(x=>x.kind==='follow-teacher');
  const groupedKinds=new Set(['teacher','plan-teacher','follow-teacher','career-program','career-needs','coordinator']);

  issues.filter(x=>!groupedKinds.has(x.kind)).forEach(issue=>{
    out.push(issueLine(issue,esc(issue.text),`Corregir en ${correctionLabel(issue.view)}`));
  });

  if(teachers.length){
    out.push(issueGroup(
      teachers.length+' docente(s) con información incompleta',
      teachers.map(issue=>issueLine(
        issue,
        `<strong>${esc(issue.name)}</strong><span>${esc(issue.fields.map(x=>x.label).join(' · '))}</span>`
      ))
    ));
  }

  const careerProgram=issues.find(x=>x.kind==='career-program');
  if(careerProgram){
    out.push(issueGroup(
      careerProgram.names.length+' carrera(s) sin programa',
      careerProgram.names.map(name=>issueLine(
        {view:'carreras',careerName:name},
        `<strong>${esc(name)}</strong><span>Programa sin definir</span>`
      ))
    ));
  }

  const careerNeeds=issues.find(x=>x.kind==='career-needs');
  if(careerNeeds){
    out.push(issueGroup(
      careerNeeds.names.length+' carrera(s) sin necesidad de formación',
      careerNeeds.names.map(name=>issueLine(
        {view:'necesidades',careerName:name},
        '<strong>'+esc(name)+'</strong><span>Definir al menos una necesidad de formación</span>'
      ))
    ));
  }

  const coordinators=issues.find(x=>x.kind==='coordinator');
  if(coordinators){
    out.push(issueGroup(
      coordinators.names.length+' carrera(s) sin coordinador',
      coordinators.names.map(name=>issueLine(
        {view:'necesidades',careerName:name},
        `<strong>${esc(name)}</strong><span>Coordinador sin definir</span>`
      ))
    ));
  }

  if(planTeachers.length){
    out.push(issueGroup(
      planTeachers.length+' docente(s) con planificación incompleta',
      planTeachers.map(issue=>issueLine(
        issue,
        `<strong>${esc(issue.name)}</strong><span>${esc(issue.fields.join(' · '))}</span>`
      ))
    ));
  }

  if(followTeachers.length){
    out.push(issueGroup(
      followTeachers.length+' docente(s) con seguimiento incompleto',
      followTeachers.map(issue=>issueLine(
        issue,
        `<strong>${esc(issue.name)}</strong><span>${esc(issue.fields.join(' · '))}</span>`
      ))
    ));
  }

  return `<div class="issue-list">${out.join('')}</div>`;
}

function issueTotal(issues){
  return issues.reduce((total,issue)=>{
    if((issue.kind==='career-program'||issue.kind==='coordinator')&&Array.isArray(issue.names)) return total+issue.names.length;
    return total+1;
  },0);
}

function docViewForType(type){
  return type==='dnf'?'doc-dnf':type==='plan'?'doc-plan':'doc-informe';
}

function focusCorrectionTarget(view,teacherId='',careerName=''){
  requestAnimationFrame(()=>{
    let target=null;
    if(view==='planificacion'&&teacherId) target=$(`[data-plan-row="${teacherId}"]`);
    if(view==='seguimiento'&&teacherId) target=$(`[data-follow-row="${teacherId}"]`);
    if(view==='carreras'&&careerName) target=$$('[data-career-name]').find(el=>el.value===careerName)?.closest('.catalog-row');
    if(view==='necesidades'&&careerName) target=$$('.coord-input').find(el=>el.dataset.career===careerName)?.closest('tr');
    if(target){
      target.classList.add('attention-target');
      target.scrollIntoView({behavior:'smooth',block:'center'});
      setTimeout(()=>target.classList.remove('attention-target'),2200);
    }
  });
}

function bindCorrectionActions(type,root=document){
  const back=docViewForType(type);
  const buttons=root.querySelectorAll ? [...root.querySelectorAll('[data-correct-view]')] : [];
  buttons.forEach(btn=>btn.onclick=()=>{
    const view=btn.dataset.correctView;
    const teacherId=btn.dataset.teacherId||'';
    const careerName=btn.dataset.careerName||'';
    const focusField=btn.dataset.focusField||'';
    if(view==='docentes'&&teacherId){
      setView('docentes');
      openTeacher(teacherId,back,focusField);
      return;
    }
    setView(view);
    focusCorrectionTarget(view,teacherId,careerName);
  });
}

function statusCard(type,title){
  const s=documentStatus(type);
  return `<div class="status-card simple-doc-card" data-status-type="${type}">
    <div class="status-head">
      <h3>${esc(title)}</h3>
      <span class="status-badge ${s.ready?'ready':'blocked'}">${s.ready?'Listo':'Pendiente'}</span>
    </div>
    ${s.ready
      ? `<div class="ready-message">Toda la información necesaria está completa.</div>
         <div class="doc-actions"><button class="primary" data-generate="${type}">Generar PDF</button></div>`
      : `<div class="missing-heading">${issueTotal(s.issues)} pendiente(s) por completar</div>${renderIssues(type,s.issues)}`}
  </div>`;
}

function completionAlert(type){
  const s=documentStatus(type);
  if(s.ready) return '<div class="alert-strip success"><div><strong>Documento listo</strong>La información mínima está completa.</div></div>';
  return `<div class="alert-strip warning"><div><strong>${issueTotal(s.issues)} pendiente(s)</strong>Guarda la corrección y vuelve al documento para verificar el estado.</div></div>`;
}

function renderHome(){
  $('#content').innerHTML = `
    <div class="simple-home-head">
      <h2>Documentos de Formación Docente</h2>
      <p>Selecciona un documento, corrige únicamente lo pendiente y genera el PDF cuando quede listo.</p>
    </div>
    <div class="status-grid simple-status-grid">
      ${statusCard('dnf','Detección de Necesidades de Formación')}
      ${statusCard('plan','Plan de Formación Docente')}
      ${statusCard('informe','Informe de Cumplimiento del Plan de Formación')}
    </div>`;
  bindCorrectionActions('dnf',$('[data-status-type="dnf"]'));
  bindCorrectionActions('plan',$('[data-status-type="plan"]'));
  bindCorrectionActions('informe',$('[data-status-type="informe"]'));
  $$('[data-generate]').forEach(b=>b.onclick=()=>generateDocument(b.dataset.generate));
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
  refreshPeriodMissingStyles();
  $('#content').querySelectorAll('[name]').forEach(el=>{
    el.addEventListener('input',refreshPeriodMissingStyles);
    el.addEventListener('change',refreshPeriodMissingStyles);
  });
  $('#savePeriod').onclick=async()=>{
    $('#content').querySelectorAll('[name]').forEach(el=>state.period[el.name]=el.name==='targetPercent'?n(el.value):el.value);
    await save(); toast('Período actualizado');
  };
}

function renderCareers() {
  $('#content').innerHTML = `
    <div class="alert-strip success"><div><strong>Catálogo precargado</strong>Estas son las carreras que aparecerán inmediatamente en la app. Puedes editar el tipo de programa o agregar nuevas carreras.</div></div>
    <div class="section-title">
      <div><h2>Carreras y programas</h2><p>${(state.careers||[]).length} carreras configuradas.</p></div>
      <button class="primary" id="addCareer">+ Agregar carrera</button>
    </div>
    <div class="card" id="careerCatalog">
      ${(state.careers||[]).map((cr,i)=>`<div class="catalog-row" data-career-row="${i}">
        <input data-career-name="${i}" value="${esc(cr.name)}" placeholder="Nombre de la carrera">
        <select data-career-program="${i}">${optionList(['Técnico Superior','Tecnología Superior','Tecnología Universitaria','Otro'],cr.program)}</select>
        <button class="danger remove-career" data-i="${i}">Eliminar</button>
      </div>`).join('')}
    </div>
    <div class="dialog-actions"><button class="primary" id="saveCareers">Guardar carreras</button></div>`;

  refreshCareerMissingStyles();
  $('[data-career-name],[data-career-program]').forEach(el=>{
    el.addEventListener('input',refreshCareerMissingStyles);
    el.addEventListener('change',refreshCareerMissingStyles);
  });

  $('#addCareer').onclick=()=>{
    let base='Nueva carrera', name=base, i=2;
    while(state.careers.some(c=>c.name===name)){ name=base+' '+i; i++; }
    state.careers.push({name,program:'Tecnología Superior'});
    ensureCoordination(name);
    renderCareers();
  };

  $$('.remove-career').forEach(b=>b.onclick=()=>{
    const i=Number(b.dataset.i), cr=state.careers[i];
    if(state.teachers.some(t=>t.carrera===cr.name)){ toast('No puedes eliminar una carrera que ya tiene docentes.'); return; }
    if(!confirm('¿Eliminar '+cr.name+'?')) return;
    state.careers.splice(i,1);
    state.coordinations=state.coordinations.filter(x=>x.carrera!==cr.name);
    renderCareers();
  });

  $('#saveCareers').onclick=async()=>{
    $$('[data-career-row]').forEach(row=>{
      const i=Number(row.dataset.careerRow);
      const old=state.careers[i].name;
      const name=norm(row.querySelector('[data-career-name]').value) || old;
      const program=row.querySelector('[data-career-program]').value || 'Por definir';
      if(old!==name){
        state.teachers.filter(t=>t.carrera===old).forEach(t=>t.carrera=name);
        const coord=state.coordinations.find(x=>x.carrera===old);
        if(coord) coord.carrera=name;
      }
      state.careers[i]={name,program};
      ensureCoordination(name);
    });
    await save();
    toast('Carreras actualizadas');
    renderCareers();
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
  return `<table class="table"><thead><tr><th>Cédula</th><th>Nombre</th><th>Carrera principal</th><th>Programa</th><th>Dedicación</th><th>Nivel actual</th><th>Deseado</th><th>Tipo</th><th></th></tr></thead><tbody>${
    state.teachers.map(t=>`<tr><td>${esc(t.cedula)}</td><td><strong>${esc(t.nombre)}</strong></td><td>${esc(t.carrera)}</td><td>${esc(programForCareer(t.carrera)||'Por definir')}</td><td>${esc(t.dedicacion)}</td><td>${esc(t.nivelActual)}</td><td>${esc(t.nivelDeseado)}</td><td>${esc(t.tipoFormacion)}</td><td class="right"><button class="ghost edit-teacher" data-id="${t.id}">Editar</button><button class="danger delete-teacher" data-id="${t.id}">Eliminar</button></td></tr>`).join('')
  }</tbody></table>`;
}

function openTeacher(teacherId=null,returnView=null,focusField=''){
  editingTeacherId=teacherId;
  teacherReturnView=returnView||null;
  const t=teacherId?teacherById(teacherId):{
    cedula:'',nombre:'',carrera:'',dedicacion:'Tiempo Completo',
    nivelActual:'',tituloActual:'',afinidad:'Sí',estudiaActualmente:'No',
    nivelCurso:'',programaCurso:'',institucionCurso:'',nivelDeseado:'',
    areaInteres:'',dispuesto:'Sí',tipoFormacion:'Específica',
    modalidadPreferida:'Virtual',inicioTentativo:'',barrera:'Ninguna',
    actualizacionReciente:'Sí'
  };
  $('#teacherDialogTitle').textContent=teacherId?'Editar docente':'Nuevo docente';
  const dialogHint=$('#teacherDialog .dialog-header p');
  if(dialogHint){
    dialogHint.textContent=teacherReturnView==='doc-dnf'
      ? 'Para la DNF solo se marcan en rojo los datos necesarios para detectar la necesidad de formación.'
      : 'Solo campos necesarios para los documentos.';
  }
  $('#teacherFields').innerHTML = [
    field('Cédula','cedula',t.cedula),
    field('Nombre completo','nombre',t.nombre),
    field('Carrera principal','carrera',validCareerName(t.carrera)?t.carrera:'','select',careerNames(),false,'Selecciona únicamente la carrera principal donde labora.'),
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
    field('Actualización reciente (opcional)','actualizacionReciente',t.actualizacionReciente,'select',['Sí','No'])
  ].join('');
  $('#teacherDialog').showModal();
  refreshTeacherMissingStyles();
  $('#teacherForm').querySelectorAll('[name]').forEach(el=>{
    el.addEventListener('input',refreshTeacherMissingStyles);
    el.addEventListener('change',refreshTeacherMissingStyles);
  });
  if(focusField){
    requestAnimationFrame(()=>{
      const el=$(`#teacherForm [name="${focusField}"]`);
      if(el){
        el.closest('.field')?.classList.add('needs-attention');
        el.focus();
      }
    });
  }
}

async function handleTeacherSubmit(e){
  e.preventDefault();
  const fd=new FormData(e.target);
  const obj=Object.fromEntries(fd.entries());
  if(!obj.cedula || !obj.nombre || !obj.carrera){toast('Completa cédula, nombre y carrera');return;}
  if(!validCareerName(obj.carrera)){toast('Selecciona una carrera principal válida');return;}
  const duplicate=state.teachers.find(t=>t.cedula===obj.cedula && t.id!==editingTeacherId);
  if(duplicate){toast('Ya existe un docente con esa cédula');return;}
  if(editingTeacherId) Object.assign(teacherById(editingTeacherId),obj);
  else state.teachers.push({id:id(),...obj});
  $('#teacherDialog').close();
  const back=teacherReturnView;
  teacherReturnView=null;
  await save();
  if(back) setView(back);
  else renderTeachers();
  toast('Docente guardado');
}

function closeTeacherDialog(){
  $('#teacherDialog').close();
  const back=teacherReturnView;
  teacherReturnView=null;
  if(back) setView(back);
}

$('#teacherForm').addEventListener('submit',handleTeacherSubmit);

$('#closeTeacher').onclick=$('#cancelTeacher').onclick=closeTeacherDialog;

function needSummary(career) {
  const list=state.teachers.filter(t=>careerKey(t.carrera)===careerKey(career));
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
function needId(career,index){
  return 'need_'+careerKey(career).replace(/[^a-z0-9]+/g,'_')+'_'+index;
}
function ensureNeedItems(career){
  const coord=ensureCoordination(career);
  if(!coord) return [];
  if(Array.isArray(coord.needItems)&&coord.needItems.length){
    coord.needItems=coord.needItems.map((item,i)=>({
      id:item.id||needId(career,i),
      text:norm(item.text),
      priorityOverride:norm(item.priorityOverride)
    })).filter(item=>item.text);
    return coord.needItems;
  }
  const legacy=norm(coord.needsOverride)
    ? coord.needsOverride.split('|').map(x=>norm(x)).filter(Boolean).slice(0,3)
    : needSummary(career);
  coord.needItems=legacy.map((text,i)=>({
    id:needId(career,i),
    text,
    priorityOverride:norm(coord.priorityOverride)
  }));
  return coord.needItems;
}
function autoPriorityForNeed(career,need){
  const list=state.teachers.filter(t=>careerKey(t.carrera)===careerKey(career));
  if(!list.length) return 'Baja';
  const target=norm(need).toLowerCase();
  let matches=0;
  if(target==='fortalecimiento de formación de cuarto nivel'){
    matches=list.filter(t=>!String(t.nivelActual).includes('Maestr') && t.nivelActual!=='Doctorado').length;
  }else if(target==='formación doctoral'){
    matches=list.filter(t=>t.nivelDeseado==='Doctorado').length;
  }else{
    matches=list.filter(t=>{
      const candidates=[t.areaInteres,t.programaCurso,t.nivelDeseado].map(x=>norm(x).toLowerCase()).filter(Boolean);
      return candidates.includes(target);
    }).length;
  }
  const ratio=matches/list.length;
  if(ratio>=0.5) return 'Alta';
  if(ratio>=0.25) return 'Media';
  return 'Baja';
}
function needsFor(career){
  return ensureNeedItems(career).map(x=>x.text);
}
function priorityFor(career){
  const rank={Alta:3,Media:2,Baja:1};
  const items=ensureNeedItems(career);
  if(!items.length) return 'Baja';
  return items.map(item=>item.priorityOverride||autoPriorityForNeed(career,item.text))
    .sort((a,b)=>rank[b]-rank[a])[0]||'Baja';
}

function renderDNF() {
  const s=stats();
  const careers=specificCareerNames();
  careers.forEach(name=>ensureNeedItems(name));
  $('#content').innerHTML = `
    ${completionAlert('dnf')}
    <div class="grid cards">
      ${metric('Total docentes',s.total)}
      ${metric('Con maestría',s.masters)}
      ${metric('Con doctorado',s.doctors)}
      ${metric('Dispuestos',s.willing)}
    </div>

    <div class="section-title"><div><h2>Coordinadores por carrera</h2><p>Este dato identifica al responsable de cada carrera. No define la necesidad de formación.</p></div></div>
    <div class="table-wrap">
      ${careers.length?`<table class="table needs-table"><thead><tr><th>Carrera</th><th>Coordinador</th></tr></thead><tbody>
      ${careers.map(name=>{const coord=ensureCoordination(name);return `<tr>
        <td><strong>${esc(name)}</strong></td>
        <td><input class="coord-input" data-career="${esc(name)}" value="${esc(coord?.coordinador||'')}" placeholder="Nombre del coordinador"></td>
      </tr>`}).join('')}</tbody></table>`:'<div class="empty">Carga docentes para identificar las carreras utilizadas.</div>'}
    </div>

    <div class="section-title"><div><h2>Necesidades específicas por carrera</h2><p>Las necesidades se obtienen de la información de los docentes. Cada necesidad tiene su propia prioridad.</p></div></div>
    <div class="table-wrap">
      ${careers.length?`<table class="table needs-table"><thead><tr><th>Carrera</th><th>Necesidad de formación</th><th>Prioridad sugerida</th><th>Prioridad final</th><th></th></tr></thead><tbody>
      ${careers.map(name=>{
        const items=ensureNeedItems(name);
        const rows=(items.length?items:[{id:needId(name,0),text:'',priorityOverride:''}]).map((item,i)=>{
          const suggested=item.text?autoPriorityForNeed(name,item.text):'Baja';
          return `<tr>
            <td><strong>${esc(name)}</strong>${i===items.length-1&&items.length<3?`<div class="inline-note"><button class="ghost add-need" data-career="${esc(name)}">+ Agregar necesidad</button></div>`:''}</td>
            <td><input class="need-item-input" data-career="${esc(name)}" data-need-id="${esc(item.id)}" value="${esc(item.text)}" placeholder="Necesidad requerida por la carrera"></td>
            <td><span class="pill ${suggested.toLowerCase()}">${suggested}</span></td>
            <td><select class="need-priority-input" data-career="${esc(name)}" data-need-id="${esc(item.id)}"><option value="">Automática</option>${['Alta','Media','Baja'].map(x=>'<option '+(item.priorityOverride===x?'selected':'')+'>'+x+'</option>').join('')}</select></td>
            <td>${items.length>1?`<button class="danger remove-need" data-career="${esc(name)}" data-need-id="${esc(item.id)}">Eliminar</button>`:''}</td>
          </tr>`;
        }).join('');
        return rows;
      }).join('')}</tbody></table>`:'<div class="empty">Carga docentes para generar las necesidades por carrera.</div>'}
    </div>

    <div class="section-title"><div><h2>Líneas genéricas institucionales</h2><p>Son líneas transversales y se gestionan de forma independiente a las necesidades específicas.</p></div><button class="secondary" id="addGeneric">+ Línea</button></div>
    <div class="card" id="genericList">
      ${state.settings.genericLines.map((g,i)=>`<div class="generic-line"><input data-generic="${i}" value="${esc(g)}"><button class="danger delete-generic" data-i="${i}">Eliminar</button></div>`).join('')}
    </div>`;

  refreshDNFMissingStyles();
  $('.coord-input,.need-item-input').forEach(el=>{
    el.addEventListener('input',refreshDNFMissingStyles);
    el.addEventListener('change',refreshDNFMissingStyles);
  });

  $('#addGeneric').onclick=()=>{state.settings.genericLines.push('Nueva línea genérica');save();renderDNF();};
  $$('.delete-generic').forEach(b=>b.onclick=()=>{state.settings.genericLines.splice(Number(b.dataset.i),1);save();renderDNF();});
  $$('[data-generic]').forEach(inp=>inp.onchange=()=>{state.settings.genericLines[Number(inp.dataset.generic)]=inp.value;save();});

  $$('.coord-input').forEach(inp=>inp.onchange=async()=>{
    const coord=ensureCoordination(inp.dataset.career);
    coord.coordinador=inp.value;
    await save();
  });

  $$('.need-item-input').forEach(inp=>inp.onchange=async()=>{
    const items=ensureNeedItems(inp.dataset.career);
    let item=items.find(x=>x.id===inp.dataset.needId);
    if(!item){
      item={id:inp.dataset.needId,text:'',priorityOverride:''};
      items.push(item);
    }
    item.text=norm(inp.value);
    const coord=ensureCoordination(inp.dataset.career);
    coord.needItems=items.filter(x=>x.text);
    coord.needsOverride='';
    coord.priorityOverride='';
    await save();
    renderDNF();
  });

  $$('.need-priority-input').forEach(sel=>sel.onchange=async()=>{
    const items=ensureNeedItems(sel.dataset.career);
    const item=items.find(x=>x.id===sel.dataset.needId);
    if(item) item.priorityOverride=sel.value;
    const coord=ensureCoordination(sel.dataset.career);
    coord.needItems=items;
    coord.priorityOverride='';
    await save();
  });

  $$('.add-need').forEach(btn=>btn.onclick=async()=>{
    const items=ensureNeedItems(btn.dataset.career);
    if(items.length>=3){toast('Máximo 3 necesidades por carrera');return;}
    items.push({id:needId(btn.dataset.career,Date.now()),text:'Nueva necesidad',priorityOverride:''});
    ensureCoordination(btn.dataset.career).needItems=items;
    await save();
    renderDNF();
  });

  $$('.remove-need').forEach(btn=>btn.onclick=async()=>{
    const coord=ensureCoordination(btn.dataset.career);
    coord.needItems=ensureNeedItems(btn.dataset.career).filter(x=>x.id!==btn.dataset.needId);
    await save();
    renderDNF();
  });
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
    ${completionAlert('plan')}
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
  refreshPlanMissingStyles();
  $('[data-p]').forEach(el=>{
    el.addEventListener('input',refreshPlanMissingStyles);
    el.addEventListener('change',refreshPlanMissingStyles);
  });
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
    ${completionAlert('informe')}
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
  refreshFollowupMissingStyles();
  $('[data-f]').forEach(el=>{
    el.addEventListener('input',refreshFollowupMissingStyles);
    el.addEventListener('change',refreshFollowupMissingStyles);
  });
  $('.evidence-btn').forEach(b=>b.onclick=async()=>{
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

function renderDocumentView(type){
  const s=documentStatus(type);
  $('#content').innerHTML = `
    <div class="status-card simple-doc-card single-document">
      <div class="status-head">
        <div class="missing-heading">${s.ready?'Documento completo':'Falta completar'}</div>
        <span class="status-badge ${s.ready?'ready':'blocked'}">${s.ready?'Listo':'Pendiente'}</span>
      </div>
      ${s.ready
        ? `<div class="ready-message">Toda la información requerida está completa.</div>
           <div class="doc-actions"><button class="primary" id="generateCurrent">Generar PDF</button></div>`
        : `<div class="issue-count">${issueTotal(s.issues)} pendiente(s) detectado(s)</div>${renderIssues(type,s.issues)}`}
    </div>`;
  bindCorrectionActions(type);
  if($('#generateCurrent')) $('#generateCurrent').onclick=()=>generateDocument(type);
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
  if(sheets.CARRERAS?.length){
    sheets.CARRERAS.forEach(r=>{
      ensureCareer(r.CARRERA||r.Carrera||r.carrera, r.PROGRAMA||r.Programa||r.programa);
    });
  }

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
    state.period.dnfCode=p.CODIGO_DNF||state.period.dnfCode;
    state.period.planCode=p.CODIGO_PLAN||state.period.planCode;
    state.period.reportCode=p.CODIGO_INFORME||state.period.reportCode;
  }

  if(sheets.DOCENTES?.length){
    const existing=new Map(state.teachers.map(t=>[String(t.cedula),t]));
    sheets.DOCENTES.forEach(r=>{
      const cedula=norm(r.CEDULA); if(!cedula)return;
      const carrera=norm(r.CARRERA_PRINCIPAL);
      if(carrera && validCareerName(carrera)) ensureCareer(carrera, r.PROGRAMA_CARRERA||'');
      const obj={
        cedula,nombre:norm(r.NOMBRE_COMPLETO),carrera,
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
      const carrera=norm(r.CARRERA); if(!carrera||!validCareerName(carrera))return;
      ensureCareer(carrera);
      const coord=ensureCoordination(carrera);
      coord.coordinador=norm(r.COORDINADOR)||coord.coordinador;

      // Compatibilidad con plantillas anteriores donde necesidades y coordinador estaban en la misma hoja.
      const legacyNeeds=norm(r.NECESIDADES);
      if(legacyNeeds){
        coord.needItems=legacyNeeds.split('|').map(x=>norm(x)).filter(Boolean).slice(0,3).map((text,i)=>({
          id:needId(carrera,i),
          text,
          priorityOverride:norm(r.PRIORIDAD_MANUAL)
        }));
        coord.needsOverride='';
        coord.priorityOverride='';
      }
    });
  }

  if(sheets.NECESIDADES?.length){
    const grouped=new Map();
    sheets.NECESIDADES.forEach(r=>{
      const carrera=norm(r.CARRERA);
      const necesidad=norm(r.NECESIDAD);
      if(!carrera||!necesidad||!validCareerName(carrera)) return;
      ensureCareer(carrera);
      const key=careerKey(carrera);
      if(!grouped.has(key)) grouped.set(key,{carrera,items:[]});
      grouped.get(key).items.push({
        id:needId(carrera,grouped.get(key).items.length),
        text:necesidad,
        priorityOverride:norm(r.PRIORIDAD_MANUAL)
      });
    });
    grouped.forEach(({carrera,items})=>{
      const coord=ensureCoordination(carrera);
      coord.needItems=items.slice(0,3);
      coord.needsOverride='';
      coord.priorityOverride='';
    });
  }

  ensurePlanRows();
  if(sheets.PLAN?.length){
    sheets.PLAN.forEach(r=>{
      const t=state.teachers.find(x=>String(x.cedula)===norm(r.CEDULA)); if(!t)return;
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
      const t=state.teachers.find(x=>String(x.cedula)===norm(r.CEDULA)); if(!t)return;
      let fol=followByTeacher(t.id);
      if(!fol){fol={teacherId:t.id,status:'No iniciado',realStart:'',plannedEnd:'',progress:0,evidenceTitle:'',evidencePath:'',abandoned:false};state.followup.push(fol);}
      Object.assign(fol,{
        status:norm(r.ESTADO)||fol.status,realStart:norm(r.FECHA_REAL_INICIO)||fol.realStart,
        plannedEnd:norm(r.FECHA_PREVISTA_FINALIZACION)||fol.plannedEnd,progress:n(r.PORCENTAJE_AVANCE),
        evidenceTitle:norm(r.TITULO_EVIDENCIA)||fol.evidenceTitle,evidencePath:norm(r.RUTA_EVIDENCIA)||fol.evidencePath,
        abandoned:yes(r.ABANDONO)
      });
    });
  }

  // También acepta hojas de seguimiento existentes como "forma.xlsx".
  const legacyRows=Object.values(sheets).find(rows=>Array.isArray(rows)&&rows.length&&(
    Object.prototype.hasOwnProperty.call(rows[0],'Docente') ||
    Object.prototype.hasOwnProperty.call(rows[0],'DOCENTE')
  ));
  if(legacyRows && !sheets.DOCENTES){
    const existing=new Map(state.teachers.map(t=>[String(t.cedula),t]));
    legacyRows.forEach(r=>{
      const cedula=norm(r['Cédula']??r.CEDULA); if(!cedula)return;
      const nombre=norm(r.Docente??r.DOCENTE);
      const carrera=norm(r['Unidad / carrera donde labora']??r.CARRERA_PRINCIPAL);
      if(carrera && validCareerName(carrera)) ensureCareer(carrera);

      let t=existing.get(cedula);
      if(!t){
        t={
          id:id(),cedula,nombre,carrera,dedicacion:'Tiempo Completo',
          nivelActual:'',tituloActual:norm(r['Título académico actual']),afinidad:'Sí',
          estudiaActualmente:norm(r['Formación en curso'])?'Sí':'No',
          nivelCurso:norm(r['Formación en curso']),programaCurso:norm(r['Carrera / programa que cursa']),
          institucionCurso:norm(r.Institución),nivelDeseado:norm(r['Formación en curso']),
          areaInteres:norm(r['Carrera / programa que cursa']),dispuesto:'Sí',tipoFormacion:'Específica',
          modalidadPreferida:norm(r.Modalidad)||'Virtual',inicioTentativo:'',barrera:'Ninguna',
          actualizacionReciente:'Sí'
        };
        state.teachers.push(t);existing.set(cedula,t);
      }

      ensurePlanRows();
      const pr=planByTeacher(t.id);
      if(pr){
        pr.selected=true;
        pr.level=norm(r['Formación en curso'])||pr.level;
        pr.program=norm(r['Carrera / programa que cursa'])||pr.program;
        pr.institution=norm(r.Institución)||pr.institution;
        pr.modality=norm(r.Modalidad)||pr.modality;
        pr.supportType=norm(r['Tipo de apoyo'])||pr.supportType;
        const amount=norm(r['Monto / horas']);
        if(/^\$?[\d.,]+$/.test(amount)) pr.supportAmount=amount.replace('$','');
      }

      ensureFollowRows();
      let fol=followByTeacher(t.id);
      if(!fol){fol={teacherId:t.id,status:'No iniciado',realStart:'',plannedEnd:'',progress:0,evidenceTitle:'',evidencePath:'',abandoned:false};state.followup.push(fol);}
      const rawProgress=n(r.Avance);
      fol.status=norm(r.Estado)||fol.status;
      fol.progress=rawProgress<=1?rawProgress*100:rawProgress;
      fol.evidenceTitle=norm(r['Evidencia presentada'])||fol.evidenceTitle;
    });
  }
  cleanupInvalidCareers();
  dedupeCareerState();
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
    <div class="h1">4. Necesidades específicas por carrera</div><p>Las necesidades específicas se obtienen de la información registrada por los docentes. La prioridad se determina para cada necesidad de manera independiente.</p>
    <table class="data"><tr><th>Carrera</th><th>Necesidad específica</th><th>Prioridad sugerida</th><th>Prioridad final</th></tr>${
      specificCareerNames().flatMap(career=>ensureNeedItems(career).map(item=>`<tr><td>${esc(career)}</td><td>${esc(item.text)}</td><td>${esc(autoPriorityForNeed(career,item.text))}</td><td>${esc(item.priorityOverride||autoPriorityForNeed(career,item.text))}</td></tr>`)).join('')
    }</table>
    <div class="h2">4.1 Coordinadores por carrera</div><p>Los coordinadores se registran como responsables administrativos de cada carrera y se mantienen separados de las necesidades de formación.</p>
    <table class="data"><tr><th>Carrera</th><th>Coordinador</th></tr>${
      specificCareerNames().map(career=>`<tr><td>${esc(career)}</td><td>${esc(ensureCoordination(career)?.coordinador||'Por definir')}</td></tr>`).join('')
    }</table>
    <div class="h2">4.2 Formación genérica institucional</div><p>Las siguientes líneas transversales se mantienen como catálogo editable para el período:</p><ul>${state.settings.genericLines.map(x=>'<li>'+esc(x)+'</li>').join('')}</ul>
    <div class="h1">5. Conclusiones</div>
    <p>El diagnóstico evidencia una base de ${total} docentes y permite diferenciar brechas por nivel académico, carrera, disposición y tipo de formación. Las prioridades generadas deben utilizarse como insumo directo para la selección y planificación del Plan de Formación Docente.</p>
    <div class="h1">6. Recomendaciones</div><p>Priorizar las carreras con brecha Alta, aprovechar la disposición declarada de los docentes y mantener rutas diferenciadas para formación específica y genérica, evitando duplicar información entre el diagnóstico y el Plan.</p>
    <div class="h1">7. Anexo: Base consolidada</div>
    <table class="data"><tr><th>Docente</th><th>Carrera</th><th>Programa</th><th>Nivel actual</th><th>Nivel deseado</th><th>Tipo</th><th>Modalidad</th></tr>${
      state.teachers.map(t=>`<tr><td>${esc(t.nombre)}</td><td>${esc(t.carrera)}</td><td>${esc(programForCareer(t.carrera)||'Por definir')}</td><td>${esc(t.nivelActual)}</td><td>${esc(t.nivelDeseado)}</td><td>${esc(t.tipoFormacion)}</td><td>${esc(t.modalidadPreferida)}</td></tr>`).join('')
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
$('#btnFirebase').onclick=updateFromFirebase;
$('#closeFirebase').onclick=$('#closeFirebaseBottom').onclick=()=>$('#firebaseDialog').close();

(async function init(){
  const loaded=await window.docformacion.loadData();
  if(loaded && !loaded.__error){
    state={...defaultState(),...loaded};
    state.period={...defaultState().period,...(loaded.period||{})};
    state.settings={...defaultState().settings,...(loaded.settings||{})};
    state.integrations={
      ...defaultState().integrations,
      ...(loaded.integrations||{}),
      firebase:{...defaultState().integrations.firebase,...(loaded.integrations?.firebase||{})}
    };
    state.careers=(loaded.careers?.length?loaded.careers:defaultState().careers).map(x=>({...x}));
    state.coordinations=(loaded.coordinations||[]).map(x=>({...x,needItems:Array.isArray(x.needItems)?x.needItems:[]}));
    dedupeCareerState();
    const previousCoords=[...state.coordinations];
    state.coordinations=state.careers.map(cr=>({
      carrera:cr.name,
      coordinador:'',
      priorityOverride:'',
      needsOverride:'',
      needItems:[],
      ...(previousCoords.find(x=>careerKey(x.carrera)===careerKey(cr.name))||{})
    }));
    previousCoords.filter(x=>
      !state.coordinations.some(c=>c.carrera===x.carrera) &&
      (loaded.teachers||[]).some(t=>t.carrera===x.carrera)
    ).forEach(x=>{
      if(!state.careers.some(cr=>cr.name===x.carrera)) state.careers.push({name:x.carrera,program:'Por definir'});
      state.coordinations.push({...x});
    });
    state.teachers=loaded.teachers||[];
    state.plan=loaded.plan||[];
    state.followup=loaded.followup||[];
  }
  const cleanedInvalidCareers=cleanupInvalidCareers();
  const dedupedCareers=dedupeCareerState();
  if(cleanedInvalidCareers||dedupedCareers) await save();
  render();
})();
