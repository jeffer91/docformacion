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

function documentCodeFromDate(rgi,date){
  const value=norm(date);
  const match=value.match(/^(\d{4})-(\d{2})/);
  if(!match) return '';
  return 'UGPA-RGI'+rgi+'-01-PRO-31-'+match[1]+'-'+match[2];
}

function syncPeriodCodes(period){
  if(!period) return;
  period.dnfCode=documentCodeFromDate(1,period.elaborationDate);
  period.planCode=documentCodeFromDate(2,period.elaborationDate);
  period.reportCode=documentCodeFromDate(3,period.elaborationDate);
}

function defaultState() {
  const elaborationDate=new Date().toISOString().slice(0,10);
  return {
    period: {
      start: '',
      end: '',
      elaborationDate,
      version: '1.0',
      preparedBy: 'MSc. Jefferson Villarreal',
      preparedRole: 'Gestor de Procesos Académicos',
      reviewedBy: 'Ing. Martha Tomalá',
      reviewedRole: 'Coordinación General de Carreras',
      approvedBy: 'Dr. Alex León T.',
      approvedRole: 'Vicerrector',
      targetPercent: 10,
      dnfCode: documentCodeFromDate(1,elaborationDate),
      planCode: documentCodeFromDate(2,elaborationDate),
      reportCode: documentCodeFromDate(3,elaborationDate)
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
    approvedBy:!norm(root.querySelector('[name="approvedBy"]')?.value)
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
function dnfCareerNames(){
  const seen=new Set();
  const out=[];
  [...(state.careers||[]).map(x=>x.name),...(state.coordinations||[]).map(x=>x.carrera)].forEach(name=>{
    if(!validCareerName(name)) return;
    const key=careerKey(name);
    if(seen.has(key)) return;
    seen.add(key);
    out.push((state.careers||[]).find(cr=>careerKey(cr.name)===key)?.name||name);
  });
  return out;
}

function ensureCareer(name, program=''){
  const clean=norm(name);
  if(!clean || !validCareerName(clean)) return;
  const key=careerKey(clean);
  let existing=state.careers.find(c=>careerKey(c.name)===key);
  if(!existing){
    existing={name:clean,program:norm(program)||'Por definir'};
    state.careers.push(existing);
  }else if(norm(program)){
    existing.program=norm(program);
  }
  ensureCoordination(existing.name);
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

function teacherCriticalEntriesForDNF(t){
  const missing=[];
  if(!norm(t.cedula)) missing.push({key:'cedula',label:'Cédula'});
  if(!norm(t.nombre)) missing.push({key:'nombre',label:'Nombre'});
  if(!norm(t.carrera)) missing.push({key:'carrera',label:'Carrera principal'});
  else if(!validCareerName(t.carrera)) missing.push({key:'carrera',label:'Carrera principal válida'});
  return missing;
}

function teacherWarningEntriesForDNF(t){
  const missing=[];
  const required=[
    ['dedicacion','Dedicación'],
    ['nivelActual','Nivel académico actual'],
    ['afinidad','Afinidad del título'],
    ['estudiaActualmente','¿Estudia actualmente?'],
    ['nivelDeseado','Nivel que desea alcanzar'],
    ['areaInteres','Área o programa de interés'],
    ['dispuesto','Disposición para estudiar'],
    ['tipoFormacion','Tipo de formación'],
    ['modalidadPreferida','Modalidad preferida'],
    ['barrera','Barrera principal']
  ];
  required.forEach(([key,label])=>{if(!norm(t[key])) missing.push({key,label});});
  if(t.estudiaActualmente==='Sí'){
    if(!norm(t.nivelCurso)) missing.push({key:'nivelCurso',label:'Nivel de formación en curso'});
    if(!norm(t.programaCurso)) missing.push({key:'programaCurso',label:'Programa en curso'});
    if(!norm(t.institucionCurso)) missing.push({key:'institucionCurso',label:'Institución de estudio'});
  }
  return missing;
}

function teacherMissingEntriesForDNF(t){
  return teacherCriticalEntriesForDNF(t);
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
  return miss;
}

function documentStatus(type){
  const issues=periodMissing(type).map(text=>({kind:'period',text,view:'periodo'}));
  const careersInUse=type==='dnf'
    ? dnfCareerNames()
    : [...new Set(state.teachers.map(t=>t.carrera).filter(validCareerName))];

  if(type!=='dnf' && !state.teachers.length){
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

  const warnings=[];

  if(type==='dnf' && !careersInUse.length){
    issues.push({kind:'career-empty',text:'Configurar al menos una carrera institucional',view:'carreras'});
  }

  if(type!=='dnf'){
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
    const needsWithoutPriority=careersInUse.flatMap(name=>
      ensureNeedItems(name)
        .filter(item=>norm(item.text)&&!norm(item.priorityOverride))
        .map(item=>({career:name,item}))
    );
    if(needsWithoutPriority.length){
      issues.push({
        kind:'need-priority',
        count:needsWithoutPriority.length,
        text:needsWithoutPriority.length+' necesidad(es) sin prioridad definida',
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

  return {ready:issues.length===0,missing:issues.map(x=>x.text),issues,warnings};
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

function issueGroup(title,items,type='',templateKind=''){
  const template=templateKind?issueTemplateButton(type,templateKind):'';
  const upload=templateKind?issueUploadButton(type,templateKind):'';
  return `<details class="issue-group">
    <summary>
      <span>${esc(title)}</span>
      <span class="issue-group-actions">${template}${upload}<span class="issue-group-hint">Ver y corregir</span></span>
    </summary>
    <div class="issue-group-body">${items.join('')}</div>
  </details>`;
}

function issueLine(issue,description,buttonLabel='Corregir',type='',templateKind=''){
  const template=templateKind?issueTemplateButton(type,templateKind):'';
  const upload=templateKind?issueUploadButton(type,templateKind):'';
  return `<div class="issue-line">
    <div class="issue-line-text">${description}</div>
    <div class="issue-line-actions">${template}${upload}${issueButton(issue,buttonLabel)}</div>
  </div>`;
}

function renderIssues(type,issues){
  const out=[];
  const teachers=issues.filter(x=>x.kind==='teacher');
  const planTeachers=issues.filter(x=>x.kind==='plan-teacher');
  const followTeachers=issues.filter(x=>x.kind==='follow-teacher');
  const groupedKinds=new Set(['teacher','plan-teacher','follow-teacher','career-program','career-needs','coordinator']);

  issues.filter(x=>!groupedKinds.has(x.kind)).forEach(issue=>{
    out.push(issueLine(
      issue,
      esc(issue.text),
      'Corregir en '+correctionLabel(issue.view),
      type,
      issue.kind
    ));
  });

  if(teachers.length){
    out.push(issueGroup(
      teachers.length+' docente(s) con información incompleta',
      teachers.map(issue=>issueLine(
        issue,
        '<strong>'+esc(issue.name)+'</strong><span>'+esc(issue.fields.map(x=>x.label).join(' · '))+'</span>'
      )),
      type,
      'teacher'
    ));
  }

  const careerProgram=issues.find(x=>x.kind==='career-program');
  if(careerProgram){
    out.push(issueGroup(
      careerProgram.names.length+' carrera(s) sin programa',
      careerProgram.names.map(name=>issueLine(
        {view:'carreras',careerName:name},
        '<strong>'+esc(name)+'</strong><span>Programa sin definir</span>'
      )),
      type,
      'career-program'
    ));
  }

  const careerNeeds=issues.find(x=>x.kind==='career-needs');
  if(careerNeeds){
    out.push(issueGroup(
      careerNeeds.names.length+' carrera(s) sin necesidad de formación',
      careerNeeds.names.map(name=>issueLine(
        {view:'necesidades',careerName:name},
        '<strong>'+esc(name)+'</strong><span>Definir al menos una necesidad de formación</span>'
      )),
      type,
      'career-needs'
    ));
  }

  const coordinators=issues.find(x=>x.kind==='coordinator');
  if(coordinators){
    out.push(issueGroup(
      coordinators.names.length+' carrera(s) sin coordinador',
      coordinators.names.map(name=>issueLine(
        {view:'necesidades',careerName:name},
        '<strong>'+esc(name)+'</strong><span>Coordinador sin definir</span>'
      )),
      type,
      'coordinator'
    ));
  }

  if(planTeachers.length){
    out.push(issueGroup(
      planTeachers.length+' docente(s) con planificación incompleta',
      planTeachers.map(issue=>issueLine(
        issue,
        '<strong>'+esc(issue.name)+'</strong><span>'+esc(issue.fields.join(' · '))+'</span>'
      )),
      type,
      'plan-teacher'
    ));
  }

  if(followTeachers.length){
    out.push(issueGroup(
      followTeachers.length+' docente(s) con seguimiento incompleto',
      followTeachers.map(issue=>issueLine(
        issue,
        '<strong>'+esc(issue.name)+'</strong><span>'+esc(issue.fields.join(' · '))+'</span>'
      )),
      type,
      'follow-teacher'
    ));
  }

  return '<div class="issue-list">'+out.join('')+'</div>';
}
function renderWarnings(warnings){
  if(!warnings?.length) return '';
  const teachers=warnings.filter(x=>x.kind==='teacher-warning');
  if(!teachers.length) return '';
  return `<div class="warning-card">
    <div class="warning-title">Observaciones de calidad de datos</div>
    <div class="warning-text">${teachers.length} docente(s) tienen campos diagnósticos sin completar. Puedes generar la DNF; esos valores aparecerán como “Sin información”.</div>
    ${issueGroup(
      teachers.length+' docente(s) con información diagnóstica pendiente',
      teachers.map(issue=>issueLine(
        issue,
        `<strong>${esc(issue.name)}</strong><span>${esc(issue.fields.map(x=>x.label).join(' · '))}</span>`,
        'Completar'
      ))
    )}
  </div>`;
}

function issueTotal(issues){
  return issues.reduce((total,issue)=>{
    if(Number.isFinite(Number(issue.count)) && Number(issue.count)>0) return total+Number(issue.count);
    if(Array.isArray(issue.names) && issue.names.length) return total+issue.names.length;
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

  const templateButtons=root.querySelectorAll ? [...root.querySelectorAll('[data-issue-template]')] : [];
  templateButtons.forEach(btn=>btn.onclick=(event)=>{
    event.preventDefault();
    event.stopPropagation();
    exportIssueTemplate(btn.dataset.issueType||type,btn.dataset.issueTemplate);
  });

  const uploadButtons=root.querySelectorAll ? [...root.querySelectorAll('[data-issue-upload]')] : [];
  uploadButtons.forEach(btn=>btn.onclick=(event)=>{
    event.preventDefault();
    event.stopPropagation();
    importIssueExcel(btn.dataset.issueType||type,btn.dataset.issueUpload);
  });

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
  const hasWarnings=type==='dnf'?false:!!s.warnings?.length;
  return `<div class="status-card simple-doc-card" data-status-type="${type}">
    <div class="status-head">
      <h3>${esc(title)}</h3>
      <span class="status-badge ${s.ready?'ready':'blocked'}">${s.ready?(hasWarnings?'Listo con observaciones':'Listo'):'Pendiente'}</span>
    </div>
    ${s.ready
      ? `<div class="ready-message">${hasWarnings?'La información crítica está completa; existen observaciones de calidad de datos.':'Toda la información necesaria está completa.'}</div>
         ${renderWarnings(s.warnings)}
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
  syncPeriodCodes(p);
  $('#content').innerHTML = `
    <div class="section-title">
      <div><h2>Datos generales del período</h2><p>Completa manualmente o usa la plantilla Excel de esta sección.</p></div>
      ${excelActions('periodo')}
    </div>
    <div class="card">
      <div class="notice">Los códigos documentales se generan automáticamente con la fecha de elaboración. No necesitas escribirlos manualmente.</div>
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
        <div class="field"><label>Código DNF</label><input name="dnfCode" value="${esc(p.dnfCode)}" readonly class="auto-code"><span class="hint">Automático según fecha de elaboración.</span></div>
        <div class="field"><label>Código Plan</label><input name="planCode" value="${esc(p.planCode)}" readonly class="auto-code"><span class="hint">Automático según fecha de elaboración.</span></div>
        <div class="field"><label>Código Informe</label><input name="reportCode" value="${esc(p.reportCode)}" readonly class="auto-code"><span class="hint">Automático según fecha de elaboración.</span></div>
      </div>
      <div class="dialog-actions"><button class="primary" id="savePeriod">Guardar</button></div>
    </div>`;

  const updateCodesFromDate=()=>{
    const date=$('#content').querySelector('[name="elaborationDate"]')?.value||'';
    const codes={
      dnfCode:documentCodeFromDate(1,date),
      planCode:documentCodeFromDate(2,date),
      reportCode:documentCodeFromDate(3,date)
    };
    Object.entries(codes).forEach(([name,value])=>{
      const input=$('#content').querySelector('[name="'+name+'"]');
      if(input) input.value=value;
    });
    refreshPeriodMissingStyles();
  };

  bindExcelActions('periodo',$('#content'));
  refreshPeriodMissingStyles();
  $('#content').querySelectorAll('[name]').forEach(el=>{
    el.addEventListener('input',()=>{
      if(el.name==='elaborationDate') updateCodesFromDate();
      else refreshPeriodMissingStyles();
    });
    el.addEventListener('change',()=>{
      if(el.name==='elaborationDate') updateCodesFromDate();
      else refreshPeriodMissingStyles();
    });
  });

  $('#savePeriod').onclick=async()=>{
    $('#content').querySelectorAll('[name]').forEach(el=>{
      state.period[el.name]=el.name==='targetPercent'?n(el.value):el.value;
    });
    syncPeriodCodes(state.period);
    await save();
    renderPeriod();
    toast('Período actualizado');
  };
}

function renderCareers() {
  $('#content').innerHTML = `
    <div class="alert-strip success"><div><strong>Catálogo precargado</strong>Estas son las carreras que aparecerán inmediatamente en la app. Puedes editar el tipo de programa o agregar nuevas carreras.</div></div>
    <div class="section-title">
      <div><h2>Carreras y programas</h2><p>${(state.careers||[]).length} carreras configuradas.</p></div>
      <div class="toolbar">${excelActions('carreras')}<button class="primary" id="addCareer">+ Agregar carrera</button></div>
    </div>
    <div class="card" id="careerCatalog">
      ${(state.careers||[]).map((cr,i)=>`<div class="catalog-row" data-career-row="${i}">
        <input data-career-name="${i}" value="${esc(cr.name)}" placeholder="Nombre de la carrera">
        <select data-career-program="${i}">${optionList(['Técnico Superior','Tecnología Superior','Tecnología Universitaria','Otro'],cr.program)}</select>
        <button class="danger remove-career" data-i="${i}">Eliminar</button>
      </div>`).join('')}
    </div>
    <div class="dialog-actions"><button class="primary" id="saveCareers">Guardar carreras</button></div>`;

  bindExcelActions('carreras',$('#content'));
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
      <div class="toolbar">${excelActions('docentes')}<button class="primary" id="addTeacher">+ Nuevo docente</button></div>
    </div>
    <div class="table-wrap">
      ${state.teachers.length?teacherTable():'<div class="empty">Todavía no hay docentes. Puedes agregarlos por formulario o importar el Excel global.</div>'}
    </div>`;
  $('#addTeacher').onclick=()=>openTeacher();
  bindExcelActions('docentes',$('#content'));
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
    : [];
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
  const careers=dnfCareerNames();
  careers.forEach(name=>ensureNeedItems(name));
  const allNeeds=careers.flatMap(name=>ensureNeedItems(name).filter(item=>norm(item.text)));
  const highPriority=allNeeds.filter(item=>item.priorityOverride==='Alta').length;
  const genericCount=(state.settings.genericLines||[]).filter(norm).length;
  $('#content').innerHTML = `
    ${completionAlert('dnf')}
    <div class="section-title">
      <div><h2>Carga Excel de la DNF</h2><p>Descarga las hojas de coordinaciones, necesidades y líneas genéricas, complétalas y vuelve a importarlas.</p></div>
      ${excelActions('dnf')}
    </div>
    <div class="grid cards">
      ${metric('Carreras configuradas',careers.length)}
      ${metric('Necesidades específicas',allNeeds.length)}
      ${metric('Prioridad alta',highPriority)}
      ${metric('Líneas genéricas',genericCount)}
    </div>

    <div class="section-title"><div><h2>Coordinadores por carrera</h2><p>Este dato identifica al responsable de cada carrera. No define la necesidad de formación.</p></div></div>
    <div class="table-wrap">
      ${careers.length?`<table class="table needs-table"><thead><tr><th>Carrera</th><th>Coordinador</th></tr></thead><tbody>
      ${careers.map(name=>{const coord=ensureCoordination(name);return `<tr>
        <td><strong>${esc(name)}</strong></td>
        <td><input class="coord-input" data-career="${esc(name)}" value="${esc(coord?.coordinador||'')}" placeholder="Nombre del coordinador"></td>
      </tr>`}).join('')}</tbody></table>`:'<div class="empty">Configura las carreras institucionales para registrar coordinadores y necesidades.</div>'}
    </div>

    <div class="section-title"><div><h2>Necesidades específicas por carrera</h2><p>Las necesidades se registran directamente por carrera. No se requieren nombres ni fichas individuales de docentes para completar este documento.</p></div></div>
    <div class="table-wrap">
      ${careers.length?`<table class="table needs-table"><thead><tr><th>Carrera</th><th>Necesidad de formación</th><th>Prioridad</th><th></th></tr></thead><tbody>
      ${careers.map(name=>{
        const items=ensureNeedItems(name);
        const rows=(items.length?items:[{id:needId(name,0),text:'',priorityOverride:''}]).map((item,i)=>{
          return `<tr>
            <td><strong>${esc(name)}</strong>${i===items.length-1&&items.length<3?`<div class="inline-note"><button class="ghost add-need" data-career="${esc(name)}">+ Agregar necesidad</button></div>`:''}</td>
            <td><input class="need-item-input" data-career="${esc(name)}" data-need-id="${esc(item.id)}" value="${esc(item.text)}" placeholder="Necesidad requerida por la carrera"></td>
            <td><select class="need-priority-input" data-career="${esc(name)}" data-need-id="${esc(item.id)}"><option value="">Seleccionar prioridad</option>${['Alta','Media','Baja'].map(x=>'<option '+(item.priorityOverride===x?'selected':'')+'>'+x+'</option>').join('')}</select></td>
            <td>${items.length>1?`<button class="danger remove-need" data-career="${esc(name)}" data-need-id="${esc(item.id)}">Eliminar</button>`:''}</td>
          </tr>`;
        }).join('');
        return rows;
      }).join('')}</tbody></table>`:'<div class="empty">Configura las carreras institucionales para registrar sus necesidades de formación.</div>'}
    </div>

    <div class="section-title"><div><h2>Líneas genéricas institucionales</h2><p>Son líneas transversales y se gestionan de forma independiente a las necesidades específicas.</p></div><button class="secondary" id="addGeneric">+ Línea</button></div>
    <div class="card" id="genericList">
      ${state.settings.genericLines.map((g,i)=>`<div class="generic-line"><input data-generic="${i}" value="${esc(g)}"><button class="danger delete-generic" data-i="${i}">Eliminar</button></div>`).join('')}
    </div>`;

  bindExcelActions('dnf',$('#content'));
  refreshDNFMissingStyles();
  $('.coord-input,.need-item-input,.need-priority-input').forEach(el=>{
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
    <div class="section-title">
      <div><h2>Carga Excel del Plan</h2><p>La plantilla usa las cédulas de la base interna para completar la planificación masivamente.</p></div>
      ${excelActions('plan')}
    </div>
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
  bindExcelActions('plan',$('#content'));
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
    <div class="section-title">
      <div><h2>Carga Excel de seguimiento</h2><p>Descarga la plantilla con los docentes seleccionados en el Plan y completa estado, avance y evidencia.</p></div>
      ${excelActions('seguimiento')}
    </div>
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
  bindExcelActions('seguimiento',$('#content'));
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
  const hasWarnings=type==='dnf'?false:!!s.warnings?.length;
  $('#content').innerHTML = `
    <div class="status-card simple-doc-card single-document">
      <div class="status-head">
        <div class="missing-heading">${s.ready?(hasWarnings?'Documento listo con observaciones':'Documento completo'):'Falta completar'}</div>
        <span class="status-badge ${s.ready?'ready':'blocked'}">${s.ready?(hasWarnings?'Listo con observaciones':'Listo'):'Pendiente'}</span>
      </div>
      ${s.ready
        ? `<div class="ready-message">${hasWarnings?'La información crítica está completa. Las observaciones no bloquean la generación del documento.':'Toda la información requerida está completa.'}</div>
           ${renderWarnings(s.warnings)}
           <div class="doc-actions"><button class="primary" id="generateCurrent">Generar PDF</button></div>`
        : `<div class="issue-count">${issueTotal(s.issues)} pendiente(s) detectado(s)</div>${renderIssues(type,s.issues)}`}
    </div>`;
  bindCorrectionActions(type);
  if($('#generateCurrent')) $('#generateCurrent').onclick=()=>generateDocument(type);
}


function excelSheetSpec(name,headers,descriptions,rows,widths){
  return {name,headers,descriptions,rows:rows||[],widths:widths||[]};
}

function excelTemplatePayload(scope,includeData){
  scope=scope||'global';
  includeData=!!includeData;
  const p=state.period;
  const blank=(headers)=>headers.map(()=>'');
  const periodHeaders=['PERIODO_INICIO','PERIODO_FIN','FECHA_ELABORACION','VERSION','ELABORADO_POR','CARGO_ELABORADO','REVISADO_POR','CARGO_REVISADO','APROBADO_POR','CARGO_APROBADO','META_FORMACION_PORCENTAJE'];
  const periodDesc=['Fecha inicio del período (AAAA-MM-DD).','Fecha fin del período (AAAA-MM-DD).','Fecha de elaboración (AAAA-MM-DD).','Versión, por ejemplo 1.0.','Nombre de quien elabora.','Cargo de quien elabora.','Nombre de quien revisa.','Cargo de quien revisa.','Nombre de quien aprueba.','Cargo de quien aprueba.','Meta institucional en porcentaje, solo número.'];
  const periodRows=includeData?[[p.start,p.end,p.elaborationDate,p.version,p.preparedBy,p.preparedRole,p.reviewedBy,p.reviewedRole,p.approvedBy,p.approvedRole,p.targetPercent]]:[blank(periodHeaders)];

  const careerHeaders=['CARRERA','PROGRAMA'];
  const careerDesc=['Nombre oficial de la carrera institucional.','Técnico Superior, Tecnología Superior, Tecnología Universitaria u Otro.'];
  const careerRows=(state.careers||[]).map(cr=>[cr.name,cr.program]);
  if(!careerRows.length) careerRows.push(blank(careerHeaders));

  const coordHeaders=['CARRERA','COORDINADOR'];
  const coordDesc=['Carrera oficial. Debe coincidir con CARRERAS.','Nombre completo del coordinador responsable.'];
  const coordRows=dnfCareerNames().map(name=>[name,includeData?(ensureCoordination(name)?.coordinador||''):'']);
  if(!coordRows.length) coordRows.push(blank(coordHeaders));

  const needHeaders=['CARRERA','NECESIDAD','PRIORIDAD_MANUAL'];
  const needDesc=['Carrera a la que corresponde la necesidad.','Necesidad de formación concreta. Máximo 3 por carrera.','Prioridad obligatoria: Alta, Media o Baja.'];
  let needRows=[];
  if(includeData){
    needRows=dnfCareerNames().flatMap(name=>ensureNeedItems(name).map(item=>[name,item.text,item.priorityOverride]));
  }else{
    needRows=dnfCareerNames().map(name=>[name,'','']);
  }
  if(!needRows.length) needRows.push(blank(needHeaders));

  const genericHeaders=['LINEA_GENERICA'];
  const genericDesc=['Línea transversal institucional. Una línea por fila.'];
  const genericRows=includeData?(state.settings.genericLines||[]).filter(norm).map(x=>[x]):[['']];

  const teacherHeaders=['CEDULA','NOMBRE_COMPLETO','CARRERA_PRINCIPAL','DEDICACION','NIVEL_ACADEMICO_ACTUAL','TITULO_ACADEMICO_ACTUAL','AFIN_TITULO_CARRERA','ESTUDIA_ACTUALMENTE','NIVEL_FORMACION_EN_CURSO','PROGRAMA_EN_CURSO','INSTITUCION_ESTUDIO','NIVEL_QUE_DESEA_ALCANZAR','AREA_O_PROGRAMA_INTERES','DISPUESTO_A_ESTUDIAR','TIPO_FORMACION','MODALIDAD_PREFERIDA','INICIO_TENTATIVO_MES_ANIO','BARRERA_PRINCIPAL','ACTUALIZACION_RECIENTE'];
  const teacherDesc=['Cédula sin espacios ni guiones.','Nombres y apellidos completos.','Carrera principal donde labora.','Tiempo Completo, Medio Tiempo o Tiempo Parcial.','Nivel académico actual.','Título académico actual.','Sí o No.','Sí o No.','Solo si estudia actualmente.','Programa que cursa actualmente.','Institución donde cursa estudios.','Nivel que desea alcanzar.','Área o programa de interés.','Sí o No.','Específica o Genérica.','Presencial, Virtual o Híbrida.','Mes/año, por ejemplo 2026-10.','Ninguna, Económica, Tiempo, Carga laboral, Falta de oferta, Personal u Otra.','Sí o No.'];
  const teacherRows=includeData?state.teachers.map(t=>[t.cedula,t.nombre,t.carrera,t.dedicacion,t.nivelActual,t.tituloActual,t.afinidad,t.estudiaActualmente,t.nivelCurso,t.programaCurso,t.institucionCurso,t.nivelDeseado,t.areaInteres,t.dispuesto,t.tipoFormacion,t.modalidadPreferida,t.inicioTentativo,t.barrera,t.actualizacionReciente]):[blank(teacherHeaders)];

  ensurePlanRows();
  const planHeaders=['CEDULA','INCLUIR_EN_PLAN','NIVEL_PLANIFICADO','PROGRAMA_PLANIFICADO','INSTITUCION','MODALIDAD','FECHA_INICIO_PLANIFICADA','FECHA_FIN_PLANIFICADA','TIPO_APOYO','MONTO_APOYO','CONVENIO','EFECTO_MULTIPLICADOR_PREVISTO'];
  const planDesc=['Cédula de un docente existente en DOCENTES.','Sí o No.','Nivel proyectado.','Programa proyectado.','Institución prevista.','Presencial, Virtual o Híbrida.','Fecha inicio AAAA-MM-DD.','Fecha fin AAAA-MM-DD.','Sin apoyo, Económico, Tiempo o Ambos.','Monto numérico si aplica.','Convenio, si aplica.','Resultado o transferencia institucional prevista.'];
  let planRows;
  if(includeData){
    planRows=state.plan.map(pr=>{const t=teacherById(pr.teacherId);return [t?.cedula||'',pr.selected?'Sí':'No',pr.level,pr.program,pr.institution,pr.modality,pr.plannedStart,pr.plannedEnd,pr.supportType,pr.supportAmount,pr.convenio,pr.multiplier];});
  }else{
    planRows=state.teachers.length?state.teachers.map(t=>[t.cedula,'','','','','','','','','','','']):[blank(planHeaders)];
  }

  ensureFollowRows();
  const followHeaders=['CEDULA','ESTADO','FECHA_REAL_INICIO','FECHA_PREVISTA_FINALIZACION','PORCENTAJE_AVANCE','TITULO_EVIDENCIA','RUTA_EVIDENCIA','ABANDONO'];
  const followDesc=['Cédula del docente incluido en el Plan.','No iniciado, En proceso, Finalizado o Suspendido.','Fecha real de inicio AAAA-MM-DD.','Fecha prevista de finalización AAAA-MM-DD.','Porcentaje de 0 a 100.','Nombre descriptivo de la evidencia.','Nombre o ruta del archivo.','Sí o No.'];
  const selected=state.plan.filter(pr=>pr.selected);
  let followRows;
  if(includeData){
    followRows=selected.map(pr=>{const t=teacherById(pr.teacherId),f=followByTeacher(pr.teacherId)||{};return [t?.cedula||'',f.status||'',f.realStart||'',f.plannedEnd||pr.plannedEnd||'',f.progress||0,f.evidenceTitle||'',f.evidencePath||'',f.abandoned?'Sí':'No'];});
  }else{
    followRows=selected.length?selected.map(pr=>{const t=teacherById(pr.teacherId);return [t?.cedula||'','','',pr.plannedEnd||'','','','',''];}):[blank(followHeaders)];
  }

  const specs={
    periodo:excelSheetSpec('PERIODO',periodHeaders,periodDesc,periodRows,[16,16,18,10,24,24,24,28,24,22,24]),
    carreras:excelSheetSpec('CARRERAS',careerHeaders,careerDesc,careerRows,[42,28]),
    docentes:excelSheetSpec('DOCENTES',teacherHeaders,teacherDesc,teacherRows,[16,30,42,18,26,34,20,22,28,34,30,30,36,24,20,22,24,24,24]),
    coordinaciones:excelSheetSpec('COORDINACIONES',coordHeaders,coordDesc,coordRows,[42,32]),
    necesidades:excelSheetSpec('NECESIDADES',needHeaders,needDesc,needRows,[42,54,22]),
    genericas:excelSheetSpec('LINEAS_GENERICAS',genericHeaders,genericDesc,genericRows,[60]),
    plan:excelSheetSpec('PLAN',planHeaders,planDesc,planRows,[16,20,28,40,34,20,24,24,22,18,30,42]),
    seguimiento:excelSheetSpec('SEGUIMIENTO',followHeaders,followDesc,followRows,[16,20,24,30,24,34,42,16])
  };

  const ayuda=excelSheetSpec('INSTRUCCIONES',['PASO','INDICACION'],['Número de paso.','Indicaciones generales.'],[
    ['1','No cambies nombres de hojas ni encabezados de la fila 1.'],
    ['2','La fila 2 contiene explicaciones y la app la ignora automáticamente.'],
    ['3','Completa o agrega datos desde la fila 3.'],
    ['4','Para DNF usa COORDINACIONES, NECESIDADES y LINEAS_GENERICAS; no se requieren nombres de docentes.'],
    ['5','Importa el archivo desde la misma sección o con Importar Excel global.']
  ],[12,90]);

  const map={
    periodo:[specs.periodo],
    carreras:[specs.carreras],
    docentes:[specs.docentes],
    dnf:[specs.coordinaciones,specs.necesidades,specs.genericas],
    plan:[specs.plan],
    seguimiento:[specs.seguimiento],
    global:[ayuda,specs.periodo,specs.carreras,specs.coordinaciones,specs.necesidades,specs.genericas,specs.docentes,specs.plan,specs.seguimiento]
  };
  const filenames={periodo:'Plantilla_Periodo.xlsx',carreras:'Plantilla_Carreras.xlsx',docentes:'Plantilla_Docentes.xlsx',dnf:'Plantilla_DNF.xlsx',plan:'Plantilla_Plan_Formacion.xlsx',seguimiento:'Plantilla_Seguimiento.xlsx',global:'FORMACION_DOCENTE_GLOBAL.xlsx'};
  return {filename:(includeData?'Datos_Actuales_':'')+filenames[scope],sheets:map[scope]||map.global};
}


function cloneExcelSheetSpec(spec){
  return {
    name:spec.name,
    headers:[...(spec.headers||[])],
    descriptions:[...(spec.descriptions||[])],
    rows:(spec.rows||[]).map(row=>[...row]),
    widths:[...(spec.widths||[])]
  };
}

function issueExcelTemplatePayload(type,kind){
  const status=documentStatus(type);
  const issue=status.issues.find(x=>x.kind===kind);
  const getSheet=(payload,name)=>cloneExcelSheetSpec(payload.sheets.find(s=>s.name===name));

  if(kind==='career-needs'){
    const names=issue?.names||[];
    const sheet=getSheet(excelTemplatePayload('dnf',false),'NECESIDADES');
    sheet.rows=names.map(name=>[name,'','']);
    return {filename:'Pendientes_DNF_Necesidades.xlsx',sheets:[sheet]};
  }

  if(kind==='coordinator'){
    const names=issue?.names||[];
    const sheet=getSheet(excelTemplatePayload('dnf',false),'COORDINACIONES');
    sheet.rows=names.map(name=>[name,'']);
    return {filename:'Pendientes_DNF_Coordinadores.xlsx',sheets:[sheet]};
  }

  if(kind==='need-priority'){
    const sheet=getSheet(excelTemplatePayload('dnf',true),'NECESIDADES');
    sheet.rows=dnfCareerNames().flatMap(name=>
      ensureNeedItems(name)
        .filter(item=>norm(item.text)&&!norm(item.priorityOverride))
        .map(item=>[name,item.text,''])
    );
    return {filename:'Pendientes_DNF_Prioridades.xlsx',sheets:[sheet]};
  }

  if(kind==='generic'){
    const sheet=getSheet(excelTemplatePayload('dnf',false),'LINEAS_GENERICAS');
    sheet.rows=[['']];
    return {filename:'Pendiente_DNF_Lineas_Genericas.xlsx',sheets:[sheet]};
  }

  if(kind==='career-empty'){
    return {...excelTemplatePayload('carreras',false),filename:'Pendiente_Carreras.xlsx'};
  }

  if(kind==='career-program'){
    const names=new Set(issue?.names||[]);
    const sheet=getSheet(excelTemplatePayload('carreras',true),'CARRERAS');
    sheet.rows=(state.careers||[])
      .filter(cr=>names.has(cr.name))
      .map(cr=>[cr.name,'']);
    return {filename:'Pendientes_Programas_Carreras.xlsx',sheets:[sheet]};
  }

  if(kind==='period'){
    return {...excelTemplatePayload('periodo',true),filename:'Pendientes_Datos_Generales.xlsx'};
  }

  if(kind==='teachers-empty'){
    return {...excelTemplatePayload('docentes',false),filename:'Pendiente_Base_Docentes.xlsx'};
  }

  if(kind==='teacher'){
    const ids=new Set(status.issues.filter(x=>x.kind==='teacher').map(x=>x.teacherId));
    const cedulas=new Set(state.teachers.filter(t=>ids.has(t.id)).map(t=>String(t.cedula)));
    const sheet=getSheet(excelTemplatePayload('docentes',true),'DOCENTES');
    sheet.rows=sheet.rows.filter(row=>cedulas.has(String(row[0]||'')));
    return {filename:'Pendientes_Docentes.xlsx',sheets:[sheet]};
  }

  if(kind==='plan-empty'){
    return {...excelTemplatePayload('plan',false),filename:'Pendiente_Plan_Formacion.xlsx'};
  }

  if(kind==='plan-teacher'){
    const ids=new Set(status.issues.filter(x=>x.kind==='plan-teacher').map(x=>x.teacherId));
    const cedulas=new Set(state.teachers.filter(t=>ids.has(t.id)).map(t=>String(t.cedula)));
    const sheet=getSheet(excelTemplatePayload('plan',true),'PLAN');
    sheet.rows=sheet.rows.filter(row=>cedulas.has(String(row[0]||'')));
    return {filename:'Pendientes_Plan_Formacion.xlsx',sheets:[sheet]};
  }

  if(kind==='follow-teacher'){
    const ids=new Set(status.issues.filter(x=>x.kind==='follow-teacher').map(x=>x.teacherId));
    const cedulas=new Set(state.teachers.filter(t=>ids.has(t.id)).map(t=>String(t.cedula)));
    const sheet=getSheet(excelTemplatePayload('seguimiento',true),'SEGUIMIENTO');
    sheet.rows=sheet.rows.filter(row=>cedulas.has(String(row[0]||'')));
    return {filename:'Pendientes_Seguimiento.xlsx',sheets:[sheet]};
  }

  return excelTemplatePayload(type==='dnf'?'dnf':type==='plan'?'plan':'seguimiento',false);
}

function issueTemplateButton(type,kind,label='Descargar plantilla'){
  return '<button type="button" class="secondary compact issue-template-btn" data-issue-template="'+esc(kind)+'" data-issue-type="'+esc(type)+'">'+esc(label)+'</button>';
}

function issueUploadButton(type,kind,label='Subir plantilla'){
  return '<button type="button" class="primary compact issue-upload-btn" data-issue-upload="'+esc(kind)+'" data-issue-type="'+esc(type)+'">'+esc(label)+'</button>';
}

async function exportIssueTemplate(type,kind){
  const payload=issueExcelTemplatePayload(type,kind);
  const r=await window.docformacion.exportExcelTemplate(payload);
  if(r?.ok) toast('Plantilla de pendientes descargada');
  else if(r?.error) toast('Error: '+r.error);
}


let pendingExcelImport=null;

function excelImportContext(scope,kind=''){
  const kindMap={
    'career-needs':{label:'Necesidades de formación pendientes',sheet:'NECESIDADES'},
    'coordinator':{label:'Coordinadores pendientes',sheet:'COORDINACIONES'},
    'need-priority':{label:'Prioridades de necesidades pendientes',sheet:'NECESIDADES'},
    'generic':{label:'Líneas genéricas',sheet:'LINEAS_GENERICAS'},
    'career-empty':{label:'Carreras institucionales',sheet:'CARRERAS'},
    'career-program':{label:'Programas de carrera pendientes',sheet:'CARRERAS'},
    'period':{label:'Datos generales del período',sheet:'PERIODO'},
    'teachers-empty':{label:'Base de docentes',sheet:'DOCENTES'},
    'teacher':{label:'Datos docentes pendientes',sheet:'DOCENTES'},
    'plan-empty':{label:'Planificación de formación',sheet:'PLAN'},
    'plan-teacher':{label:'Planificación docente pendiente',sheet:'PLAN'},
    'follow-teacher':{label:'Seguimiento pendiente',sheet:'SEGUIMIENTO'}
  };
  if(kind && kindMap[kind]) return {...kindMap[kind],scope,kind};

  const scopeMap={
    global:{label:'Carga global',sheets:['PERIODO','CARRERAS','COORDINACIONES','NECESIDADES','LINEAS_GENERICAS','DOCENTES','PLAN','SEGUIMIENTO']},
    periodo:{label:'Datos generales del período',sheets:['PERIODO']},
    carreras:{label:'Carreras',sheets:['CARRERAS']},
    docentes:{label:'Docentes',sheets:['DOCENTES']},
    dnf:{label:'Detección de Necesidades',sheets:['COORDINACIONES','NECESIDADES','LINEAS_GENERICAS']},
    plan:{label:'Plan de Formación',sheets:['PLAN']},
    seguimiento:{label:'Seguimiento',sheets:['SEGUIMIENTO']}
  };
  return {...(scopeMap[scope]||scopeMap.global),scope,kind:''};
}

function excelIssuePendingSet(type,kind){
  const status=documentStatus(type);
  const issue=status.issues.find(x=>x.kind===kind);
  if(kind==='career-needs'||kind==='coordinator'||kind==='career-program'){
    return new Set((issue?.names||[]).map(x=>careerKey(x)));
  }
  if(kind==='teacher'||kind==='plan-teacher'||kind==='follow-teacher'){
    const targetIds=new Set(status.issues.filter(x=>x.kind===kind).map(x=>x.teacherId));
    return new Set(state.teachers.filter(t=>targetIds.has(t.id)).map(t=>String(t.cedula)));
  }
  return new Set();
}

function rowPreviewValues(row){
  return Object.entries(row||{})
    .filter(([,value])=>norm(value)!=='')
    .slice(0,4)
    .map(([key,value])=>({key,value:String(value)}));
}


const EXCEL_MODULES={
  PERIODO:{module:'periodo',label:'Datos generales',view:'periodo'},
  CARRERAS:{module:'carreras',label:'Carreras',view:'carreras'},
  COORDINACIONES:{module:'dnf',label:'Detección de Necesidades',view:'necesidades'},
  NECESIDADES:{module:'dnf',label:'Detección de Necesidades',view:'necesidades'},
  LINEAS_GENERICAS:{module:'dnf',label:'Detección de Necesidades',view:'necesidades'},
  DOCENTES:{module:'docentes',label:'Docentes',view:'docentes'},
  PLAN:{module:'plan',label:'Plan de Formación',view:'planificacion'},
  SEGUIMIENTO:{module:'seguimiento',label:'Seguimiento',view:'seguimiento'}
};

function workbookModuleInfo(sheetNames){
  const recognized=sheetNames
    .filter(name=>EXCEL_MODULES[name])
    .map(name=>({sheet:name,...EXCEL_MODULES[name]}));
  const modules=[...new Map(recognized.map(x=>[x.module,x])).values()];
  return {recognized,modules};
}

function excelScopeLabel(scope){
  return {
    periodo:'Datos generales',
    carreras:'Carreras',
    docentes:'Docentes',
    dnf:'Detección de Necesidades',
    plan:'Plan de Formación',
    seguimiento:'Seguimiento',
    global:'Carga global'
  }[scope]||'este apartado';
}

function analyzeExcelImport(scope,result,type='',kind=''){
  const context=excelImportContext(scope,kind);
  const sheets=result?.sheets||{};
  const detected=Object.keys(sheets).filter(name=>Array.isArray(sheets[name])&&sheets[name].length);
  const allowed=context.sheet?[context.sheet]:(context.sheets||[]);
  const required=context.sheet?[context.sheet]:[];
  const moduleInfo=workbookModuleInfo(detected);
  const compatibleSheets=scope==='global'
    ? detected.filter(name=>EXCEL_MODULES[name])
    : detected.filter(name=>allowed.includes(name));
  const incompatibleSheets=scope==='global'
    ? detected.filter(name=>!EXCEL_MODULES[name])
    : detected.filter(name=>EXCEL_MODULES[name]&&!allowed.includes(name));
  const unknownSheets=detected.filter(name=>!EXCEL_MODULES[name]);

  const mismatch=scope!=='global' && compatibleSheets.length===0 && moduleInfo.recognized.length>0;
  const detectedDestination=mismatch && moduleInfo.modules.length===1
    ? moduleInfo.modules[0]
    : null;

  const pendingSet=kind?excelIssuePendingSet(type,kind):new Set();
  const priorities=new Set(['Alta','Media','Baja']);
  const accepted={};
  const preview=[];
  let totalRows=0,validRows=0,ignoredRows=0,errorRows=0,matchedRows=0;

  const accept=(sheet,row,status,reason,matched=true)=>{
    const valid=status==='Aplicar'||status==='Actualizar';
    totalRows++;
    if(valid){
      validRows++;
      if(matched) matchedRows++;
      if(!accepted[sheet]) accepted[sheet]=[];
      accepted[sheet].push(row);
    }else{
      ignoredRows++;
      if(status==='Error') errorRows++;
    }
    preview.push({sheet,row,status,valid,reason});
  };

  compatibleSheets.forEach(sheet=>{
    const rows=Array.isArray(sheets[sheet])?sheets[sheet]:[];
    rows.forEach(row=>{
      if(!kind){
        const nonEmpty=Object.values(row||{}).some(v=>norm(v)!=='');
        accept(sheet,row,nonEmpty?'Aplicar':'Omitir',nonEmpty?'Registro reconocido':'Fila vacía',nonEmpty);
        return;
      }

      if(kind==='career-needs'){
        const carrera=norm(row.CARRERA),need=norm(row.NECESIDAD),priority=norm(row.PRIORIDAD_MANUAL);
        const matches=pendingSet.has(careerKey(carrera));
        if(!matches){accept(sheet,row,'Omitir','La carrera no está entre las pendientes',false);return;}
        if(!need){accept(sheet,row,'Error','Falta NECESIDAD',true);return;}
        if(!priorities.has(priority)){accept(sheet,row,'Error','PRIORIDAD_MANUAL debe ser Alta, Media o Baja',true);return;}
        accept(sheet,row,'Aplicar','Nueva necesidad lista para registrar',true);
        return;
      }
      if(kind==='coordinator'){
        const carrera=norm(row.CARRERA),coord=norm(row.COORDINADOR);
        const matches=pendingSet.has(careerKey(carrera));
        if(!matches){accept(sheet,row,'Omitir','La carrera no está entre las pendientes',false);return;}
        if(!coord){accept(sheet,row,'Error','Falta COORDINADOR',true);return;}
        accept(sheet,row,'Aplicar','Coordinador listo para registrar',true);
        return;
      }
      if(kind==='need-priority'){
        const carrera=norm(row.CARRERA),need=norm(row.NECESIDAD),priority=norm(row.PRIORIDAD_MANUAL);
        const existing=ensureNeedItems(carrera).some(item=>norm(item.text)===need&&!norm(item.priorityOverride));
        if(!existing){accept(sheet,row,'Omitir','No coincide con una necesidad pendiente',false);return;}
        if(!priorities.has(priority)){accept(sheet,row,'Error','Prioridad inválida',true);return;}
        accept(sheet,row,'Actualizar','Se completará la prioridad de la necesidad',true);
        return;
      }
      if(kind==='generic'){
        const line=norm(row.LINEA_GENERICA);
        accept(sheet,row,line?'Aplicar':'Error',line?'Línea genérica lista para registrar':'Falta LINEA_GENERICA',!!line);
        return;
      }
      if(kind==='career-program'){
        const carrera=norm(row.CARRERA),program=norm(row.PROGRAMA);
        const matches=pendingSet.has(careerKey(carrera));
        if(!matches){accept(sheet,row,'Omitir','La carrera no está entre las pendientes',false);return;}
        if(!program){accept(sheet,row,'Error','Falta PROGRAMA',true);return;}
        accept(sheet,row,'Actualizar','Se completará el programa de la carrera',true);
        return;
      }
      if(kind==='career-empty'){
        const carrera=norm(row.CARRERA),program=norm(row.PROGRAMA);
        if(!carrera){accept(sheet,row,'Error','Falta CARRERA',false);return;}
        if(!validCareerName(carrera)){accept(sheet,row,'Error','Nombre de carrera no válido',false);return;}
        if(!program){accept(sheet,row,'Error','Falta PROGRAMA',false);return;}
        accept(sheet,row,'Aplicar','Carrera lista para registrar',true);
        return;
      }
      if(kind==='period'){
        const valid=Object.values(row||{}).some(v=>norm(v)!=='');
        accept(sheet,row,valid?'Actualizar':'Omitir',valid?'Se actualizarán los datos generales':'Fila vacía',valid);
        return;
      }
      if(kind==='teachers-empty'||kind==='teacher'){
        const cedula=norm(row.CEDULA),nombre=norm(row.NOMBRE_COMPLETO),carrera=norm(row.CARRERA_PRINCIPAL);
        const matches=kind==='teachers-empty'||pendingSet.has(cedula);
        if(!matches){accept(sheet,row,'Omitir','Docente no está entre los pendientes',false);return;}
        if(!cedula){accept(sheet,row,'Error','Falta CEDULA',true);return;}
        if(!nombre){accept(sheet,row,'Error','Falta NOMBRE_COMPLETO',true);return;}
        if(!carrera){accept(sheet,row,'Error','Falta CARRERA_PRINCIPAL',true);return;}
        accept(sheet,row,kind==='teacher'?'Actualizar':'Aplicar',kind==='teacher'?'Se actualizará el docente pendiente':'Docente listo para registrar',true);
        return;
      }
      if(kind==='plan-empty'||kind==='plan-teacher'){
        const cedula=norm(row.CEDULA);
        const matches=kind==='plan-empty'||pendingSet.has(cedula);
        if(!matches){accept(sheet,row,'Omitir','Docente no está entre los pendientes',false);return;}
        if(!cedula){accept(sheet,row,'Error','Falta CEDULA',true);return;}
        accept(sheet,row,'Actualizar','Se actualizará la planificación',true);
        return;
      }
      if(kind==='follow-teacher'){
        const cedula=norm(row.CEDULA);
        const matches=pendingSet.has(cedula);
        if(!matches){accept(sheet,row,'Omitir','Docente no está entre los pendientes',false);return;}
        if(!cedula){accept(sheet,row,'Error','Falta CEDULA',true);return;}
        accept(sheet,row,'Actualizar','Se actualizará el seguimiento',true);
        return;
      }

      const fallback=Object.values(row||{}).some(v=>norm(v)!=='');
      accept(sheet,row,fallback?'Aplicar':'Omitir',fallback?'Registro reconocido':'Fila vacía',fallback);
    });
  });

  const expectedCount=kind && ['career-needs','coordinator','career-program','teacher','plan-teacher','follow-teacher'].includes(kind)
    ? pendingSet.size
    : 0;
  const errors=[];
  const warnings=[];

  if(!detected.length){
    errors.push('El archivo no contiene hojas con datos.');
  }else if(mismatch){
    const detectedLabel=moduleInfo.modules.map(x=>x.label).join(' + ');
    errors.push(
      'Este archivo corresponde a '+detectedLabel+
      ' y no a '+excelScopeLabel(scope)+'.'
    );
    errors.push(
      'En este apartado se admiten únicamente: '+allowed.join(', ')+'.'
    );
  }else if(required.length && !compatibleSheets.length){
    errors.push('Este bloque espera la hoja '+required.join(', ')+'.');
  }else if(!compatibleSheets.length){
    errors.push('El archivo no contiene ninguna hoja compatible con '+excelScopeLabel(scope)+'.');
  }

  if(!errors.length && validRows===0){
    errors.push('No se encontraron filas completas que puedan aplicarse.');
  }
  if(errorRows){
    warnings.push(errorRows+' fila(s) contienen errores y no se aplicarán.');
  }
  const omittedOnly=Math.max(0,ignoredRows-errorRows);
  if(omittedOnly){
    warnings.push(omittedOnly+' fila(s) se omitirán porque no corresponden a los pendientes actuales o están vacías.');
  }
  if(expectedCount && matchedRows<expectedCount){
    warnings.push('El archivo resolvería '+matchedRows+' de '+expectedCount+' pendiente(s) de este bloque.');
  }
  if(!mismatch && incompatibleSheets.length){
    warnings.push('Se ignorarán hojas de otros módulos: '+incompatibleSheets.join(', ')+'.');
  }
  if(unknownSheets.length){
    warnings.push('Se ignorarán hojas no reconocidas: '+unknownSheets.join(', ')+'.');
  }

  const safeSheets={};
  Object.entries(accepted).forEach(([name,rows])=>{if(rows.length)safeSheets[name]=rows;});

  return {
    context,
    filePath:result?.filePath||'Archivo Excel',
    detected,
    allowed,
    compatibleSheets,
    incompatibleSheets,
    totalRows,
    validRows,
    ignoredRows,
    errorRows,
    matchedRows,
    expectedCount,
    errors,
    warnings,
    safeSheets,
    preview:preview.slice(0,16),
    mismatch,
    detectedDestination
  };
}
function excelAnalysisTable(preview){
  if(!preview.length) return '<div class="excel-analysis-empty">No hay filas compatibles para previsualizar.</div>';
  return '<div class="excel-analysis-table-wrap"><table class="excel-analysis-table"><thead><tr><th>Hoja</th><th>Datos detectados</th><th>Estado</th></tr></thead><tbody>'+
    preview.map(item=>{
      const values=rowPreviewValues(item.row);
      const data=values.length?values.map(x=>'<span><strong>'+esc(x.key)+':</strong> '+esc(x.value)+'</span>').join(''):'<span>Fila vacía</span>';
      const cls=item.status==='Aplicar'?'ok':item.status==='Actualizar'?'update':item.status==='Error'?'error':'bad';
      return '<tr><td>'+esc(item.sheet)+'</td><td class="excel-preview-values">'+data+'</td><td><span class="excel-row-status '+cls+'">'+esc(item.status)+'</span><div class="excel-row-reason">'+esc(item.reason)+'</div></td></tr>';
    }).join('')+
  '</tbody></table></div>';
}
function openExcelAnalysisDialog(scope,result,type='',kind=''){
  const analysis=analyzeExcelImport(scope,result,type,kind);
  pendingExcelImport={scope,type,kind,analysis,sheets:analysis.safeSheets};
  const filename=String(analysis.filePath||'').split(/[\\/]/).pop()||'Archivo Excel';

  $('#excelAnalysisTitle').textContent=analysis.mismatch
    ? 'Archivo de otro módulo'
    : 'Analizar plantilla antes de importar';
  $('#excelAnalysisSubtitle').textContent=analysis.context.label+' · '+filename;

  const detectedText=analysis.detected.length?analysis.detected.join(', '):'Ninguna';
  $('#excelAnalysisSummary').innerHTML=
    '<div class="excel-analysis-kpis">'+
      '<div><strong>'+analysis.detected.length+'</strong><span>Hojas detectadas</span></div>'+
      '<div><strong>'+analysis.totalRows+'</strong><span>Filas leídas</span></div>'+
      '<div><strong>'+analysis.validRows+'</strong><span>Filas aplicables</span></div>'+
      '<div><strong>'+analysis.ignoredRows+'</strong><span>Filas no aplicables</span></div>'+
    '</div>'+
    '<div class="excel-match-progress"><strong>Hojas encontradas:</strong> '+esc(detectedText)+'</div>'+
    (analysis.expectedCount?'<div class="excel-match-progress"><strong>Coincidencia con pendientes:</strong> '+analysis.matchedRows+' de '+analysis.expectedCount+'</div>':'')+
    (analysis.errors.length?'<div class="excel-analysis-message error"><strong>'+(analysis.mismatch?'Archivo no compatible con este apartado.':'No se puede aplicar todavía.')+'</strong><ul>'+analysis.errors.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></div>':'')+
    (analysis.warnings.length?'<div class="excel-analysis-message warning"><strong>Observaciones del análisis</strong><ul>'+analysis.warnings.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul></div>':'')+
    (!analysis.errors.length?'<div class="excel-analysis-message success"><strong>Archivo reconocido.</strong> Revisa la vista previa y confirma para guardar los cambios.</div>':'');

  $('#excelAnalysisPreview').innerHTML=excelAnalysisTable(analysis.preview);

  const apply=$('#applyExcelAnalysis');
  apply.disabled=!!analysis.errors.length||analysis.validRows===0;
  apply.textContent=analysis.validRows?'Aplicar '+analysis.validRows+' registro(s)':'Aplicar datos';

  const go=$('#goExcelModule');
  if(analysis.mismatch && analysis.detectedDestination){
    go.hidden=false;
    go.dataset.view=analysis.detectedDestination.view;
    go.textContent='Ir a '+analysis.detectedDestination.label;
  }else{
    go.hidden=true;
    go.dataset.view='';
    go.textContent='Ir al módulo correcto';
  }

  $('#excelAnalysisDialog').showModal();
}
function closeExcelAnalysisDialog(){
  pendingExcelImport=null;
  if($('#excelAnalysisDialog')?.open) $('#excelAnalysisDialog').close();
}

function applySpecificExcelImport(kind,sheets){
  if(kind==='need-priority' && sheets.NECESIDADES?.length){
    sheets.NECESIDADES.forEach(row=>{
      const carrera=norm(row.CARRERA);
      const necesidad=norm(row.NECESIDAD);
      const prioridad=norm(row.PRIORIDAD_MANUAL);
      if(!carrera||!necesidad||!['Alta','Media','Baja'].includes(prioridad)) return;
      const item=ensureNeedItems(carrera).find(x=>norm(x.text)===necesidad);
      if(item) item.priorityOverride=prioridad;
    });
    return;
  }

  if(kind==='career-needs' && sheets.NECESIDADES?.length){
    const grouped=new Map();
    sheets.NECESIDADES.forEach(row=>{
      const carrera=norm(row.CARRERA);
      const necesidad=norm(row.NECESIDAD);
      const prioridad=norm(row.PRIORIDAD_MANUAL);
      if(!carrera||!necesidad||!['Alta','Media','Baja'].includes(prioridad)) return;
      const key=careerKey(carrera);
      if(!grouped.has(key)) grouped.set(key,{carrera,items:[]});
      grouped.get(key).items.push({
        id:needId(carrera,grouped.get(key).items.length),
        text:necesidad,
        priorityOverride:prioridad
      });
    });
    grouped.forEach(({carrera,items})=>{
      const coord=ensureCoordination(carrera);
      const existing=ensureNeedItems(carrera);
      const merged=[...existing];
      items.forEach(item=>{
        const current=merged.find(x=>norm(x.text)===norm(item.text));
        if(current) Object.assign(current,item);
        else if(merged.length<3) merged.push(item);
      });
      coord.needItems=merged.slice(0,3);
      coord.needsOverride='';
      coord.priorityOverride='';
    });
    return;
  }

  applyExcel(sheets||{});
}

async function confirmExcelAnalysis(){
  if(!pendingExcelImport) return;
  const {type,scope,kind,sheets}=pendingExcelImport;
  const before=type?issueTotal(documentStatus(type).issues):null;
  applySpecificExcelImport(kind,sheets||{});
  await save();
  const after=type?issueTotal(documentStatus(type).issues):null;
  closeExcelAnalysisDialog();
  render();
  if(before!==null && after!==null){
    const resolved=Math.max(0,before-after);
    toast('Importación aplicada · '+resolved+' pendiente(s) resuelto(s) · '+after+' restante(s)');
  }else{
    toast(scope==='global'?'Excel global aplicado correctamente':'Excel aplicado correctamente');
  }
}

async function importIssueExcel(type,kind){
  const r=await window.docformacion.importExcel();
  if(!r) return;
  if(!r.ok){toast('Error al leer el Excel: '+r.error);return;}
  openExcelAnalysisDialog(type==='dnf'?'dnf':type==='plan'?'plan':'seguimiento',r,type,kind);
}

function excelActions(scope){
  return '<div class="toolbar excel-toolbar">'+
    '<button class="secondary" data-excel-template="'+scope+'">Descargar plantilla</button>'+
    '<button class="secondary" data-excel-current="'+scope+'">Exportar datos actuales</button>'+
    '<button class="primary" data-excel-import="'+scope+'">Importar Excel</button>'+
  '</div>';
}

function bindExcelActions(scope,root){
  root=root||document;
  root.querySelectorAll('[data-excel-template="'+scope+'"]').forEach(btn=>btn.onclick=()=>exportTemplate(scope,false));
  root.querySelectorAll('[data-excel-current="'+scope+'"]').forEach(btn=>btn.onclick=()=>exportTemplate(scope,true));
  root.querySelectorAll('[data-excel-import="'+scope+'"]').forEach(btn=>btn.onclick=()=>importExcel(scope));
}

async function exportTemplate(scope,includeData){
  scope=scope||'global';
  const r=await window.docformacion.exportExcelTemplate(excelTemplatePayload(scope,!!includeData));
  if(r?.ok) toast(includeData?'Datos actuales exportados':'Plantilla Excel creada');
  else if(r?.error) toast('Error: '+r.error);
}
async function importExcel(scope){
  scope=scope||'global';
  const r=await window.docformacion.importExcel();
  if(!r) return;
  if(!r.ok){toast('Error al leer el Excel: '+r.error);return;}
  openExcelAnalysisDialog(scope,r,'','');
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
    syncPeriodCodes(state.period);
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

  if(sheets.LINEAS_GENERICAS?.length){
    state.settings.genericLines=sheets.LINEAS_GENERICAS
      .map(r=>norm(r.LINEA_GENERICA))
      .filter(Boolean);
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

const INSTITUTION_LOGO_DATA="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCABPANwDASIAAhEBAxEB/8QAHAAAAgMAAwEAAAAAAAAAAAAAAAUDBAYBAgcI/8QASBAAAgEDAgQDBAUIBggHAAAAAQIDBAURACEGEhMxIkFRBxRhcRUjMoGRNEJSYnJ1obIzNZWxs8EWFyQlN5LR4kNVZHN0w/D/xAAZAQEBAQEBAQAAAAAAAAAAAAAAAQIDBAX/xAAqEQACAgIBAgQFBQAAAAAAAAAAAQIRAyESMVEEQXGhMmGRwfATFCIjM//aAAwDAQACEQMRAD8AmuPGK2KgtLXCq4iq6mupPeXeG6GNRl2XAGP1dL/9aFB+hxT/AG1/26Qcefk3C/7pH+NJrHa3Rmz6U4Mhg4wsC3WO6cRUqmV4+m90Zj4T3yBrQ/6Hp/5/f/7RbXzpwvxVxVRCGzWS6vTRO7OEEasATux+yT5a0acU+0GUusXEvO6ozcogAzgZ/Q2/67alFs1PHHEFJwVeYbdLVcS1bSwCfnS7FQMsRjBHw1mf9aFB+hxT/bX/AG6wN64gunEdXHV3asaqnSMRq7KowuScbAeZOlurRLPovgm7tda+zV9NV3YU9bFWLJT1tYZxmMxgEbfrHTjh27Xas9oHEdqqrgZaK2iHoJ0UUnqLnxMBvj4Y1kvZV+QcLfs3L+eLWk4V/wCK/G/ypP8ADOsso/mtfENRcKmdeIDS0zP9TTx0kb8igAbswySTk/DOs5wvWcS8QVN9hk4hMX0bcHpEKUUR51UDc5899eh6wHs1/rLjL9+Tf3DQDW43S68JcE3O5XOojuNVS8zRydMRK4LAJzBe2MjPy1I9rvzUcFVTcSTS1WUd0MEXQkXILBRy5AIzg8xPbvp7cbfTXW3VFBWRCWmqIzHIh81OvNKKpvXsvulJa7lM9x4UqphBS1bf0lGxPhV/h/8AhjtoU2vEV+mt1RQWu3RxzXa4uyU6SZ5I1UZeR8b8qjyHckDQeHq2SLml4kunvOP6SLpooPwTkIx8Dn56zdwlMPt2tPXP1c1nljpye3OGJYfPA16HoDG2TiS40nFUnCnEJikrDEZ6KtiTkWrjHfK/muN8gbbase0HiGq4Y4Wa5Ua8861EKhMZ5wXBZfvUNpRxhAZ/afwOKcf7Qj1MkhHcRBRnPw8vv024vxPduFaFgGE106jKfNUhkY/5aENDbbhT3a2U1wpJA9PUxrLGw8wRnWX9oXFz8L26iWmP+11VVGmwzyRB16jH7iF+bDS7gaVuGOIrpwTUsRBCTW2tmP2qdzug/ZP+elXGMJvXAXFHErbrKiJQZ8qeGUEMP22DN8uXStgYe1vh3iDiGitaWGGWR4ZpGl6c4jwCoA7kZ1LY7BfaXhGzUdVDIKuCBlmBmDEMXYjJzvsRqxxbLDV2/hKrljaRJrjBzhFLF0aJyVwNyDtt8NOqKz2C40jrFbiII6hnMM8TxgScoBPI2PL4Y3OueXGskOLNwlxdo8w444K4xunGSVtspp3oxFTqWWrVBlQObbmGvcNYDhzh+019z4qp6mhikjiuXSjBz9WvRjOF9NyTt661F7u/0XAkNOFeslB6YfPKij7Uj435RkdtySANzrTaivQuPHLJPjHqy5X3SitiK1ZUJFznCKd2c+iqNyfkNKJeLIlUlLdV4zgGZo4c/c7A/iNdLZw6ZJGrbg8zzyjxc7YkYejEfZH6i4UefMd9XobpZaW4taoHgjqVXmMUSjsASe3pjfPqNYuT66PWseGNqKc2uvb22VouLKYgNPRVcKb5kVVmQfMxlsfPGnVLV09dTrUUs8c0LdnjYMD941Rt9VbL/TrW08SyCOQqHePDKw9PPSyptctnrGuFJIwRmHUb1/8AcHZh5c/2l9SM4Jtb6okseKTcKcZdn09O/wCdDT6NVqCrNdRR1BglgZh4opVwyMDgg/f59jqzronZ45RcW0z5X48/JuF/3SP8aTSHh+mFTeabnpmngWQdVQAcA+ZB2Prj4HT7jz8m4X/dI/xpNJLEsc8tRTS06zK0XVHMwHKY8nO+2ME99dDBraRrHR1qSmqpnQEBJI6ZEwzcvLk7MAQwbIGO/kMasw3G3RtUmqq16fIeuObmx4lCgDmPNlcHbPY5xpPVxZdHWntzxxxgvJ11yYwxCt4Vx9gA4HkPhqmr07uVSK2MZM+7AT7v48fo7bZ/DUKNDS2p6esVBTzzCKTkp0po1djg4PMNhsOc4O38NYV43ikaORSrocMpGCDrZrRpUU0VJPSUXjkYNHDMhZmyBtkAnCczZB/HWQq6j3usmqOQRiRywQEkKPIZOqRnuHsq/q/hb9m5fzxa1fD1pvND7QOIbtVW/kobn0REwmRmTkGMsM+fwzrKeyoZt/CwPmty/ni1rIZ5BbbZWGlNQsiSyVSRySB+RWAygDbkZyV8xnG+AcsptnJVCQpYgZCjufhrE8CWe8Wavv7XOgEMdxuD1cTJMr8qt5Ng5zsO2dTzvCLfPXwdSaiSoGZoHdykBjVucDm8WCRnzxnbI1NLQlrvRU8FZmCpglmDDJ+z08YPN2POT+GoUa39rtHRRTWeBaioinR3gaUR9WPPiUMdgcHbPppHe6K5cY0cFsntMtuoTPFNVS1MsbOVRg3IioW3JAHMSMDPfXSqWQWa9VkUnI9DLOsYyxDBQCoOW1fjoViv8VBK7SxNSyTFuZlOQ6gdm9GOgOeLuFF4kpqWanqmorrQS9eiq1Xm6b+YI81PmNcUly4qjhENdw9BLUqMGamrVELn1ww5l+WDqi0MrUtsmWcoaqq6DjxHA+s3GW7+EamSnapobjPBIFko5HiVXZ8SNGNy3iyATnt2GDvoQUyS8QcP8VVN9vNjNzhniWGOe1kyPRxjcp02wWBO5YbnbYYA1HV8T229cXWK4UldRrS27rGWOplMExaRAoxG6g7b/jrQ1EaNw/Bc6SjqGMiRzPGkrtIsbYLco5vEwB7eePu10oo6arrqgJJ1oFoYKiGYO4LF+plvtdvCNvnoClxVw1HxmbdW2yrkpKqjm5TUhGQvTuOWVVJG+V7eWdOuIrH9IcGV9koY406tG1PAhPKq+HCj4AbaTAVU81KlOvUkeigqGRmfDFnw+/N4RjJHp8e2jLfRd7qvrOej95EWQ/J9WTy782+w3GgKxsvEb2DhikkoKdqqz1MMkxFUOWRY0ZPCcZycjuNbGgmrpxK1bRpSgECNRKJCwxuSQMD5fDWcPL9GVdQjB+lWxQRyc8gJUvGrBl5tiCzDy7A413kj61suVfTEJ7pJMiRPI5DdIkHmPNkZKnt2BHfQpa4btlfb7rf5quFEirq73mErJzHl5FTDDyPhz599QWlPpe/VVxkw8Qb6v05EYrGB94kf5lfQapQ1AqL3HTxLyxSPDyxSPIGCPEXbxc32hjt89vPTcr/o1Q09LSQvUSSAIrNuzMq+gGTsCT9+uc1tN9D1eGf8ZRj8T0vTzL16tct1pEgirp6NlkV+pCdzjy12jslviur3RadRWMoUyjY4AP8A13+700qq+IpurPR0/TSqpyOoOUv1FAUuUAPcZJwe4Hn5LLhWSwPULdZo3SCoL9OoPgmTcKMLk9iD9nGV3PbGXKN2d8eDO4qF0u3m7r6+Xn9zR1F4tlrWWJWQPEMmGIAHy+QzuCd9hvpXLxLVTfkNPzyO6CKMgNzAF1cZU47pjmzgZB0lgequg92paWoqUZn6jzxqIRKRyu+BuVwxIHN66cLwvW1kgavuPShyT7vSoE7qoILDvuM9tZ5Sl8J2/QwYf9Xv579l9/qaSiqkraRJ0BXmG6kglT5g42yDqfSmkjobKyW6kjYGRg5Bf12zknfZew8hptrsnrZ8zLFKVx6eR8r8efk3C/7pH+NJpLw2Qt0kJkMYFNNuGVfze2W237b+unXHn5Nwv+6f/uk0u4YpypqLgSGWNTB0wRzkup3UEEMRjZfM48gddTiPaggz0UpqFBgZ5elLUx826svTTAxkMeXfyGqUUjlnV3lxJHIrrLVwlKfLEDIAzjOBt667TLDVumYzHUCKFPrbarFJncHJIOMkZJ9M6kqaS3hK5IJPr6Ej30mgRhMC2TgDHn/d599AW6RljS3xe9nljVYi8dTEUXlAHMoIzgkcnr4tefDsNbqllio5VWKBnEM8qyctIkKKu7IHYg8q9jzeq6x9xovo+vlpeoJOTGGHmCAf89Az2z2U/kHC37Ny/ni16ZTQUFE1LHBTVKmBJBCp5j4WILdzvvjvrzP2U/kHC37Ny/ni16vKQLtTDIyYpP711xyNrobikyl7lboQ0MNPPF1WapZYCy8xbZiQD5+Y9d++rT09HFVUsqxN1oImjhSPPhQ8uRjtjwr39Ndak/71X68Qn3dvFt+kPXXKyrBcpWlbEc6IY3P2ds5GfvzrHN3TNcUQPS2w2+4QTRSJBUMzVKuWGS+xOc7A/DVmtpaV+lUy9QPEORJYnIYBsZGR3BwPwB1zWTQvSycrq2GQNg5H2htqtURvRx9FQWpZHXpnv0zzDb9n09NSU2gopk01JQ4pacQs3ujLLEkefAQCAT9xPfvqGSktsq1dUVkCv+VRqzKHwMeNfM4wPiPUanp5FgrKqOYhWeTqIWOOZcAbfLGoKkB0uVQh+qaDkz5MQDk/xA0eR1fqFFFyojhlpVZ3eJEwwKOUI/D59tUDQUHWjDQvTp0hTpy8yc6fosQfngHfc+p1PVSq1NA8bBxE6SOqnJ5R54/j92u9e8dVQtFC6u8uAgU53yN/u76rm915BROehSQ1/XjiY1AhEOEzgICSBjsN86qfR9tShryyVAgn6nvEbSP+fu+BnbOfL7tWoJVp62qjnIQyOHRm2DDAGAfhjtqGedprXXszKVUsilR3AA1HkdN+oUQqbZbndnkik6k/TLKjsDIYyCpIB7jA3+QOuDQ2+SWqd4pIhJh6iNiVSTbGSM4PbB9cb6maQQXJZZTiKSIIrnsCCTgnyzn+Gua+RZac9EiQxsjuqb5UNnH8O2q5um+w4orz0VsmkmeenkX3l42MjFl8SfYIOfCR5EY1LeKTr0IeNJHqITzRGNyrjyOCO+xO3nrvWzQ1NvkjidZGlXlRVOSSe2qV+pa/oQ1VFLM7QDEkEbYMi7HmXO3OCMgHYjKnvo5N2up0wL+yO6/Pv0K8Nlr6qiaCaUUA63PinOS6EDIJznm2+1k+ffVu38L2u3L4YDO+STJUHqNkjB3PqO+ubRf6a4wxh5EWZtlIyFkI78udwfVT4h5+pmuX0r71QfR/R6HWHvfU+10/1fjqpRq1s7zyZ+TxSfH2Qw8Eafmqij5ADXEcsc0YkjdXRuzKcg6zdNZLqeIblNX1/WtVTEUSnyTyqScrnYj1yPXHlqGaso7RbKe0WRHZGBji6LZZz5qhPc+rdlG53wC51toz+2UnxhK3r0Wt2+6JQ63Ti+ExkmOmzKx8sKGRfxZpP+TWo0sslr+jaPMqx+9zYaZo88uQMBVz+aowB+PcnTPVgmls5+JnGUlGPRKj5u9pVrantVucKf8Ad1XVW2U+nj6sX4o2sVarubfHLCy80Uh5uwblfGAxU7Njvg4+BGvoPj/h+nn95epIjtt1RIKmbG1LUIfqJz+rvyMfQr5Z1863W1VtkulRbrhCYaqBuV0P8CPUHuDrsjys0J4jpffTOapBiUBRicfVcxZtubHNnGPw1BT8Q0kNyvlSk3Kaxg0DMrYyGz4uUgjXsXsattBVez9Jamippn96mHNJCrHGR5ka2lLDYKupeCK3UZdf/Tpv/DWZTjF0zSi2rR82LxDSQxSosgmiypWPkkctvlgTISo37HBI8hrO1tW9bVPUS55mAzlixwBjcncnA769F9uFLT0nGVFHTQRQoaBSVjQKCed99tZrg3h1LrWtcLirrZqAq9UwGTK2fDCg83c4GB6/LWzJ7D7OKFqCG0xSrgW6ztUTY3KyVMnOB8wkY2+Oto14nWmt9Y0ELRVq+ADPNGTGzrk+YwuDjGM654YttRRUEtVXqq3GvlNTUqpyIyQAsYPoihV+4nz1O9jhWOIUcstMYSTEFPOi5GCORsjHw2x5Y1hminU3qVLVFWe7Qsz25qwq2cBgEPL8vEdSXC61NDWTpKsDUsNK9U3hJYop3XvjOPPVmCx0y0L0s6iRHi6JALKBH+iviJA+/Vx6GnkqTUPGGkMRhPMcgoTkgjtqaBRWtmgrqKlqIYeSrVipi/MdRzYPqMZ327dt9QVfEIpXusRpuaSjjDwrzf0/hBIHphtj6Ag6ZU1tpqQxmJG+rTkj53Lci7bDJ2Gw/Aa6vaKGSUyyU6vIS55mJJHOoVsemQANNApx3Gatuk9JGsPTSKORGeNmzzgnc9hjH36qfTtUlrp6uYUiJNUNDurcqBepkn/kH4nTentVLS1AmhV1fkWM/WMQVUELkZwcAnXKWukjigiWMhIJTNGOc7Mc5Pff7TbfHQFKkuM9YxipoIIJ1poppA+SOZwcKCPIcp3/AIaow8SSOvvSUSilFMlTMB9tFKyFt+xwUx8c6bR2Sgh5OjE0XKhjHTkZfATnl7/ZBJwPLO2NWIrfSwPI0cKr1I1iZfzeRcgDHbG500BVW3ipo4YXnp4JFqIJHQKT4HWMuAfUEA7jHy31Y9/meW308ccINVTvKSwJClQhG3p4j+Gp0s1CkHQ6TNEImhVWdjyIRgquTsMbba7wWulp3gdFkLQKyxl5GYqCACNz+qPw00BQ9/mpbK9fVRwMvWaJY0yNkdg53/VQtj7tTVF8WjrKin6CLF0waecHwvIVLcjY7EjGD57jvjLGK2UkIQJFsnUIBYkeM5bv6nUYslvFFLRNTh6eWNYnjdiwKqMAbnyHn8NNAoveJVorhXQQQlaHPVQ5DScqhnwfLY7ZznGniMHRWHYjIzqm1pomkkcxH63l6qhzyyYAA5hnB2AHxA31e0AnuPDlHXTPURs9NUPjqPEARJj9NCCrfMjI9dUpLVfIZCtHUwdADCgzyIcfIhh+GNaXRrDgj0R8Vkiqe18zLGwXms8NbXwJH5gc85/BiE/FTpzbbNSWvneIPJPIAJJ5m5ncDsM+QHoMAemmGjVUEtjJ4rJNcW6XZBo0aNaPORzwRVVPJTzxpLDIpR0cZVlOxBHmNeYcWcApNSLT1VLU3C2wqRS1VN4q2hX9Ag/08Q8h9ofHvr1PRpYMJ7MKa32nhlrRBeKOvdaiR/q8o4DHYNG3iU+oOtXTWmlo6h6lAQx3yTsNdbjw/Z7u3NcLZSVLgYDywqzD5HvpcvAXC6tn6Hgf9WQs6/gSRqSjGTtlTaVIwXH1gtHFXGtNUNcnq+jSrCbda061Q7B2O7fZjXf7THWv4a4QFJ7rUV9NBTR0mTQ22A80VKT3dm/8SU+bHtvj1Opo6Gkt8AgoqWGmiHaOGMIv4DVjWrIGjRo1AGjRo0AaNGjQBo0aNAGjRo0AaNGjQBo0aNAGjRo0AaNGjQBo0aNAGs1xBxU1kr0ploxMGiEnMZOXG5GOx9NaXXnPHv8AXsH/AMZf520B/9k=";

function basePdfCss(exactPages=false){
  if(exactPages){
    return '<style>'+
      '@page{size:A4;margin:0}'+
      '*{box-sizing:border-box}html,body{margin:0!important;padding:0!important;width:210mm!important;background:#fff!important;font-family:Arial,Helvetica,sans-serif;color:#111}'+
      'body{font-size:11pt;line-height:1.55}'+
      '.pdf-document{width:210mm!important;margin:0!important;padding:0!important;background:#fff;counter-reset:apafigure}'+
      '.pdf-page{width:210mm!important;height:297mm!important;min-height:297mm!important;max-height:297mm!important;margin:0!important;padding:15mm!important;background:#fff!important;overflow:hidden!important;display:flex!important;flex-direction:column!important;break-after:page;page-break-after:always;position:relative}'+
      '.pdf-page:last-child{break-after:auto;page-break-after:auto}'+
      '.institution-header{width:100%;border-collapse:collapse;table-layout:fixed;margin:0 0 6mm 0;font-size:7.5pt;line-height:1.12;flex:0 0 auto}'+
      '.institution-header td{border:.75pt solid #111;padding:1.7mm 2mm;vertical-align:middle;text-align:center}'+
      '.institution-header .brand-cell{width:25%;font-weight:700}.institution-header .unit-cell{width:50%;font-weight:500;font-size:9pt;height:8mm}.institution-header .meta-cell{width:25%;font-size:8.5pt;line-height:1.2}.institution-header .doc-cell{font-weight:700;font-size:9pt;height:20mm;line-height:1.15}'+
      '.institution-header .brand-cell{padding:1.2mm 2mm}.institution-logo{display:block;max-width:38mm;max-height:18mm;width:auto;height:auto;object-fit:contain;margin:0 auto}.institution-header .brand-main{font-size:12pt;font-weight:800;letter-spacing:.2px}.institution-header .brand-sub{font-size:5.7pt;font-weight:400;margin-top:.5mm}'+
      '.institution-header .date-cell,.institution-header .page-cell{font-size:6.8pt}'+
      '.pdf-body{flex:1 1 auto;min-height:0;overflow:hidden}.pdf-body.content-page{padding:0 .5mm}'+
      '.cover-body{height:100%;display:flex;flex-direction:column;justify-content:space-between;padding-top:8mm}'+
      '.cover-title{text-align:center;margin-top:44mm}.cover-title h1{font-size:18pt;line-height:1.2;margin:0;font-weight:700}.cover-title .period{font-size:16pt;line-height:1.2;font-weight:700;margin-top:3mm}'+
      '.signature-table{width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:0;font-size:8.5pt}.signature-table td{border:.6pt solid #111;padding:1mm 1.2mm;vertical-align:top}.signature-table .sig-space td{height:24mm;font-size:8.5pt}.signature-table .sig-name td{height:7.5mm;vertical-align:middle}.signature-table .sig-role-row td{height:10.5mm;vertical-align:middle;line-height:1.08;text-transform:none;font-size:8.5pt}.signature-table strong{font-size:8.5pt}.signature-table .sig-label{font-size:8.5pt}.signature-table .label-inline{font-weight:700;margin-right:1mm}'+
      '.sec-title{font-size:13pt;font-weight:700;margin:0 0 3mm;color:#1f2d3d}.sub-title{font-size:11pt;font-weight:700;margin:3.2mm 0 1.5mm;color:#26384a}.mini-title{font-size:10pt;font-weight:700;margin:2.2mm 0 1.1mm}.section-rule{border:0;border-top:.7pt solid #aeb7c0;margin:2.5mm 0}.section-intro{font-size:10.5pt;line-height:1.6;margin-bottom:3mm;text-indent:12.7mm}'+
      'p{margin:0 0 2.4mm;text-align:justify;line-height:1.62;text-indent:12.7mm}.lead{font-size:10.5pt;line-height:1.65;text-indent:12.7mm}.small{font-size:8.2pt;line-height:1.35;text-indent:0}.muted{color:#5c6670}.tight{margin-bottom:1.4mm}.body-list{margin:0 0 2.3mm;padding-left:7mm}.body-list li{margin:1mm 0;text-align:justify;line-height:1.48}.number-list{margin:0 0 2.5mm;padding-left:7mm}.number-list li{margin:1.2mm 0;text-align:justify;line-height:1.48}.criteria{display:grid;grid-template-columns:repeat(3,1fr);gap:2mm;margin:2mm 0 3mm}.criteria div{border:.6pt solid #9da8b2;padding:2.2mm;text-align:center;font-size:7.2pt;background:#f5f7f9}.criteria strong{display:block;font-size:8.8pt;margin-bottom:.8mm;color:#24394d}'+
      '.info-box{border:.6pt solid #aeb7c0;border-left:3mm solid #314b63;background:#f6f8fa;padding:2.5mm 3mm;margin:3mm 0;font-size:8.5pt;line-height:1.4}.info-box p,.panel p,.callout p,.quote-box p{ text-indent:0}.info-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2.5mm;margin:3mm 0}.info-item{border:.6pt solid #aeb7c0;border-top:2mm solid #314b63;padding:2.4mm;text-align:center;background:#fbfcfd}.info-item strong{display:block;font-size:14pt;color:#24394d}.info-item span{font-size:7.2pt}'+
      '.two-col,.three-col{display:block}.two-col .panel,.three-col .panel{margin-bottom:3mm}.panel{border:.6pt solid #aeb7c0;padding:3mm;break-inside:avoid;background:#fbfcfd}.panel h3{font-size:10pt;margin:0 0 2mm;color:#24394d}.callout{border-left:3mm solid #9b7a45;background:#fbf8f2;padding:3mm 3.5mm;margin:3mm 0;font-size:9.5pt;line-height:1.45}.quote-box{border:.6pt solid #aeb7c0;padding:3mm 3.5mm;margin:3mm 0;background:#fafbfc;font-size:9.5pt;line-height:1.5}'+
      'table.data{width:100%;border-collapse:collapse;table-layout:fixed;margin:2mm 0 2.5mm;border-top:1pt solid #26384a;border-bottom:1pt solid #26384a}table.data th,table.data td{border:0;padding:2mm 2.2mm;font-size:10pt;line-height:1.3;vertical-align:top}table.data th{background:#fff;font-weight:700;text-align:center;color:#1f2d3d;border-bottom:1pt solid #52687a}table.data tr:last-child td{border-bottom:0}table.data td.num{text-align:center;white-space:nowrap}.career-summary th:nth-child(1){width:34%}.career-summary th:nth-child(2){width:10%}.career-summary th:nth-child(3){width:12%}.career-summary th:nth-child(4){width:22%}.career-summary th:nth-child(5){width:22%}.apa-table-block{margin:4mm 0 5mm;break-inside:avoid}.apa-table-number{font-size:11pt;font-weight:700;margin-bottom:.8mm;color:#1f2d3d}.apa-table-title{font-size:11pt;font-style:italic;margin-bottom:2mm;line-height:1.3}.apa-table-context,.apa-table-analysis{font-size:11pt;line-height:1.5;text-align:justify;text-indent:12.7mm;margin:2mm 0}.apa-table-analysis strong{color:#24394d}.apa-table-note{font-size:10pt;line-height:1.35;margin-top:1.5mm;color:#4f5963}.apa-table-note em{font-weight:400;font-style:italic}'+
      '.summary-table th:first-child,.summary-table td:first-child{width:72%}.summary-table th:last-child,.summary-table td:last-child{width:28%}'+
      '.needs-grid{display:block}.need-card{border:.55pt solid #9da8b2;padding:2.5mm 3mm;break-inside:avoid;min-height:0;margin:0 0 3mm;background:#fbfcfd}.need-card-title{font-size:10pt;font-weight:700;margin-bottom:1mm;color:#24394d}.need-coord{font-size:9pt;color:#444;margin-bottom:1.2mm}.need-line{display:grid;grid-template-columns:1fr auto;gap:2mm;font-size:9.5pt;line-height:1.3;margin:1mm 0}.priority{border:.5pt solid #555;border-radius:2mm;padding:.5mm 1.5mm;font-size:8.5pt;white-space:nowrap;align-self:start}'+
      '.needs-grid.dense .need-card{padding:2.2mm 2.7mm;margin-bottom:2.5mm}.needs-grid.dense .need-card-title{font-size:10pt}.needs-grid.dense .need-coord{font-size:9pt}.needs-grid.dense .need-line{font-size:9pt;line-height:1.25;margin:.8mm 0}'+
      '.bullet-list{margin:1mm 0 2mm;padding-left:6mm}.bullet-list li{margin:0 0 1.5mm;text-align:justify}.compact-list{font-size:9.5pt;line-height:1.4}.compact-list li{margin-bottom:1.2mm}.chart-grid{display:block;margin:3mm 0}.apa-figure-block{display:block;width:100%;min-width:0;break-inside:avoid;margin:0 0 5mm}.apa-figure-block.full{width:100%}.visual-context,.visual-analysis{font-size:11pt;line-height:1.5;text-align:justify;text-indent:12.7mm;margin:2mm 0}.visual-analysis strong{color:#24394d}.figure-note{font-size:10pt;line-height:1.35;margin-top:1.5mm;color:#4f5963}.figure-note em{font-weight:400;font-style:italic}.chart-box{counter-increment:apafigure;border:0;padding:1mm 0 2mm;background:#fff;break-inside:avoid;box-shadow:none;width:100%}.chart-box::before{content:\"Figura \" counter(apafigure);display:block;font-size:11pt;font-weight:700;color:#1f2d3d;margin-bottom:.8mm}.chart-title{font-size:11pt;font-style:italic;font-weight:400;margin-bottom:2.2mm;color:#1f2d3d}.chart-subtitle{font-size:10pt;color:#5e6872;margin-top:-.5mm;margin-bottom:2mm}.chart-row{display:grid;grid-template-columns:48mm 1fr 25mm;gap:2mm;align-items:center;margin:1.8mm 0;font-size:10pt}.chart-label{overflow:hidden;text-overflow:ellipsis;white-space:normal;line-height:1.2}.chart-track{height:5.5mm;background:#eef1f3;border:.35pt solid #d1d6db;position:relative;border-radius:.7mm;overflow:hidden}.chart-fill{height:100%}.chart-c1{background:#29445c}.chart-c2{background:#9b7a45}.chart-c3{background:#4f7775}.chart-c4{background:#76515a}.chart-c5{background:#6b7785}.chart-value{text-align:right;font-size:10pt}.stacked{display:flex;width:100%;height:9mm;border:.4pt solid #9da8b2;margin:2.5mm 0 1.5mm;border-radius:.8mm;overflow:hidden}.stacked>span{display:flex;align-items:center;justify-content:center;font-size:9pt;overflow:hidden;white-space:nowrap}.stacked-a{background:#29445c;color:#fff}.stacked-b{background:#b89557;color:#111}.legend{display:flex;gap:5mm;flex-wrap:wrap;font-size:10pt;margin-top:1.5mm}.legend i{display:inline-block;width:3.5mm;height:3.5mm;margin-right:1.2mm;vertical-align:-.5mm;border:.35pt solid #777}.group-row{display:grid;grid-template-columns:48mm 1fr 1fr;gap:2mm;align-items:center;margin:1.8mm 0;font-size:10pt}.group-bar{height:5.5mm;background:#eef1f3;border:.35pt solid #d1d6db;border-radius:.7mm;overflow:hidden}.group-current{height:100%;background:#29445c}.group-desired{height:100%;background:#b89557}.priority-high{background:#76515a;color:#fff}.priority-medium{background:#b89557}.priority-low{background:#4f7775;color:#fff}.kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:2.5mm;margin:3mm 0}.kpi{border:.6pt solid #aeb7c0;border-top:2mm solid #314b63;padding:2.5mm;text-align:center;background:#fbfcfd}.kpi:nth-child(2){border-top-color:#9b7a45}.kpi:nth-child(3){border-top-color:#4f7775}.kpi:nth-child(4){border-top-color:#76515a}.kpi strong{display:block;font-size:14pt;line-height:1.05;color:#24394d}.kpi span{font-size:8.5pt}.flow{display:flex;gap:1.5mm;align-items:stretch;margin:3mm 0}.flow-box{flex:1;border:.6pt solid #aeb7c0;border-top:1.8mm solid #314b63;background:#fbfcfd;padding:2.5mm;text-align:center;font-size:8.5pt}.flow-arrow{display:flex;align-items:center;font-size:12pt;color:#9b7a45}.matrix{width:100%;border-collapse:collapse;margin:2.5mm 0;border-top:1pt solid #26384a;border-bottom:1pt solid #26384a}.matrix th,.matrix td{border:0;padding:1.8mm;font-size:10pt;text-align:center}.matrix th{background:#fff;color:#1f2d3d;border-bottom:1pt solid #52687a}.matrix th:first-child,.matrix td:first-child{text-align:left}.toc{width:100%;border-collapse:collapse;margin-top:3mm}.toc td{padding:1.8mm 0;border-bottom:.35pt dotted #9aa4ad;font-size:10pt}.toc td:last-child{text-align:right;width:14mm;font-weight:700;color:#24394d}.annex-table th,.annex-table td{font-size:8.5pt!important;padding:1.2mm 1.4mm!important}'+
      '.footer-note{position:absolute;left:15mm;right:15mm;bottom:5mm;text-align:center;font-size:6.5pt;color:#7a848d;letter-spacing:.08px}'+
      '.institution-header td{border-color:#7c8791;border-width:.5pt}.institution-header .unit-cell{color:#233b4d;font-weight:600;letter-spacing:.15px}.institution-header .doc-cell{background:#f7f9fa;color:#233b4d}.institution-header .meta-cell{color:#384957}.signature-table td{border-color:#8b959d;border-width:.5pt}'+
      '.cover-title h1{font-size:18pt;color:#17384d;letter-spacing:-.1px;line-height:1.2}.cover-title .period{font-size:16pt;color:#3f5260;font-weight:700;margin-top:3mm}'+
      '.sec-title{font-size:16pt;line-height:1.15;color:#17384d;margin:0 0 4mm;padding-bottom:2.2mm;border-bottom:.8pt solid #caa45b}.sub-title{font-size:12pt;line-height:1.25;color:#29485e;margin:4mm 0 2mm}.mini-title{font-size:10.5pt;color:#38556a}.page-topic{font-size:12.5pt;font-weight:700;color:#29485e;border-left:1.6mm solid #caa45b;padding:1.3mm 0 1.3mm 3mm;margin:0 0 4mm;line-height:1.2}'+
      '.criteria div{border:0;border-radius:1.8mm;background:#f3f6f8;padding:3mm}.info-box{border:0;border-left:1.6mm solid #29485e;border-radius:0 1.5mm 1.5mm 0;background:#f4f7f9;padding:3mm 3.5mm}.quote-box{border:0;border-left:1.2mm solid #9b7a45;border-radius:0 1.5mm 1.5mm 0;background:#faf8f3}.panel{border:0;border-radius:1.8mm;background:#f4f7f9;padding:3.2mm}.callout{border-left:1.6mm solid #b28c48;border-radius:0 1.5mm 1.5mm 0;background:#fbf8f1}'+
      '.info-item{border:0;border-radius:1.8mm;background:#f4f7f9;box-shadow:inset 0 1.2mm 0 #29485e;padding:3mm}.info-item:nth-child(2){box-shadow:inset 0 1.2mm 0 #9b7a45}.info-item:nth-child(3){box-shadow:inset 0 1.2mm 0 #4f7775}'+
      '.kpi{border:0;border-radius:1.8mm;background:#f4f7f9;box-shadow:inset 0 1.2mm 0 #29485e;padding:3mm}.kpi:nth-child(2){border:0;box-shadow:inset 0 1.2mm 0 #9b7a45}.kpi:nth-child(3){border:0;box-shadow:inset 0 1.2mm 0 #4f7775}.kpi:nth-child(4){border:0;box-shadow:inset 0 1.2mm 0 #76515a}'+
      '.flow-box{border:0;border-radius:1.5mm;background:#f3f6f8;padding:2.8mm}.flow-arrow{color:#b28c48}.need-card{border:0;border-left:1.5mm solid #29485e;border-radius:0 1.5mm 1.5mm 0;background:#f5f7f9;padding:3mm 3.5mm}'+
      '.chart-track,.group-bar{border:0;background:#eef1f3;border-radius:1mm;overflow:hidden}.chart-fill,.group-current,.group-desired{border-radius:0 1mm 1mm 0}.stacked{border:0;background:#eef1f3;box-shadow:inset 0 0 0 .3pt #dde2e6}.chart-c1{background:#24465d}.chart-c2{background:#b18a45}.chart-c3{background:#4d7773}.chart-c4{background:#7b5260}.chart-c5{background:#70808d}.group-current{background:#24465d}.group-desired{background:#b18a45}'+
      '.toc td{border-bottom:.35pt solid #e2e6e9;padding:2mm .5mm}.toc td:last-child{color:#8b6c35}.apa-table-block{margin-top:4.5mm}.apa-table-number,.chart-box::before{color:#29485e}.apa-table-title,.chart-title{color:#2d3d49}.figure-note,.apa-table-note{color:#68747d}'+
      '</style>';
  }
  return '<style>'+
    '@page{size:A4;margin:18mm 16mm 18mm 16mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#111;font-size:10.5pt;line-height:1.45;margin:0}.page-break{page-break-before:always}.avoid{page-break-inside:avoid}.header{border:1px solid #333;display:grid;grid-template-columns:22% 58% 20%;align-items:stretch;margin-bottom:18px}.header>div{padding:8px;border-right:1px solid #333;text-align:center}.header>div:last-child{border-right:0}.logo{font-weight:800;font-size:18px}.doc-title{font-weight:700}.meta{font-size:8.5pt}.cover{min-height:245mm;display:flex;flex-direction:column;justify-content:space-between}.cover h1{text-align:center;margin-top:75mm;font-size:23pt}.sign{width:100%;border-collapse:collapse}.sign td{border:1px solid #333;padding:10px;vertical-align:top;height:70px}.sign small{display:block}.h1{font-size:17pt;margin:18px 0 10px}.h2{font-size:13pt;margin:18px 0 7px}.h3{font-size:11pt;margin:14px 0 6px}table.data{width:100%;border-collapse:collapse;margin:8px 0 12px}table.data th,table.data td{border:1px solid #666;padding:6px 7px;font-size:9.2pt}table.data th{background:#e9edf2}.note{font-size:8.5pt;color:#555}.analysis{margin:8px 0 14px}.bar{display:grid;grid-template-columns:190px 1fr 55px;gap:8px;align-items:center;margin:6px 0}.track{height:12px;background:#e8edf3}.fill{height:100%;background:#365f86}.footer{position:fixed;bottom:-10mm;left:0;right:0;text-align:center;font-size:8pt;color:#666}'+
    '</style>';
}
function pdfHeader(title,code){
  return '<div class="header"><div class="logo"><img src="'+INSTITUTION_LOGO_DATA+'" alt="ITSQMET" style="max-width:100%;height:28px;object-fit:contain"></div><div><div>UNIDAD DE GESTIÓN DE PROCESOS ACADÉMICOS</div><div class="doc-title">'+esc(title)+'</div></div><div class="meta">Código:<br>'+esc(code)+'<br>Versión: '+esc(state.period.version)+'</div></div>';
}
function cover(title,code){
  const p=state.period;
  return '<section class="cover">'+pdfHeader(title,code)+'<h1>'+esc(title)+'<br><small>'+esc(periodLabel())+'</small></h1>'+
    '<table class="sign"><tr><td>ELABORADO POR:<br><br><small>NOMBRE: '+esc(p.preparedBy)+'<br>CARGO: '+esc(p.preparedRole)+'</small></td><td>REVISADO POR:<br><br><small>NOMBRE: '+esc(p.reviewedBy)+'<br>CARGO: '+esc(p.reviewedRole)+'</small></td><td>APROBADO POR:<br><br><small>NOMBRE: '+esc(p.approvedBy)+'<br>CARGO: '+esc(p.approvedRole)+'</small></td></tr></table></section>';
}
function formatMonthYear(value,hyphen=false){
  if(!value) return '';
  const months=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const m=String(value).match(/^(\d{4})-(\d{2})/);
  if(!m) return String(value);
  const label=months[Math.max(0,Math.min(11,Number(m[2])-1))]+' '+m[1];
  return hyphen?label.replace(' ','-'):label;
}
function periodLabel(){
  const p=state.period;
  if(!p.start&&!p.end)return 'Período de Formación Docente';
  const a=formatMonthYear(p.start),b=formatMonthYear(p.end);
  return [a,b].filter(Boolean).join(' a ');
}
function dnfHeader(title,code,page,totalPages){
  return '<table class="institution-header">'+
    '<tr><td class="brand-cell" rowspan="2"><img class="institution-logo" src="'+INSTITUTION_LOGO_DATA+'" alt="ITSQMET"></td>'+
    '<td class="unit-cell">UNIDAD DE GESTIÓN DE PROCESOS ACADÉMICOS</td>'+
    '<td class="meta-cell" rowspan="2">Código:<br><strong>'+esc(code)+'</strong></td></tr>'+
    '<tr><td class="doc-cell">'+esc(title)+'<br><span style="font-size:8.5pt;font-weight:600">'+esc(periodLabel())+'</span></td></tr>'+
    '</table>';
}
function dnfPage(title,code,page,totalPages,body,extraClass=''){
  return '<section class="pdf-page '+extraClass+'" data-pdf-page="'+page+'">'+dnfHeader(title,code,page,totalPages)+'<div class="pdf-body content-page">'+body+'</div><div class="footer-note">ITSQMET · Unidad de Gestión de Procesos Académicos · '+esc(periodLabel())+' · Página '+page+' de '+totalPages+'</div></section>';
}
function dist(field,filter=()=>true){
  const map={};state.teachers.filter(filter).forEach(t=>{const k=t[field]||'Sin información';map[k]=(map[k]||0)+1;});return map;
}
function distRows(map,total){
  return Object.entries(map).sort((a,b)=>b[1]-a[1]).map(([k,v])=>'<tr><td>'+esc(k)+'</td><td class="num">'+v+'</td><td class="num">'+fmtPct(pct(v,total))+'</td></tr>').join('');
}
function bars(map,total){
  return Object.entries(map).sort((a,b)=>b[1]-a[1]).map(([k,v])=>'<div class="bar"><div>'+esc(k)+'</div><div class="track"><div class="fill" style="width:'+pct(v,total)+'%"></div></div><div>'+fmtPct(pct(v,total))+'</div></div>').join('');
}
function compactDist(title,map,total){
  return '<div class="panel"><h3>'+esc(title)+'</h3><table class="data"><tr><th>Condición</th><th>N</th><th>%</th></tr>'+distRows(map,total)+'</table></div>';
}

function reportEntries(map){
  return Object.entries(map||{}).filter(([,v])=>Number(v)>0).sort((a,b)=>b[1]-a[1]);
}
function figureContextFor(title){
  const t=norm(title).toLowerCase();
  if(t.includes('nivel académico actual')) return 'Para establecer el punto de partida de la cualificación docente, se examina la distribución de los niveles académicos registrados.';
  if(t.includes('nivel académico deseado')) return 'Para reconocer la dirección de la progresión académica, se analizan los niveles que los docentes proyectan alcanzar.';
  if(t.includes('docentes por carrera')||t.includes('número de docentes por carrera')) return 'La distribución por carrera permite dimensionar el peso relativo de cada grupo dentro de la base institucional.';
  if(t.includes('dedicación')) return 'La dedicación docente se analiza porque puede incidir en la disponibilidad y continuidad de una ruta formativa.';
  if(t.includes('modalidad')) return 'Las preferencias de modalidad permiten anticipar condiciones de acceso que deberán considerarse al estructurar las rutas formativas.';
  if(t.includes('barrera')) return 'Las barreras declaradas permiten identificar factores que podrían dificultar el inicio o la continuidad de los estudios.';
  if(t.includes('tipo de formación')) return 'La preferencia entre formación específica y genérica ayuda a distinguir necesidades disciplinares de necesidades transversales.';
  if(t.includes('necesidad')) return 'La concentración de necesidades permite reconocer cuáles requieren mayor atención dentro de la planificación institucional.';
  if(t.includes('prioridad')) return 'La distribución de prioridades permite ordenar la intervención institucional de acuerdo con la incidencia de las necesidades registradas.';
  if(t.includes('institucion')) return 'Las instituciones registradas aportan información operativa sobre las trayectorias ya iniciadas y las opciones de articulación disponibles.';
  if(t.includes('afinidad')) return 'La afinidad entre la formación y el campo de trabajo permite valorar la pertinencia académica del perfil docente.';
  return 'La distribución de esta variable permite identificar concentraciones y diferencias relevantes para el diagnóstico.';
}
function figureImplicationFor(title){
  const t=norm(title).toLowerCase();
  if(t.includes('nivel académico')) return 'La lectura conjunta de estos niveles orienta la definición de rutas de progresión y cierre de brechas.';
  if(t.includes('modalidad')) return 'Esta preferencia debe considerarse al buscar programas viables, sin desplazar el criterio de pertinencia académica.';
  if(t.includes('barrera')) return 'El resultado permite anticipar medidas de apoyo o alternativas de acceso antes de incorporar una ruta al Plan.';
  if(t.includes('necesidad')||t.includes('prioridad')) return 'La concentración observada aporta un criterio directo para ordenar las acciones que pasarán al Plan de Formación.';
  if(t.includes('carrera')) return 'La concentración por carrera permite dimensionar el alcance potencial de una intervención y comparar necesidades entre grupos.';
  if(t.includes('dedicación')) return 'La distribución debe considerarse junto con disponibilidad, modalidad y condiciones de acceso.';
  return 'El resultado aporta evidencia para la interpretación de la sección y debe contrastarse con las demás variables del diagnóstico.';
}
function barChart(title,map,total,subtitle='',limit=10){
  const rows=reportEntries(map).slice(0,limit);
  const max=Math.max(1,...rows.map(([,v])=>Number(v)||0));
  const context=figureContextFor(title);
  if(!rows.length) return '<div class="apa-figure-block"><p class="visual-context">'+esc(context)+'</p><div class="chart-box"><div class="chart-title">'+esc(title)+'</div><div class="small muted">Sin información disponible.</div></div><div class="figure-note"><em>Nota.</em> Elaboración propia a partir de los registros consolidados en DocFormación.</div><p class="visual-analysis"><strong>Análisis.</strong> No existen registros suficientes para interpretar esta variable; la información deberá completarse antes del cierre formal del diagnóstico.</p></div>';
  const top=rows[0], topPct=pct(top[1],total);
  return '<div class="apa-figure-block"><p class="visual-context">'+esc(context)+'</p>'+
    '<div class="chart-box"><div class="chart-title">'+esc(title)+'</div>'+(subtitle?'<div class="chart-subtitle">'+esc(subtitle)+'</div>':'')+
    rows.map(([label,value],idx)=>'<div class="chart-row"><div class="chart-label" title="'+esc(label)+'">'+esc(label)+'</div><div class="chart-track"><div class="chart-fill chart-c'+((idx%5)+1)+'" style="width:'+Math.max(2,100*value/max)+'%"></div></div><div class="chart-value">'+value+' · '+fmtPct(pct(value,total))+'</div></div>').join('')+
    '</div><div class="figure-note"><em>Nota.</em> N = '+total+'. Elaboración propia a partir de los registros consolidados en DocFormación.</div>'+
    '<p class="visual-analysis"><strong>Análisis.</strong> La mayor concentración corresponde a <strong>'+esc(top[0])+'</strong>, con '+top[1]+' registros ('+fmtPct(topPct)+'). '+esc(figureImplicationFor(title))+'</p></div>';
}
function stackedChart(title,yesCount,total,yesLabel='Sí',noLabel='No'){
  const yesPct=pct(yesCount,total),noCount=Math.max(0,total-yesCount),noPct=pct(noCount,total);
  const majority=yesCount>=noCount?yesLabel:noLabel,majorityCount=Math.max(yesCount,noCount),majorityPct=Math.max(yesPct,noPct);
  return '<div class="apa-figure-block"><p class="visual-context">La comparación entre ambos grupos permite establecer su peso relativo dentro de la población analizada y valorar su efecto sobre la viabilidad de la planificación.</p>'+
    '<div class="chart-box"><div class="chart-title">'+esc(title)+'</div>'+
    '<div class="stacked"><span class="stacked-a" style="width:'+yesPct+'%">'+(yesPct>=12?fmtPct(yesPct):'')+'</span><span class="stacked-b" style="width:'+noPct+'%">'+(noPct>=12?fmtPct(noPct):'')+'</span></div>'+
    '<div class="legend"><span><i class="stacked-a"></i>'+esc(yesLabel)+': '+yesCount+' ('+fmtPct(yesPct)+')</span><span><i class="stacked-b"></i>'+esc(noLabel)+': '+noCount+' ('+fmtPct(noPct)+')</span></div></div>'+
    '<div class="figure-note"><em>Nota.</em> N = '+total+'. Elaboración propia a partir de los registros consolidados en DocFormación.</div>'+
    '<p class="visual-analysis"><strong>Análisis.</strong> Predomina <strong>'+esc(majority)+'</strong>, con '+majorityCount+' docentes ('+fmtPct(majorityPct)+'). La diferencia observada permite estimar la condición de viabilidad de este grupo antes de trasladar decisiones al Plan.</p></div>';
}
function groupedLevelChart(currentMap,desiredMap,total){
  const currentTop=reportEntries(currentMap)[0]||['Sin información',0];
  const desiredTop=reportEntries(desiredMap)[0]||['Sin información',0];
  return '<div class="apa-figure-block full"><p class="visual-context">El contraste entre la situación observada y la proyección declarada permite estimar la dirección de la brecha de progresión académica.</p>'+
    '<div class="chart-box"><div class="chart-title">Comparación entre nivel académico actual y nivel deseado</div><div class="chart-subtitle">Cada barra se expresa respecto del total de docentes del período.</div>'+
    LEVELS.map(level=>{const current=Number(currentMap[level]||0),desired=Number(desiredMap[level]||0);return '<div class="group-row"><div>'+esc(level)+'</div><div class="group-bar"><div class="group-current" style="width:'+pct(current,total)+'%"></div></div><div class="group-bar"><div class="group-desired" style="width:'+pct(desired,total)+'%"></div></div></div>';}).join('')+
    '<div class="legend"><span><i style="background:#24465d"></i>Nivel actual</span><span><i style="background:#b18a45"></i>Nivel deseado</span></div></div>'+
    '<div class="figure-note"><em>Nota.</em> N = '+total+'. Las categorías se presentan con la misma base porcentual para facilitar la comparación.</div>'+
    '<p class="visual-analysis"><strong>Análisis.</strong> El nivel actual más frecuente es <strong>'+esc(currentTop[0])+'</strong> ('+fmtPct(pct(currentTop[1],total))+'), mientras que la proyección se concentra en <strong>'+esc(desiredTop[0])+'</strong> ('+fmtPct(pct(desiredTop[1],total))+'). La diferencia evidencia la dirección de las rutas de progresión que deberán analizarse en el Plan.</p></div>';
}
function careerCountMap(careers){
  const map={};careers.forEach(career=>map[career]=state.teachers.filter(t=>careerKey(t.carrera)===careerKey(career)).length);return map;
}
function priorityDistribution(careers){
  const out={Alta:0,Media:0,Baja:0};
  careers.forEach(career=>ensureNeedItems(career).forEach(item=>{
    const p=item.priorityOverride||autoPriorityForNeed(career,item.text);
    out[p]=(out[p]||0)+1;
  }));
  return out;
}
function affectedCountForNeed(career,need){
  const list=state.teachers.filter(t=>careerKey(t.carrera)===careerKey(career));
  const target=norm(need).toLowerCase();
  if(target==='fortalecimiento de formación de cuarto nivel') return list.filter(t=>!String(t.nivelActual).includes('Maestr') && t.nivelActual!=='Doctorado').length;
  if(target==='formación doctoral') return list.filter(t=>t.nivelDeseado==='Doctorado').length;
  return list.filter(t=>{
    const candidates=[t.areaInteres,t.programaCurso,t.nivelDeseado].map(x=>norm(x).toLowerCase()).filter(Boolean);
    return candidates.includes(target);
  }).length;
}
function overallNeedRanking(careers){
  const map={};
  careers.forEach(career=>ensureNeedItems(career).forEach(item=>{
    const key=norm(item.text);if(!key)return;
    map[key]=(map[key]||0)+affectedCountForNeed(career,key);
  }));
  return map;
}
function careerProfile(career){
  const teachers=state.teachers.filter(t=>careerKey(t.carrera)===careerKey(career));
  const count=teachers.length;
  const localDist=(field)=>{const map={};teachers.forEach(t=>{const key=t[field]||'Sin información';map[key]=(map[key]||0)+1;});return map;};
  const items=ensureNeedItems(career).filter(x=>norm(x.text));
  const coord=ensureCoordination(career);
  const masters=teachers.filter(t=>String(t.nivelActual||'').includes('Maestr')).length;
  const doctors=teachers.filter(t=>t.nivelActual==='Doctorado').length;
  const willing=teachers.filter(t=>t.dispuesto==='Sí').length;
  const studying=teachers.filter(t=>t.estudiaActualmente==='Sí').length;
  const table=items.length?'<table class="data"><tr><th>Necesidad detectada</th><th>Docentes relacionados</th><th>% carrera</th><th>Prioridad</th></tr>'+
    items.map(item=>{const a=affectedCountForNeed(career,item.text),p=item.priorityOverride||autoPriorityForNeed(career,item.text);return '<tr><td>'+esc(item.text)+'</td><td class="num">'+a+' / '+count+'</td><td class="num">'+fmtPct(pct(a,count))+'</td><td class="num">'+esc(p)+'</td></tr>';}).join('')+'</table>':
    '<div class="info-box small">No se registraron necesidades específicas para esta carrera.</div>';
  const highest=items.map(x=>x.priorityOverride||autoPriorityForNeed(career,x.text)).sort((a,b)=>({Alta:3,Media:2,Baja:1}[b]||0)-({Alta:3,Media:2,Baja:1}[a]||0))[0]||'Sin registrar';
  return {
    teachers,count,coord,items,masters,doctors,willing,studying,highest,
    level:localDist('nivelActual'),wish:localDist('nivelDeseado'),modality:localDist('modalidadPreferida'),barrier:localDist('barrera'),type:localDist('tipoFormacion'),table
  };
}
function chunkArray(items,size){
  const out=[];for(let i=0;i<items.length;i+=size) out.push(items.slice(i,i+size));return out.length?out:[[]];
}

function enhanceApaTables(html){
  const holder=document.createElement('div');
  holder.innerHTML=html;
  let number=0;
  holder.querySelectorAll('table.data').forEach(table=>{
    number++;
    let heading='';
    let prev=table.previousElementSibling;
    while(prev && !heading){
      if(prev.classList?.contains('sub-title')||prev.classList?.contains('sec-title')||prev.classList?.contains('mini-title')) heading=norm(prev.textContent);
      prev=prev.previousElementSibling;
    }
    const headers=[...table.querySelectorAll('th')].map(x=>norm(x.textContent)).filter(Boolean);
    const cleanHeading=heading.replace(/^\d+(?:\.\d+)*\s*/, '').trim();
    const title=table.dataset.apaTitle||cleanHeading||('Resultados consolidados: '+headers.slice(0,2).join(' y '))||'Resultados del diagnóstico';
    const rows=[...table.querySelectorAll('tr')].slice(1);
    let best=null;
    rows.forEach(row=>{
      const cells=[...row.querySelectorAll('td')].map(x=>norm(x.textContent));
      if(!cells.length)return;
      const pctCell=cells.find(x=>/%/.test(x));
      if(!pctCell)return;
      const value=Number(pctCell.replace('%','').replace(',','.').replace(/[^0-9.]/g,''));
      if(Number.isFinite(value)&&(!best||value>best.value)) best={label:cells[0],value,text:pctCell};
    });
    const block=document.createElement('div');
    block.className='apa-table-block';
    table.parentNode.insertBefore(block,table);
    const context=document.createElement('p');
    context.className='apa-table-context';
    const headerSummary=headers.slice(0,3).map(x=>x.toLowerCase()).join(', ');
    context.textContent=headerSummary?('Para sustentar la lectura de esta sección, se contrastan '+headerSummary+' mediante la siguiente tabla.'):('Para sustentar la lectura de esta sección, los resultados se organizan en la siguiente tabla.');
    block.appendChild(context);
    const num=document.createElement('div');num.className='apa-table-number';num.textContent='Tabla '+number;block.appendChild(num);
    const ttl=document.createElement('div');ttl.className='apa-table-title';ttl.textContent=title;block.appendChild(ttl);
    block.appendChild(table);
    const note=document.createElement('div');note.className='apa-table-note';const hasPercent=headers.some(x=>x.includes('%'))||rows.some(row=>[...row.querySelectorAll('td')].some(td=>/%/.test(td.textContent||'')));
    note.innerHTML=hasPercent?'<em>Nota.</em> Elaboración propia a partir de los registros consolidados en DocFormación. Los porcentajes se calculan sobre la base correspondiente a cada sección; las diferencias por redondeo pueden afectar el total.':'<em>Nota.</em> Elaboración propia a partir de los registros consolidados en DocFormación.';block.appendChild(note);
    const analysis=document.createElement('p');analysis.className='apa-table-analysis';
    analysis.innerHTML=best?('<strong>Análisis.</strong> La mayor proporción observada corresponde a <strong>'+esc(best.label)+'</strong>, con '+esc(best.text)+'. Este resultado debe relacionarse con las demás variables de la sección antes de establecer una prioridad o decisión dentro del Plan de Formación.'):('<strong>Análisis.</strong> La tabla permite organizar y comparar la información utilizada en esta sección. Su lectura debe complementarse con los resultados gráficos y el análisis narrativo para orientar la decisión institucional.');
    block.appendChild(analysis);
  });
  return holder.innerHTML;
}
function dnfHtml(){
  const title='Detección de Necesidades de Formación';
  const code=state.period.dnfCode;
  const careers=dnfCareerNames();
  careers.forEach(name=>ensureNeedItems(name));

  const profiles=careers.map(career=>{
    const coord=ensureCoordination(career);
    const needs=ensureNeedItems(career).filter(item=>norm(item.text));
    return {
      career,
      program:programForCareer(career)||'Por definir',
      coordinator:norm(coord?.coordinador)||'Por definir',
      needs,
      high:needs.filter(x=>x.priorityOverride==='Alta').length,
      medium:needs.filter(x=>x.priorityOverride==='Media').length,
      low:needs.filter(x=>x.priorityOverride==='Baja').length
    };
  });

  const totalCareers=careers.length;
  const allNeeds=profiles.flatMap(p=>p.needs.map(item=>({career:p.career,...item})));
  const totalNeeds=allNeeds.length;
  const genericLines=(state.settings.genericLines||[]).filter(norm);
  const completeCoordinators=profiles.filter(p=>p.coordinator!=='Por definir').length;
  const careersWithNeeds=profiles.filter(p=>p.needs.length).length;
  const coverage=pct(careersWithNeeds,Math.max(1,totalCareers));

  const needsByCareer={};
  const highByCareer={};
  const mediumByCareer={};
  const lowByCareer={};
  profiles.forEach(p=>{
    needsByCareer[p.career]=p.needs.length;
    highByCareer[p.career]=p.high;
    mediumByCareer[p.career]=p.medium;
    lowByCareer[p.career]=p.low;
  });

  const priorityDist={Alta:0,Media:0,Baja:0};
  const needFrequency={};
  allNeeds.forEach(item=>{
    const priority=norm(item.priorityOverride)||'Sin definir';
    if(priorityDist[priority]!==undefined) priorityDist[priority]++;
    const key=norm(item.text);
    if(key) needFrequency[key]=(needFrequency[key]||0)+1;
  });

  const topNeed=reportEntries(needFrequency)[0]||['Sin información',0];
  const highCount=Number(priorityDist.Alta||0);
  const mediumCount=Number(priorityDist.Media||0);
  const lowCount=Number(priorityDist.Baja||0);

  const pages=[];
  const add=(tocLabel,body,extraClass='')=>pages.push({tocLabel,body,extraClass});
  const dnfResponsible={preparedBy:'Mgs. Jefferson Villarreal',preparedRole:'Gestor de Procesos Académicos',reviewedBy:'Ing. Martha Tomalá',reviewedRole:'Coordinadora General de Carreras',approvedBy:'Dr. Alex León',approvedRole:'Vicerrector'};

  const coverBody='<div class="cover-body">'+
    '<div class="cover-title"><h1>'+esc(title)+'</h1><div class="period">'+esc(periodLabel())+'</div></div>'+
    '<table class="signature-table">'+
      '<tr class="sig-space"><td><span class="sig-label">ELABORADO POR:</span></td><td><span class="sig-label">REVISADO POR:</span></td><td><span class="sig-label">APROBADO POR:</span></td></tr>'+
      '<tr class="sig-name"><td><span class="label-inline">NOMBRE:</span>'+esc(dnfResponsible.preparedBy)+'</td><td><span class="label-inline">NOMBRE:</span>'+esc(dnfResponsible.reviewedBy)+'</td><td><span class="label-inline">NOMBRE:</span>'+esc(dnfResponsible.approvedBy)+'</td></tr>'+
      '<tr class="sig-role-row"><td><span class="label-inline">CARGO:</span>'+esc(dnfResponsible.preparedRole)+'</td><td><span class="label-inline">CARGO:</span>'+esc(dnfResponsible.reviewedRole)+'</td><td><span class="label-inline">CARGO:</span>'+esc(dnfResponsible.approvedRole)+'</td></tr>'+
    '</table></div>';
  add(null,coverBody,'cover-page');
  add('Índice general','__DNF_TOC__');

  add('1. Introducción',
    '<div class="sec-title">1. Introducción</div>'+
    '<p class="lead">La Detección de Necesidades de Formación constituye el punto de partida para organizar la planificación institucional de formación académica. Su propósito es identificar, por carrera, las necesidades que requieren atención durante el período y establecer una prioridad que permita orientar posteriormente el Plan de Formación Docente.</p>'+
    '<p>El presente documento se construye a nivel institucional y por carrera. No requiere incorporar nombres, cédulas ni fichas individuales de docentes. La unidad de análisis es la <strong>necesidad de formación registrada por cada carrera</strong>, validada por su coordinación y organizada según prioridad.</p>'+
    '<div class="sub-title">1.1 Finalidad</div>'+
    '<p>Consolidar las necesidades específicas de las carreras y las líneas genéricas institucionales, identificar recurrencias y prioridades, y establecer una base técnica para la elaboración del Plan de Formación Docente.</p>'+
    '<div class="sub-title">1.2 Alcance</div>'+
    '<p>La DNF comprende formación académica vinculada con el fortalecimiento disciplinar, metodológico, curricular, investigativo y de cualificación profesional. La capacitación de corta duración se mantiene como un proceso distinto y no sustituye las necesidades de formación identificadas en este documento.</p>'+
    '<div class="flow"><div class="flow-box"><strong>DNF</strong><br>Identifica necesidades</div><div class="flow-arrow">→</div><div class="flow-box"><strong>Priorización</strong><br>Ordena la intervención</div><div class="flow-arrow">→</div><div class="flow-box"><strong>Plan</strong><br>Define rutas y metas</div><div class="flow-arrow">→</div><div class="flow-box"><strong>Informe</strong><br>Evalúa cumplimiento</div></div>'
  );

  add(null,
    '<div class="sec-title">1. Introducción</div>'+
    '<div class="sub-title">1.3 Principios de aplicación</div>'+
    '<div class="three-col"><div class="panel"><h3>Pertinencia</h3><p class="small">Cada necesidad debe relacionarse con la realidad académica de la carrera y con sus objetivos de fortalecimiento.</p></div><div class="panel"><h3>Priorización</h3><p class="small">Las necesidades se ordenan como Alta, Media o Baja según la valoración institucional registrada para el período.</p></div><div class="panel"><h3>Trazabilidad</h3><p class="small">Las necesidades consolidadas deben poder rastrearse posteriormente en el Plan y en el Informe de Cumplimiento.</p></div></div>'+
    '<div class="sub-title">1.4 Productos del diagnóstico</div>'+
    '<ol class="number-list"><li>Mapa institucional de necesidades específicas por carrera.</li><li>Distribución de necesidades por prioridad.</li><li>Identificación de necesidades recurrentes entre carreras.</li><li>Líneas genéricas institucionales de formación.</li><li>Lineamientos para traducir el diagnóstico al Plan de Formación.</li></ol>'
  );

  add('2. Base legal y normativa',
    '<div class="sec-title">2. Base legal y normativa</div>'+
    '<p class="section-intro">La DNF se enmarca en la normativa nacional de educación superior, los criterios de aseguramiento de la calidad y la planificación institucional que orientan el desarrollo y fortalecimiento del personal académico.</p>'+
    '<div class="sub-title">2.1 Referentes nacionales</div>'+
    '<div class="quote-box"><strong>Constitución de la República del Ecuador.</strong> Sustenta el derecho a la educación, la calidad y el desarrollo profesional del personal académico.</div>'+
    '<div class="quote-box"><strong>Ley Orgánica de Educación Superior.</strong> Vincula la calidad de la educación superior con la cualificación y desarrollo del personal académico.</div>'+
    '<div class="quote-box"><strong>Reglamento de Carrera y Escalafón.</strong> Constituye un referente para la progresión y desarrollo de la carrera académica.</div>'+
    '<div class="sub-title">2.2 Aseguramiento de la calidad</div>'+
    '<p>Los procesos de evaluación y aseguramiento de la calidad requieren evidencias de diagnóstico, planificación, ejecución y seguimiento. La DNF cumple la función de sustentar técnicamente las decisiones que luego se materializan en el Plan.</p>'
  );

  add(null,
    '<div class="sec-title">2. Base legal y normativa</div>'+
    '<div class="sub-title">2.3 Referentes institucionales</div>'+
    '<table class="data" data-apa-title="Referentes institucionales para la DNF"><tr><th>Referente</th><th>Aplicación</th></tr><tr><td>PEDI</td><td>Articula el desarrollo del talento humano con los objetivos estratégicos y de calidad.</td></tr><tr><td>POA</td><td>Permite convertir necesidades priorizadas en acciones, responsables y metas del período.</td></tr><tr><td>Reglamento institucional de formación</td><td>Orienta las decisiones de formación académica y los mecanismos de apoyo.</td></tr><tr><td>Manual del proceso de formación académica</td><td>Organiza la secuencia DNF → Plan → Seguimiento → Informe.</td></tr></table>'+
    '<div class="callout"><strong>Aplicación:</strong> el marco normativo justifica el proceso; la necesidad concreta y su prioridad se registran a nivel de carrera.</div>'
  );

  add('3. Alineación institucional y estratégica',
    '<div class="sec-title">3. Alineación institucional y estratégica</div>'+
    '<p class="lead">La DNF debe conectar las necesidades de las carreras con la planificación institucional. Esto evita construir un Plan de Formación a partir de solicitudes aisladas y permite orientar los recursos hacia áreas de mayor relevancia académica.</p>'+
    '<div class="sub-title">3.1 Relación con la planificación</div>'+
    '<table class="data" data-apa-title="Relación entre la DNF y la planificación institucional"><tr><th>Componente</th><th>Aporte de la DNF</th></tr><tr><td>Planificación académica</td><td>Identifica campos que requieren fortalecimiento en las carreras.</td></tr><tr><td>Calidad</td><td>Genera evidencia diagnóstica y criterios de priorización.</td></tr><tr><td>Formación docente</td><td>Define las necesidades que deben transformarse en rutas, metas y acciones.</td></tr><tr><td>Seguimiento</td><td>Permite verificar posteriormente qué necesidades fueron atendidas.</td></tr></table>'+
    '<div class="flow"><div class="flow-box">Carreras</div><div class="flow-arrow">→</div><div class="flow-box">Necesidades</div><div class="flow-arrow">→</div><div class="flow-box">Prioridades</div><div class="flow-arrow">→</div><div class="flow-box">Plan</div></div>'
  );

  add('4. Metodología y enfoque',
    '<div class="sec-title">4. Metodología y enfoque</div>'+
    '<div class="sub-title">4.1 Unidad de análisis</div>'+
    '<p>La unidad de análisis es la <strong>necesidad de formación por carrera</strong>. La DNF no utiliza nombres ni fichas individuales como requisito documental. Cada carrera puede registrar hasta tres necesidades específicas y cada necesidad debe contar con una prioridad definida.</p>'+
    '<div class="sub-title">4.2 Fuentes de información</div>'+
    '<ul class="body-list"><li>Catálogo institucional de carreras.</li><li>Información de coordinaciones académicas.</li><li>Necesidades específicas registradas por carrera.</li><li>Líneas genéricas institucionales definidas para el período.</li><li>Documentos de planificación y normativa institucional.</li></ul>'+
    '<div class="sub-title">4.3 Variables analizadas</div>'+
    '<table class="data" data-apa-title="Variables utilizadas en la DNF"><tr><th>Dimensión</th><th>Variables</th></tr><tr><td>Identificación académica</td><td>Carrera, programa institucional y coordinación responsable.</td></tr><tr><td>Necesidad específica</td><td>Descripción de la necesidad de formación registrada por carrera.</td></tr><tr><td>Prioridad</td><td>Alta, Media o Baja.</td></tr><tr><td>Transversalidad</td><td>Frecuencia con que una misma necesidad aparece en distintas carreras.</td></tr><tr><td>Formación genérica</td><td>Líneas institucionales comunes a varias carreras.</td></tr></table>'
  );

  add(null,
    '<div class="sec-title">4. Metodología y enfoque</div>'+
    '<div class="sub-title">4.4 Criterios de priorización</div>'+
    '<div class="criteria"><div><strong>Alta</strong>Necesidad que requiere atención prioritaria en el siguiente Plan de Formación.</div><div><strong>Media</strong>Necesidad relevante que puede programarse según disponibilidad y secuencia institucional.</div><div><strong>Baja</strong>Necesidad de seguimiento o desarrollo posterior.</div></div>'+
    '<div class="sub-title">4.5 Secuencia de análisis</div>'+
    '<div class="flow"><div class="flow-box">Registro por carrera</div><div class="flow-arrow">→</div><div class="flow-box">Consolidación</div><div class="flow-arrow">→</div><div class="flow-box">Frecuencia</div><div class="flow-arrow">→</div><div class="flow-box">Prioridad</div><div class="flow-arrow">→</div><div class="flow-box">Lineamientos</div></div>'+
    '<div class="sub-title">4.6 Criterio de lectura</div>'+
    '<p>Los resultados se interpretan en dos niveles: primero, la situación particular de cada carrera; segundo, la recurrencia institucional de una misma necesidad. Una necesidad puede ser prioritaria por su valoración dentro de una carrera, por su repetición en varias carreras o por ambas condiciones.</p>'
  );

  add('5. Caracterización institucional de necesidades',
    '<div class="sec-title">5. Caracterización institucional de necesidades</div>'+
    '<p class="section-intro">La caracterización resume el alcance del diagnóstico a partir de las carreras configuradas, las necesidades específicas registradas y las líneas genéricas institucionales.</p>'+
    '<div class="kpi-row"><div class="kpi"><strong>'+totalCareers+'</strong><span>Carreras</span></div><div class="kpi"><strong>'+totalNeeds+'</strong><span>Necesidades específicas</span></div><div class="kpi"><strong>'+genericLines.length+'</strong><span>Líneas genéricas</span></div><div class="kpi"><strong>'+fmtPct(coverage)+'</strong><span>Cobertura de carreras</span></div></div>'+
    '<div class="chart-grid">'+barChart('Necesidades registradas por carrera',needsByCareer,Math.max(1,totalNeeds),'Participación de cada carrera en el conjunto de necesidades',15)+'</div>'+
    '<p>La cobertura del diagnóstico alcanza <strong>'+fmtPct(coverage)+'</strong> de las carreras configuradas. Este indicador permite verificar si la DNF incorpora necesidades para toda la oferta institucional considerada en el período.</p>'
  );

  add(null,
    '<div class="sec-title">5. Caracterización institucional de necesidades</div>'+
    '<div class="sub-title">5.1 Responsables y estructura académica</div>'+
    '<table class="data" data-apa-title="Carreras, programas y responsables del diagnóstico"><tr><th>Carrera</th><th>Programa</th><th>Coordinador/a</th><th>N.º de necesidades</th></tr>'+
      profiles.map(p=>'<tr><td>'+esc(p.career)+'</td><td>'+esc(p.program)+'</td><td>'+esc(p.coordinator)+'</td><td class="num">'+p.needs.length+'</td></tr>').join('')+
    '</table>'+
    '<p>Se registran coordinadores definidos en <strong>'+completeCoordinators+' de '+totalCareers+'</strong> carreras. La coordinación es responsable de validar la pertinencia de las necesidades consignadas para su carrera.</p>'
  );

  add('6. Análisis de brechas y necesidades institucionales',
    '<div class="sec-title">6. Análisis de brechas y necesidades institucionales</div>'+
    '<p class="section-intro">En esta DNF, la brecha se representa mediante la necesidad formativa que una carrera declara como requerida para fortalecer su desarrollo académico. El análisis se concentra en la prioridad, recurrencia y distribución institucional de esas necesidades.</p>'+
    '<div class="chart-grid">'+barChart('Distribución de prioridades',priorityDist,Math.max(1,totalNeeds),'Necesidades específicas clasificadas como Alta, Media o Baja',5)+barChart('Necesidades recurrentes entre carreras',needFrequency,Math.max(1,totalCareers),'Número de carreras en las que aparece cada necesidad',12)+'</div>'+
    '<p>La DNF registra <strong>'+highCount+'</strong> necesidades de prioridad Alta, <strong>'+mediumCount+'</strong> de prioridad Media y <strong>'+lowCount+'</strong> de prioridad Baja. La necesidad con mayor recurrencia institucional es <strong>'+esc(topNeed[0])+'</strong>, presente en '+topNeed[1]+' carrera(s).</p>'
  );

  add(null,
    '<div class="sec-title">6. Análisis de brechas y necesidades institucionales</div>'+
    '<div class="sub-title">6.1 Prioridad por carrera</div>'+
    '<table class="data" data-apa-title="Distribución de prioridades por carrera"><tr><th>Carrera</th><th>Alta</th><th>Media</th><th>Baja</th><th>Total</th></tr>'+
      profiles.map(p=>'<tr><td>'+esc(p.career)+'</td><td class="num">'+p.high+'</td><td class="num">'+p.medium+'</td><td class="num">'+p.low+'</td><td class="num">'+p.needs.length+'</td></tr>').join('')+
    '</table>'+
    '<div class="chart-grid">'+barChart('Necesidades de prioridad alta por carrera',highByCareer,Math.max(1,highCount),'Concentración de necesidades que requieren atención prioritaria',15)+'</div>'
  );

  add('7. Necesidades específicas por carrera',
    '<div class="sec-title">7. Necesidades específicas por carrera</div>'+
    '<p class="lead">Las necesidades específicas se presentan por carrera para conservar la pertinencia disciplinar. Cada registro mantiene su prioridad y se vincula con la coordinación responsable.</p>'+
    '<div class="chart-grid">'+barChart('Necesidades registradas por carrera',needsByCareer,Math.max(1,totalNeeds),'Cantidad de necesidades específicas declaradas en cada carrera',15)+'</div>'
  );

  profiles.forEach((p,index)=>{
    const priorityText=p.high?'Alta':p.medium?'Media':p.low?'Baja':'Sin definir';
    add(null,
      '<div class="sec-title">7.'+(index+2)+' '+esc(p.career)+'</div>'+
      '<div class="kpi-row"><div class="kpi"><strong>'+p.needs.length+'</strong><span>Necesidades</span></div><div class="kpi"><strong>'+p.high+'</strong><span>Alta</span></div><div class="kpi"><strong>'+p.medium+'</strong><span>Media</span></div><div class="kpi"><strong>'+p.low+'</strong><span>Baja</span></div></div>'+
      '<p><strong>Programa:</strong> '+esc(p.program)+'<br><strong>Coordinador/a:</strong> '+esc(p.coordinator)+'</p>'+
      '<table class="data" data-apa-title="Necesidades de formación de '+esc(p.career)+'"><tr><th>N.º</th><th>Necesidad de formación</th><th>Prioridad</th></tr>'+
        p.needs.map((item,i)=>'<tr><td class="num">'+(i+1)+'</td><td>'+esc(item.text)+'</td><td class="num">'+esc(item.priorityOverride||'Sin definir')+'</td></tr>').join('')+
      '</table>'+
      '<div class="sub-title">Interpretación</div>'+
      '<p>La carrera registra '+p.needs.length+' necesidad(es) específica(s). La prioridad institucional más alta presente en este bloque es <strong>'+esc(priorityText)+'</strong>. Estas necesidades deben trasladarse al Plan respetando su pertinencia y el orden de intervención definido para el período.</p>'
    );
  });

  add('8. Líneas genéricas institucionales de formación',
    '<div class="sec-title">8. Líneas genéricas institucionales de formación</div>'+
    '<p class="lead">Las líneas genéricas corresponden a ámbitos transversales que pueden atender a varias carreras. Se mantienen separadas de las necesidades específicas para evitar que una línea común sustituya una necesidad disciplinar.</p>'+
    (genericLines.length?'<table class="data" data-apa-title="Líneas genéricas institucionales"><tr><th>N.º</th><th>Línea genérica</th><th>Uso previsto</th></tr>'+genericLines.map((x,i)=>'<tr><td class="num">'+(i+1)+'</td><td>'+esc(x)+'</td><td>Complementar las necesidades específicas cuando exista pertinencia institucional.</td></tr>').join('')+'</table>':'<div class="info-box">No se registraron líneas genéricas para el período.</div>')+
    '<div class="callout"><strong>Regla:</strong> una línea genérica no reemplaza una necesidad específica de carrera; ambas se planifican de forma diferenciada.</div>'
  );

  add('9. Priorización institucional',
    '<div class="sec-title">9. Priorización institucional</div>'+
    '<p class="section-intro">La priorización ordena las necesidades antes de la elaboración del Plan de Formación. Se consideran la prioridad registrada en cada carrera y la recurrencia de una misma necesidad en la institución.</p>'+
    '<div class="chart-grid">'+barChart('Distribución de prioridades',priorityDist,Math.max(1,totalNeeds),'Composición del diagnóstico según prioridad',5)+barChart('Recurrencia institucional de necesidades',needFrequency,Math.max(1,totalCareers),'Carreras en las que se repite cada necesidad',12)+'</div>'+
    '<table class="data" data-apa-title="Matriz institucional de priorización"><tr><th>Necesidad</th><th>Carreras donde aparece</th><th>Prioridad mayor registrada</th></tr>'+
      reportEntries(needFrequency).map(([need,count])=>{
        const related=allNeeds.filter(x=>norm(x.text)===need);
        const rank={Alta:3,Media:2,Baja:1};
        const highest=related.map(x=>x.priorityOverride).sort((a,b)=>(rank[b]||0)-(rank[a]||0))[0]||'Sin definir';
        return '<tr><td>'+esc(need)+'</td><td class="num">'+count+'</td><td class="num">'+esc(highest)+'</td></tr>';
      }).join('')+
    '</table>'
  );

  add('10. Propuesta de lineamientos para el Plan de Formación',
    '<div class="sec-title">10. Propuesta de lineamientos para el Plan de Formación</div>'+
    '<p class="lead">El Plan de Formación debe tomar las necesidades consolidadas en esta DNF y convertirlas en acciones institucionales verificables. La DNF define qué debe atenderse; el Plan define cómo, cuándo, con qué recursos y bajo qué metas.</p>'+
    '<div class="sub-title">10.1 Criterios de traslado al Plan</div>'+
    '<ol class="number-list"><li>Atender primero las necesidades de prioridad Alta.</li><li>Considerar la recurrencia institucional como criterio complementario de priorización.</li><li>Mantener separadas las necesidades específicas y las líneas genéricas.</li><li>Definir para cada línea seleccionada una modalidad, institución o mecanismo de ejecución pertinente.</li><li>Establecer metas e indicadores que permitan evaluar posteriormente el cumplimiento.</li></ol>'+
    '<div class="sub-title">10.2 Secuencia sugerida</div>'+
    '<div class="flow"><div class="flow-box">Necesidad priorizada</div><div class="flow-arrow">→</div><div class="flow-box">Ruta formativa</div><div class="flow-arrow">→</div><div class="flow-box">Meta</div><div class="flow-arrow">→</div><div class="flow-box">Seguimiento</div></div>'
  );

  add(null,
    '<div class="sec-title">10. Propuesta de lineamientos para el Plan de Formación</div>'+
    '<div class="sub-title">10.3 Matriz de decisión</div>'+
    '<table class="data" data-apa-title="Criterios para trasladar necesidades al Plan"><tr><th>Criterio</th><th>Pregunta de decisión</th><th>Aplicación</th></tr><tr><td>Prioridad</td><td>¿La necesidad está clasificada como Alta?</td><td>Atención preferente.</td></tr><tr><td>Recurrencia</td><td>¿La necesidad aparece en varias carreras?</td><td>Evaluar una respuesta institucional compartida.</td></tr><tr><td>Pertinencia</td><td>¿La acción propuesta responde directamente a la necesidad?</td><td>Validar antes de programar.</td></tr><tr><td>Viabilidad</td><td>¿Existe una alternativa real de ejecución?</td><td>Definir modalidad, institución, convenio o apoyo.</td></tr><tr><td>Seguimiento</td><td>¿Puede medirse el resultado?</td><td>Definir indicadores y evidencias.</td></tr></table>'
  );

  add('11. Resumen ejecutivo',
    '<div class="sec-title">11. Resumen ejecutivo</div>'+
    '<p class="lead">La Detección de Necesidades de Formación del período '+esc(periodLabel())+' consolida información de <strong>'+totalCareers+' carreras</strong>, con <strong>'+totalNeeds+' necesidades específicas</strong> y <strong>'+genericLines.length+' líneas genéricas institucionales</strong>.</p>'+
    '<div class="kpi-row"><div class="kpi"><strong>'+totalCareers+'</strong><span>Carreras</span></div><div class="kpi"><strong>'+totalNeeds+'</strong><span>Necesidades</span></div><div class="kpi"><strong>'+highCount+'</strong><span>Prioridad alta</span></div><div class="kpi"><strong>'+fmtPct(coverage)+'</strong><span>Cobertura</span></div></div>'+
    '<p>La necesidad con mayor recurrencia institucional es <strong>'+esc(topNeed[0])+'</strong>, registrada en '+topNeed[1]+' carrera(s). El diagnóstico identifica '+highCount+' necesidades de prioridad Alta, '+mediumCount+' de prioridad Media y '+lowCount+' de prioridad Baja.</p>'+
    '<p>El siguiente paso consiste en trasladar las necesidades priorizadas al Plan de Formación, definiendo rutas, metas, responsables, modalidades y mecanismos de seguimiento sin convertir este documento en una nómina de docentes.</p>'
  );

  add('12. Conclusiones',
    '<div class="sec-title">12. Conclusiones</div>'+
    '<ol class="number-list"><li>La DNF se consolida a nivel institucional y por carrera, sin requerir información nominal de docentes.</li><li>El período registra '+totalNeeds+' necesidades específicas distribuidas en '+totalCareers+' carreras.</li><li>Las necesidades de prioridad Alta constituyen el primer grupo de atención para la elaboración del Plan.</li><li>La recurrencia de una misma necesidad en distintas carreras permite identificar oportunidades de respuesta institucional compartida.</li><li>Las líneas genéricas deben complementar, y no sustituir, las necesidades específicas de cada carrera.</li><li>La trazabilidad entre DNF, Plan e Informe permite evaluar posteriormente qué necesidades fueron atendidas y con qué resultados.</li></ol>'
  );

  add('13. Recomendaciones',
    '<div class="sec-title">13. Recomendaciones</div>'+
    '<ul class="number-list"><li>Validar con cada coordinación las necesidades registradas antes del cierre formal del documento.</li><li>Priorizar en el Plan las necesidades clasificadas como Alta y aquellas con recurrencia institucional.</li><li>Mantener actualizado el catálogo de carreras y responsables.</li><li>Evitar utilizar nombres, cédulas o fichas individuales dentro de la DNF institucional.</li><li>Definir metas verificables para cada línea que pase al Plan de Formación.</li><li>Utilizar el Informe de Cumplimiento como retroalimentación para la siguiente DNF.</li></ul>'
  );

  add('14. Referencias',
    '<div class="sec-title">14. Referencias</div>'+
    '<ul class="number-list"><li>Constitución de la República del Ecuador.</li><li>Ley Orgánica de Educación Superior (LOES).</li><li>Reglamento de Carrera y Escalafón del Personal Académico del Sistema de Educación Superior.</li><li>Consejo de Aseguramiento de la Calidad de la Educación Superior (CACES). Modelo de evaluación externa aplicable.</li><li>Instituto Superior Tecnológico Quito Metropolitano. Plan Estratégico de Desarrollo Institucional.</li><li>Instituto Superior Tecnológico Quito Metropolitano. Reglamento de Formación Docente.</li><li>Instituto Superior Tecnológico Quito Metropolitano. Manual del proceso de Formación Académica.</li></ul>'
  );

  add('15. Anexos',
    '<div class="sec-title">15. Anexos</div>'+
    '<div class="sub-title">15.1 Matriz consolidada por carrera</div>'+
    '<table class="data" data-apa-title="Matriz consolidada de necesidades por carrera"><tr><th>Carrera</th><th>Programa</th><th>Coordinador/a</th><th>Alta</th><th>Media</th><th>Baja</th><th>Total</th></tr>'+
      profiles.map(p=>'<tr><td>'+esc(p.career)+'</td><td>'+esc(p.program)+'</td><td>'+esc(p.coordinator)+'</td><td class="num">'+p.high+'</td><td class="num">'+p.medium+'</td><td class="num">'+p.low+'</td><td class="num">'+p.needs.length+'</td></tr>').join('')+
    '</table>'+
    '<div class="sub-title">15.2 Necesidades consolidadas</div>'+
    '<table class="data" data-apa-title="Frecuencia institucional de necesidades"><tr><th>Necesidad</th><th>N.º de carreras</th></tr>'+
      reportEntries(needFrequency).map(([need,count])=>'<tr><td>'+esc(need)+'</td><td class="num">'+count+'</td></tr>').join('')+
    '</table>'
  );

  add(null,
    '<div class="sec-title">15. Anexos</div>'+
    '<div class="sub-title">15.3 Detalle completo de necesidades</div>'+
    '<table class="data annex-table" data-apa-title="Detalle de necesidades específicas por carrera"><tr><th>Carrera</th><th>Necesidad</th><th>Prioridad</th></tr>'+
      allNeeds.map(item=>'<tr><td>'+esc(item.career)+'</td><td>'+esc(item.text)+'</td><td>'+esc(item.priorityOverride||'Sin definir')+'</td></tr>').join('')+
    '</table>'+
    '<div class="sub-title">15.4 Líneas genéricas</div>'+
    '<table class="data" data-apa-title="Líneas genéricas institucionales"><tr><th>N.º</th><th>Línea</th></tr>'+genericLines.map((x,i)=>'<tr><td class="num">'+(i+1)+'</td><td>'+esc(x)+'</td></tr>').join('')+'</table>'
  );

  const seenSectionTitles=new Set();
  pages.forEach(page=>{
    const match=page.body.match(/^\s*<div class="sec-title">([^<]+)<\/div>/);
    if(!match) return;
    const full=norm(match[1]);
    const careerContinuation=full.match(/^(7\.\d+)\s+(.+?)\s+-\s+(.+)$/i);
    if(careerContinuation){
      const topic=careerContinuation[3].trim();
      page.body='<div class="page-topic">'+esc(topic.charAt(0).toUpperCase()+topic.slice(1))+'</div>'+page.body.slice(match[0].length);
      return;
    }
    const key=full.toLowerCase();
    if(page.tocLabel===null || seenSectionTitles.has(key)){
      page.body=page.body.slice(match[0].length);
      return;
    }
    seenSectionTitles.add(key);
  });

  const tocRows=[];
  pages.forEach((page,index)=>{
    if(page.tocLabel && page.tocLabel!=='Índice general') tocRows.push([page.tocLabel,index+1]);
  });
  pages[1].body='<div class="sec-title">Índice general</div><table class="toc">'+tocRows.map(([label,page])=>'<tr><td>'+esc(label)+'</td><td>'+page+'</td></tr>').join('')+'</table>';

  const totalPages=pages.length;
  let body='<div class="pdf-document">'+pages.map((page,index)=>dnfPage(title,code,index+1,totalPages,page.body,page.extraClass||'')).join('')+'</div>';
  body=enhanceApaTables(body);
  return htmlDoc(title,body,true);
}
function planHtml(){
  ensurePlanRows();
  const rows=state.plan.filter(p=>p.selected);
  const total=state.teachers.length;
  const coverage=pct(rows.length,total);
  const by=(getter)=>{
    const map={};
    rows.forEach(p=>{
      const key=norm(getter(p))||'Sin información';
      map[key]=(map[key]||0)+1;
    });
    return map;
  };
  const aggRows=(map)=>Object.entries(map).sort((a,b)=>b[1]-a[1]).map(([label,count])=>
    '<tr><td>'+esc(label)+'</td><td>'+count+'</td><td>'+fmtPct(pct(count,Math.max(1,rows.length)))+'</td></tr>'
  ).join('');
  const byCareer=by(p=>teacherById(p.teacherId)?.carrera);
  const byLevel=by(p=>p.level);
  const byProgram=by(p=>p.program);
  const byInstitution=by(p=>p.institution||'Por definir');
  const byModality=by(p=>p.modality);
  const bySupport=by(p=>p.supportType);
  return htmlDoc('Plan de Formación Docente',`
    ${cover('Plan de Formación Docente',state.period.planCode)}
    <div class="page-break"></div>${pdfHeader('Plan de Formación Docente',state.period.planCode)}
    <div class="h1">1. Introducción</div>
    <p>El presente Plan se construye a partir de la Detección de Necesidades de Formación del mismo período. La identificación individual de los docentes permanece en la gestión interna de la aplicación para selección y seguimiento; el documento institucional presenta la planificación de forma consolidada.</p>
    <div class="h1">2. Objetivo</div>
    <p>Orientar la formación académica del personal docente mediante rutas pertinentes y verificables, alineadas con las brechas identificadas y las prioridades institucionales.</p>
    <div class="h1">3. Diagnóstico resumido</div>
    <p>La base institucional contiene ${total} docentes. La población proyectada para formación corresponde a ${rows.length} docentes, equivalente al ${fmtPct(coverage)}. La meta configurada para el período es ${fmtPct(state.period.targetPercent)}.</p>
    <div class="h1">4. Planificación consolidada de la formación</div>
    <p>Esta sección presenta la distribución de la población proyectada sin incorporar nombres, cédulas ni fichas individuales en el PDF institucional.</p>
    <div class="h2">4.1 Distribución por carrera</div>
    <table class="data"><tr><th>Carrera</th><th>Docentes proyectados</th><th>% del Plan</th></tr>${aggRows(byCareer)}</table>
    <div class="h2">4.2 Nivel de formación proyectado</div>
    <table class="data"><tr><th>Nivel</th><th>Docentes proyectados</th><th>% del Plan</th></tr>${aggRows(byLevel)}</table>
    <div class="h2">4.3 Programas proyectados</div>
    <table class="data"><tr><th>Programa</th><th>Docentes proyectados</th><th>% del Plan</th></tr>${aggRows(byProgram)}</table>
    <div class="h2">4.4 Instituciones proyectadas</div>
    <table class="data"><tr><th>Institución</th><th>Docentes proyectados</th><th>% del Plan</th></tr>${aggRows(byInstitution)}</table>
    <div class="h2">4.5 Modalidad y apoyo</div>
    <table class="data"><tr><th>Modalidad</th><th>Docentes proyectados</th><th>% del Plan</th></tr>${aggRows(byModality)}</table>
    <table class="data"><tr><th>Tipo de apoyo</th><th>Docentes proyectados</th><th>% del Plan</th></tr>${aggRows(bySupport)}</table>
    <div class="h1">5. Acciones institucionales</div>
    <ol>${state.settings.planActions.map(x=>'<li>'+esc(x)+'</li>').join('')}</ol>
    <div class="h1">6. Metas e indicadores</div>
    <table class="data"><tr><th>Indicador</th><th>Meta / referencia</th></tr><tr><td>Población proyectada para formación</td><td>${rows.length} docentes</td></tr><tr><td>Cobertura del Plan</td><td>${fmtPct(coverage)}</td></tr><tr><td>Meta institucional configurada</td><td>${fmtPct(state.period.targetPercent)}</td></tr></table>
    <div class="h1">7. Seguimiento</div>
    <p>El seguimiento se realiza sobre la misma base interna y registra estado, fecha real de inicio, fecha prevista de finalización, porcentaje de avance, evidencia y abandono cuando corresponda. Los datos nominales permanecen en la gestión operativa y no en el cuerpo del Plan institucional.</p>
    <div class="h1">8. Conclusión</div>
    <p>El Plan traduce las prioridades del diagnóstico en una planificación institucional consolidada y mantiene la trazabilidad interna entre DNF, planificación y resultados sin convertir el documento en una nómina de docentes.</p>
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
function htmlDoc(title,body,exactPages=false){
  const footer=exactPages?'':'<div class="footer">ITSQMET · Unidad de Gestión de Procesos Académicos</div>';
  return '<!doctype html><html><head><meta charset="UTF-8"><title>'+esc(title)+'</title>'+basePdfCss(exactPages)+'</head><body>'+body+footer+'</body></html>';
}
async function generateDocument(type){
  syncPeriodCodes(state.period);
  if(type==='plan' && !state.plan.some(p=>p.selected)){toast('Selecciona docentes en el Plan');return;}
  if(type==='informe' && !state.plan.some(p=>p.selected)){toast('No hay docentes planificados');return;}

  const payload = type==='dnf'
    ? {filename:'Deteccion_Necesidades_Formacion.pdf',html:dnfHtml(),exactPages:true}
    : type==='plan'
    ? {filename:'Plan_Formacion_Docente.pdf',html:planHtml()}
    : {filename:'Informe_Cumplimiento_Plan_Formacion.pdf',html:informeHtml()};

  const button = $('#generateCurrent') || document.querySelector('[data-generate="'+type+'"]');
  const previousText = button?.textContent || 'Generar PDF';
  if(button){
    button.disabled = true;
    button.textContent = 'Generando PDF…';
  }
  toast('Generando PDF…');

  const onPdfProgress=(event)=>{
    if(type!=='dnf') return;
    const d=event?.detail||{};
    if(!button) return;
    if(d.phase==='assembling'){
      button.textContent='Armando PDF…';
    }else if(d.phase==='done'){
      button.textContent='Descargando…';
    }else if(d.total){
      button.textContent='Generando PDF '+d.current+'/'+d.total+'…';
    }
  };
  window.addEventListener('docformacion-pdf-progress',onPdfProgress);

  try{
    const r=await window.docformacion.generatePDF(payload);
    if(r?.ok) toast(r.downloaded ? ('PDF descargado correctamente'+(r.pages?' · '+r.pages+' páginas':'')) : 'PDF generado correctamente');
    else if(r?.error) toast('Error al generar PDF: '+r.error);
    else toast('No se pudo generar el PDF');
  }catch(error){
    console.error('Error al generar PDF', error);
    toast('Error al generar PDF: '+(error?.message||error));
  }finally{
    window.removeEventListener('docformacion-pdf-progress',onPdfProgress);
    if(button){
      button.disabled = false;
      button.textContent = previousText;
    }
  }
}

$$('.nav-item').forEach(b=>b.onclick=()=>setView(b.dataset.view));
$('#btnTemplate').onclick=()=>exportTemplate('global',false);
$('#btnImport').onclick=()=>importExcel('global');
$('#btnFirebase').onclick=updateFromFirebase;
$('#closeFirebase').onclick=$('#closeFirebaseBottom').onclick=()=>$('#firebaseDialog').close();
$('#closeExcelAnalysis').onclick=$('#cancelExcelAnalysis').onclick=closeExcelAnalysisDialog;
$('#applyExcelAnalysis').onclick=confirmExcelAnalysis;
$('#goExcelModule').onclick=()=>{
  const view=$('#goExcelModule').dataset.view;
  closeExcelAnalysisDialog();
  if(view) setView(view);
};

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
    syncPeriodCodes(state.period);
  }
  syncPeriodCodes(state.period);
  const cleanedInvalidCareers=cleanupInvalidCareers();
  const dedupedCareers=dedupeCareerState();
  if(cleanedInvalidCareers||dedupedCareers) await save();
  render();
})();
