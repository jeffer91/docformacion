(() => {
  'use strict';
  if (!window.jspdf?.jsPDF) return;

  const PreviousJsPDF = window.jspdf.jsPDF;
  const ENGINE = 'dnf-vector-jspdf-v8-executive-summary';
  const CM = 72 / 2.54;
  const BODY = {left:72,right:72,top:150,bottom:72,fontSize:12,lineHeight:24,paragraphIndent:36};
  const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

  const clean = (v='') => String(v ?? '').trim();
  const period = () => state?.period || {};
  const documentCode = () => clean(period().dnfCode);
  const documentTitle = () => 'Detección de Necesidades de Formación';
  const pctText = value => Number(value||0).toLocaleString('es-EC',{maximumFractionDigits:1,minimumFractionDigits:Number.isInteger(Number(value||0))?0:1}) + ' %';

  function periodText() {
    const fmt=value=>{const m=clean(value).match(/^(\d{4})-(\d{2})/);return m?(MONTHS[Number(m[2])-1]||m[2])+' '+m[1]:clean(value);};
    const a=fmt(period().start),b=fmt(period().end);return a&&b?a+' a '+b:(a||b||'período seleccionado');
  }

  function imageFormat(dataUrl='') { if(/^data:image\/png/i.test(dataUrl))return'PNG';if(/^data:image\/webp/i.test(dataUrl))return'WEBP';return'JPEG'; }
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
    function heading(text,level=1){font('bold',12);const lines=doc.splitTextToSize(clean(text),bodyW),before=level===1?0:(level===2?12:8),after=level===1?18:(level===2?12:8);ensureSpace(before+lines.length*BODY.lineHeight+after+BODY.lineHeight);y+=before;doc.text(lines,BODY.left,y,{lineHeightFactor:2});y+=lines.length*BODY.lineHeight+after;}
    function wrap(text,firstWidth,otherWidth){font();const words=clean(text).split(/\s+/).filter(Boolean),lines=[];let line='',available=firstWidth;words.forEach(word=>{const c=line?line+' '+word:word;if(doc.getTextWidth(c)<=available)line=c;else{if(line)lines.push({text:line,width:available});line=word;available=otherWidth;}});if(line)lines.push({text:line,width:available});return lines;}
    function drawLine(text,x,width,justify){const words=clean(text).split(/\s+/).filter(Boolean);if(!words.length)return;font();if(!justify||words.length===1){doc.text(words.join(' '),x,y);return;}const wordsW=words.reduce((s,w)=>s+doc.getTextWidth(w),0),normal=doc.getTextWidth(' '),gap=Math.max(normal,(width-wordsW)/(words.length-1));let cur=x;words.forEach((word,i)=>{doc.text(word,cur,y);cur+=doc.getTextWidth(word)+(i<words.length-1?gap:0);});}
    function paragraph(text,opts={}){const indent=opts.indent===false?0:BODY.paragraphIndent,firstW=bodyW-indent,lines=wrap(text,firstW,bodyW);let i=0;while(i<lines.length){let available=Math.floor((pageH-BODY.bottom-y)/BODY.lineHeight);if(available<2&&lines.length-i>1){newPage();available=Math.floor((pageH-BODY.bottom-y)/BODY.lineHeight);}let take=Math.min(Math.max(available,1),lines.length-i);const rem=lines.length-i-take;if(rem===1&&take>2)take--;if(take<=0){newPage();continue;}for(let o=0;o<take;o++){const absolute=i+o,first=absolute===0,x=BODY.left+(first?indent:0),width=first?firstW:bodyW,last=absolute===lines.length-1;drawLine(lines[absolute].text,x,width,opts.justify!==false&&!last);y+=BODY.lineHeight;}i+=take;if(i<lines.length)newPage();}y+=opts.after==null?8:opts.after;}
    function table(headers,rows,widths,opts={}){
      const x=BODY.left,totalW=bodyW,weights=(widths||headers.map(()=>1)).map(Number),sum=weights.reduce((a,b)=>a+b,0)||1,colW=weights.map(w=>totalW*w/sum),pad=5,headFont=opts.headFont||9.5,rowFont=opts.fontSize||10.5,lineH=opts.lineHeight||13;
      function cellStyle(row,index){if(row.bold)return'bold';if(row.boldFirst&&index===0)return'bold';return'normal';}
      function textLines(text,w,size,style='normal'){doc.setFont('times',style);doc.setFontSize(size);const parts=String(text??'').split(/\n/),out=[];parts.forEach((part,i)=>{out.push(...doc.splitTextToSize(clean(part)||' ',Math.max(8,w-pad*2)));if(i<parts.length-1)out.push('');});return out.length?out:[' '];}
      function headerHeight(){return Math.max(...headers.map((h,i)=>textLines(h,colW[i],headFont,'bold').length))*lineH+pad*2;}
      function rowHeight(row){return Math.max(...row.cells.map((c,i)=>textLines(c,colW[i],rowFont,cellStyle(row,i)).length))*lineH+pad*2;}
      function drawHead(){const h=headerHeight();if(y+h>pageH-BODY.bottom)newPage();doc.setFillColor(55,55,55);doc.setDrawColor(95);doc.rect(x,y,totalW,h,'FD');let cx=x;headers.forEach((text,i)=>{if(i>0)doc.line(cx,y,cx,y+h);doc.setFont('times','bold');doc.setFontSize(headFont);doc.setTextColor(255);doc.text(textLines(text,colW[i],headFont,'bold'),cx+pad,y+pad+lineH-2,{lineHeightFactor:1.08});cx+=colW[i];});doc.setTextColor(0);y+=h;}
      drawHead();
      rows.forEach((row,index)=>{const rh=rowHeight(row);if(y+rh>pageH-BODY.bottom){newPage();drawHead();}if(index%2===1){doc.setFillColor(246,247,248);doc.rect(x,y,totalW,rh,'F');}doc.setDrawColor(145);doc.rect(x,y,totalW,rh);let cx=x;row.cells.forEach((cell,i)=>{if(i>0)doc.line(cx,y,cx,y+rh);const style=cellStyle(row,i);doc.setFont('times',style);doc.setFontSize(rowFont);doc.setTextColor(0);doc.text(textLines(cell,colW[i],rowFont,style),cx+pad,y+pad+lineH-2,{lineHeightFactor:1.08});cx+=colW[i];});y+=rh;});y+=opts.after==null?10:opts.after;
    }
    newPage();return{heading,paragraph,table,newPage};
  }

  function fallbackMetrics(){
    const all=Array.isArray(state?.teachers)?state.teachers:[];
    return {diagnosticTotal:all.length,level:{total:0,fourthPct:0,belowFourthPct:0},availability:{total:0,yesPct:0,noPct:0,interpretation:'ausencia de información suficiente'},update:{total:0,yesPct:0,noPct:0},updateAreas:{total:0,percentages:{}},programLevels:{total:0,percentages:{}},interests:{total:0,rows:[]},meta:{updateCategories:[]}};
  }
  function metrics(){return typeof window.__DOCFORMACION_DNF_METRICS==='function'?window.__DOCFORMACION_DNF_METRICS():fallbackMetrics();}
  function result(value,total){return total?pctText(value):'—';}

  function appendExecutiveSummary(doc){
    if(doc.__docformacionSection8Appended)return;doc.__docformacionSection8Appended=true;
    const w=createWriter(doc),m=metrics();

    w.heading('8. Resumen Ejecutivo',1);
    w.paragraph('El presente informe de detección de necesidades de formación docente del ITSQMET recoge los hallazgos más relevantes sobre el perfil académico del claustro, sus aspiraciones formativas, niveles de actualización y alineación con las exigencias del modelo de acreditación y del Plan Estratégico de Desarrollo Institucional (PEDI).');

    const validDiagnostic=m.level.total||m.diagnosticTotal;
    if(m.level.total){
      let second='Los resultados obtenidos durante el período '+periodText()+', a partir de '+validDiagnostic+' docentes considerados en el diagnóstico, permiten identificar el estado actual de la formación académica del claustro, su disposición para continuar procesos formativos y las principales áreas de interés y actualización. Del total de respuestas válidas sobre nivel académico, '+pctText(m.level.fourthPct)+' cuenta con formación de cuarto nivel, mientras que '+pctText(m.level.belowFourthPct)+' aún no alcanza este nivel de formación.';
      if(m.availability.total) second+=' Asimismo, '+pctText(m.availability.yesPct)+' manifestó disposición para iniciar o continuar estudios, evidenciando '+m.availability.interpretation+' respecto al fortalecimiento académico del personal docente.';
      else second+=' No existen respuestas válidas suficientes sobre disponibilidad para iniciar o continuar estudios, por lo que este indicador no se estima para el período.';
      w.paragraph(second);
    }else{
      w.paragraph('Los datos registrados para el período '+periodText()+' no contienen respuestas válidas suficientes sobre nivel académico para estimar la proporción de docentes con y sin formación de cuarto nivel. Los demás indicadores se presentan únicamente cuando existe una base válida de respuesta.');
    }
    w.paragraph('Estos resultados permiten establecer prioridades para la planificación del Plan de Formación Docente, orientar las líneas de formación por carrera y definir acciones institucionales dirigidas al cierre progresivo de brechas académicas, la actualización permanente y el fortalecimiento de la calidad educativa.');

    w.heading('Indicadores Cuantitativos Clave',2);
    const uc=m.updateAreas.percentages||{};
    w.table(['Indicador','Resultado (%)'],[
      {cells:['Docentes con título de cuarto nivel',result(m.level.fourthPct,m.level.total)]},
      {cells:['Docentes sin título de cuarto nivel',result(m.level.belowFourthPct,m.level.total)]},
      {cells:['Docentes dispuestos a iniciar estudios próximamente',result(m.availability.yesPct,m.availability.total)]},
      {cells:['Docentes sin intención actual de estudiar',result(m.availability.noPct,m.availability.total)]},
      {cells:['Docentes con formación o cursos recientes',result(m.update.yesPct,m.update.total)]},
      {cells:['Docentes sin formación reciente',result(m.update.noPct,m.update.total)]},
      {cells:['Formación declarada en áreas pedagógicas',result(uc['Áreas pedagógicas'],m.updateAreas.total)]},
      {cells:['Formación declarada en TIC, IA o plataformas digitales',result(uc['TIC, IA o plataformas digitales'],m.updateAreas.total)]},
      {cells:['Formación declarada en normativas o estándares',result(uc['Normativas o estándares'],m.updateAreas.total)]},
      {cells:['Formación en áreas técnicas o disciplinares específicas',result(uc['Áreas técnicas o disciplinares específicas'],m.updateAreas.total)]}
    ],[72,28]);

    w.heading('Distribución del Tipo de Programa donde Labora el Docente',2);
    const pp=m.programLevels.percentages||{};
    w.table(['Nivel de Formación que imparte','Porcentaje (%)'],[
      {cells:['Tecnología Superior',result(pp['Tecnología Superior'],m.programLevels.total)]},
      {cells:['Tecnología Universitaria',result(pp['Tecnología Universitaria'],m.programLevels.total)]},
      {cells:['Técnico Superior',result(pp['Técnico Superior'],m.programLevels.total)]}
    ],[72,28]);

    w.heading('Interés en Formación por Área de Conocimiento',2);
    const interestRows=(m.interests.rows||[]).map(item=>({cells:[item.label,result(item.percentage,m.interests.total)]}));
    if(!interestRows.length) interestRows.push({cells:['Sin respuestas válidas para el período','—']});
    w.table(['Área','Porcentaje de Docentes Interesados (%)'],interestRows,[68,32]);

    w.heading('Líneas de Acción Estratégica',2);
    const fourthObjective=m.level.total
      ? 'Brindar incentivos institucionales para que el '+pctText(m.level.belowFourthPct)+' de docentes pendientes avance hacia formación de cuarto nivel.'
      : 'Brindar incentivos institucionales para que los docentes pendientes avancen hacia formación de cuarto nivel, una vez consolidada la línea base válida del período.';
    w.table(['Línea','Objetivo'],[
      {cells:['Plan de Formación por carrera','Diseñar rutas formativas específicas según cada carrera y nivel educativo impartido.'],boldFirst:true},
      {cells:['Promoción de estudios de cuarto nivel',fourthObjective],boldFirst:true},
      {cells:['Apertura hacia estudios doctorales','Generar una política progresiva para fortalecer la formación doctoral en educación, innovación y áreas clave.'],boldFirst:true},
      {cells:['Capacitación permanente','Mantener la actualización continua en nuevas metodologías, normativas, tecnologías y tendencias disciplinarias.'],boldFirst:true},
      {cells:['Seguimiento y multiplicación del conocimiento','Establecer un sistema institucional de aplicación práctica de lo aprendido mediante rediseños, proyectos o tutorías.'],boldFirst:true}
    ],[38,62]);
  }

  function redrawFooters(doc){
    const total=doc.getNumberOfPages(),pageW=doc.internal.pageSize.getWidth(),pageH=doc.internal.pageSize.getHeight();
    for(let n=1;n<=total;n++){doc.setPage(n);doc.setFillColor(255,255,255);doc.rect(0,pageH-44,pageW,30,'F');doc.setTextColor(105);doc.setFont('helvetica','normal');doc.setFontSize(7.2);doc.text('ITSQMET · Unidad de Gestión de Procesos Académicos · '+periodText()+' · Página '+n+' de '+total,pageW/2,pageH-24,{align:'center'});}
  }

  function WrappedSection8JsPDF(...args){
    const doc=new PreviousJsPDF(...args),originalSave=doc.save.bind(doc);
    doc.save=function section8Save(filename,options){
      if(/necesidades/i.test(String(filename||''))){appendExecutiveSummary(doc);redrawFooters(doc);window.__DOCFORMACION_DNF_RENDERER=ENGINE;window.__DOCFORMACION_DNF_VECTOR_STAGE='cover+introduction+base-legal+alignment+methodology+characterization+training-lines+coverage+executive-summary';}
      return originalSave(filename,options);
    };
    return doc;
  }
  WrappedSection8JsPDF.API=PreviousJsPDF.API;WrappedSection8JsPDF.version=PreviousJsPDF.version;Object.setPrototypeOf(WrappedSection8JsPDF,PreviousJsPDF);window.jspdf.jsPDF=WrappedSection8JsPDF;window.__DOCFORMACION_SECTION8_PDF_READY=true;
})();
