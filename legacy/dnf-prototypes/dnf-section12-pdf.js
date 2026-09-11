(() => {
  'use strict';
  if (!window.jspdf?.jsPDF) return;

  const PreviousJsPDF=window.jspdf.jsPDF;
  const ENGINE='dnf-vector-jspdf-v12-annexes';
  const CM=72/2.54;
  const BODY={left:54,right:54,top:145,bottom:62,fontSize:12,lineHeight:20};
  const MONTHS=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const PALETTE=[[69,94,181],[126,87,194],[38,166,154],[255,112,67],[66,165,245],[171,71,188],[102,187,106],[255,167,38],[120,144,156],[236,64,122]];
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

  function annexes(){return typeof window.__DOCFORMACION_DNF_ACTIVE_ANNEXES==='function'?window.__DOCFORMACION_DNF_ACTIVE_ANNEXES():[];}
  function pctText(value){return Number(value||0).toLocaleString('es-EC',{maximumFractionDigits:1,minimumFractionDigits:Number.isInteger(Number(value||0))?0:1})+' %';}

  function drawSectionTitle(doc,text,y){doc.setFont('times','bold');doc.setFontSize(12);doc.setTextColor(25);doc.text(text,BODY.left,y);}
  function drawMuted(doc,text,x,y,opts={}){doc.setFont('helvetica','normal');doc.setFontSize(opts.size||9);doc.setTextColor(104);doc.text(text,x,y,opts);}

  function drawCardBase(doc,x,y,w,h){
    doc.setFillColor(250,251,253);doc.setDrawColor(220,226,234);doc.setLineWidth(.7);doc.roundedRect(x,y,w,h,10,10,'FD');
  }

  function cardHeader(doc,item,index,x,y,w){
    doc.setFont('helvetica','bold');doc.setFontSize(11.3);doc.setTextColor(35);
    const title='12.'+(index+1)+'. '+clean(item.config?.title||item.title),lines=doc.splitTextToSize(title,w-30);doc.text(lines,x+16,y+25,{lineHeightFactor:1.15});
    const titleBottom=y+25+(lines.length-1)*13;
    if(item.config?.showResponses!==false) drawMuted(doc,item.responseCount+' respuestas válidas',x+16,titleBottom+18,{size:8.8});
    if(item.effectiveConfidentiality && item.effectiveConfidentiality!=='Público'){
      doc.setFillColor(238,241,245);doc.roundedRect(x+w-92,y+14,76,18,8,8,'F');doc.setFont('helvetica','bold');doc.setFontSize(7.6);doc.setTextColor(90);doc.text(item.effectiveConfidentiality,x+w-54,y+26,{align:'center'});
    }
    return titleBottom+32;
  }

  function drawDonut(doc,item,x,y,w,h){
    const groups=(item.groups||[]).slice(0,10);if(!groups.length){drawMuted(doc,'Sin respuestas válidas para representar.',x+w/2,y+h/2,{align:'center',size:10});return;}
    const legendW=w*.53,cx=x+w*.77,cy=y+h*.47,r=Math.min(70,h*.27),lineW=17;
    const total=item.responseCount||1,segments=144;let cumulative=0,bounds=[];
    groups.forEach((g,i)=>{const start=cumulative,end=cumulative+g.count/total;bounds.push({start,end,color:PALETTE[i%PALETTE.length]});cumulative=end;});
    doc.setLineWidth(lineW);
    for(let s=0;s<segments;s++){
      const mid=(s+.5)/segments;const found=bounds.find(b=>mid>=b.start&&mid<b.end)||bounds[bounds.length-1];const a1=-Math.PI/2+(s/segments)*Math.PI*2,a2=-Math.PI/2+((s+1)/segments)*Math.PI*2;
      doc.setDrawColor(...found.color);doc.line(cx+Math.cos(a1)*r,cy+Math.sin(a1)*r,cx+Math.cos(a2)*r,cy+Math.sin(a2)*r);
    }
    doc.setFillColor(250,251,253);doc.circle(cx,cy,r-lineW*.65,'F');
    const dominant=groups[0];doc.setFont('helvetica','bold');doc.setFontSize(16);doc.setTextColor(45);doc.text(pctText(dominant.percentage),cx,cy-2,{align:'center'});drawMuted(doc,'principal',cx,cy+14,{align:'center',size:8.2});

    let ly=y+10;const maxLegend=Math.min(groups.length,9);
    for(let i=0;i<maxLegend;i++){
      const g=groups[i],color=PALETTE[i%PALETTE.length];doc.setFillColor(...color);doc.roundedRect(x+5,ly+2,9,9,2,2,'F');
      doc.setFont('helvetica','normal');doc.setFontSize(8.4);doc.setTextColor(45);const label=doc.splitTextToSize(g.label,legendW-86);doc.text(label,x+22,ly+10,{lineHeightFactor:1.05});
      let suffix='';if(item.config?.showCounts) suffix+=String(g.count);if(item.config?.showCounts&&item.config?.showPercentages) suffix+=' · ';if(item.config?.showPercentages) suffix+=pctText(g.percentage);
      if(suffix){doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(75);doc.text(suffix,x+legendW-3,ly+10,{align:'right'});}
      ly+=Math.max(22,label.length*9+8);if(ly>y+h-20)break;
    }
  }

  function drawBars(doc,item,x,y,w,h){
    let groups=(item.groups||[]).slice(0,10);if(!groups.length){drawMuted(doc,'Sin respuestas válidas para representar.',x+w/2,y+h/2,{align:'center',size:10});return;}
    const labelW=Math.min(180,w*.38),barX=x+labelW+16,barW=w-labelW-74,max=Math.max(...groups.map(g=>g.count),1);let yy=y+8;const rowH=Math.min(38,(h-12)/groups.length);
    groups.forEach((g,i)=>{
      doc.setFont('helvetica','normal');doc.setFontSize(8.3);doc.setTextColor(50);const label=doc.splitTextToSize(g.label,labelW-8).slice(0,2);doc.text(label,x+4,yy+13,{lineHeightFactor:1.05});
      doc.setFillColor(233,237,242);doc.roundedRect(barX,yy+4,barW,12,6,6,'F');const fill=Math.max(2,barW*(g.count/max));doc.setFillColor(...PALETTE[i%PALETTE.length]);doc.roundedRect(barX,yy+4,fill,12,6,6,'F');
      let suffix='';if(item.config?.showCounts)suffix+=g.count;if(item.config?.showCounts&&item.config?.showPercentages)suffix+=' · ';if(item.config?.showPercentages)suffix+=pctText(g.percentage);doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(65);doc.text(suffix||pctText(g.percentage),barX+barW+8,yy+14);
      yy+=rowH;
    });
  }

  function drawNumeric(doc,item,x,y,w,h){
    const dominant=item.dominant;doc.setFont('helvetica','bold');doc.setFontSize(34);doc.setTextColor(55);doc.text(String(item.responseCount||0),x+w/2,y+h*.37,{align:'center'});drawMuted(doc,'respuestas válidas',x+w/2,y+h*.37+22,{align:'center',size:10});
    if(dominant){doc.setFont('helvetica','bold');doc.setFontSize(12);doc.setTextColor(45);doc.text(doc.splitTextToSize(dominant.label,w*.72),x+w/2,y+h*.63,{align:'center',lineHeightFactor:1.1});drawMuted(doc,pctText(dominant.percentage)+' del total válido',x+w/2,y+h*.63+34,{align:'center',size:9});}
  }

  function drawResponseList(doc,item,x,y,w,h){
    const restricted=item.effectiveConfidentiality==='Restringido';if(restricted){drawNumeric(doc,item,x,y,w,h);drawMuted(doc,'El detalle de respuestas se conserva en la base institucional y no se visualiza por confidencialidad.',x+w/2,y+h-20,{align:'center',size:8});return;}
    const limit=Math.max(1,Math.min(10,Number(item.config?.recentCount)||5)),rows=(item.responses||[]).slice(0,limit);doc.setFont('helvetica','bold');doc.setFontSize(9.5);doc.setTextColor(55);doc.text(item.hasResponseDates?'Respuestas más recientes':'Respuestas registradas',x+8,y+14);
    let yy=y+34;rows.forEach((row,i)=>{if(yy>y+h-24)return;doc.setFillColor(255,255,255);doc.setDrawColor(228);doc.roundedRect(x+8,yy-12,w-16,40,6,6,'FD');doc.setFont('helvetica','normal');doc.setFontSize(8.2);doc.setTextColor(45);const lines=doc.splitTextToSize(row.value,w-40).slice(0,2);doc.text(lines,x+18,yy,{lineHeightFactor:1.05});if(row.date)drawMuted(doc,row.date,x+w-18,yy+20,{align:'right',size:7});yy+=48;});
  }

  function drawWordCloud(doc,item,x,y,w,h){
    const restricted=item.effectiveConfidentiality==='Restringido';if(restricted){drawNumeric(doc,item,x,y,w,h);drawMuted(doc,'Contenido oculto por nivel de confidencialidad.',x+w/2,y+h-20,{align:'center',size:8});return;}
    const words=(item.words||[]).slice(0,20);if(!words.length){drawResponseList(doc,item,x,y,w,h);return;}
    const max=Math.max(...words.map(word=>word.count),1),min=Math.min(...words.map(word=>word.count),1);let cx=x+8,cy=y+22,rowMax=0;
    words.forEach((entry,i)=>{const ratio=max===min?0.5:(entry.count-min)/(max-min),size=9+ratio*12;doc.setFont('helvetica',i%4===0?'bold':'normal');doc.setFontSize(size);doc.setTextColor(...PALETTE[i%PALETTE.length]);const ww=doc.getTextWidth(entry.word)+14;if(cx+ww>x+w-10){cx=x+8;cy+=rowMax+12;rowMax=0;}if(cy>y+h-22)return;doc.text(entry.word,cx,cy);cx+=ww;rowMax=Math.max(rowMax,size);});
  }

  function drawMixedOpen(doc,item,x,y,w,h){
    const showList=item.config?.showRecent!==false,showCloud=item.config?.showWordCloud!==false;
    if(showList&&showCloud){const left=w*.48;drawResponseList(doc,item,x,y,left-8,h);doc.setDrawColor(225);doc.line(x+left,y+5,x+left,y+h-5);drawWordCloud(doc,item,x+left+10,y,w-left-10,h);return;}
    if(showCloud){drawWordCloud(doc,item,x,y,w,h);return;}
    if(showList){drawResponseList(doc,item,x,y,w,h);return;}
    drawNumeric(doc,item,x,y,w,h);
  }

  function drawVisualization(doc,item,x,y,w,h){
    const viz=clean(item.config?.visualization||item.visualization);
    if(viz==='Dona')return drawDonut(doc,item,x,y,w,h);
    if(viz==='Barras')return drawBars(doc,item,x,y,w,h);
    if(viz==='Tarjeta numérica')return drawNumeric(doc,item,x,y,w,h);
    if(viz==='Lista de respuestas')return drawResponseList(doc,item,x,y,w,h);
    if(viz==='Nube de palabras')return drawMixedOpen(doc,item,x,y,w,h);
    drawNumeric(doc,item,x,y,w,h);
  }

  function drawAnnexPage(doc,item,index,first=false){
    if(!first){doc.addPage();drawHeader(doc,doc.getNumberOfPages());}
    const pageW=doc.internal.pageSize.getWidth(),pageH=doc.internal.pageSize.getHeight();let top=BODY.top;
    if(first){drawSectionTitle(doc,'12. Anexos',top);top+=30;drawMuted(doc,'Evidencia gráfica generada automáticamente a partir de las respuestas válidas del período.',BODY.left,top,{size:9});top+=24;}
    const x=BODY.left,w=pageW-BODY.left-BODY.right,h=Math.min(525,pageH-BODY.bottom-top);drawCardBase(doc,x,top,w,h);const contentY=cardHeader(doc,item,index,x,top,w);const innerX=x+14,innerY=contentY,innerW=w-28,innerH=Math.max(90,top+h-contentY-34);drawVisualization(doc,item,innerX,innerY,innerW,innerH);
    if(item.config?.showNote&&clean(item.config?.note)){drawMuted(doc,doc.splitTextToSize('Nota: '+clean(item.config.note),w-32),x+16,top+h-16,{size:7.8});}
  }

  function appendAnnexes(doc){
    if(doc.__docformacionSection12Appended)return;doc.__docformacionSection12Appended=true;
    const list=annexes();
    if(!list.length){doc.addPage();drawHeader(doc,doc.getNumberOfPages());drawSectionTitle(doc,'12. Anexos',BODY.top);drawMuted(doc,'No existen anexos seleccionados con respuestas válidas para el período.',BODY.left,BODY.top+32,{size:9.5});return;}
    doc.addPage();drawHeader(doc,doc.getNumberOfPages());list.forEach((item,index)=>drawAnnexPage(doc,item,index,index===0));
  }

  function redrawFooters(doc){const total=doc.getNumberOfPages(),pageW=doc.internal.pageSize.getWidth(),pageH=doc.internal.pageSize.getHeight();for(let n=1;n<=total;n++){doc.setPage(n);doc.setFillColor(255,255,255);doc.rect(0,pageH-44,pageW,30,'F');doc.setTextColor(105);doc.setFont('helvetica','normal');doc.setFontSize(7.2);doc.text('ITSQMET · Unidad de Gestión de Procesos Académicos · '+periodText()+' · Página '+n+' de '+total,pageW/2,pageH-24,{align:'center'});}}

  function WrappedSection12JsPDF(...args){const doc=new PreviousJsPDF(...args),originalSave=doc.save.bind(doc);doc.save=function section12Save(filename,options){if(/necesidades/i.test(String(filename||''))){appendAnnexes(doc);redrawFooters(doc);window.__DOCFORMACION_DNF_RENDERER=ENGINE;window.__DOCFORMACION_DNF_VECTOR_STAGE='cover+introduction+base-legal+alignment+methodology+characterization+training-lines+coverage+executive-summary+conclusions+recommendations+bibliography+annexes';}return originalSave(filename,options);};return doc;}
  WrappedSection12JsPDF.API=PreviousJsPDF.API;WrappedSection12JsPDF.version=PreviousJsPDF.version;Object.setPrototypeOf(WrappedSection12JsPDF,PreviousJsPDF);window.jspdf.jsPDF=WrappedSection12JsPDF;window.__DOCFORMACION_SECTION12_PDF_READY=true;
})();
