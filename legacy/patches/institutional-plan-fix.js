(() => {
  const MODALITIES=['Presencial','Virtual','Híbrida'];
  const SUPPORTS=['Sin apoyo económico','Económico','Convenio / beca','Gestión interna'];
  const STATUSES=['No iniciado','En proceso','Finalizado','No ejecutado'];

  function sourceNeeds(){
    const careers=typeof dnfCareerNames==='function'?dnfCareerNames():[];
    return careers.flatMap(career=>(typeof ensureNeedItems==='function'?ensureNeedItems(career):[])
      .filter(item=>norm(item?.text))
      .map((item,index)=>({
        key:careerKey(career)+'::'+(norm(item.id)||('need_'+careerKey(career).replace(/[^a-z0-9]+/g,'_')+'_'+index)),
        career,
        text:norm(item.text),
        priority:norm(item.priorityOverride)||(typeof autoPriorityForNeed==='function'?autoPriorityForNeed(career,item.text):'')||'Sin definir'
      })));
  }

  function ensureNeedPlan(){
    if(!Array.isArray(state.needPlan)) state.needPlan=[];
    const prev=new Map(state.needPlan.map(r=>[r.needKey,r]));
    state.needPlan=sourceNeeds().map(src=>{
      const old=prev.get(src.key)||{};
      return {
        needKey:src.key,career:src.career,needText:src.text,priority:src.priority,
        action:norm(old.action),modality:norm(old.modality),
        plannedStart:norm(old.plannedStart)||norm(state.period?.start),
        plannedEnd:norm(old.plannedEnd)||norm(state.period?.end),
        indicator:norm(old.indicator),targetPercent:n(old.targetPercent)||100,
        evidence:norm(old.evidence),responsibleRole:norm(old.responsibleRole)||'Unidad de Gestión de Procesos Académicos',
        supportType:norm(old.supportType),supportAmount:n(old.supportAmount),observations:norm(old.observations)
      };
    });
    return state.needPlan;
  }

  function planMissing(r){
    const miss=[];
    if(!norm(r.action))miss.push('acción');
    if(!norm(r.modality))miss.push('modalidad');
    if(!norm(r.plannedStart))miss.push('inicio');
    if(!norm(r.plannedEnd))miss.push('fin');
    if(!norm(r.indicator))miss.push('indicador');
    if(!norm(r.evidence))miss.push('medio de verificación');
    if(!norm(r.responsibleRole))miss.push('responsable institucional');
    if(!norm(r.supportType))miss.push('tipo de apoyo');
    if(r.supportType==='Económico'&&n(r.supportAmount)<=0)miss.push('monto');
    if(n(r.targetPercent)<=0)miss.push('meta');
    return miss;
  }

  function ensureNeedFollowup(){
    const plans=ensureNeedPlan();
    if(!Array.isArray(state.needFollowup)) state.needFollowup=[];
    const prev=new Map(state.needFollowup.map(r=>[r.needKey,r]));
    state.needFollowup=plans.map(p=>{
      const old=prev.get(p.needKey)||{};
      return {needKey:p.needKey,career:p.career,needText:p.needText,action:p.action,status:norm(old.status),realStart:norm(old.realStart),progress:Math.max(0,Math.min(100,n(old.progress))),evidenceTitle:norm(old.evidenceTitle),evidencePath:norm(old.evidencePath),observation:norm(old.observation)};
    });
    return state.needFollowup;
  }

  function followMissing(r){
    const miss=[];
    if(!norm(r.status))miss.push('estado');
    if(['En proceso','Finalizado'].includes(r.status)){
      if(!norm(r.realStart))miss.push('inicio real');
      if(n(r.progress)<=0)miss.push('avance');
      if(!norm(r.evidenceTitle))miss.push('evidencia');
    }
    if(r.status==='No ejecutado'&&!norm(r.observation))miss.push('motivo');
    return miss;
  }

  function options(values,selected){
    return '<option value="">Seleccione…</option>'+values.map(v=>'<option value="'+esc(v)+'" '+(v===selected?'selected':'')+'>'+esc(v)+'</option>').join('');
  }

  const oldStatus=documentStatus;
  documentStatus=function(type){
    if(type==='dnf') return oldStatus(type);
    const base=oldStatus(type);
    const obsolete=new Set(['teachers-empty','teacher','plan-empty','plan-teacher','follow-teacher']);
    const issues=(base.issues||[]).filter(i=>!obsolete.has(i.kind));
    const plans=ensureNeedPlan();
    if(!plans.length) issues.push({kind:'needs-empty-for-plan',text:'No hay necesidades de formación detectadas para construir el Plan',view:'necesidades'});
    const pendingPlan=plans.filter(r=>planMissing(r).length);
    if(pendingPlan.length) issues.push({kind:'need-plan-summary',text:pendingPlan.length+' necesidad(es) de formación pendiente(s) de planificar',view:'planificacion'});
    if(type==='informe'&&plans.length&&!pendingPlan.length){
      const pendingFollow=ensureNeedFollowup().filter(r=>followMissing(r).length);
      if(pendingFollow.length) issues.push({kind:'need-follow-summary',text:pendingFollow.length+' acción(es) del Plan pendiente(s) de seguimiento',view:'seguimiento'});
    }
    return {...base,ready:issues.length===0,issues,missing:issues.map(i=>i.text),warnings:[]};
  };

  renderPlan=function(){
    const rows=ensureNeedPlan();
    const complete=rows.filter(r=>!planMissing(r).length).length;
    $('#content').innerHTML=`
      ${completionAlert('plan')}
      <div class="section-title"><div><h2>Planificación por necesidades de formación</h2><p>La unidad del Plan es la necesidad detectada en la DNF. No se seleccionan docentes ni se registran nombres de docentes.</p></div><button class="primary" id="saveNeedPlan" ${rows.length?'':'disabled'}>Guardar planificación</button></div>
      <div class="metric-grid">${metric('Necesidades detectadas',rows.length)}${metric('Planificadas',complete)}${metric('Pendientes',rows.length-complete)}</div>
      ${rows.length?rows.map((r,i)=>`<div class="card" data-need-plan-row="${esc(r.needKey)}" style="margin-bottom:14px"><div class="section-title" style="margin-bottom:10px"><div><h2 style="font-size:15px">${esc(r.career)}</h2><p><strong>Necesidad:</strong> ${esc(r.needText)} · <strong>Prioridad:</strong> ${esc(r.priority)}</p></div></div><div class="form-grid">
        <div class="field wide"><label>Acción de formación</label><input data-np="action" value="${esc(r.action)}"></div>
        <div class="field"><label>Modalidad</label><select data-np="modality">${options(MODALITIES,r.modality)}</select></div>
        <div class="field"><label>Inicio planificado</label><input data-np="plannedStart" type="month" value="${esc(r.plannedStart)}"></div>
        <div class="field"><label>Fin planificado</label><input data-np="plannedEnd" type="month" value="${esc(r.plannedEnd)}"></div>
        <div class="field wide"><label>Indicador</label><input data-np="indicator" value="${esc(r.indicator)}"></div>
        <div class="field"><label>Meta (%)</label><input data-np="targetPercent" type="number" min="1" max="100" value="${esc(r.targetPercent)}"></div>
        <div class="field wide"><label>Medio de verificación</label><input data-np="evidence" value="${esc(r.evidence)}"></div>
        <div class="field"><label>Responsable institucional</label><input data-np="responsibleRole" value="${esc(r.responsibleRole)}"></div>
        <div class="field"><label>Tipo de apoyo</label><select data-np="supportType">${options(SUPPORTS,r.supportType)}</select></div>
        <div class="field"><label>Monto de apoyo (si aplica)</label><input data-np="supportAmount" type="number" min="0" step="0.01" value="${esc(r.supportAmount||'')}"></div>
        <div class="field wide"><label>Observaciones</label><textarea data-np="observations">${esc(r.observations)}</textarea></div>
      </div></div>`).join(''):'<div class="card"><div class="empty">No existen necesidades registradas en la DNF.</div></div>'}`;
    $('#saveNeedPlan')&&($('#saveNeedPlan').onclick=async()=>{
      $$('#content [data-need-plan-row]').forEach((card,i)=>card.querySelectorAll('[data-np]').forEach(el=>{rows[i][el.dataset.np]=['supportAmount','targetPercent'].includes(el.dataset.np)?n(el.value):el.value;}));
      state.needPlan=rows;await save();renderPlan();toast('Planificación por necesidades actualizada');
    });
  };

  renderFollowup=function(){
    const plans=ensureNeedPlan();
    if(!plans.length||plans.some(r=>planMissing(r).length)){
      $('#content').innerHTML='<div class="alert-strip warning"><div><strong>Plan pendiente</strong>Completa primero la planificación por necesidades.</div></div><div class="dialog-actions"><button class="primary" id="goNeedPlan">Ir a Planificación</button></div>';
      $('#goNeedPlan').onclick=()=>setView('planificacion');return;
    }
    const rows=ensureNeedFollowup();
    const complete=rows.filter(r=>!followMissing(r).length).length;
    $('#content').innerHTML=`${completionAlert('informe')}<div class="section-title"><div><h2>Seguimiento por necesidad</h2><p>El seguimiento es institucional y consolidado. No utiliza nombres, cédulas ni fichas individuales de docentes.</p></div><button class="primary" id="saveNeedFollow">Guardar seguimiento</button></div><div class="metric-grid">${metric('Acciones planificadas',rows.length)}${metric('Seguimiento completo',complete)}${metric('Pendientes',rows.length-complete)}</div>${rows.map((r,i)=>`<div class="card" data-need-follow-row="${esc(r.needKey)}" style="margin-bottom:14px"><div class="section-title" style="margin-bottom:10px"><div><h2 style="font-size:15px">${esc(r.career)}</h2><p><strong>Necesidad:</strong> ${esc(r.needText)}<br><strong>Acción:</strong> ${esc(plans[i].action)}</p></div></div><div class="form-grid">
      <div class="field"><label>Estado</label><select data-nf="status">${options(STATUSES,r.status)}</select></div>
      <div class="field"><label>Inicio real</label><input data-nf="realStart" type="date" value="${esc(r.realStart)}"></div>
      <div class="field"><label>Avance (%)</label><input data-nf="progress" type="number" min="0" max="100" value="${esc(r.progress||'')}"></div>
      <div class="field wide"><label>Evidencia / respaldo</label><input data-nf="evidenceTitle" value="${esc(r.evidenceTitle)}"></div>
      <div class="field wide"><label>Resultado / observación</label><textarea data-nf="observation">${esc(r.observation)}</textarea></div>
      <div class="field wide"><label>Archivo de evidencia</label><button type="button" class="secondary evidence-need-btn" data-key="${esc(r.needKey)}">${r.evidencePath?'Cambiar archivo':'Adjuntar archivo'}</button><span class="hint">${esc(r.evidencePath?r.evidencePath.split(/[\\/]/).pop():'Sin archivo adjunto')}</span></div>
      </div></div>`).join('')}`;
    $$('.evidence-need-btn').forEach(b=>b.onclick=async()=>{const picked=await window.docformacion.pickEvidence();if(!picked)return;const row=rows.find(r=>r.needKey===b.dataset.key);if(!row)return;row.evidencePath=picked.path;if(!row.evidenceTitle)row.evidenceTitle=picked.name;state.needFollowup=rows;await save();renderFollowup();toast('Evidencia cargada');});
    $('#saveNeedFollow').onclick=async()=>{$$('#content [data-need-follow-row]').forEach((card,i)=>card.querySelectorAll('[data-nf]').forEach(el=>{rows[i][el.dataset.nf]=el.dataset.nf==='progress'?n(el.value):el.value;}));state.needFollowup=rows;await save();renderFollowup();toast('Seguimiento actualizado');};
  };

  function agg(rows,getter){const out={};rows.forEach(r=>{const k=norm(getter(r))||'Sin información';out[k]=(out[k]||0)+1;});return out;}
  function aggRows(map,total){return Object.entries(map).sort((a,b)=>b[1]-a[1]).map(([k,c])=>'<tr><td>'+esc(k)+'</td><td>'+c+'</td><td>'+fmtPct(pct(c,total))+'</td></tr>').join('');}

  planHtml=function(){
    const rows=ensureNeedPlan(),byPriority=agg(rows,r=>r.priority),byModality=agg(rows,r=>r.modality),careers=new Set(rows.map(r=>r.career)).size;
    const supportTotal=rows.reduce((s,r)=>s+(r.supportType==='Económico'?n(r.supportAmount):0),0);
    return htmlDoc('Plan de Formación Docente',`${cover('Plan de Formación Docente',state.period.planCode)}<div class="page-break"></div>${pdfHeader('Plan de Formación Docente',state.period.planCode)}
    <div class="h1">1. Introducción</div><p>El presente Plan transforma las necesidades identificadas en la Detección de Necesidades de Formación del período ${esc(periodLabel())} en acciones institucionales verificables. La unidad de planificación es la necesidad de formación y no la persona docente.</p>
    <div class="h1">2. Objetivo</div><p>Definir acciones, modalidades, metas, responsables, recursos y medios de verificación para atender las necesidades priorizadas.</p>
    <div class="h1">3. Diagnóstico resumido</div><table class="data"><tr><th>Indicador</th><th>Resultado</th></tr><tr><td>Necesidades incorporadas al Plan</td><td>${rows.length}</td></tr><tr><td>Carreras con acciones planificadas</td><td>${careers}</td></tr><tr><td>Apoyo económico previsto</td><td>${supportTotal?'$ '+supportTotal.toLocaleString('es-EC',{minimumFractionDigits:2,maximumFractionDigits:2}):'No registrado'}</td></tr></table>
    <div class="h2">3.1 Distribución por prioridad</div><table class="data"><tr><th>Prioridad</th><th>Necesidades</th><th>%</th></tr>${aggRows(byPriority,rows.length)}</table>
    <div class="h2">3.2 Distribución por modalidad</div><table class="data"><tr><th>Modalidad</th><th>Acciones</th><th>%</th></tr>${aggRows(byModality,rows.length)}</table>
    <div class="h1">4. Matriz del Plan</div><p>La matriz vincula cada necesidad con su respuesta institucional. No contiene nombres, cédulas ni identificadores de docentes.</p><table class="data"><tr><th>Carrera</th><th>Necesidad</th><th>Prioridad</th><th>Acción</th><th>Modalidad</th><th>Inicio</th><th>Fin</th><th>Meta</th></tr>${rows.map(r=>`<tr><td>${esc(r.career)}</td><td>${esc(r.needText)}</td><td>${esc(r.priority)}</td><td>${esc(r.action)}</td><td>${esc(r.modality)}</td><td>${esc(formatMonthYear(r.plannedStart))}</td><td>${esc(formatMonthYear(r.plannedEnd))}</td><td>${esc(r.targetPercent)}%</td></tr>`).join('')}</table>
    <div class="h1">5. Indicadores y verificación</div><table class="data"><tr><th>Carrera / necesidad</th><th>Indicador</th><th>Medio de verificación</th><th>Responsable institucional</th><th>Apoyo</th></tr>${rows.map(r=>`<tr><td>${esc(r.career)} · ${esc(r.needText)}</td><td>${esc(r.indicator)}</td><td>${esc(r.evidence)}</td><td>${esc(r.responsibleRole)}</td><td>${esc(r.supportType)}${r.supportType==='Económico'?' · $ '+n(r.supportAmount).toLocaleString('es-EC',{minimumFractionDigits:2,maximumFractionDigits:2}):''}</td></tr>`).join('')}</table>
    <div class="h1">6. Seguimiento</div><p>El seguimiento se realizará por necesidad y acción planificada, registrando estado, avance, evidencia y resultados, sin incorporar datos nominales de docentes.</p>
    <div class="h1">7. Conclusión</div><p>El Plan consolida ${rows.length} acciones vinculadas a necesidades de formación de ${careers} carrera(s) para el período ${esc(periodLabel())}.</p>`);
  };

  informeHtml=function(){
    const plans=ensureNeedPlan(),follow=ensureNeedFollowup(),joined=plans.map(p=>({p,f:follow.find(x=>x.needKey===p.needKey)||{}}));
    const started=joined.filter(x=>['En proceso','Finalizado'].includes(x.f.status)).length,finished=joined.filter(x=>x.f.status==='Finalizado').length,notExecuted=joined.filter(x=>x.f.status==='No ejecutado').length,avg=joined.length?joined.reduce((s,x)=>s+n(x.f.progress),0)/joined.length:0;
    return htmlDoc('Informe de Cumplimiento del Plan de Formación Docente',`${cover('Informe de Cumplimiento del Plan de Formación Docente',state.period.reportCode)}<div class="page-break"></div>${pdfHeader('Informe de Cumplimiento del Plan de Formación Docente',state.period.reportCode)}
    <div class="h1">1. Objeto del informe</div><p>Presentar el nivel de ejecución del Plan del período ${esc(periodLabel())}, evaluando las acciones definidas para cada necesidad de formación, sin incorporar información nominal de docentes.</p>
    <div class="h1">2. Resumen de cumplimiento</div><table class="data"><tr><th>Indicador</th><th>Resultado</th></tr><tr><td>Acciones planificadas</td><td>${joined.length}</td></tr><tr><td>Acciones iniciadas o finalizadas</td><td>${started}</td></tr><tr><td>Acciones finalizadas</td><td>${finished}</td></tr><tr><td>Acciones no ejecutadas</td><td>${notExecuted}</td></tr><tr><td>Avance promedio</td><td>${fmtPct(avg)}</td></tr><tr><td>Cumplimiento final</td><td>${fmtPct(pct(finished,joined.length))}</td></tr></table>
    <div class="h1">3. Seguimiento por necesidad</div><table class="data"><tr><th>Carrera</th><th>Necesidad</th><th>Acción</th><th>Estado</th><th>Inicio real</th><th>Avance</th><th>Evidencia</th><th>Resultado / observación</th></tr>${joined.map(x=>`<tr><td>${esc(x.p.career)}</td><td>${esc(x.p.needText)}</td><td>${esc(x.p.action)}</td><td>${esc(x.f.status)}</td><td>${esc(x.f.realStart)}</td><td>${fmtPct(x.f.progress)}</td><td>${esc(x.f.evidenceTitle)}</td><td>${esc(x.f.observation)}</td></tr>`).join('')}</table>
    <div class="h1">4. Evidencias</div><p>Las evidencias se consolidan por acción de formación y necesidad, sin identificar docentes individuales.</p><table class="data"><tr><th>Carrera / necesidad</th><th>Evidencia</th><th>Archivo</th></tr>${joined.filter(x=>x.f.evidenceTitle||x.f.evidencePath).map(x=>`<tr><td>${esc(x.p.career)} · ${esc(x.p.needText)}</td><td>${esc(x.f.evidenceTitle)}</td><td>${esc(x.f.evidencePath?x.f.evidencePath.split(/[\\/]/).pop():'')}</td></tr>`).join('')}</table>
    <div class="h1">5. Análisis</div><p>De ${joined.length} acciones planificadas, ${started} registran inicio o finalización y ${finished} se encuentran finalizadas. El avance promedio institucional es ${fmtPct(avg)}.</p>
    <div class="h1">6. Conclusiones</div><p>El informe mantiene la trazabilidad entre DNF, Plan y ejecución desde una perspectiva institucional, sin convertirse en una nómina o expediente individual de docentes.</p>
    <div class="h1">7. Recomendaciones</div><p>Priorizar las acciones pendientes, fortalecer la evidencia de cumplimiento y retroalimentar la DNF del siguiente período con los resultados consolidados.</p>`);
  };

  const oldGenerate=generateDocument;
  generateDocument=async function(type){
    if(type==='dnf') return oldGenerate(type);
    if(!(await ensureCurrentBuildBeforeGenerate()))return;
    syncPeriodCodes(state.period);
    const status=documentStatus(type);if(!status.ready){toast('Completa los pendientes del documento antes de generar el PDF');return;}
    const payload=type==='plan'?{filename:documentPdfFilename(state.period.planCode,'Plan de Formación Docente'),html:planHtml()}:{filename:documentPdfFilename(state.period.reportCode,'Informe de Cumplimiento del Plan de Formación'),html:informeHtml()};
    const button=$('#generateCurrent')||document.querySelector('[data-generate="'+type+'"]'),prev=button?.textContent||'Generar PDF';if(button){button.disabled=true;button.textContent='Generando PDF…';}
    try{const r=await window.docformacion.generatePDF(payload);if(r?.ok)toast(r.downloaded?'PDF descargado correctamente':'PDF generado correctamente');else toast(r?.error?'Error al generar PDF: '+r.error:'No se pudo generar el PDF');}catch(e){toast('Error al generar PDF: '+(e?.message||e));}finally{if(button){button.disabled=false;button.textContent=prev;}}
  };

  const content=document.getElementById('content');
  if(content&&content.children.length)render();
})();