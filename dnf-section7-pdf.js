(() => {
  'use strict';
  if (!window.jspdf?.jsPDF) return;

  const PreviousJsPDF=window.jspdf.jsPDF;
  const ENGINE='dnf-vector-jspdf-v7-institutional-coverage';
  const CM=72/2.54;
  const BODY={left:72,right:72,top:150,bottom:72,fontSize:12,lineHeight:24,paragraphIndent:36};
  const MONTHS=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const LEVELS=['Técnico Superior','Tecnología Superior','Tecnología Universitaria'];

  const clean=(v='')=>String(v??'').trim();
  const period=()=>state?.period||{};
  const documentCode=()=>clean(period().dnfCode);
  const documentTitle=()=> 'Detección de Necesidades de Formación';
  const pct=(part,total)=>total?part*100/total:0;
  const pctText=value=>Number(value||0).toLocaleString('es-EC',{maximumFractionDigits:1,minimumFractionDigits:Number.isInteger(Number(value||0))?0:1})+' %';
  const keyFor=value=>typeof careerKey==='function'?careerKey(value):clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ');

  function periodText(){
    const fmt=value=>{const m=clean(value).match(/^(\d{4})-(\d{2})/);return m?(MONTHS[Number(m[2])-1]||m[2])+' '+m[1]:clean(value);};
    const a=fmt(period().start),b=fmt(period().end);return a&&b?a+' a '+b:(a||b||'período seleccionado');
  }
  function surveyDate(value){const m=clean(value).match(/^(\d{4})-(\d{2})/);return m?(MONTHS[Number(m[2])-1]||m[2])+' de '+m[1]:clean(value);}
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
    function heading(text,level=1){font('bold',12);const lines=doc.splitTextToSize(clean(text),bodyW),before=level===1?0:(level===2?12:8),after=level===1?18:(level===2?12:8);ensureSpace(before+lines.length*BODY.lineHeight+after+BODY.lineHeight);y+=before;doc.text(lines,BODY.left,y,{lineHeightFactor:2});y+=lines.length*BODY.lineHeight+after;}
    function wrap(text,firstWidth,otherWidth){font();const words=clean(text).split(/\s+/).filter(Boolean),lines=[];let line='',available=firstWidth;words.forEach(word=>{const c=line?line+' '+word:word;if(doc.getTextWidth(c)<=available)line=c;else{if(line)lines.push({text:line,width:available});line=word;available=otherWidth;}});if(line)lines.push({text:line,width:available});return lines;}
    function drawLine(text,x,width,justify){const words=clean(text).split(/\s+/).filter(Boolean);if(!words.length)return;font();if(!justify||words.length===1){doc.text(words.join(' '),x,y);return;}const wordsW=words.reduce((s,w)=>s+doc.getTextWidth(w),0),normal=doc.getTextWidth(' '),gap=Math.max(normal,(width-wordsW)/(words.length-1));let cur=x;words.forEach((word,i)=>{doc.text(word,cur,y);cur+=doc.getTextWidth(word)+(i<words.length-1?gap:0);});}
    function paragraph(text,opts={}){const indent=opts.indent===false?0:BODY.paragraphIndent,firstW=bodyW-indent,lines=wrap(text,firstW,bodyW);let i=0;while(i<lines.length){let available=Math.floor((pageH-BODY.bottom-y)/BODY.lineHeight);if(available<2&&lines.length-i>1){newPage();available=Math.floor((pageH-BODY.bottom-y)/BODY.lineHeight);}const take=Math.min(Math.max(available,1),lines.length-i);for(let o=0;o<take;o++){const absolute=i+o,first=absolute===0,x=BODY.left+(first?indent:0),width=first?firstW:bodyW,last=absolute===lines.length-1;drawLine(lines[absolute].text,x,width,opts.justify!==false&&!last);y+=BODY.lineHeight;}i+=take;if(i<lines.length)newPage();}y+=opts.after==null?8:opts.after;}
    function note(text){ensureSpace(32);font('italic',10,70);const lines=doc.splitTextToSize(clean(text),bodyW);doc.text(lines,BODY.left,y,{lineHeightFactor:1.25});y+=lines.length*13+10;font();}
    function table(headers,rows,widths,opts={}){
      const x=BODY.left,totalW=bodyW,weights=(widths||headers.map(()=>1)).map(Number),sum=weights.reduce((a,b)=>a+b,0)||1,colW=weights.map(w=>totalW*w/sum),pad=5,headFont=opts.headFont||9,rowFont=opts.fontSize||10,lineH=opts.lineHeight||12.5;
      function textLines(text,w,size,style='normal'){doc.setFont('times',style);doc.setFontSize(size);const parts=String(text??'').split(/\n/),out=[];parts.forEach((part,i)=>{out.push(...doc.splitTextToSize(clean(part)||' ',Math.max(8,w-pad*2)));if(i<parts.length-1)out.push('');});return out.length?out:[' '];}
      function hHeight(){return Math.max(...headers.map((h,i)=>textLines(h,colW[i],headFont,'bold').length))*lineH+pad*2;}
      function rHeight(row){return Math.max(...row.cells.map((c,i)=>textLines(c,colW[i],rowFont,row.bold?'bold':'normal').length))*lineH+pad*2;}
      function drawHead(){const h=hHeight();if(y+h>pageH-BODY.bottom)newPage();doc.setFillColor(55,55,55);doc.setDrawColor(95);doc.rect(x,y,totalW,h,'FD');let cx=x;headers.forEach((text,i)=>{if(i>0)doc.line(cx,y,cx,y+h);doc.setFont('times','bold');doc.setFontSize(headFont);doc.setTextColor(255);doc.text(textLines(text,colW[i],headFont,'bold'),cx+pad,y+pad+lineH-2,{lineHeightFactor:1.08});cx+=colW[i];});doc.setTextColor(0);y+=h;}
      drawHead();rows.forEach((row,index)=>{const rh=rHeight(row);if(y+rh>pageH-BODY.bottom){newPage();drawHead();}if(index%2===1){doc.setFillColor(246,247,248);doc.rect(x,y,totalW,rh,'F');}doc.setDrawColor(145);doc.rect(x,y,totalW,rh);let cx=x;row.cells.forEach((cell,i)=>{if(i>0)doc.line(cx,y,cx,y+rh);doc.setFont('times',row.bold?'bold':'normal');doc.setFontSize(rowFont);doc.setTextColor(0);doc.text(textLines(cell,colW[i],rowFont,row.bold?'bold':'normal'),cx+pad,y+pad+lineH-2,{lineHeightFactor:1.08});cx+=colW[i];});y+=rh;});y+=10;
    }
    function horizontalBars(title,items){
      const rowH=40,labelW=142,valueW=54,trackW=bodyW-labelW-valueW-12,totalH=38+items.length*rowH+24;ensureSpace(totalH);
      font('bold',11);doc.text(clean(title),BODY.left,y);y+=22;
      const max=Math.max(1,...items.map(x=>Number(x.value)||0));
      font('normal',9,80);doc.text('0 %',BODY.left+labelW,y);doc.text(pctText(max),BODY.left+labelW+trackW,y,{align:'right'});y+=10;
      items.forEach(item=>{
        font('normal',10,0);doc.text(clean(item.label),BODY.left,y+14);
        doc.setFillColor(235,238,241);doc.rect(BODY.left+labelW,y,trackW,18,'F');
        doc.setFillColor(55,75,94);doc.rect(BODY.left+labelW,y,trackW*Math.max(0,Number(item.value)||0)/max,18,'F');
        font('bold',10,0);doc.text(pctText(item.value),BODY.left+labelW+trackW+valueW,y+14,{align:'right'});
        y+=rowH;
      });
      y+=8;font();
    }
    newPage();return{heading,paragraph,note,table,horizontalBars,newPage};
  }

  function activeCareers(){
    if(typeof window.__DOCFORMACION_SECTION7_ACTIVE_CAREERS==='function')return window.__DOCFORMACION_SECTION7_ACTIVE_CAREERS();
    const seen=new Set(),out=[];(state.careers||[]).forEach(cr=>{const key=keyFor(cr.name);if(!key||seen.has(key))return;seen.add(key);out.push(cr.name);});return out;
  }
  function dedicationStats(){
    if(typeof window.__DOCFORMACION_SECTION7_DEDICATION_STATS==='function')return window.__DOCFORMACION_SECTION7_DEDICATION_STATS();
    const counts={'Tiempo Completo':0,'Medio Tiempo':0,'Tiempo Parcial':0};(state.teachers||[]).forEach(t=>{if(counts[t.dedicacion]!==undefined)counts[t.dedicacion]++;});const total=Object.values(counts).reduce((a,b)=>a+b,0);return{counts,total,percentages:{'Tiempo Completo':pct(counts['Tiempo Completo'],total),'Medio Tiempo':pct(counts['Medio Tiempo'],total),'Tiempo Parcial':pct(counts['Tiempo Parcial'],total)}};
  }
  function programFor(name){return (state.careers||[]).find(cr=>keyFor(cr.name)===keyFor(name))?.program||'';}
  function pluralCarrera(value){return Number(value)===1?'carrera':'carreras';}

  function appendCoverage(doc){
    if(doc.__docformacionSection7Appended)return;doc.__docformacionSection7Appended=true;
    const w=createWriter(doc),careers=activeCareers();
    const grouped={};LEVELS.forEach(level=>grouped[level]=[]);
    careers.forEach(name=>{const level=programFor(name);if(grouped[level])grouped[level].push(name);});
    const counts={};LEVELS.forEach(level=>counts[level]=grouped[level].length);

    w.heading('7. Cobertura Institucional',1);
    w.paragraph('El ITSQMET ha estructurado su oferta académica con base en una visión estratégica que responde a las necesidades del entorno productivo, tecnológico y social del país. Esta cobertura contempla programas técnicos y tecnológicos, en sus diferentes niveles de formación, que permiten atender una diversidad de perfiles estudiantiles y profesionales. La implementación de estas carreras se encuentra alineada con las directrices del Plan Estratégico de Desarrollo Institucional (PEDI), garantizando pertinencia, calidad y proyección en los distintos campos del saber.');
    w.paragraph('En este contexto, la cobertura institucional no solo se refiere a la amplitud de carreras que ofrece el ITSQMET, sino también a la estructura docente que las respalda. La caracterización de esta cobertura involucra el análisis del tipo de carreras por nivel académico, la inclusión del talento humano por régimen de dedicación —tiempo completo, medio tiempo y tiempo parcial—, así como la distribución del claustro docente en función de los perfiles requeridos. Estos elementos resultan fundamentales para definir estrategias de formación continua, planificar recursos institucionales y orientar los esfuerzos hacia una mejora sostenible de la calidad educativa.');

    w.heading('7.1. Listado oficial de carreras del ITSQMET',2);
    w.paragraph('El ITSQMET cuenta con una oferta académica compuesta por programas correspondientes a los diferentes niveles de formación vigentes en la institución. Esta diversidad permite atender necesidades de formación técnica, tecnológica e interdisciplinaria en sectores estratégicos del país. La clasificación por tipo de programa permite identificar las trayectorias formativas disponibles y su articulación con los niveles superiores del sistema de educación superior.');
    w.paragraph('A continuación, se presenta el listado oficial de carreras activas correspondiente al período '+periodText()+', organizadas por nivel de formación:');
    w.heading('Carreras por Programa',3);
    const rows=LEVELS.filter(level=>grouped[level].length).map(level=>({cells:[level,grouped[level].join('\n')]}));
    w.table(['Nivel de Formación','Carreras'],rows.length?rows:[{cells:['Sin carreras activas','—']}],[32,68],{fontSize:10,lineHeight:13});
    w.paragraph('Esta distribución refleja un total de '+counts['Técnico Superior']+' '+pluralCarrera(counts['Técnico Superior'])+' de Técnico Superior, '+counts['Tecnología Superior']+' '+pluralCarrera(counts['Tecnología Superior'])+' de Tecnología Superior y '+counts['Tecnología Universitaria']+' '+pluralCarrera(counts['Tecnología Universitaria'])+' de Tecnología Universitaria, consolidando una cobertura institucional alineada a las necesidades de formación y al desarrollo institucional.');

    w.heading('7.2. Inclusión de docentes por tipo de dedicación (TC, MT, TP)',2);
    w.paragraph('Para comprender el alcance de la cobertura del diagnóstico, es relevante analizar la participación de los docentes según su tipo de dedicación institucional. Esta información permite evaluar qué tan representados estuvieron los distintos regímenes laborales y si los hallazgos del estudio pueden proyectarse sobre la planta docente del ITSQMET. Al mismo tiempo, permite prever enfoques diferenciados de formación, considerando las cargas horarias, funciones y niveles de permanencia del personal académico.');
    w.paragraph('La encuesta aplicada incluyó una consulta sobre el tipo de dedicación laboral. Los resultados obtenidos para el período '+periodText()+' permiten identificar la distribución del personal docente entre tiempo completo, medio tiempo y tiempo parcial. Esta distribución constituye un elemento relevante para considerar estrategias formativas flexibles y adaptadas a las distintas condiciones de dedicación del claustro.');

    const d=dedicationStats();
    const tc=d.percentages['Tiempo Completo']||0,mt=d.percentages['Medio Tiempo']||0,tp=d.percentages['Tiempo Parcial']||0;
    w.heading('Distribución porcentual por tipo de dedicación',3);
    w.table(['Tipo de Dedicación','Porcentaje aproximado'],[
      {cells:['Tiempo Completo (TC)',pctText(tc)]},
      {cells:['Medio Tiempo (MT)',pctText(mt)]},
      {cells:['Tiempo Parcial (TP)',pctText(tp)]}
    ],[68,32]);

    const ranking=[['Tiempo Completo (TC)',tc],['Medio Tiempo (MT)',mt],['Tiempo Parcial (TP)',tp]].sort((a,b)=>b[1]-a[1]);
    if(d.total){
      const max=ranking[0][1],leaders=ranking.filter(x=>Math.abs(x[1]-max)<0.0001);
      if(leaders.length===1)w.paragraph('La mayor participación corresponde a '+leaders[0][0]+', con '+pctText(leaders[0][1])+'. Este resultado debe considerarse al definir modalidades, tiempos y mecanismos de acceso a las acciones de formación del período.');
      else w.paragraph('La mayor participación se distribuye de manera equivalente entre '+leaders.map(x=>x[0]).join(' y ')+', con '+pctText(max)+' en cada categoría. Esta distribución debe considerarse al definir modalidades, tiempos y mecanismos de acceso a las acciones de formación del período.');
    }

    w.horizontalBars('Distribución de docentes por tipo de dedicación',[
      {label:'Tiempo Parcial (TP)',value:tp},
      {label:'Medio Tiempo (MT)',value:mt},
      {label:'Tiempo Completo (TC)',value:tc}
    ]);
    const start=surveyDate(period().surveyStart),end=surveyDate(period().surveyEnd);
    w.note('Nota: Estos porcentajes se estiman en base a los datos declarados en el formulario del diagnóstico institucional aplicado entre '+(start||'fecha no definida')+' y '+(end||'fecha no definida')+'.');
  }

  function redrawFooters(doc){
    const total=doc.getNumberOfPages(),pageW=doc.internal.pageSize.getWidth(),pageH=doc.internal.pageSize.getHeight();
    for(let n=1;n<=total;n++){doc.setPage(n);doc.setFillColor(255,255,255);doc.rect(0,pageH-44,pageW,30,'F');doc.setTextColor(105);doc.setFont('helvetica','normal');doc.setFontSize(7.2);doc.text('ITSQMET · Unidad de Gestión de Procesos Académicos · '+periodText()+' · Página '+n+' de '+total,pageW/2,pageH-24,{align:'center'});}
  }

  function WrappedSection7JsPDF(...args){
    const doc=new PreviousJsPDF(...args),originalSave=doc.save.bind(doc);
    doc.save=function section7Save(filename,options){
      if(/necesidades/i.test(String(filename||''))){appendCoverage(doc);redrawFooters(doc);window.__DOCFORMACION_DNF_RENDERER=ENGINE;window.__DOCFORMACION_DNF_VECTOR_STAGE='cover+introduction+base-legal+alignment+methodology+characterization+training-lines+coverage';}
      return originalSave(filename,options);
    };
    return doc;
  }
  WrappedSection7JsPDF.API=PreviousJsPDF.API;WrappedSection7JsPDF.version=PreviousJsPDF.version;Object.setPrototypeOf(WrappedSection7JsPDF,PreviousJsPDF);window.jspdf.jsPDF=WrappedSection7JsPDF;window.__DOCFORMACION_SECTION7_PDF_READY=true;
})();