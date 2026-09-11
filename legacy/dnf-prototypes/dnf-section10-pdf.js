(() => {
  'use strict';
  if (!window.jspdf?.jsPDF) return;

  const PreviousJsPDF=window.jspdf.jsPDF;
  const ENGINE='dnf-vector-jspdf-v10-recommendations';
  const CM=72/2.54;
  const BODY={left:72,right:72,top:150,bottom:72,fontSize:12,lineHeight:24};
  const MONTHS=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

  const clean=(v='')=>String(v??'').trim();
  const key=value=>clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ');
  const period=()=>state?.period||{};
  const documentCode=()=>clean(period().dnfCode);
  const documentTitle=()=> 'Detección de Necesidades de Formación';

  function periodText(){
    const fmt=value=>{const m=clean(value).match(/^(\d{4})-(\d{2})/);return m?(MONTHS[Number(m[2])-1]||m[2])+' '+m[1]:clean(value);};
    const a=fmt(period().start),b=fmt(period().end);return a&&b?a+' a '+b:(a||b||'período seleccionado');
  }
  function imageFormat(dataUrl=''){if(/^data:image\/png/i.test(dataUrl))return'PNG';if(/^data:image\/webp/i.test(dataUrl))return'WEBP';return'JPEG';}
  function getLogoData(){try{if(typeof INSTITUTION_LOGO_DATA!=='undefined'&&typeof INSTITUTION_LOGO_DATA==='string')return INSTITUTION_LOGO_DATA;}catch(_e){}return'';}
  function fitImage(doc,dataUrl,maxW,maxH){try{const p=doc.getImageProperties(dataUrl),r=p.width/p.height;let w=maxW,h=w/r;if(h>maxH){h=maxH;w=h*r;}return{w,h};}catch(_e){return{w:maxW,h:maxH};}}

  function drawHeader(doc,pageNo){
    doc.setPage(pageNo);const pageW=doc.internal.pageSize.getWidth(),totalW=18*CM,x=(pageW-totalW)/2,top=1.5*CM,h=2.8*CM;
    const colA=totalW*.25,colB=totalW*.5,colC=totalW*.25,row1=.8*CM,row2=h-row1,bx=x+colA,cx=bx+colB;
    doc.setDrawColor(70);doc.setLineWidth(.65);doc.rect(x,top,totalW,h);doc.line(bx,top,bx,top+h);doc.line(cx,top,cx,top+h);doc.line(bx,top+row1,cx,top+row1);
    const logo=getLogoData();if(logo){try{const f=fitImage(doc,logo,Math.min(colA-12,3.8*CM),Math.min(h-12,1.8*CM));doc.addImage(logo,imageFormat(logo),x+(colA-f.w)/2,top+(h-f.h)/2,f.w,f.h,undefined,'FAST');}catch(_e){}}else{doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text('ITSQMET',x+colA/2,top+h/2,{align:'center'});}
    doc.setTextColor(30);doc.setFont('helvetica','normal');doc.setFontSize(8.5);const unit=doc.splitTextToSize('UNIDAD DE GESTIÓN DE PROCESOS ACADÉMICOS',colB-12);doc.text(unit,bx+colB/2,top+(row1-unit.length*9.2)/2+7.2,{align:'center',lineHeightFactor:1.02});
    const title=doc.splitTextToSize(documentTitle(),colB-18),per=doc.splitTextToSize(periodText(),colB-18);let gy=top+row1+(row2-(title.length*9.3+3+per.length*9.1))/2+7.2;doc.setFont('helvetica','bold');doc.setFontSize(8.5);doc.text(title,bx+colB/2,gy,{align:'center',lineHeightFactor:1.02});gy+=title.length*9.3+3;doc.setFontSize(8.2);doc.text(per,bx+colB/2,gy,{align:'center',lineHeightFactor:1.02});
    doc.setFont('helvetica','bold');doc.setFontSize(8.2);doc.text('Código:',cx+colC/2,top+h/2-8,{align:'center'});doc.setFont('helvetica','normal');doc.setFontSize(8.1);doc.text(doc.splitTextToSize(documentCode(),colC-14),cx+colC/2,top+h/2+5,{align:'center',lineHeightFactor:1.05});
  }

  function createWriter(doc){
    const pageW=doc.internal.pageSize.getWidth(),pageH=doc.internal.pageSize.getHeight(),bodyW=pageW-BODY.left-BODY.right;let y=BODY.top;
    function font(style='normal',size=BODY.fontSize,color=0){doc.setFont('times',style);doc.setFontSize(size);doc.setTextColor(color);}
    function newPage(){doc.addPage();drawHeader(doc,doc.getNumberOfPages());font();y=BODY.top;}
    function ensureSpace(h){if(y+h>pageH-BODY.bottom)newPage();}
    function heading(text,level=1){font('bold',12);const lines=doc.splitTextToSize(clean(text),bodyW),before=level===1?0:10,after=level===1?18:10;ensureSpace(before+lines.length*BODY.lineHeight+after+BODY.lineHeight);y+=before;doc.text(lines,BODY.left,y,{lineHeightFactor:2});y+=lines.length*BODY.lineHeight+after;}
    function tokenize(lead,rest){
      const out=[];clean(lead).split(/\s+/).filter(Boolean).forEach(word=>out.push({word,style:'bold'}));clean(rest).split(/\s+/).filter(Boolean).forEach(word=>out.push({word,style:'normal'}));return out;
    }
    function wordWidth(token){font(token.style,12);return doc.getTextWidth(token.word);}
    function splitTokens(tokens,width){
      const lines=[];let line=[],used=0;const space=doc.getTextWidth(' ');
      tokens.forEach(token=>{const w=wordWidth(token),need=(line.length?space:0)+w;if(line.length&&used+need>width){lines.push(line);line=[token];used=w;}else{line.push(token);used+=need;}});if(line.length)lines.push(line);return lines;
    }
    function drawTokenLine(tokens,x,width,justify){
      const normalSpace=doc.getTextWidth(' '),wordsW=tokens.reduce((sum,t)=>sum+wordWidth(t),0),gaps=Math.max(0,tokens.length-1),gap=justify&&gaps?Math.max(normalSpace,(width-wordsW)/gaps):normalSpace;let cur=x;
      tokens.forEach((token,i)=>{font(token.style,12);doc.text(token.word,cur,y);cur+=wordWidth(token)+(i<tokens.length-1?gap:0);});
    }
    function bullet(lead,rest){
      const x=BODY.left+30,width=bodyW-30,tokens=tokenize(lead,rest),lines=splitTokens(tokens,width);let i=0;
      while(i<lines.length){if(y+BODY.lineHeight>pageH-BODY.bottom)newPage();if(i===0){font('normal',12);doc.text('•',BODY.left+8,y);}drawTokenLine(lines[i],x,width,i<lines.length-1);y+=BODY.lineHeight;i++;}
      y+=6;
    }
    newPage();return{heading,bullet,newPage};
  }

  function metrics(){return typeof window.__DOCFORMACION_DNF_METRICS==='function'?window.__DOCFORMACION_DNF_METRICS():{interests:{rows:[]}};}
  function isFourthLevel(level){const k=key(level);return k.startsWith('maestr')||k.startsWith('doctor');}
  function activeCareerKeys(){
    if(typeof window.__DOCFORMACION_SECTION7_ACTIVE_CAREERS==='function')return new Set(window.__DOCFORMACION_SECTION7_ACTIVE_CAREERS().map(key));
    return new Set((state.careers||[]).map(cr=>key(cr.name)).filter(Boolean));
  }
  function careerGapStats(){
    const active=activeCareerKeys(),map=new Map();
    (state.teachers||[]).forEach(t=>{
      const career=clean(t.carrera),ck=key(career),level=clean(t.nivelActual);if(!career||!level||(active.size&&!active.has(ck)))return;
      const row=map.get(ck)||{career,valid:0,below:0};row.valid++;if(!isFourthLevel(level))row.below++;map.set(ck,row);
    });
    const rows=[...map.values()].map(row=>({...row,gapPct:row.valid?row.below*100/row.valid:0})).filter(row=>row.below>0).sort((a,b)=>b.gapPct-a.gapPct||b.below-a.below||a.career.localeCompare(b.career,'es'));
    if(!rows.length)return{rows:[],priority:[]};const max=rows[0].gapPct;return{rows,priority:rows.filter(row=>Math.abs(row.gapPct-max)<0.0001)};
  }
  function naturalList(items){const list=(items||[]).map(clean).filter(Boolean);if(!list.length)return'';if(list.length===1)return list[0];if(list.length===2)return list[0]+' y '+list[1];return list.slice(0,-1).join(', ')+' y '+list[list.length-1];}
  function priorityAreas(){return (metrics().interests?.rows||[]).filter(item=>Number(item.count)>0).slice(0,4).map(item=>item.label);}

  function appendRecommendations(doc){
    if(doc.__docformacionSection10Appended)return;doc.__docformacionSection10Appended=true;
    const w=createWriter(doc),gaps=careerGapStats(),areas=priorityAreas();
    const priorityCareers=gaps.priority.map(row=>row.career);
    const careerSuffix=priorityCareers.length?' priorizando '+naturalList(priorityCareers)+', que presenta'+(priorityCareers.length===1?'':'n')+' la mayor brecha proporcional de formación posgradual en el período.':' sin señalar carreras como prioritarias por falta de formación posgradual cuando los datos válidos no evidencian dicha brecha.';
    const areaSuffix=areas.length?' '+naturalList(areas)+'.':' las áreas que cuenten con evidencia válida en el levantamiento; para este período no existen áreas suficientes para enumerarlas.';

    w.heading('10. Recomendaciones',1);
    w.heading('Lineamientos iniciales para el Plan de Formación Docente',2);
    w.bullet('Diseñar un Plan de Formación Docente de un año de duración,','con cronograma de implementación y metas claras por carrera y tipo de formación.');
    w.bullet('Organizar trayectorias formativas breves pero estratégicas,','enfocadas en licenciaturas, ingenierías, maestrías y doctorados según cada caso,'+careerSuffix);
    w.bullet('Alinear las propuestas de formación al perfil de egreso de cada carrera,','considerando el contexto institucional, los requerimientos normativos y las tendencias del sector productivo.');
    w.bullet('Incluir componentes comunes transversales','como educación superior, planificación curricular, evaluación por competencias, herramientas digitales y normativa educativa vigente.');

    w.heading('Propuesta de criterios para asignación de apoyos',2);
    w.bullet('Asignar apoyos con base en criterios objetivos,','priorizando a docentes con mayor carga académica cuando este dato esté disponible, el tipo de contrato o dedicación correspondiente y carreras con menor proporción de formación posgradual.');
    w.bullet('Diferenciar el tipo de apoyo (total o parcial)','según el nivel de formación a cursar, el tiempo requerido y el impacto institucional estimado.');
    w.bullet('Condicionar el apoyo a compromisos formales,','como permanencia mínima en la institución, cumplimiento de cronograma académico y participación en acciones de réplica institucional.');
    w.bullet('Favorecer postulaciones alineadas con las áreas estratégicas identificadas durante el levantamiento:',''+areaSuffix.trimStart());

    w.heading('Consideraciones para el efecto multiplicador y seguimiento',2);
    w.bullet('Establecer mecanismos claros de aplicación del conocimiento adquirido,','como rediseño de PEAs, aplicación de innovaciones pedagógicas, liderazgo en talleres internos y tutorías especializadas.');
    w.bullet('Implementar un sistema de seguimiento académico-administrativo,','con entregables semestrales y validación por parte de la coordinación académica correspondiente.');
    w.bullet('Incentivar la generación de productos académicos derivados del proceso formativo,','como publicaciones, presentaciones en eventos o desarrollo de recursos didácticos.');
    w.bullet('Promover el acompañamiento entre pares','para facilitar la transferencia de conocimientos y buenas prácticas entre docentes con diferentes niveles de formación.');
  }

  function redrawFooters(doc){const total=doc.getNumberOfPages(),pageW=doc.internal.pageSize.getWidth(),pageH=doc.internal.pageSize.getHeight();for(let n=1;n<=total;n++){doc.setPage(n);doc.setFillColor(255,255,255);doc.rect(0,pageH-44,pageW,30,'F');doc.setTextColor(105);doc.setFont('helvetica','normal');doc.setFontSize(7.2);doc.text('ITSQMET · Unidad de Gestión de Procesos Académicos · '+periodText()+' · Página '+n+' de '+total,pageW/2,pageH-24,{align:'center'});}}

  function WrappedSection10JsPDF(...args){const doc=new PreviousJsPDF(...args),originalSave=doc.save.bind(doc);doc.save=function section10Save(filename,options){if(/necesidades/i.test(String(filename||''))){appendRecommendations(doc);redrawFooters(doc);window.__DOCFORMACION_DNF_RENDERER=ENGINE;window.__DOCFORMACION_DNF_VECTOR_STAGE='cover+introduction+base-legal+alignment+methodology+characterization+training-lines+coverage+executive-summary+conclusions+recommendations';}return originalSave(filename,options);};return doc;}
  WrappedSection10JsPDF.API=PreviousJsPDF.API;WrappedSection10JsPDF.version=PreviousJsPDF.version;Object.setPrototypeOf(WrappedSection10JsPDF,PreviousJsPDF);window.jspdf.jsPDF=WrappedSection10JsPDF;window.__DOCFORMACION_SECTION10_PDF_READY=true;
})();