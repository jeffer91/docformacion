(() => {
  'use strict';
  if (!window.jspdf?.jsPDF) return;

  const PreviousJsPDF=window.jspdf.jsPDF;
  const ENGINE='dnf-vector-jspdf-v11-bibliography';
  const CM=72/2.54;
  const BODY={left:72,right:72,top:150,bottom:72,fontSize:12,lineHeight:24};
  const MONTHS=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const clean=(v='')=>String(v??'').trim();
  const period=()=>state?.period||{};
  const documentCode=()=>clean(period().dnfCode);
  const documentTitle=()=> 'Detección de Necesidades de Formación';

  function periodText(){const fmt=value=>{const m=clean(value).match(/^(\d{4})-(\d{2})/);return m?(MONTHS[Number(m[2])-1]||m[2])+' '+m[1]:clean(value);};const a=fmt(period().start),b=fmt(period().end);return a&&b?a+' a '+b:(a||b||'período seleccionado');}
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

  function bibliographyState(){return typeof window.__DOCFORMACION_DNF_BIBLIOGRAPHY==='function'?window.__DOCFORMACION_DNF_BIBLIOGRAPHY():{used:[],unresolved:[]};}

  function createWriter(doc){
    const pageW=doc.internal.pageSize.getWidth(),pageH=doc.internal.pageSize.getHeight(),bodyW=pageW-BODY.left-BODY.right;let y=BODY.top;
    function font(style='normal',size=BODY.fontSize,color=0){doc.setFont('times',style);doc.setFontSize(size);doc.setTextColor(color);}
    function newPage(){doc.addPage();drawHeader(doc,doc.getNumberOfPages());font();y=BODY.top;}
    function ensureSpace(h){if(y+h>pageH-BODY.bottom)newPage();}
    function heading(text){font('bold',12);const lines=doc.splitTextToSize(clean(text),bodyW);ensureSpace(lines.length*BODY.lineHeight+BODY.lineHeight*2);doc.text(lines,BODY.left,y,{lineHeightFactor:2});y+=lines.length*BODY.lineHeight+18;}
    function token(word,style){return{word,style};}
    function sourceTokens(source){
      const out=[];
      const prefix=clean(source.author)+'. ('+clean(source.year)+').';
      prefix.split(/\s+/).filter(Boolean).forEach(w=>out.push(token(w,'normal')));
      const article=source.type==='Artículo';
      clean(source.title).split(/\s+/).filter(Boolean).forEach(w=>out.push(token(w,article?'normal':'italic')));
      const pub=clean(source.publisher);if(pub){pub.split(/\s+/).filter(Boolean).forEach(w=>out.push(token(w,article?'italic':'normal')));}
      return out;
    }
    function widthOf(t){font(t.style,12);return doc.getTextWidth(t.word);}
    function splitTokens(tokens,width){const lines=[];let line=[],used=0;const space=doc.getTextWidth(' ');tokens.forEach(t=>{const w=widthOf(t),need=(line.length?space:0)+w;if(line.length&&used+need>width){lines.push(line);line=[t];used=w;}else{line.push(t);used+=need;}});if(line.length)lines.push(line);return lines;}
    function drawLine(tokens,x){let cur=x;const space=doc.getTextWidth(' ');tokens.forEach((t,i)=>{font(t.style,12);doc.text(t.word,cur,y);cur+=widthOf(t)+(i<tokens.length-1?space:0);});}
    function reference(source){
      const x=BODY.left+30,width=bodyW-30,lines=splitTokens(sourceTokens(source),width);ensureSpace(Math.min(lines.length,2)*BODY.lineHeight+12);let i=0;
      while(i<lines.length){if(y+BODY.lineHeight>pageH-BODY.bottom)newPage();if(i===0){font('normal',12);doc.text('•',BODY.left+8,y);}drawLine(lines[i],x);y+=BODY.lineHeight;i++;}y+=10;
    }
    newPage();return{heading,reference};
  }

  function appendBibliography(doc){
    if(doc.__docformacionSection11Appended)return;doc.__docformacionSection11Appended=true;
    const w=createWriter(doc),bib=bibliographyState();
    w.heading('11. Bibliografía');
    const unique=new Map();(bib.used||[]).forEach(source=>{if(source?.id&&!unique.has(source.id))unique.set(source.id,source);});
    const sources=[...unique.values()].sort((a,b)=>clean(a.author).localeCompare(clean(b.author),'es')||String(a.year).localeCompare(String(b.year))||clean(a.title).localeCompare(clean(b.title),'es'));
    sources.forEach(source=>w.reference(source));
  }

  function redrawFooters(doc){const total=doc.getNumberOfPages(),pageW=doc.internal.pageSize.getWidth(),pageH=doc.internal.pageSize.getHeight();for(let n=1;n<=total;n++){doc.setPage(n);doc.setFillColor(255,255,255);doc.rect(0,pageH-44,pageW,30,'F');doc.setTextColor(105);doc.setFont('helvetica','normal');doc.setFontSize(7.2);doc.text('ITSQMET · Unidad de Gestión de Procesos Académicos · '+periodText()+' · Página '+n+' de '+total,pageW/2,pageH-24,{align:'center'});}}

  function WrappedSection11JsPDF(...args){const doc=new PreviousJsPDF(...args),originalSave=doc.save.bind(doc);doc.save=function section11Save(filename,options){if(/necesidades/i.test(String(filename||''))){appendBibliography(doc);redrawFooters(doc);window.__DOCFORMACION_DNF_RENDERER=ENGINE;window.__DOCFORMACION_DNF_VECTOR_STAGE='cover+introduction+base-legal+alignment+methodology+characterization+training-lines+coverage+executive-summary+conclusions+recommendations+bibliography';}return originalSave(filename,options);};return doc;}
  WrappedSection11JsPDF.API=PreviousJsPDF.API;WrappedSection11JsPDF.version=PreviousJsPDF.version;Object.setPrototypeOf(WrappedSection11JsPDF,PreviousJsPDF);window.jspdf.jsPDF=WrappedSection11JsPDF;window.__DOCFORMACION_SECTION11_PDF_READY=true;
})();