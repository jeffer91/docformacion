(() => {
  'use strict';
  if (!window.jspdf?.jsPDF) return;

  const PreviousJsPDF = window.jspdf.jsPDF;
  const ENGINE = 'dnf-vector-jspdf-v9-conclusions';
  const CM = 72 / 2.54;
  const BODY = {left:72,right:72,top:150,bottom:72,fontSize:12,lineHeight:24,paragraphIndent:36};
  const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

  const clean = (v='') => String(v ?? '').trim();
  const period = () => state?.period || {};
  const documentCode = () => clean(period().dnfCode);
  const documentTitle = () => 'Detección de Necesidades de Formación';
  const pctText = value => Number(value || 0).toLocaleString('es-EC',{
    maximumFractionDigits:1,
    minimumFractionDigits:Number.isInteger(Number(value || 0)) ? 0 : 1
  }) + ' %';

  function periodText(){
    const fmt=value=>{const m=clean(value).match(/^(\d{4})-(\d{2})/);return m?(MONTHS[Number(m[2])-1]||m[2])+' '+m[1]:clean(value);};
    const a=fmt(period().start),b=fmt(period().end);return a&&b?a+' a '+b:(a||b||'período seleccionado');
  }

  function imageFormat(dataUrl=''){if(/^data:image\/png/i.test(dataUrl))return'PNG';if(/^data:image\/webp/i.test(dataUrl))return'WEBP';return'JPEG';}
  function getLogoData(){try{if(typeof INSTITUTION_LOGO_DATA!=='undefined'&&typeof INSTITUTION_LOGO_DATA==='string')return INSTITUTION_LOGO_DATA;}catch(_e){}return'';}
  function fitImage(doc,dataUrl,maxW,maxH){try{const p=doc.getImageProperties(dataUrl),r=p.width/p.height;let w=maxW,h=w/r;if(h>maxH){h=maxH;w=h*r;}return{w,h};}catch(_e){return{w:maxW,h:maxH};}}

  function drawHeader(doc,pageNo){
    doc.setPage(pageNo);
    const pageW=doc.internal.pageSize.getWidth(),totalW=18*CM,x=(pageW-totalW)/2,top=1.5*CM,h=2.8*CM;
    const colA=totalW*.25,colB=totalW*.5,colC=totalW*.25,row1=.8*CM,row2=h-row1,bx=x+colA,cx=bx+colB;
    doc.setDrawColor(70);doc.setLineWidth(.65);doc.rect(x,top,totalW,h);doc.line(bx,top,bx,top+h);doc.line(cx,top,cx,top+h);doc.line(bx,top+row1,cx,top+row1);
    const logo=getLogoData();
    if(logo){try{const f=fitImage(doc,logo,Math.min(colA-12,3.8*CM),Math.min(h-12,1.8*CM));doc.addImage(logo,imageFormat(logo),x+(colA-f.w)/2,top+(h-f.h)/2,f.w,f.h,undefined,'FAST');}catch(_e){}}
    else{doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text('ITSQMET',x+colA/2,top+h/2,{align:'center'});}
    doc.setTextColor(30);doc.setFont('helvetica','normal');doc.setFontSize(8.5);
    const unit=doc.splitTextToSize('UNIDAD DE GESTIÓN DE PROCESOS ACADÉMICOS',colB-12);doc.text(unit,bx+colB/2,top+(row1-unit.length*9.2)/2+7.2,{align:'center',lineHeightFactor:1.02});
    const title=doc.splitTextToSize(documentTitle(),colB-18),per=doc.splitTextToSize(periodText(),colB-18);let gy=top+row1+(row2-(title.length*9.3+3+per.length*9.1))/2+7.2;
    doc.setFont('helvetica','bold');doc.setFontSize(8.5);doc.text(title,bx+colB/2,gy,{align:'center',lineHeightFactor:1.02});gy+=title.length*9.3+3;doc.setFontSize(8.2);doc.text(per,bx+colB/2,gy,{align:'center',lineHeightFactor:1.02});
    doc.setFont('helvetica','bold');doc.setFontSize(8.2);doc.text('Código:',cx+colC/2,top+h/2-8,{align:'center'});doc.setFont('helvetica','normal');doc.setFontSize(8.1);doc.text(doc.splitTextToSize(documentCode(),colC-14),cx+colC/2,top+h/2+5,{align:'center',lineHeightFactor:1.05});
  }

  function createWriter(doc){
    const pageW=doc.internal.pageSize.getWidth(),pageH=doc.internal.pageSize.getHeight(),bodyW=pageW-BODY.left-BODY.right;let y=BODY.top;
    function font(style='normal',size=BODY.fontSize,color=0){doc.setFont('times',style);doc.setFontSize(size);doc.setTextColor(color);}
    function newPage(){doc.addPage();drawHeader(doc,doc.getNumberOfPages());font();y=BODY.top;}
    function ensureSpace(h){if(y+h>pageH-BODY.bottom)newPage();}
    function heading(text){font('bold',12);const lines=doc.splitTextToSize(clean(text),bodyW);ensureSpace(lines.length*BODY.lineHeight+BODY.lineHeight*2);doc.text(lines,BODY.left,y,{lineHeightFactor:2});y+=lines.length*BODY.lineHeight+18;}
    function wrap(text,width){font();const words=clean(text).split(/\s+/).filter(Boolean),lines=[];let line='';words.forEach(word=>{const c=line?line+' '+word:word;if(doc.getTextWidth(c)<=width)line=c;else{if(line)lines.push(line);line=word;}});if(line)lines.push(line);return lines;}
    function drawJustifiedLine(text,x,width,justify){const words=clean(text).split(/\s+/).filter(Boolean);if(!words.length)return;font();if(!justify||words.length===1){doc.text(words.join(' '),x,y);return;}const wordsW=words.reduce((s,w)=>s+doc.getTextWidth(w),0),normal=doc.getTextWidth(' '),gap=Math.max(normal,(width-wordsW)/(words.length-1));let cur=x;words.forEach((word,i)=>{doc.text(word,cur,y);cur+=doc.getTextWidth(word)+(i<words.length-1?gap:0);});}
    function paragraph(text,opts={}){
      const leftIndent=Number(opts.leftIndent||0),firstIndent=opts.firstIndent===false?0:BODY.paragraphIndent;
      const baseX=BODY.left+leftIndent,fullW=bodyW-leftIndent,firstW=fullW-firstIndent;
      const firstWords=clean(text).split(/\s+/).filter(Boolean),lines=[];let line='',width=firstW;
      firstWords.forEach(word=>{const c=line?line+' '+word:word;if(doc.getTextWidth(c)<=width)line=c;else{if(line)lines.push({text:line,width});line=word;width=fullW;}});if(line)lines.push({text:line,width});
      let i=0;
      while(i<lines.length){let available=Math.floor((pageH-BODY.bottom-y)/BODY.lineHeight);if(available<2&&lines.length-i>1){newPage();available=Math.floor((pageH-BODY.bottom-y)/BODY.lineHeight);}let take=Math.min(Math.max(available,1),lines.length-i);const remaining=lines.length-i-take;if(remaining===1&&take>2)take--;if(take<=0){newPage();continue;}for(let o=0;o<take;o++){const absolute=i+o,first=absolute===0,x=baseX+(first?firstIndent:0),w=first?firstW:fullW,last=absolute===lines.length-1;drawJustifiedLine(lines[absolute].text,x,w,opts.justify!==false&&!last);y+=BODY.lineHeight;}i+=take;if(i<lines.length)newPage();}
      y+=opts.after==null?12:opts.after;
    }
    function conclusion(number,title,text){
      font('bold',12);const label=number+'. '+clean(title),titleLines=doc.splitTextToSize(label,bodyW);ensureSpace(titleLines.length*BODY.lineHeight+BODY.lineHeight*3);doc.text(titleLines,BODY.left,y,{lineHeightFactor:2});y+=titleLines.length*BODY.lineHeight+8;
      paragraph(text,{leftIndent:18,firstIndent:false,after:18});
    }
    newPage();return{heading,paragraph,conclusion,newPage};
  }

  function fallbackMetrics(){
    return {
      diagnosticTotal:Array.isArray(state?.teachers)?state.teachers.length:0,
      level:{total:0,fourthPct:0,belowFourthPct:0},
      availability:{total:0,yesPct:0,noPct:0},
      update:{total:0,yesPct:0,noPct:0},
      interests:{total:0,rows:[]},
      programLevels:{total:0,percentages:{}},
      meta:{}
    };
  }
  function metrics(){return typeof window.__DOCFORMACION_DNF_METRICS==='function'?window.__DOCFORMACION_DNF_METRICS():fallbackMetrics();}

  function naturalList(items){
    const list=(items||[]).map(clean).filter(Boolean);
    if(!list.length)return'';
    if(list.length===1)return list[0];
    if(list.length===2)return list[0]+' y '+list[1];
    return list.slice(0,-1).join(', ')+' y '+list[list.length-1];
  }

  function conclusion1(m){
    if(!m.level.total) return 'No existen respuestas válidas suficientes sobre nivel académico para estimar la proporción del claustro con y sin formación de cuarto nivel. En consecuencia, esta brecha deberá interpretarse una vez que el levantamiento disponga de información válida para el período.';
    return 'De acuerdo con los resultados obtenidos, '+pctText(m.level.fourthPct)+' del claustro docente con respuesta válida cuenta con formación de cuarto nivel, mientras que '+pctText(m.level.belowFourthPct)+' aún no alcanza este nivel de formación. Estos resultados permiten identificar las brechas académicas existentes y establecer la necesidad de mantener acciones institucionales orientadas al fortalecimiento progresivo de la cualificación del personal docente, en concordancia con las exigencias normativas y del modelo de evaluación.';
  }

  function conclusion2(m){
    if(m.availability.total && m.update.total) return 'La disposición del personal docente para iniciar o continuar estudios superiores alcanza el '+pctText(m.availability.yesPct)+', mientras que la participación en procesos de actualización reciente corresponde al '+pctText(m.update.yesPct)+'. Estos resultados permiten valorar el nivel de interés del claustro por continuar fortaleciendo su perfil académico y constituyen un insumo para la planificación de políticas institucionales de formación continua de mediano y largo plazo.';
    if(m.availability.total) return 'La disposición del personal docente para iniciar o continuar estudios superiores alcanza el '+pctText(m.availability.yesPct)+'. No existen respuestas válidas suficientes sobre participación en procesos de actualización reciente para calcular este segundo indicador. La información disponible constituye un insumo para la planificación de políticas institucionales de formación continua.';
    if(m.update.total) return 'La participación del personal docente en procesos de actualización reciente corresponde al '+pctText(m.update.yesPct)+'. No existen respuestas válidas suficientes sobre disposición para iniciar o continuar estudios superiores para calcular este segundo indicador. La información disponible constituye un insumo para la planificación de políticas institucionales de formación continua.';
    return 'No existen respuestas válidas suficientes sobre disposición para iniciar o continuar estudios ni sobre participación en procesos de actualización reciente. Por tanto, esta conclusión no incorpora porcentajes y deberá actualizarse automáticamente cuando el levantamiento disponga de información válida.';
  }

  function conclusion3(m){
    const areas=(m.interests?.rows||[]).filter(item=>Number(item.count)>0).slice(0,4).map(item=>item.label);
    if(!areas.length) return 'No se registraron áreas de interés formativo con información válida suficiente para establecer prioridades durante el período. La aplicación no asigna ni completa categorías que no se encuentren respaldadas por el levantamiento institucional.';
    const singular=areas.length===1;
    return 'Las '+(singular?'área':'áreas')+' con mayor interés de formación durante el período '+(singular?'fue ':'fueron ')+naturalList(areas)+', de acuerdo con los resultados obtenidos en el levantamiento institucional. Estas prioridades permiten orientar la planificación de la formación docente hacia las áreas de mayor demanda y establecer una articulación con las necesidades de las carreras ofertadas por el ITSQMET.';
  }

  function appendConclusions(doc){
    if(doc.__docformacionSection9Appended)return;doc.__docformacionSection9Appended=true;
    const w=createWriter(doc),m=metrics();
    w.heading('9. Conclusiones');
    w.conclusion(1,'La formación docente actual presenta avances, pero aún enfrenta desafíos estructurales.',conclusion1(m));
    w.conclusion(2,'Existe un entorno favorable para el fortalecimiento académico.',conclusion2(m));
    w.conclusion(3,'Las prioridades formativas están bien identificadas.',conclusion3(m));
    w.conclusion(4,'El levantamiento de información ofrece una base sólida para el diseño del Plan de Formación Docente.','La caracterización por carrera, tipo de programa y nivel de formación alcanzado, junto con los datos sobre disponibilidad, intereses y dedicación laboral, aportan insumos concretos y estratégicos para la toma de decisiones en la planificación institucional y para la estructuración del Plan de Formación Docente del ITSQMET.');
    w.conclusion(5,'El reto institucional se concentra en consolidar mecanismos de apoyo diferenciados.','La diversidad de perfiles y trayectorias del cuerpo docente evidencia la necesidad de establecer rutas de formación flexibles y progresivas, considerando variables como el tipo de vinculación o dedicación, la experiencia docente y los requerimientos específicos de cada carrera y programa. Esta diferenciación permitirá orientar de manera pertinente las acciones de formación y responder a las distintas características del claustro académico.');
  }

  function redrawFooters(doc){
    const total=doc.getNumberOfPages(),pageW=doc.internal.pageSize.getWidth(),pageH=doc.internal.pageSize.getHeight();
    for(let n=1;n<=total;n++){doc.setPage(n);doc.setFillColor(255,255,255);doc.rect(0,pageH-44,pageW,30,'F');doc.setTextColor(105);doc.setFont('helvetica','normal');doc.setFontSize(7.2);doc.text('ITSQMET · Unidad de Gestión de Procesos Académicos · '+periodText()+' · Página '+n+' de '+total,pageW/2,pageH-24,{align:'center'});}
  }

  function WrappedSection9JsPDF(...args){
    const doc=new PreviousJsPDF(...args),originalSave=doc.save.bind(doc);
    doc.save=function section9Save(filename,options){
      if(/necesidades/i.test(String(filename||''))){appendConclusions(doc);redrawFooters(doc);window.__DOCFORMACION_DNF_RENDERER=ENGINE;window.__DOCFORMACION_DNF_VECTOR_STAGE='cover+introduction+base-legal+alignment+methodology+characterization+training-lines+coverage+executive-summary+conclusions';}
      return originalSave(filename,options);
    };
    return doc;
  }
  WrappedSection9JsPDF.API=PreviousJsPDF.API;WrappedSection9JsPDF.version=PreviousJsPDF.version;Object.setPrototypeOf(WrappedSection9JsPDF,PreviousJsPDF);window.jspdf.jsPDF=WrappedSection9JsPDF;window.__DOCFORMACION_SECTION9_PDF_READY=true;
})();
