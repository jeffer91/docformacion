(() => {
  'use strict';

  if (!window.jspdf?.jsPDF) return;

  const PreviousJsPDF = window.jspdf.jsPDF;
  const ENGINE = 'dnf-vector-jspdf-v5-characterization';
  const CM = 72 / 2.54;
  const BODY = { left:72, right:72, top:150, bottom:72, fontSize:12, lineHeight:24, paragraphIndent:36 };
  const LEVELS_CURRENT = ['Tecnólogo Superior','Tecnólogo Universitario','Licenciatura / Ingeniería','Maestría / Maestría Tecnológica','Doctorado'];
  const LEVELS_DESIRED = ['Doctorado','Maestría / Maestría Tecnológica','Licenciatura / Ingeniería','Tecnólogo Universitario'];
  const FUNCTIONS = ['Docencia','Investigación','Vinculación'];

  function clean(v='') { return String(v ?? '').trim(); }
  function teachers() { return Array.isArray(state?.teachers) ? state.teachers : []; }
  function period() { return state?.period || {}; }
  function surveyPeriod() { return clean(period().surveyPeriod); }
  function surveyYear() {
    const match = surveyPeriod().match(/\b(20\d{2}|19\d{2})\b/);
    return match ? match[1] : surveyPeriod();
  }
  function periodText() {
    const p = period();
    const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const fmt = value => {
      const m = clean(value).match(/^(\d{4})-(\d{2})/);
      return m ? (months[Number(m[2])-1] || m[2]) + ' ' + m[1] : clean(value);
    };
    const a = fmt(p.start), b = fmt(p.end);
    return a && b ? a + ' a ' + b : (a || b || 'período seleccionado');
  }
  function documentCode() { return clean(period().dnfCode); }
  function documentTitle() { return 'Detección de Necesidades de Formación'; }
  function pct(part,total) { return total ? (part * 100 / total) : 0; }
  function pctText(value) {
    const n = Number(value || 0);
    return n.toLocaleString('es-EC',{maximumFractionDigits:1,minimumFractionDigits:Number.isInteger(n)?0:1}) + ' %';
  }
  function countValid(values) { return values.filter(v => clean(v)).length; }
  function yesNo(value) {
    const raw = clean(value).toLowerCase();
    if (/^(sí|si)\b/.test(raw)) return 'Sí';
    if (/^no\b/.test(raw)) return 'No';
    return '';
  }
  function normalize(value, allowed=[]) {
    const raw = clean(value);
    if (!raw) return '';
    return allowed.find(x => x.toLowerCase() === raw.toLowerCase()) || raw;
  }
  function orderedCounts(field, categories, normalizer=v=>clean(v)) {
    const map = Object.fromEntries(categories.map(x => [x,0]));
    teachers().forEach(t => {
      const value = normalizer(t[field]);
      if (Object.prototype.hasOwnProperty.call(map,value)) map[value]++;
    });
    const total = Object.values(map).reduce((a,b)=>a+b,0);
    return {map,total};
  }
  function topEntries(map) {
    return Object.entries(map).sort((a,b)=>b[1]-a[1]);
  }
  function sourceLabel() {
    const y = surveyYear();
    return 'Fuente: Encuesta de detección de necesidades de formación docente' + (y ? ' (' + y + ')' : '') + '.';
  }

  function imageFormat(dataUrl='') {
    if (/^data:image\/png/i.test(dataUrl)) return 'PNG';
    if (/^data:image\/webp/i.test(dataUrl)) return 'WEBP';
    return 'JPEG';
  }
  function getLogoData() {
    try { if (typeof INSTITUTION_LOGO_DATA !== 'undefined' && typeof INSTITUTION_LOGO_DATA === 'string') return INSTITUTION_LOGO_DATA; } catch (_e) {}
    return '';
  }
  function fitImage(doc,dataUrl,maxW,maxH) {
    try {
      const props = doc.getImageProperties(dataUrl), ratio = props.width / props.height;
      let w=maxW,h=w/ratio;
      if (h>maxH) { h=maxH; w=h*ratio; }
      return {w,h};
    } catch (_e) { return {w:maxW,h:maxH}; }
  }
  function drawHeader(doc,pageNo) {
    doc.setPage(pageNo);
    const pageW=doc.internal.pageSize.getWidth(), totalW=18*CM, x=(pageW-totalW)/2, top=1.5*CM, h=2.8*CM;
    const colA=totalW*.25,colB=totalW*.5,colC=totalW*.25,row1=.8*CM,row2=h-row1,bx=x+colA,cx=bx+colB;
    doc.setDrawColor(70);doc.setLineWidth(.65);doc.rect(x,top,totalW,h);doc.line(bx,top,bx,top+h);doc.line(cx,top,cx,top+h);doc.line(bx,top+row1,cx,top+row1);
    const logo=getLogoData();
    if (logo) {
      try { const f=fitImage(doc,logo,Math.min(colA-12,3.8*CM),Math.min(h-12,1.8*CM));doc.addImage(logo,imageFormat(logo),x+(colA-f.w)/2,top+(h-f.h)/2,f.w,f.h,undefined,'FAST'); } catch (_e) {}
    } else { doc.setFont('helvetica','bold');doc.setFontSize(9);doc.text('ITSQMET',x+colA/2,top+h/2,{align:'center'}); }
    doc.setTextColor(30);doc.setFont('helvetica','normal');doc.setFontSize(8.5);
    const unit=doc.splitTextToSize('UNIDAD DE GESTIÓN DE PROCESOS ACADÉMICOS',colB-12);
    doc.text(unit,bx+colB/2,top+(row1-unit.length*9.2)/2+7.2,{align:'center',lineHeightFactor:1.02});
    const title=doc.splitTextToSize(documentTitle(),colB-18), per=doc.splitTextToSize(periodText(),colB-18);
    let gy=top+row1+(row2-(title.length*9.3+3+per.length*9.1))/2+7.2;
    doc.setFont('helvetica','bold');doc.setFontSize(8.5);doc.text(title,bx+colB/2,gy,{align:'center',lineHeightFactor:1.02});gy+=title.length*9.3+3;
    doc.setFontSize(8.2);doc.text(per,bx+colB/2,gy,{align:'center',lineHeightFactor:1.02});
    doc.setFont('helvetica','bold');doc.setFontSize(8.2);doc.text('Código:',cx+colC/2,top+h/2-8,{align:'center'});
    doc.setFont('helvetica','normal');doc.setFontSize(8.1);doc.text(doc.splitTextToSize(documentCode(),colC-14),cx+colC/2,top+h/2+5,{align:'center',lineHeightFactor:1.05});
  }

  function createWriter(doc) {
    const pageW=doc.internal.pageSize.getWidth(), pageH=doc.internal.pageSize.getHeight(), bodyW=pageW-BODY.left-BODY.right;
    let y=BODY.top;
    function font(style='normal',size=BODY.fontSize,color=0) { doc.setFont('times',style);doc.setFontSize(size);doc.setTextColor(color); }
    function newPage() { doc.addPage();drawHeader(doc,doc.getNumberOfPages());font();y=BODY.top; }
    function ensureSpace(h) { if (y+h>pageH-BODY.bottom) newPage(); }
    function heading(text,level=1) {
      font('bold',12);const lines=doc.splitTextToSize(clean(text),bodyW),before=level===1?0:(level===2?12:8),after=level===1?18:(level===2?12:8);
      ensureSpace(before+lines.length*BODY.lineHeight+after+BODY.lineHeight*2);y+=before;doc.text(lines,BODY.left,y,{align:'left',lineHeightFactor:2});y+=lines.length*BODY.lineHeight+after;
    }
    function wrap(text,firstWidth,otherWidth) {
      font();const words=clean(text).split(/\s+/).filter(Boolean),lines=[];let line='',available=firstWidth;
      words.forEach(word=>{const candidate=line?line+' '+word:word;if(doc.getTextWidth(candidate)<=available)line=candidate;else{if(line)lines.push({text:line,width:available});line=word;available=otherWidth;}});
      if(line)lines.push({text:line,width:available});return lines;
    }
    function drawLine(text,x,width,justify) {
      const words=clean(text).split(/\s+/).filter(Boolean);if(!words.length)return;font();
      if(!justify||words.length===1){doc.text(words.join(' '),x,y);return;}
      const wordsW=words.reduce((s,w)=>s+doc.getTextWidth(w),0),normal=doc.getTextWidth(' '),gap=Math.max(normal,(width-wordsW)/(words.length-1));let cur=x;
      words.forEach((word,i)=>{doc.text(word,cur,y);cur+=doc.getTextWidth(word)+(i<words.length-1?gap:0);});
    }
    function paragraph(text,opts={}) {
      const indent=opts.indent===false?0:BODY.paragraphIndent, firstW=bodyW-indent, lines=wrap(text,firstW,bodyW);let index=0;
      while(index<lines.length){let available=Math.floor((pageH-BODY.bottom-y)/BODY.lineHeight);if(available<2&&lines.length-index>1){newPage();available=Math.floor((pageH-BODY.bottom-y)/BODY.lineHeight);}let take=Math.min(Math.max(available,1),lines.length-index);const rem=lines.length-index-take;if(rem===1&&take>2)take--;if(take<=0){newPage();continue;}for(let o=0;o<take;o++){const absolute=index+o,first=absolute===0,x=BODY.left+(first?indent:0),width=first?firstW:bodyW,last=absolute===lines.length-1;drawLine(lines[absolute].text,x,width,opts.justify!==false&&!last);y+=BODY.lineHeight;}index+=take;if(index<lines.length)newPage();}y+=opts.after==null?8:opts.after;
    }
    function bullet(text) {
      const left=30,width=bodyW-left,lines=wrap(text,width,width);let idx=0;
      while(idx<lines.length){if(y+BODY.lineHeight>pageH-BODY.bottom)newPage();const abs=idx;if(abs===0){font();doc.text('•',BODY.left+8,y);}doc.text(lines[idx].text,BODY.left+left,y);y+=BODY.lineHeight;idx++;}
      y+=2;
    }
    function source(text) { ensureSpace(20);font('italic',10,70);doc.text(clean(text),BODY.left,y);y+=18;font(); }

    function table(headers,rows,widths,opts={}) {
      const x=BODY.left,totalW=bodyW;
      const ws=(widths||[]).map(Number);const sum=ws.reduce((a,b)=>a+b,0)||1;const colW=ws.map(w=>totalW*w/sum);
      const pad=5,headFont=9.5,rowFont=10.5,lineH=13;
      function textLines(text,w,size,rowStyle='normal') { doc.setFont('times',rowStyle);doc.setFontSize(size);return doc.splitTextToSize(clean(text),Math.max(8,w-pad*2)); }
      function headerHeight(){return Math.max(...headers.map((h,i)=>textLines(h,colW[i],headFont,'bold').length))*lineH+pad*2;}
      function rowHeight(row){return Math.max(...row.cells.map((c,i)=>textLines(c,colW[i],rowFont,row.bold?'bold':'normal').length))*lineH+pad*2;}
      function drawHeaderRow(){const h=headerHeight();if(y+h>pageH-BODY.bottom)newPage();doc.setFillColor(55,55,55);doc.setDrawColor(95);doc.rect(x,y,totalW,h,'FD');let cx=x;headers.forEach((htext,i)=>{if(i>0)doc.line(cx,y,cx,y+h);doc.setFont('times','bold');doc.setFontSize(headFont);doc.setTextColor(255);const lines=textLines(htext,colW[i],headFont,'bold');const ty=y+pad+lineH-2;doc.text(lines,cx+pad,ty,{lineHeightFactor:1.15});cx+=colW[i];});doc.setTextColor(0);y+=h;}
      drawHeaderRow();
      rows.forEach(row=>{
        const rh=rowHeight(row);if(y+rh>pageH-BODY.bottom){newPage();drawHeaderRow();}
        doc.setDrawColor(145);doc.rect(x,y,totalW,rh);let cx=x;
        row.cells.forEach((cell,i)=>{if(i>0)doc.line(cx,y,cx,y+rh);doc.setFont('times',row.bold?'bold':'normal');doc.setFontSize(rowFont);doc.setTextColor(0);const lines=textLines(cell,colW[i],rowFont,row.bold?'bold':'normal');doc.text(lines,cx+pad,y+pad+lineH-2,{lineHeightFactor:1.15});cx+=colW[i];});
        y+=rh;
      });
      y+=opts.after==null?10:opts.after;
      if(opts.source) source(opts.source);
    }
    newPage();
    return {heading,paragraph,bullet,table,source,newPage,ensureSpace,getY:()=>y};
  }

  function functionSection(w) {
    const {map,total}=orderedCounts('funcionSustantiva',FUNCTIONS,v=>normalize(v,FUNCTIONS));
    w.heading('5.1. Distribución por Función Sustantiva Principal',2);
    w.paragraph('Como parte del proceso de caracterización del claustro docente, se analizó la función sustantiva principal asignada a cada profesor en la plataforma institucional. Esta información permite identificar hacia qué eje académico se orienta la actividad profesional predominante de los docentes y facilita la toma de decisiones para la planificación de la formación.');
    w.paragraph('A partir de '+total+' docentes analizados, se obtuvo la siguiente distribución:');
    const rows=FUNCTIONS.map(k=>({cells:[k,String(map[k]),total?pctText(pct(map[k],total)):'—']}));rows.push({cells:['Total',String(total),total?'100 %':'—'],bold:true});
    w.table(['Función Sustantiva','Número de Docentes','Porcentaje (%)'],rows,[52,24,24]);
    if(!total){w.paragraph('No se registraron respuestas válidas para la función sustantiva principal, por lo que no es posible establecer una distribución para este período.');return;}
    const ranked=topEntries(map),max=ranked[0][1],leaders=ranked.filter(x=>x[1]===max);
    if(leaders.length===1){const other=ranked.slice(1);w.paragraph('Esta distribución evidencia que la función sustantiva con mayor representación es '+leaders[0][0]+', con '+pctText(pct(leaders[0][1],total))+' del total analizado. '+(other.length?'Las funciones de '+other.map(x=>x[0]).join(' y ')+' presentan una participación de '+other.map(x=>pctText(pct(x[1],total))).join(' y ')+', respectivamente. ':'')+'Estos resultados permiten orientar la planificación de la formación docente de acuerdo con la distribución real de las funciones sustantivas del claustro.');}
    else {w.paragraph('La distribución presenta un empate en la mayor representación entre '+leaders.map(x=>x[0]).join(', ')+', con '+pctText(pct(max,total))+' cada una. El resultado debe considerarse al planificar acciones de formación diferenciadas según las funciones sustantivas presentes en el claustro.');}
  }

  function levelSection(w) {
    const {map,total}=orderedCounts('nivelActual',LEVELS_CURRENT,v=>normalize(v,LEVELS_CURRENT));
    w.heading('5.2. Nivel Académico Actual',2);
    w.heading('a) Importancia del nivel académico en el proceso formativo',3);
    w.paragraph('El nivel académico alcanzado por el cuerpo docente constituye un criterio fundamental en la evaluación de la calidad educativa. Según los estándares establecidos por el CACES, se espera que el personal docente posea como mínimo una titulación de cuarto nivel (maestría o maestría tecnológica), especialmente en carreras de formación técnica y tecnológica. Por tanto, el diagnóstico del nivel de formación actual permite establecer la línea base sobre la cual se diseñará el Plan de Formación Docente.');
    w.heading('b) Resultados del levantamiento institucional',3);
    w.paragraph('Durante '+(surveyPeriod()||'el período de aplicación registrado')+' se aplicó una encuesta institucional a los docentes del ITSQMET. De los '+total+' registros válidos obtenidos, se identificó la siguiente distribución por nivel de titulación formal:');
    const rows=LEVELS_CURRENT.map(k=>({cells:[k,String(map[k]),total?pctText(pct(map[k],total)):'—']}));rows.push({cells:['Total',String(total),total?'100 %':'—'],bold:true});
    w.table(['Nivel Académico','Número de Docentes','Porcentaje (%)'],rows,[52,24,24],{source:sourceLabel()});
    w.heading('c) Análisis de cumplimiento normativo',3);
    if(!total){w.paragraph('No existen registros válidos suficientes para calcular la distribución del nivel académico actual.');}
    else {
      const fourth=map['Maestría / Maestría Tecnológica']+map['Doctorado'],below=total-fourth;
      w.paragraph('Del total de respuestas válidas, '+pctText(pct(map['Maestría / Maestría Tecnológica'],total))+' corresponde a docentes con maestría o maestría tecnológica y '+pctText(pct(map['Doctorado'],total))+' a docentes con doctorado. En conjunto, '+pctText(pct(fourth,total))+' del grupo analizado cuenta con formación de cuarto nivel, mientras que '+pctText(pct(below,total))+' se ubica en niveles previos. La distribución permite establecer la línea base real para definir acciones diferenciadas de cualificación académica.');
    }
    w.heading('d) Oportunidad estratégica: formación doctoral',3);
    const dPct=total?pct(map['Doctorado'],total):0;
    w.paragraph('Un '+pctText(dPct)+' del claustro con respuesta válida posee título de doctorado. Este resultado permite dimensionar la presencia actual de formación doctoral dentro del claustro. En este marco, se recomienda fortalecer alianzas con universidades nacionales e internacionales que faciliten el acceso progresivo del personal docente a programas doctorales pertinentes.');
    w.heading('e) Implicaciones para la planificación',3);
    ['Acciones para elevar la cualificación académica.','Estrategias diferenciadas según nivel actual.','Rutas de fortalecimiento doctoral.','Acompañamiento académico, institucional y, cuando sea posible, financiero.'].forEach(x=>w.bullet(x));
  }

  function availabilitySection(w) {
    const map={'Sí':0,'No':0};teachers().forEach(t=>{const v=yesNo(t.dispuesto);if(v)map[v]++;});const total=map.Sí+map.No;
    w.heading('5.3. Disponibilidad Declarada para Iniciar Estudios',2);
    w.paragraph('Uno de los indicadores clave para la planificación del plan de formación docente es la disposición expresada por los docentes para iniciar nuevos procesos formativos. Este aspecto permite proyectar no solo la factibilidad operativa del plan, sino también identificar posibles barreras o necesidades de acompañamiento.');
    w.heading('a) Tendencia hacia la formación académica',3);
    const rows=[{cells:['Sí, estoy dispuesto/a a iniciar estudios',String(map.Sí),total?pctText(pct(map.Sí,total)):'—']},{cells:['No estoy interesado/a por el momento',String(map.No),total?pctText(pct(map.No,total)):'—']},{cells:['Total',String(total),total?'100 %':'—'],bold:true}];
    w.table(['Disponibilidad para iniciar estudios','Número','Porcentaje (%)'],rows,[58,18,24],{source:sourceLabel()});
    w.heading('b) Implicaciones para la gestión institucional',3);
    if(!total) w.paragraph('No existen respuestas válidas suficientes para interpretar la disponibilidad declarada para iniciar estudios.');
    else if(map.Sí>map.No) w.paragraph('La mayoría de las respuestas válidas manifiesta disposición para iniciar estudios: '+pctText(pct(map.Sí,total))+' respondió afirmativamente, frente a '+pctText(pct(map.No,total))+' que no está interesado por el momento. Esta distribución favorece la viabilidad de acciones formativas, aunque el grupo no dispuesto debe considerarse al definir mecanismos de acompañamiento y condiciones de acceso.');
    else if(map.No>map.Sí) w.paragraph('La mayor proporción de respuestas válidas corresponde a docentes que no están interesados por el momento, con '+pctText(pct(map.No,total))+', frente a '+pctText(pct(map.Sí,total))+' que sí manifiesta disposición. Este resultado exige considerar barreras, condiciones de acceso y mecanismos de acompañamiento antes de estructurar nuevas rutas formativas.');
    else w.paragraph('Las respuestas válidas se distribuyen de manera equilibrada: '+pctText(pct(map.Sí,total))+' manifiesta disposición y '+pctText(pct(map.No,total))+' no está interesado por el momento. La planificación deberá considerar ambas condiciones en igualdad de peso.');
  }

  function trainingTypeSection(w) {
    const map={'Específica':0,'Genérica':0};teachers().forEach(t=>{const v=normalize(t.tipoFormacion,['Específica','Genérica']);if(Object.prototype.hasOwnProperty.call(map,v))map[v]++;});const total=map.Específica+map.Genérica;
    w.heading('5.4. Intereses de Formación por Áreas de Conocimiento',2);
    const rows=[{cells:['Específica (vinculada a la carrera técnica)',total?pctText(pct(map.Específica,total)):'—']},{cells:['Genérica (docencia, pedagogía, investigación, transversal)',total?pctText(pct(map.Genérica,total)):'—']}];
    w.table(['Tipo de Formación Preferida','Porcentaje (%)'],rows,[72,28],{source:sourceLabel()});
    if(!total) w.paragraph('No existen respuestas válidas suficientes para identificar una preferencia entre formación específica y genérica.');
    else if(map.Específica>map.Genérica) w.paragraph('La formación específica presenta la mayor preferencia, con '+pctText(pct(map.Específica,total))+', frente a '+pctText(pct(map.Genérica,total))+' de formación genérica. El resultado indica una mayor orientación hacia contenidos directamente vinculados con las carreras que imparte el claustro.');
    else if(map.Genérica>map.Específica) w.paragraph('La formación genérica presenta la mayor preferencia, con '+pctText(pct(map.Genérica,total))+', frente a '+pctText(pct(map.Específica,total))+' de formación específica. El resultado evidencia una mayor demanda de ámbitos transversales como docencia, pedagogía, investigación u otras áreas comunes.');
    else w.paragraph('Las preferencias se distribuyen de manera equilibrada entre formación específica y genérica, con '+pctText(50)+' para cada categoría. La planificación deberá mantener una respuesta balanceada entre necesidades disciplinares y transversales.');
  }

  function desiredLevelSection(w) {
    const {map,total}=orderedCounts('nivelDeseado',LEVELS_DESIRED,v=>normalize(v,LEVELS_DESIRED));
    w.heading('5.5. Nivel Académico que Desean Alcanzar',2);
    const rows=LEVELS_DESIRED.map(k=>({cells:[k,total?pctText(pct(map[k],total)):'—']}));
    w.table(['Nivel Académico Deseado','Porcentaje (%)'],rows,[72,28],{source:sourceLabel()});
    if(!total){w.paragraph('No existen respuestas válidas suficientes para analizar el nivel académico que el claustro desea alcanzar.');return;}
    const fourth=map['Doctorado']+map['Maestría / Maestría Tecnológica'],ranked=topEntries(map),first=ranked[0],second=ranked[1];
    w.paragraph('El '+pctText(pct(fourth,total))+' de las respuestas válidas se orienta hacia niveles de cuarto nivel. El nivel académico más solicitado es '+first[0]+' con '+pctText(pct(first[1],total))+'. El segundo nivel más solicitado es '+second[0]+' con '+pctText(pct(second[1],total))+'. Las demás categorías representan '+pctText(pct(total-first[1]-second[1],total))+' del total de respuestas válidas. Estos resultados permiten priorizar rutas formativas de acuerdo con la proyección académica declarada por el claustro.');
  }

  function updateSection(w) {
    const map={'Sí':0,'No':0};teachers().forEach(t=>{const v=yesNo(t.actualizacionReciente);if(v)map[v]++;});const total=map.Sí+map.No;
    w.heading('5.6. Participación en Programas de Actualización',2);
    const rows=[{cells:['Sí o formación en curso',String(map.Sí),total?pctText(pct(map.Sí,total)):'—']},{cells:['No o sin formación reciente',String(map.No),total?pctText(pct(map.No,total)):'—']},{cells:['Total',String(total),total?'100 %':'—'],bold:true}];
    w.table(['Participación en actualización reciente','Total','Porcentaje (%)'],rows,[58,18,24],{source:sourceLabel()});
    if(total){
      const majority=map.Sí>=map.No?'Sí o formación en curso':'No o sin formación reciente',count=Math.max(map.Sí,map.No);
      w.paragraph('La categoría con mayor participación es '+majority+', con '+pctText(pct(count,total))+' de las respuestas válidas. El denominador de esta pregunta corresponde exclusivamente a los registros que contienen una respuesta válida y puede diferir del universo general del diagnóstico.');
    } else w.paragraph('No existen respuestas válidas suficientes para calcular la participación reciente en programas de actualización.');
    w.heading('b) Temáticas abordadas y líneas emergentes',3);
    const topics={};teachers().forEach(t=>{if(yesNo(t.actualizacionReciente)!=='Sí')return;const topic=clean(t.programaActualizacion);if(!topic)return;const key=topic.toLowerCase();if(!topics[key])topics[key]={label:topic,count:0};topics[key].count++;});
    const topicRows=Object.values(topics).sort((a,b)=>b.count-a.count||a.label.localeCompare(b.label,'es'));
    if(!topicRows.length){w.paragraph('No se registraron temáticas de actualización suficientemente identificadas para el período.');return;}
    w.paragraph('Entre las respuestas afirmativas se identificaron las siguientes temáticas de actualización o formación en curso:');
    topicRows.forEach(x=>w.bullet(x.label+(x.count>1?' ('+x.count+' docentes)':''))); 
  }

  function appendCharacterization(doc) {
    if (doc.__docformacionCharacterizationAppended) return;
    doc.__docformacionCharacterizationAppended = true;
    const w=createWriter(doc);
    w.heading('5. Caracterización del Claustro Docente',1);
    w.paragraph('El claustro docente del ITSQMET se conforma por profesionales provenientes de diversas áreas del conocimiento, distribuidos en carreras técnicas y tecnológicas. Esta diversidad responde a la oferta educativa del instituto, que busca garantizar un proceso formativo integral, pertinente y alineado con las demandas del entorno productivo. El perfil de los docentes incluye titulaciones de tercer y cuarto nivel, así como trayectorias profesionales que complementan la formación académica con experiencia práctica. Esta heterogeneidad representa una fortaleza, pero también plantea retos en términos de equidad en la formación continua y actualización disciplinar.');
    w.paragraph('Para el presente diagnóstico, se ha considerado a '+teachers().length+' docentes registrados en las plataformas institucionales, incluyendo tanto a quienes poseen nombramiento como a los que prestan servicios bajo contrato temporal. La información ha sido organizada con base en niveles de formación alcanzados, tiempo de permanencia en la institución, vinculación con funciones sustantivas —docencia, vinculación e investigación— y modalidad de trabajo —presencial, en línea o híbrida—. Esta caracterización constituye la base para el análisis de brechas formativas y la identificación de rutas estratégicas para el fortalecimiento del talento humano académico.');
    functionSection(w);levelSection(w);availabilitySection(w);trainingTypeSection(w);desiredLevelSection(w);updateSection(w);
  }

  function redrawFooters(doc) {
    const total=doc.getNumberOfPages(),pageW=doc.internal.pageSize.getWidth(),pageH=doc.internal.pageSize.getHeight();
    for(let n=1;n<=total;n++){
      doc.setPage(n);doc.setFillColor(255,255,255);doc.rect(0,pageH-44,pageW,30,'F');doc.setTextColor(105);doc.setFont('helvetica','normal');doc.setFontSize(7.2);
      doc.text('ITSQMET · Unidad de Gestión de Procesos Académicos · '+periodText()+' · Página '+n+' de '+total,pageW/2,pageH-24,{align:'center'});
    }
  }

  function WrappedCharacterizationJsPDF(...args) {
    const doc = new PreviousJsPDF(...args);
    const originalSave = doc.save.bind(doc);
    doc.save = function characterizationSave(filename,options) {
      if (/necesidades/i.test(String(filename||''))) {
        appendCharacterization(doc);
        redrawFooters(doc);
        window.__DOCFORMACION_DNF_RENDERER = ENGINE;
        window.__DOCFORMACION_DNF_VECTOR_STAGE = 'cover+introduction+base-legal+alignment+methodology+characterization';
      }
      return originalSave(filename,options);
    };
    return doc;
  }

  WrappedCharacterizationJsPDF.API = PreviousJsPDF.API;
  WrappedCharacterizationJsPDF.version = PreviousJsPDF.version;
  Object.setPrototypeOf(WrappedCharacterizationJsPDF,PreviousJsPDF);
  window.jspdf.jsPDF = WrappedCharacterizationJsPDF;
  window.__DOCFORMACION_SECTION5_PDF_READY = true;
})();
