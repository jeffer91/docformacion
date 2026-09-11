(() => {
  'use strict';

  const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const PRIORITIES = ['Alta','Media','Baja'];
  const FOLLOW_STATUSES = ['No iniciado','En proceso','Finalizado','No ejecutado'];
  const DEFAULT_GENERIC_LINES = [
    'Educación Superior, Pedagogía y Didáctica',
    'Evaluación del Aprendizaje y Formación por Competencias',
    'Investigación e Innovación Educativa',
    'Tecnología Educativa e Inteligencia Artificial',
    'Currículo y Gestión Académica',
    'Inclusión, Diversidad y Atención Educativa'
  ];
  const DEFAULT_LEGAL = [
    ['Constitución de la República del Ecuador','Marco constitucional de la educación superior y de la mejora continua institucional.'],
    ['Ley Orgánica de Educación Superior (LOES)','Calidad, aseguramiento de la calidad y perfeccionamiento del personal académico.'],
    ['Reglamento de Carrera y Escalafón del Personal Académico','Perfeccionamiento y desarrollo profesional del personal académico.'],
    ['Modelo de Evaluación Externa 2024 para Institutos Superiores Técnicos y Tecnológicos','Planificación sustentada en necesidades institucionales y evidencias de seguimiento.']
  ];
  const DEFAULT_BIBLIOGRAPHY = [
    'Asamblea Nacional del Ecuador. Constitución de la República del Ecuador.',
    'Asamblea Nacional del Ecuador. Ley Orgánica de Educación Superior (LOES).',
    'Consejo de Educación Superior. Reglamento de Carrera y Escalafón del Personal Académico del Sistema de Educación Superior.',
    'Consejo de Aseguramiento de la Calidad de la Educación Superior. (2024). Modelo de evaluación externa para institutos superiores técnicos y tecnológicos.',
    'UNESCO. (2019). Marco de competencias de los docentes en materia de TIC.',
    'Vaillant, D., & Marcelo, C. (2015). Desarrollo profesional docente: ¿cómo se aprende a enseñar?',
    'Zabalza, M. A. (2007). Competencias docentes del profesorado universitario.'
  ];

  const clean = value => String(value ?? '').trim();
  const key = value => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ');
  const pct = (part,total) => total ? part * 100 / total : 0;
  const pctText = value => Number(value || 0).toLocaleString('es-EC',{maximumFractionDigits:1}) + '%';
  const natural = values => {
    const list=(values||[]).filter(Boolean);
    if(!list.length)return '';
    if(list.length===1)return list[0];
    if(list.length===2)return list[0]+' y '+list[1];
    return list.slice(0,-1).join(', ')+' y '+list[list.length-1];
  };
  const counts = (rows,getter) => {
    const out={};
    (rows||[]).forEach(row=>{const name=clean(getter(row))||'Sin información';out[name]=(out[name]||0)+1;});
    return out;
  };

  function periodText(){
    const fmt=value=>{const m=clean(value).match(/^(\d{4})-(\d{2})/);return m?(MONTHS[Number(m[2])-1]||m[2])+' '+m[1]:clean(value);};
    const a=fmt(state?.period?.start),b=fmt(state?.period?.end);
    return a&&b?a+' - '+b:(a||b||'Período sin definir');
  }

  function periodActive(){ return !!clean(state?.period?.start) && !!clean(state?.period?.end); }

  function documentCode(type){
    if(typeof syncPeriodCodes==='function') syncPeriodCodes(state.period);
    if(type==='dnf') return clean(state?.period?.dnfCode)||'UGPA-RGI1-01-PRO-31';
    if(type==='plan') return clean(state?.period?.planCode)||'UGPA-RGI2-01-PRO-31';
    return clean(state?.period?.reportCode)||'UGPA-RGI3-01-PRO-31';
  }

  function documentTitle(type){
    const doc=window.DOCFORMACION_MANIFEST?.documents?.[type];
    return clean(doc?.title) || (type==='dnf'?'Detección de Necesidades de Formación':type==='plan'?'Plan de Formación Docente':'Informe de Cumplimiento del Plan de Formación Docente');
  }

  function activeCareers(){
    const careers=Array.isArray(state?.careers)?state.careers:[];
    const statuses=state?.section7?.careerStatus || {};
    const hasStatuses=Object.keys(statuses).length>0;
    return careers.filter(c=>{
      if(!hasStatuses)return true;
      const raw=clean(statuses[key(c.name)]?.status || statuses[c.name]?.status);
      return raw==='Activa';
    });
  }

  function needs(){
    const active=activeCareers();
    const activeKeys=new Set(active.map(c=>key(c.name)));
    const rows=[];
    (state?.coordinations||[]).forEach((coord,ci)=>{
      if(activeKeys.size && !activeKeys.has(key(coord.carrera))) return;
      const items=Array.isArray(coord.needItems)?coord.needItems:[];
      items.filter(item=>clean(item?.text)).forEach((item,ni)=>rows.push({
        code:clean(item.dnfCode)||('DNF-'+String(ci+1).padStart(2,'0')+'-'+String(ni+1).padStart(2,'0')),
        career:clean(coord.carrera),
        need:clean(item.text),
        priority:PRIORITIES.includes(clean(item.priorityOverride))?clean(item.priorityOverride):'Media'
      }));
    });
    return rows;
  }

  function genericLines(){
    const fromSection=(Array.isArray(state?.section6?.genericLines)?state.section6.genericLines:[])
      .map(v=>typeof v==='string'?clean(v):clean(v?.name)).filter(Boolean);
    if(fromSection.length)return fromSection;
    const fromSettings=(state?.settings?.genericLines||[]).map(clean).filter(Boolean);
    return fromSettings.length?fromSettings:DEFAULT_GENERIC_LINES;
  }

  function planRows(){
    const rows=Array.isArray(state?.needPlan)&&state.needPlan.length?state.needPlan:(Array.isArray(state?.plan)?state.plan:[]);
    return rows.map(row=>({
      dnfCode:clean(row.dnfCode||row.needKey||row.code),career:clean(row.career),needText:clean(row.needText||row.need),priority:clean(row.priority),
      action:clean(row.action||row.program),modality:clean(row.modality),plannedStart:clean(row.plannedStart),plannedEnd:clean(row.plannedEnd),
      indicator:clean(row.indicator),targetPercent:Number(row.targetPercent||0),evidence:clean(row.evidence),responsibleRole:clean(row.responsibleRole),
      supportType:clean(row.supportType),supportAmount:Number(row.supportAmount||0),observations:clean(row.observations)
    })).filter(row=>row.dnfCode||row.action||row.needText);
  }

  function reportRows(){
    const rows=Array.isArray(state?.needFollowup)&&state.needFollowup.length?state.needFollowup:(Array.isArray(state?.followup)?state.followup:[]);
    return rows.map(row=>({
      dnfCode:clean(row.dnfCode||row.needKey),career:clean(row.career),action:clean(row.action),status:clean(row.status),
      realStart:clean(row.realStart),progress:Number(row.progress||0),evidenceTitle:clean(row.evidenceTitle),evidencePath:clean(row.evidencePath),observation:clean(row.observation)
    })).filter(row=>row.dnfCode||row.action||row.status);
  }

  function legalRows(){
    if(Array.isArray(state?.baseLegal)&&state.baseLegal.length){
      return state.baseLegal.map(item=>[clean(item.name||item.title),clean(item.application||item.content||item.provision)]).filter(row=>row[0]);
    }
    return DEFAULT_LEGAL;
  }

  function bibliography(){
    const rows=Array.isArray(state?.bibliography)?state.bibliography:[];
    const cleanRows=rows.map(item=>clean(typeof item==='string'?item:item?.text||item?.reference)).filter(Boolean);
    return cleanRows.length?cleanRows:DEFAULT_BIBLIOGRAPHY;
  }

  function dataContext(){
    const active=activeCareers(),needRows=needs(),plans=planRows(),reports=reportRows();
    const diagnosed=new Set(needRows.map(r=>key(r.career))).size;
    return {
      period:{active:periodActive(),label:periodText(),id:window.docformacionModel?.periodId||''},
      careers:active,
      needs:needRows,
      genericLines:genericLines(),
      plan:plans,
      report:reports,
      legal:legalRows(),
      bibliography:bibliography(),
      metrics:{diagnosed,coverage:pct(diagnosed,active.length)}
    };
  }

  function sectionReadiness(type,section){
    const ctx=dataContext();
    const missing=[];
    if(!ctx.period.active)missing.push('período activo');
    const dataNames=section?.data||[];
    const map={
      periodo:ctx.period.active,
      carreras:ctx.careers.length>0,
      docentes:(state?.teachers||[]).length>0,
      coordinaciones:(state?.coordinations||[]).length>0,
      necesidades:ctx.needs.length>0,
      lineasGenericas:ctx.genericLines.length>0,
      baseLegal:ctx.legal.length>0,
      bibliografia:ctx.bibliography.length>0,
      plan:ctx.plan.length>0,
      seguimiento:ctx.report.length>0
    };
    dataNames.forEach(name=>{if(map[name]===false)missing.push(name);});
    return {ready:missing.length===0,missing:[...new Set(missing)]};
  }

  function filename(type,section){
    const safe=value=>clean(value).replace(/[\\/:*?"<>|]+/g,'-').replace(/\s+/g,' ').trim();
    return safe(documentCode(type)+' - '+documentTitle(type)+' - '+section.id+' - '+section.title)+'.pdf';
  }

  function makeWriter(type,section){
    if(!window.jspdf?.jsPDF)throw new Error('No se cargó el motor PDF. Recarga la aplicación.');
    const {jsPDF}=window.jspdf;
    const doc=new jsPDF({unit:'mm',format:'a4',orientation:'portrait',compress:true,putOnlyUsedFonts:true,precision:2});
    const pageW=210,pageH=297,left=18,right=18,top=42,bottom=18,bodyW=pageW-left-right;
    let y=top;

    function header(){
      doc.setDrawColor(155);doc.setLineWidth(.2);doc.rect(15,10,180,25);
      doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(35);doc.text('ITSQMET · UNIDAD DE GESTIÓN DE PROCESOS ACADÉMICOS',18,16);
      doc.setFont('helvetica','normal');doc.setFontSize(7.5);doc.text(documentTitle(type),18,22);
      doc.text(periodText(),18,28);
      doc.setFont('helvetica','bold');doc.text(documentCode(type),192,22,{align:'right'});
      doc.setFont('helvetica','normal');doc.setFontSize(6.8);doc.text(section.id,192,28,{align:'right'});
    }
    function newPage(){doc.addPage();header();y=top;}
    function ensure(h){if(y+h>pageH-bottom)newPage();}
    function heading(text,level=1){const size=level===1?14:level===2?11:9.5;const lines=doc.splitTextToSize(clean(text),bodyW);ensure(lines.length*5+8);doc.setFont('helvetica','bold');doc.setFontSize(size);doc.setTextColor(30);doc.text(lines,left,y,{lineHeightFactor:1.12});y+=lines.length*5+4;}
    function paragraph(text,opts={}){const size=opts.size||9.2,lineH=opts.lineH||4.7;doc.setFont('helvetica',opts.bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(opts.muted?90:35);const lines=doc.splitTextToSize(clean(text),bodyW);lines.forEach(line=>{ensure(lineH);doc.text(line,left,y);y+=lineH;});y+=2;}
    function bullet(text){const lines=doc.splitTextToSize(clean(text),bodyW-7);doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(35);lines.forEach((line,i)=>{ensure(4.6);if(i===0)doc.text('•',left+1,y);doc.text(line,left+6,y);y+=4.6;});y+=1;}
    function table(headers,rows,weights){
      if(!rows?.length){paragraph('Sin registros disponibles para esta sección.',{muted:true});return;}
      const total=(weights||headers.map(()=>1)).reduce((a,b)=>a+b,0);const widths=(weights||headers.map(()=>1)).map(v=>bodyW*v/total);const pad=1.4,fontSize=7.2,lineH=3.2;
      const wrap=(value,w,bold=false)=>{doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(fontSize);return doc.splitTextToSize(clean(value)||' ',Math.max(5,w-pad*2));};
      const rowHeight=(row,bold=false)=>Math.max(...row.map((cell,i)=>wrap(cell,widths[i],bold).length))*lineH+pad*2;
      const draw=(row,head=false)=>{const h=rowHeight(row,head);ensure(h);let x=left;row.forEach((cell,i)=>{if(head){doc.setFillColor(43,82,108);doc.rect(x,y,widths[i],h,'F');}doc.setDrawColor(150);doc.rect(x,y,widths[i],h);doc.setFont('helvetica',head?'bold':'normal');doc.setFontSize(fontSize);doc.setTextColor(head?255:35);doc.text(wrap(cell,widths[i],head),x+pad,y+pad+2.3,{lineHeightFactor:1.05});x+=widths[i];});y+=h;doc.setTextColor(35);};
      draw(headers,true);rows.forEach(row=>{const h=rowHeight(row,false);if(y+h>pageH-bottom){newPage();draw(headers,true);}draw(row,false);});y+=3;
    }
    function metricTable(rows){table(['Indicador','Resultado'],rows,[68,32]);}
    function barChart(title,data){
      heading(title,2);if(!data?.length){paragraph('Sin datos para graficar.',{muted:true});return;}
      const max=Math.max(...data.map(d=>Number(d.value||0)),1),x=left+58,w=bodyW-65,rowH=8;data.forEach(d=>{ensure(rowH);doc.setFont('helvetica','normal');doc.setFontSize(7.5);doc.setTextColor(45);doc.text(doc.splitTextToSize(clean(d.label),52)[0]||'',left,y+4.5);doc.setFillColor(228,234,241);doc.rect(x,y,w,4,'F');doc.setFillColor(48,92,126);doc.rect(x,y,w*(Number(d.value||0)/max),4,'F');doc.setFont('helvetica','bold');doc.text(String(d.value),x+w+2,y+3.5);y+=rowH;});y+=2;
    }
    function note(text){paragraph(text,{size:7.7,muted:true});}
    function finish(){
      const pages=doc.getNumberOfPages();for(let p=1;p<=pages;p++){doc.setPage(p);doc.setFillColor(255);doc.rect(0,pageH-13,pageW,13,'F');doc.setFont('helvetica','normal');doc.setFontSize(6.6);doc.setTextColor(105);doc.text(section.id+' · '+periodText()+' · Página '+p+' de '+pages,pageW/2,pageH-8,{align:'center'});}
      doc.setProperties({title:section.title,subject:documentTitle(type)+' · '+periodText(),author:'ITSQMET'});
      const blob=doc.output('blob');if(!blob?.size)throw new Error('El PDF de sección se generó vacío.');return {blob,pages,size:blob.size};
    }
    header();heading(section.title,1);note('Documento: '+documentTitle(type)+' · Sección independiente '+section.id+'.');
    return {heading,paragraph,bullet,table,metricTable,barChart,note,newPage,finish};
  }

  function renderDnf(section,w,ctx){
    const rows=ctx.needs,active=ctx.careers,priority=counts(rows,r=>r.priority),programs=counts(active,r=>r.program),diagnosed=ctx.metrics.diagnosed,coverage=ctx.metrics.coverage;
    const byCareer=counts(rows,r=>r.career);
    const id=section.id;
    if(id==='DNF-01-introduccion'){
      w.paragraph('La formación y el desarrollo profesional del personal académico constituyen componentes permanentes de la calidad de la educación superior. La Detección de Necesidades de Formación organiza evidencia por carrera para orientar decisiones de planificación, priorización y seguimiento.');
      w.paragraph('Para el período '+ctx.period.label+', la aplicación mantiene una fuente única de datos y conserva la trazabilidad de cada necesidad mediante un código DNF que posteriormente se reutiliza en el Plan de Formación y en el Informe de Cumplimiento.');
      w.metricTable([['Carreras activas',String(active.length)],['Necesidades registradas',String(rows.length)],['Cobertura diagnóstica',pctText(coverage)]]);
      return;
    }
    if(id==='DNF-02-base-legal'){
      w.paragraph('La DNF se sustenta en disposiciones nacionales, referentes de aseguramiento de la calidad e instrumentos institucionales vinculados con el perfeccionamiento académico y la mejora continua.');
      w.table(['Referencia','Aplicación al proceso'],ctx.legal,[40,60]);return;
    }
    if(id==='DNF-03-alineacion'){
      w.paragraph('La DNF se integra a la planificación institucional y convierte necesidades verificables en insumos para el Plan de Formación Docente.');
      ['PEDI: orienta prioridades de fortalecimiento del talento humano.','POA: transforma prioridades en actividades, responsables, metas e indicadores.','Gestión académica: vincula la formación con necesidades de las carreras y mejora continua.','Aseguramiento de la calidad: exige evidencia de diagnóstico, planificación, ejecución y seguimiento.'].forEach(w.bullet);return;
    }
    if(id==='DNF-04-metodologia'){
      w.paragraph('El diagnóstico adopta un enfoque institucional, descriptivo y de priorización. La unidad de análisis es cada necesidad concreta de formación asociada a una carrera activa.');
      w.heading('Cobertura y fuentes',2);w.paragraph('Se consideran '+active.length+' carrera(s) activa(s). Se registraron necesidades en '+diagnosed+' carrera(s), equivalente a '+pctText(coverage)+' de cobertura. La información variable se obtiene de las plantillas institucionales y se valida antes de incorporarse al documento.');
      ['Carrera y nivel de formación.','Necesidad concreta de formación.','Prioridad institucional: Alta, Media o Baja.','Código DNF persistente para trazabilidad.'].forEach(w.bullet);return;
    }
    if(id==='DNF-05-caracterizacion'){
      w.metricTable([['Carreras activas',String(active.length)],['Carreras diagnosticadas',String(diagnosed)],['Cobertura diagnóstica',pctText(coverage)],['Necesidades específicas',String(rows.length)],['Prioridad Alta',String(priority.Alta||0)],['Prioridad Media',String(priority.Media||0)],['Prioridad Baja',String(priority.Baja||0)]]);
      w.barChart('Necesidades por prioridad',PRIORITIES.map(p=>({label:p,value:priority[p]||0})));
      w.table(['Nivel de formación','Carreras','Porcentaje'],Object.entries(programs).map(([name,count])=>[name,String(count),pctText(pct(count,active.length))]),[55,20,25]);return;
    }
    if(id==='DNF-06-lineas'){
      active.forEach(career=>{const cr=rows.filter(r=>key(r.career)===key(career.name));w.heading(career.name,2);w.table(['Código','Necesidad específica','Prioridad'],cr.map(r=>[r.code,r.need,r.priority]),[18,64,18]);});
      w.heading('Formación Intelectual Genérica',2);ctx.genericLines.forEach(w.bullet);return;
    }
    if(id==='DNF-07-cobertura'){
      w.paragraph('La cobertura institucional considera las carreras activas del período y verifica que el diagnóstico incluya necesidades para cada una de ellas.');
      w.table(['Carrera','Nivel de formación','Necesidades'],active.map(c=>[c.name,c.program||'—',String(byCareer[c.name]||0)]),[55,30,15]);
      w.metricTable([['Carreras activas',String(active.length)],['Carreras diagnosticadas',String(diagnosed)],['Cobertura',pctText(coverage)]]);return;
    }
    if(id==='DNF-08-resumen'){
      w.paragraph('El diagnóstico del período '+ctx.period.label+' cubre '+diagnosed+' de '+active.length+' carreras activas y consolida '+rows.length+' necesidades específicas.');
      w.metricTable([['Cobertura diagnóstica',pctText(coverage)],['Prioridad Alta',String(priority.Alta||0)],['Prioridad Media',String(priority.Media||0)],['Prioridad Baja',String(priority.Baja||0)],['Líneas genéricas',String(ctx.genericLines.length)]]);
      w.paragraph('La prioridad y la trazabilidad mediante CODIGO_DNF permiten trasladar cada necesidad al Plan de Formación sin duplicar información.');return;
    }
    if(id==='DNF-09-conclusiones'){
      w.bullet('La cobertura diagnóstica alcanza '+pctText(coverage)+' del catálogo activo del período.');
      w.bullet('Se identificaron '+rows.length+' necesidades específicas, de las cuales '+(priority.Alta||0)+' son de prioridad Alta.');
      w.bullet('La trazabilidad mediante CODIGO_DNF mantiene la relación entre diagnóstico, planificación y seguimiento.');
      w.bullet('Las líneas genéricas complementan las necesidades específicas sin sustituirlas.');return;
    }
    if(id==='DNF-10-recomendaciones'){
      ['Priorizar en el Plan de Formación las necesidades clasificadas como Alta.','Mantener visible el CODIGO_DNF durante planificación, ejecución y seguimiento.','Definir para cada acción modalidad, cronograma, indicador, meta, responsable, medio de verificación y recursos.','Utilizar los resultados del Informe de Cumplimiento como retroalimentación para el siguiente período.'].forEach(w.bullet);return;
    }
    if(id==='DNF-11-bibliografia'){ctx.bibliography.forEach(w.bullet);return;}
    if(id==='DNF-12-anexos'){
      w.heading('Matriz de trazabilidad DNF',2);w.table(['Código','Carrera','Necesidad','Prioridad'],rows.map(r=>[r.code,r.career,r.need,r.priority]),[16,25,44,15]);
      w.heading('Matriz de Formación Intelectual Genérica',2);w.table(['Línea genérica'],ctx.genericLines.map(x=>[x]),[100]);
      w.barChart('Distribución de necesidades por prioridad',PRIORITIES.map(p=>({label:p,value:priority[p]||0})));return;
    }
  }

  function renderPlan(section,w,ctx){
    const rows=ctx.plan,priority=counts(rows,r=>r.priority),modalities=counts(rows,r=>r.modality),careers=new Set(rows.map(r=>key(r.career))).size;
    const economic=rows.filter(r=>r.supportType==='Económico').reduce((sum,r)=>sum+Number(r.supportAmount||0),0);
    switch(section.id){
      case 'PLAN-01-introduccion':w.paragraph('El Plan de Formación Docente del período '+ctx.period.label+' transforma las necesidades validadas en la DNF en acciones institucionales planificadas, manteniendo como unidad de trazabilidad el CODIGO_DNF.');break;
      case 'PLAN-02-objetivo':w.paragraph('Planificar acciones de formación pertinentes y verificables para atender las necesidades priorizadas, definiendo modalidad, cronograma, indicadores, metas, responsables, medios de verificación y recursos.');break;
      case 'PLAN-03-diagnostico':w.metricTable([['Necesidades incorporadas',String(rows.length)],['Carreras con acciones',String(careers)],['Prioridad Alta',String(priority.Alta||0)],['Prioridad Media',String(priority.Media||0)],['Prioridad Baja',String(priority.Baja||0)],['Apoyo económico previsto',economic?'USD '+economic.toLocaleString('es-EC',{minimumFractionDigits:2}):'No registrado']]);w.barChart('Acciones por modalidad',Object.entries(modalities).map(([label,value])=>({label,value})));break;
      case 'PLAN-04-matriz':w.table(['Código','Carrera','Necesidad','Prioridad','Acción','Modalidad','Inicio - Fin','Meta'],rows.map(r=>[r.dnfCode,r.career,r.needText,r.priority,r.action,r.modality,(r.plannedStart||'—')+' - '+(r.plannedEnd||'—'),r.targetPercent?r.targetPercent+'%':'—']),[12,17,22,10,19,10,14,8]);break;
      case 'PLAN-05-indicadores':w.table(['Código','Indicador','Medio de verificación','Responsable'],rows.map(r=>[r.dnfCode,r.indicator||'—',r.evidence||'—',r.responsibleRole||'—']),[17,28,30,25]);break;
      case 'PLAN-06-recursos':w.table(['Código','Tipo de apoyo','Monto','Observaciones'],rows.map(r=>[r.dnfCode,r.supportType||'—',r.supportType==='Económico'?'USD '+Number(r.supportAmount||0).toLocaleString('es-EC',{minimumFractionDigits:2}):'—',r.observations||'—']),[18,25,17,40]);break;
      case 'PLAN-07-seguimiento':w.paragraph('El seguimiento se realizará por CODIGO_DNF y acción planificada. El Informe de Cumplimiento registrará para cada acción su estado, fecha de inicio real cuando corresponda, porcentaje de avance, evidencia y resultado u observación.');break;
      case 'PLAN-08-conclusiones':w.bullet('El Plan incorpora '+rows.length+' acción(es) vinculadas directamente con necesidades validadas de '+careers+' carrera(s).');w.bullet('La trazabilidad se mantiene desde la DNF mediante un código único y persistente.');w.bullet('Las acciones cuentan con criterios mínimos de ejecución y verificación.');break;
    }
  }

  function renderReport(section,w,ctx){
    const rows=ctx.report,byStatus=counts(rows,r=>r.status),started=rows.filter(r=>['En proceso','Finalizado'].includes(r.status)).length,finished=byStatus.Finalizado||0,notExecuted=byStatus['No ejecutado']||0,avg=rows.length?rows.reduce((sum,r)=>sum+Number(r.progress||0),0)/rows.length:0;
    switch(section.id){
      case 'INF-01-objeto':w.paragraph('Presentar el nivel de cumplimiento del Plan de Formación Docente correspondiente al período '+ctx.period.label+', manteniendo la trazabilidad con la DNF mediante el CODIGO_DNF.');break;
      case 'INF-02-alcance':w.paragraph('El informe consolida resultados por necesidad y acción institucional. El seguimiento conserva la relación DNF → Plan → Informe y evita duplicar identificadores.');break;
      case 'INF-03-resumen':w.metricTable([['Acciones planificadas',String(rows.length)],['Iniciadas o finalizadas',String(started)],['Finalizadas',String(finished)],['No ejecutadas',String(notExecuted)],['Avance promedio',pctText(avg)],['Cumplimiento final',pctText(pct(finished,rows.length))]]);w.barChart('Acciones por estado',FOLLOW_STATUSES.map(s=>({label:s,value:byStatus[s]||0})));break;
      case 'INF-04-seguimiento':w.table(['Código','Carrera','Acción','Estado','Inicio real','Avance','Evidencia'],rows.map(r=>[r.dnfCode,r.career||'—',r.action||'—',r.status||'—',r.realStart||'—',r.progress+'%',r.evidenceTitle||'—']),[13,18,27,13,12,8,19]);break;
      case 'INF-05-evidencias':w.table(['Código','Archivo / referencia','Resultado u observación'],rows.map(r=>[r.dnfCode,r.evidencePath||r.evidenceTitle||'—',r.observation||'—']),[18,32,50]);break;
      case 'INF-06-analisis':w.paragraph('De '+rows.length+' acciones planificadas, '+started+' registran inicio o finalización y '+finished+' se encuentran finalizadas. El avance promedio institucional es '+pctText(avg)+' y el cumplimiento final por acciones finalizadas es '+pctText(pct(finished,rows.length))+'.');break;
      case 'INF-07-conclusiones':w.bullet('La trazabilidad DNF → Plan → Informe se mantiene mediante CODIGO_DNF.');w.bullet('Se finalizaron '+finished+' de '+rows.length+' acciones planificadas para el período.');w.bullet('El avance promedio registrado es '+pctText(avg)+'.');break;
      case 'INF-08-recomendaciones':w.bullet('Priorizar el cierre y la evidencia de las acciones que permanezcan En proceso o No iniciadas.');w.bullet('Documentar el motivo de las acciones No ejecutadas y utilizarlo como insumo para el siguiente ciclo de DNF.');w.bullet('Retroalimentar el siguiente período con los resultados consolidados.');break;
    }
  }

  function getSection(type,sectionId){
    const sections=window.DOCFORMACION_MANIFEST?.documents?.[type]?.sections||[];
    return sections.find(section=>section.id===sectionId)||null;
  }

  async function build(type,sectionId,options={}){
    const section=getSection(type,sectionId);if(!section)throw new Error('La sección solicitada no existe en el manifiesto.');
    if(!periodActive())throw new Error('Selecciona o crea un período antes de generar una sección.');
    const ctx=dataContext(),w=makeWriter(type,section),readiness=sectionReadiness(type,section);
    if(!readiness.ready)w.note('Vista borrador: faltan datos requeridos: '+readiness.missing.join(', ')+'.');
    if(type==='dnf')renderDnf(section,w,ctx);else if(type==='plan')renderPlan(section,w,ctx);else renderReport(section,w,ctx);
    const result=w.finish();const name=filename(type,section);
    if(options.download){const url=URL.createObjectURL(result.blob);const a=document.createElement('a');a.href=url;a.download=name;a.style.display='none';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
    return {...result,filename:name,section,type,readiness};
  }

  window.docformacionSectionPdf = Object.freeze({
    build,
    getSection,
    dataContext,
    sectionReadiness,
    list(type){return window.DOCFORMACION_MANIFEST?.documents?.[type]?.sections||[];}
  });
})();
