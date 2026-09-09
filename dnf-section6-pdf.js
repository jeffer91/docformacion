(() => {
  'use strict';
  if (!window.jspdf?.jsPDF) return;

  const PreviousJsPDF = window.jspdf.jsPDF;
  const ENGINE = 'dnf-vector-jspdf-v6-training-lines';
  const CM = 72 / 2.54;
  const BODY = {left:72,right:72,top:150,bottom:72,fontSize:12,lineHeight:24,paragraphIndent:36};
  const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

  const clean = (v='') => String(v ?? '').trim();
  const pct = (part,total) => total ? part*100/total : 0;
  const pctText = value => Number(value||0).toLocaleString('es-EC',{maximumFractionDigits:1,minimumFractionDigits:Number.isInteger(Number(value||0))?0:1}) + ' %';
  const teachers = () => Array.isArray(state?.teachers) ? state.teachers : [];
  const period = () => state?.period || {};
  const documentCode = () => clean(period().dnfCode);
  const documentTitle = () => 'Detección de Necesidades de Formación';

  function periodText() {
    const fmt=value=>{const m=clean(value).match(/^(\d{4})-(\d{2})/);return m?(MONTHS[Number(m[2])-1]||m[2])+' '+m[1]:clean(value);};
    const a=fmt(period().start),b=fmt(period().end);return a&&b?a+' a '+b:(a||b||'período seleccionado');
  }
  function surveyYear() {
    const raw=clean(period().surveyPeriod),m=raw.match(/\b(19\d{2}|20\d{2})\b/);return m?m[1]:raw;
  }
  function sourceLabel() {
    const y=surveyYear();return 'Fuente: Encuesta de detección de necesidades de formación docente'+(y?' ('+y+')':'')+'.';
  }
  function imageFormat(dataUrl='') { if(/^data:image\/png/i.test(dataUrl))return'PNG';if(/^data:image\/webp/i.test(dataUrl))return'WEBP';return'JPEG'; }
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
    function heading(text,level=1){font('bold',12);const lines=doc.splitTextToSize(clean(text),bodyW),before=level===1?0:(level===2?12:8),after=level===1?18:(level===2?12:8);ensureSpace(before+lines.length*BODY.lineHeight+after+BODY.lineHeight*2);y+=before;doc.text(lines,BODY.left,y,{align:'left',lineHeightFactor:2});y+=lines.length*BODY.lineHeight+after;}
    function wrap(text,firstWidth,otherWidth){font();const words=clean(text).split(/\s+/).filter(Boolean),lines=[];let line='',available=firstWidth;words.forEach(word=>{const c=line?line+' '+word:word;if(doc.getTextWidth(c)<=available)line=c;else{if(line)lines.push({text:line,width:available});line=word;available=otherWidth;}});if(line)lines.push({text:line,width:available});return lines;}
    function drawLine(text,x,width,justify){const words=clean(text).split(/\s+/).filter(Boolean);if(!words.length)return;font();if(!justify||words.length===1){doc.text(words.join(' '),x,y);return;}const wordsW=words.reduce((s,w)=>s+doc.getTextWidth(w),0),normal=doc.getTextWidth(' '),gap=Math.max(normal,(width-wordsW)/(words.length-1));let cur=x;words.forEach((word,i)=>{doc.text(word,cur,y);cur+=doc.getTextWidth(word)+(i<words.length-1?gap:0);});}
    function paragraph(text,opts={}){const indent=opts.indent===false?0:BODY.paragraphIndent,firstW=bodyW-indent,lines=wrap(text,firstW,bodyW);let index=0;while(index<lines.length){let available=Math.floor((pageH-BODY.bottom-y)/BODY.lineHeight);if(available<2&&lines.length-index>1){newPage();available=Math.floor((pageH-BODY.bottom-y)/BODY.lineHeight);}let take=Math.min(Math.max(available,1),lines.length-index);const rem=lines.length-index-take;if(rem===1&&take>2)take--;if(take<=0){newPage();continue;}for(let o=0;o<take;o++){const absolute=index+o,first=absolute===0,x=BODY.left+(first?indent:0),width=first?firstW:bodyW,last=absolute===lines.length-1;drawLine(lines[absolute].text,x,width,opts.justify!==false&&!last);y+=BODY.lineHeight;}index+=take;if(index<lines.length)newPage();}y+=opts.after==null?8:opts.after;}
    function source(text){ensureSpace(20);font('italic',10,70);doc.text(clean(text),BODY.left,y);y+=18;font();}
    function note(text){ensureSpace(28);font('italic',10,70);const lines=doc.splitTextToSize(clean(text),bodyW);doc.text(lines,BODY.left,y,{lineHeightFactor:1.25});y+=lines.length*13+8;font();}
    function table(headers,rows,widths,opts={}){
      const x=BODY.left,totalW=bodyW,weights=(widths||headers.map(()=>1)).map(Number),sum=weights.reduce((a,b)=>a+b,0)||1,colW=weights.map(w=>totalW*w/sum),pad=5,headFont=opts.headFont||9,rowFont=opts.fontSize||10,lineH=opts.lineHeight||12.5;
      function textLines(text,w,size,style='normal'){doc.setFont('times',style);doc.setFontSize(size);const parts=String(text??'').split(/\n/);const out=[];parts.forEach((part,i)=>{const lines=doc.splitTextToSize(clean(part)||' ',Math.max(8,w-pad*2));out.push(...lines);if(i<parts.length-1)out.push('');});return out.length?out:[' '];}
      function headerHeight(){return Math.max(...headers.map((h,i)=>textLines(h,colW[i],headFont,'bold').length))*lineH+pad*2;}
      function rowHeight(row){return Math.max(...row.cells.map((c,i)=>textLines(c,colW[i],rowFont,row.bold?'bold':'normal').length))*lineH+pad*2;}
      function drawHeaderRow(){const h=headerHeight();if(y+h>pageH-BODY.bottom)newPage();doc.setFillColor(55,55,55);doc.setDrawColor(95);doc.rect(x,y,totalW,h,'FD');let cx=x;headers.forEach((htext,i)=>{if(i>0)doc.line(cx,y,cx,y+h);doc.setFont('times','bold');doc.setFontSize(headFont);doc.setTextColor(255);doc.text(textLines(htext,colW[i],headFont,'bold'),cx+pad,y+pad+lineH-2,{lineHeightFactor:1.08});cx+=colW[i];});doc.setTextColor(0);y+=h;}
      drawHeaderRow();
      rows.forEach((row,rowIndex)=>{const rh=rowHeight(row);if(y+rh>pageH-BODY.bottom){newPage();drawHeaderRow();}if(rowIndex%2===1){doc.setFillColor(246,247,248);doc.rect(x,y,totalW,rh,'F');}doc.setDrawColor(145);doc.rect(x,y,totalW,rh);let cx=x;row.cells.forEach((cell,i)=>{if(i>0)doc.line(cx,y,cx,y+rh);doc.setFont('times',row.bold?'bold':'normal');doc.setFontSize(rowFont);doc.setTextColor(0);doc.text(textLines(cell,colW[i],rowFont,row.bold?'bold':'normal'),cx+pad,y+pad+lineH-2,{lineHeightFactor:1.08});cx+=colW[i];});y+=rh;});
      y+=opts.after==null?10:opts.after;if(opts.source)source(opts.source);
    }
    newPage();return{heading,paragraph,table,source,note,newPage,ensureSpace};
  }

  function section6State(){
    const s=state?.section6&&typeof state.section6==='object'?state.section6:{};s.careers=s.careers||{};s.careerOrder=Array.isArray(s.careerOrder)?s.careerOrder:[];s.genericLines=Array.isArray(s.genericLines)?s.genericLines:[];return s;
  }
  function activeCareers(){
    const s=section6State();if(s.careerOrder.length)return s.careerOrder;
    const seen=new Set(),out=[];teachers().forEach(t=>{const name=clean(t.carrera);if(!name)return;const key=typeof careerKey==='function'?careerKey(name):name.toLowerCase();if(seen.has(key))return;seen.add(key);out.push(name);});return out;
  }
  function profileFor(name){const s=section6State(),key=typeof careerKey==='function'?careerKey(name):name.toLowerCase();return s.careers[key]||{career:name,description:'',specificLines:[],academicSuggestions:[]};}
  function listText(values){return(Array.isArray(values)?values:[]).map(clean).filter(Boolean).join('\n');}
  function monthLabel(value){const m=clean(value).match(/^(\d{4})-(\d{2})/);return m?(MONTHS[Number(m[2])-1]||m[2]).replace(/^./,c=>c.toUpperCase())+' '+m[1]:clean(value);}

  function appendStartDates(w){
    w.heading('6.1. Fecha Tentativa de Inicio de Formación',2);
    const grouped=new Map();let other=0,total=0;
    teachers().forEach(t=>{const raw=clean(t.inicioTentativo);if(!raw)return;total++;const m=raw.match(/^(\d{4})-(\d{2})/);if(!m){other++;return;}const key=m[1]+'-'+m[2];grouped.set(key,(grouped.get(key)||0)+1);});
    const rows=[...grouped.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
    const ranked=[...grouped.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
    if(!total){w.paragraph('No se registraron respuestas válidas sobre la fecha tentativa de inicio de formación para el período.');w.table(['Mes/Año estimado de inicio','Número de docentes','Porcentaje aproximado'],[{cells:['Total','0','—'],bold:true}],[54,23,23],{source:sourceLabel()});return;}
    if(ranked.length){
      const max=ranked[0][1],leaders=ranked.filter(x=>x[1]===max);
      if(leaders.length===1){const first=leaders[0],second=ranked.find(x=>x[0]!==first[0]);w.paragraph('De un total de '+total+' docentes con fecha registrada, se identificaron diversas fechas tentativas para el inicio de su proceso de formación. El período con mayor concentración fue '+monthLabel(first[0])+', con '+first[1]+' docentes ('+pctText(pct(first[1],total))+')'+(second?', seguido de '+monthLabel(second[0])+' con '+second[1]+' docentes ('+pctText(pct(second[1],total))+')':'')+'. Esta distribución constituye un insumo para la planificación escalonada y progresiva del Plan de Formación Docente.');}
      else w.paragraph('De un total de '+total+' docentes con fecha registrada, la mayor concentración se distribuye de manera equivalente entre '+leaders.map(x=>monthLabel(x[0])).join(', ')+', con '+max+' docentes ('+pctText(pct(max,total))+') en cada período. Esta distribución constituye un insumo para la planificación escalonada y progresiva del Plan de Formación Docente.');
    } else w.paragraph('De un total de '+total+' docentes con fecha registrada, las respuestas no pudieron agruparse en un formato común de mes y año. La información deberá revisarse antes de estructurar el cronograma del Plan de Formación Docente.');
    const tableRows=rows.map(([key,count])=>({cells:[monthLabel(key),String(count),pctText(pct(count,total))]}));if(other)tableRows.push({cells:['Otras fechas no definidas o variadas',String(other),pctText(pct(other,total))]});tableRows.push({cells:['Total',String(total),'100 %'],bold:true});
    w.table(['Mes/Año estimado de inicio','Número de docentes','Porcentaje aproximado'],tableRows,[54,23,23],{source:sourceLabel()});
    if(other)w.note('Nota: El grupo de “otras fechas” corresponde a respuestas dispersas no agrupadas en fechas comunes.');
  }

  function appendCareerSections(w){
    const careers=activeCareers();
    w.heading('6.2. Formaciones concretas, específicas',2);
    if(!careers.length){w.paragraph('No existen carreras activas con docentes registrados para generar las formaciones específicas del período.');return;}
    careers.forEach((career,index)=>{
      const p=profileFor(career),lines=(p.specificLines||[]).filter(x=>clean(x.line)||clean(x.justification)),academic=(p.academicSuggestions||[]).filter(x=>clean(x.level)||(x.programs||[]).length||clean(x.justification));
      w.heading('6.2.'+(index+1)+'. Carrera: '+career,3);
      if(clean(p.description))w.paragraph(p.description);else w.paragraph('No se registró una descripción de las necesidades formativas para esta carrera.');
      w.heading('Líneas de formación específicas sugeridas',3);
      if(lines.length)w.table(['Línea de formación específica','Justificación técnica'],lines.map(item=>({cells:[clean(item.line),clean(item.justification)]})),[38,62]);else w.paragraph('No se registraron líneas de formación específicas para esta carrera.');
      w.heading('Carreras sugeridas para la formación docente',3);
      if(academic.length)w.table(['Nivel de formación','Carreras sugeridas','Justificación'],academic.map(item=>({cells:[clean(item.level),listText(item.programs),clean(item.justification)]})),[22,34,44]);else w.paragraph('No se registraron titulaciones o programas sugeridos para esta carrera.');
    });
  }

  function appendGenericFormation(w){
    const lines=section6State().genericLines;
    w.heading('6.3. Formación Intelectual Genérica',2);
    w.paragraph('El desarrollo docente no se limita únicamente a las áreas específicas del conocimiento, sino que también requiere el fortalecimiento de competencias genéricas que permiten un ejercicio académico más integral, actualizado y alineado a los desafíos contemporáneos de la educación superior técnica y tecnológica. Estas líneas formativas, de carácter transversal, promueven la innovación pedagógica, la integración de tecnologías, el enfoque en valores y la gestión efectiva de procesos educativos.');
    w.paragraph('El siguiente cuadro resume las principales líneas de formación genérica sugeridas, junto con las carreras académicas pertinentes para cada una de ellas, considerando niveles de tecnología, licenciatura, maestría y doctorado.');
    if(!lines.length){w.paragraph('No se registraron líneas de formación genérica para el período.');return;}
    w.table(['Línea Genérica','Tecnología','Licenciatura','Maestría','Doctorado'],lines.map(item=>({cells:[clean(item.name),listText(item.tecnologia),listText(item.licenciatura),listText(item.maestria),listText(item.doctorado)]})),[24,19,19,19,19],{fontSize:8.5,headFont:8,lineHeight:11});
  }

  function appendSection6(doc){
    if(doc.__docformacionSection6Appended)return;doc.__docformacionSection6Appended=true;
    const w=createWriter(doc);
    w.heading('6. Líneas de Formación por Coordinación Académica',1);
    w.paragraph('Las líneas de formación propuestas desde la Coordinación Académica del ITSQMET responden a dos enfoques fundamentales: por un lado, fortalecer el dominio disciplinar específico de cada docente, y por otro, potenciar competencias pedagógicas, metodológicas y transversales comunes a toda la planta docente. Esta doble vía permite articular una estrategia formativa integral que considera tanto la profundidad técnica como la excelencia didáctica en el proceso de enseñanza-aprendizaje.');
    w.paragraph('En este sentido, las líneas específicas se centran en áreas vinculadas directamente con las carreras técnicas e ingenierías del instituto, mientras que las líneas genéricas incluyen aspectos pedagógicos, metodológicos, investigativos y tecnológicos de carácter transversal. Esta distinción permite que cada docente oriente su ruta formativa en función de su perfil, necesidades de mejora y expectativas profesionales.');
    appendStartDates(w);appendCareerSections(w);appendGenericFormation(w);
  }

  function redrawFooters(doc){const total=doc.getNumberOfPages(),pageW=doc.internal.pageSize.getWidth(),pageH=doc.internal.pageSize.getHeight();for(let n=1;n<=total;n++){doc.setPage(n);doc.setFillColor(255,255,255);doc.rect(0,pageH-44,pageW,30,'F');doc.setTextColor(105);doc.setFont('helvetica','normal');doc.setFontSize(7.2);doc.text('ITSQMET · Unidad de Gestión de Procesos Académicos · '+periodText()+' · Página '+n+' de '+total,pageW/2,pageH-24,{align:'center'});}}

  function WrappedSection6JsPDF(...args){
    const doc=new PreviousJsPDF(...args),originalSave=doc.save.bind(doc);
    doc.save=function section6Save(filename,options){
      if(/necesidades/i.test(String(filename||''))){appendSection6(doc);redrawFooters(doc);window.__DOCFORMACION_DNF_RENDERER=ENGINE;window.__DOCFORMACION_DNF_VECTOR_STAGE='cover+introduction+base-legal+alignment+methodology+characterization+training-lines';}
      return originalSave(filename,options);
    };
    return doc;
  }
  WrappedSection6JsPDF.API=PreviousJsPDF.API;WrappedSection6JsPDF.version=PreviousJsPDF.version;Object.setPrototypeOf(WrappedSection6JsPDF,PreviousJsPDF);window.jspdf.jsPDF=WrappedSection6JsPDF;window.__DOCFORMACION_SECTION6_PDF_READY=true;
})();