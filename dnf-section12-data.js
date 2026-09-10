(() => {
  'use strict';

  const VISUALIZATIONS = ['Dona','Barras','Nube de palabras','Lista de respuestas','Tarjeta numérica'];
  const CONFIDENTIALITY = ['Público','Interno','Restringido'];
  const STOPWORDS = new Set(['para','como','con','del','las','los','una','uno','unos','unas','por','que','sus','más','mas','sin','sobre','entre','desde','hasta','este','esta','estos','estas','curso','cursos','programa','programas','formación','formacion','actualización','actualizacion','docente','docentes','institucional','institución','institucion','nivel','área','area']);

  const DEFINITIONS = [
    {id:'funcion-sustantiva',source:'funcionSustantiva',title:'Función sustantiva a la que pertenece',type:'Cerrada',visualization:'Dona',counts:true,percentages:true},
    {id:'dedicacion',source:'dedicacion',title:'Tipo de contrato / dedicación',type:'Cerrada',visualization:'Dona',counts:true,percentages:true},
    {id:'nivel-actual',source:'nivelActual',title:'Nivel académico actual',type:'Cerrada',visualization:'Dona',counts:true,percentages:true},
    {id:'disponibilidad',source:'dispuesto',title:'Disponibilidad para iniciar estudios',type:'Cerrada',visualization:'Dona',counts:true,percentages:true},
    {id:'tipo-formacion',source:'tipoFormacion',title:'Tipo de formación requerida',type:'Cerrada',visualization:'Dona',counts:true,percentages:true},
    {id:'nivel-deseado',source:'nivelDeseado',title:'Nivel académico que desea alcanzar',type:'Cerrada',visualization:'Dona',counts:true,percentages:true},
    {id:'actualizacion-reciente',source:'actualizacionReciente',title:'Participación en cursos o programas de actualización',type:'Cerrada',visualization:'Dona',counts:true,percentages:true},
    {id:'tematicas-actualizacion',source:'programaActualizacion',title:'Temáticas de actualización cursadas',type:'Semiestructurada',visualization:'Nube de palabras',recent:true,wordCloud:true},
    {id:'fecha-inicio',source:'inicioTentativo',title:'Fecha tentativa de inicio de formación',type:'Cerrada',visualization:'Barras',counts:true,percentages:true},
    {id:'area-interes',source:'areaInteres',title:'Áreas de interés para formación',type:'Semiestructurada',visualization:'Nube de palabras',recent:true,wordCloud:true}
  ];

  const clean = (value='') => String(value ?? '').trim();
  const key = value => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ');
  const escHtml = value => clean(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

  function yesNo(value) {
    const raw = key(value);
    if (!raw) return '';
    if (raw === 'si' || raw.startsWith('si ')) return 'Sí';
    if (raw === 'no' || raw.startsWith('no ')) return 'No';
    return clean(value);
  }

  function normalizeDedication(value) {
    const raw = key(value);
    if (!raw) return '';
    if (raw === 'tc' || raw.includes('tiempo completo')) return 'Tiempo Completo';
    if (raw === 'mt' || raw.includes('medio tiempo')) return 'Medio Tiempo';
    if (raw === 'tp' || raw.includes('tiempo parcial')) return 'Tiempo Parcial';
    return clean(value);
  }

  function formatTentative(value) {
    const raw = clean(value);
    const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const match = raw.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);
    if (!match) return raw;
    return (months[Number(match[2])-1] || match[2]) + ' ' + match[1];
  }

  function ensureState() {
    if (typeof state === 'undefined' || !state) return null;
    state.section12 = state.section12 && typeof state.section12 === 'object' ? state.section12 : {};
    state.section12.annexes = state.section12.annexes && typeof state.section12.annexes === 'object' ? state.section12.annexes : {};
    DEFINITIONS.forEach((def,index) => {
      const current = state.section12.annexes[def.id] && typeof state.section12.annexes[def.id] === 'object' ? state.section12.annexes[def.id] : {};
      state.section12.annexes[def.id] = {
        include: current.include !== false,
        order: Number.isFinite(Number(current.order)) && Number(current.order) > 0 ? Number(current.order) : index + 1,
        title: clean(current.title) || def.title,
        visualization: VISUALIZATIONS.includes(current.visualization) ? current.visualization : def.visualization,
        showResponses: current.showResponses !== false,
        showPercentages: Object.prototype.hasOwnProperty.call(current,'showPercentages') ? !!current.showPercentages : !!def.percentages,
        showCounts: Object.prototype.hasOwnProperty.call(current,'showCounts') ? !!current.showCounts : !!def.counts,
        showRecent: Object.prototype.hasOwnProperty.call(current,'showRecent') ? !!current.showRecent : !!def.recent,
        recentCount: Math.max(1,Math.min(10,Number(current.recentCount) || 5)),
        showWordCloud: Object.prototype.hasOwnProperty.call(current,'showWordCloud') ? !!current.showWordCloud : !!def.wordCloud,
        showNote: !!current.showNote,
        note: clean(current.note),
        confidentiality: CONFIDENTIALITY.includes(current.confidentiality) ? current.confidentiality : 'Público'
      };
    });
    return state.section12;
  }

  function isValidTeacher(teacher) {
    return teacher && teacher.estadoValido !== false && teacher.valid !== false && teacher.excluirDNF !== true;
  }

  function answerDate(teacher) {
    return clean(teacher?.fechaRespuestaEncuesta || teacher?.fechaRespuesta || teacher?.surveyResponseDate || '');
  }

  function sourceValue(teacher,def) {
    let value = clean(teacher?.[def.source]);
    if (def.source === 'dedicacion') value = normalizeDedication(value);
    if (def.source === 'dispuesto' || def.source === 'actualizacionReciente') value = yesNo(value);
    if (def.source === 'inicioTentativo') value = formatTentative(value);
    if (def.source === 'programaActualizacion' && key(teacher?.actualizacionReciente) && yesNo(teacher.actualizacionReciente) !== 'Sí') return '';
    return clean(value);
  }

  function responsesFor(def) {
    return (state.teachers || []).filter(isValidTeacher).map((teacher,index) => ({
      id: clean(teacher.id || teacher.cedula || index),
      value: sourceValue(teacher,def),
      date: answerDate(teacher)
    })).filter(item => item.value);
  }

  function grouped(responses) {
    const map = new Map();
    responses.forEach(item => {
      const k = key(item.value);
      const row = map.get(k) || {label:item.value,count:0};
      row.count++;
      map.set(k,row);
    });
    const total = responses.length;
    return [...map.values()].map(row => ({...row,percentage:total ? row.count*100/total : 0})).sort((a,b)=>b.count-a.count || a.label.localeCompare(b.label,'es'));
  }

  function wordCloud(responses) {
    const counts = new Map();
    responses.forEach(item => {
      clean(item.value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().split(/[^a-z0-9ñáéíóúü]+/i).forEach(raw => {
        const word = clean(raw);
        if (word.length < 4 || STOPWORDS.has(word)) return;
        counts.set(word,(counts.get(word)||0)+1);
      });
    });
    return [...counts.entries()].map(([word,count])=>({word,count})).sort((a,b)=>b.count-a.count || a.word.localeCompare(b.word,'es')).slice(0,24);
  }

  function sortResponses(responses) {
    const dated = responses.some(item => item.date);
    if (!dated) return {items:[...responses],dated:false};
    return {items:[...responses].sort((a,b)=>clean(b.date).localeCompare(clean(a.date))),dated:true};
  }

  function buildAnnexes() {
    ensureState();
    return DEFINITIONS.map(def => {
      const config = state.section12.annexes[def.id];
      const responses = responsesFor(def);
      const sorted = sortResponses(responses);
      const groups = grouped(responses);
      const words = wordCloud(responses);
      const dominant = groups[0] || null;
      return {
        ...def,
        config:{...config},
        responseCount:responses.length,
        groups,
        words,
        responses:sorted.items,
        hasResponseDates:sorted.dated,
        dominant,
        effectiveConfidentiality:def.sensitive ? 'Restringido' : config.confidentiality
      };
    }).sort((a,b)=>a.config.order-b.config.order || a.title.localeCompare(b.title,'es'));
  }

  function activeAnnexes() {
    return buildAnnexes().filter(item => item.config.include && item.responseCount > 0);
  }

  function injectStyles() {
    if (document.getElementById('section12Styles')) return;
    const style = document.createElement('style');
    style.id='section12Styles';
    style.textContent=`
      .s12-annex-grid{display:grid;gap:12px;margin-top:14px}
      .s12-annex-item{border:1px solid #d9e1ea;border-radius:12px;background:#fff;padding:0 14px}
      .s12-annex-item summary{cursor:pointer;padding:14px 0;display:flex;gap:12px;align-items:center;justify-content:space-between}
      .s12-annex-title{display:flex;align-items:center;gap:10px;min-width:0}.s12-annex-title strong{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .s12-pill{font-size:11px;padding:3px 8px;border-radius:999px;background:#eef3f8;color:#516070;white-space:nowrap}
      .s12-config-grid{display:grid;grid-template-columns:90px minmax(220px,1fr) minmax(170px,220px) minmax(150px,190px);gap:10px;padding:0 0 14px}
      .s12-toggle-row{display:flex;flex-wrap:wrap;gap:16px;padding:0 0 14px}.s12-toggle-row label{display:flex;gap:7px;align-items:center;font-size:12px}
      .s12-note{padding-bottom:14px}.s12-config-grid label,.s12-note label{font-size:12px;color:#607086;display:grid;gap:5px}
      @media(max-width:900px){.s12-config-grid{grid-template-columns:1fr}.s12-annex-item summary{align-items:flex-start;flex-direction:column}}
    `;
    document.head.appendChild(style);
  }

  function optionHtml(values,current) {
    return values.map(value=>`<option value="${escHtml(value)}" ${value===current?'selected':''}>${escHtml(value)}</option>`).join('');
  }

  function annexConfigHtml(item,index) {
    const c=item.config;
    const status=item.responseCount ? `${item.responseCount} respuestas válidas` : 'Sin respuestas válidas · no saldrá en PDF';
    return `<details class="s12-annex-item" data-s12-id="${escHtml(item.id)}">
      <summary>
        <span class="s12-annex-title"><input type="checkbox" data-s12-field="include" ${c.include?'checked':''}><strong>12.${index+1}. ${escHtml(c.title)}</strong></span>
        <span class="s12-pill">${escHtml(item.type)} · ${escHtml(status)}</span>
      </summary>
      <div class="s12-config-grid">
        <label>Orden<input type="number" min="1" max="99" value="${c.order}" data-s12-field="order"></label>
        <label>Título del anexo<input type="text" value="${escHtml(c.title)}" data-s12-field="title"></label>
        <label>Visualización<select data-s12-field="visualization">${optionHtml(VISUALIZATIONS,c.visualization)}</select></label>
        <label>Confidencialidad<select data-s12-field="confidentiality">${optionHtml(CONFIDENTIALITY,c.confidentiality)}</select></label>
      </div>
      <div class="s12-toggle-row">
        <label><input type="checkbox" data-s12-field="showResponses" ${c.showResponses?'checked':''}> Nº de respuestas</label>
        <label><input type="checkbox" data-s12-field="showCounts" ${c.showCounts?'checked':''}> Conteos</label>
        <label><input type="checkbox" data-s12-field="showPercentages" ${c.showPercentages?'checked':''}> Porcentajes</label>
        <label><input type="checkbox" data-s12-field="showRecent" ${c.showRecent?'checked':''}> Respuestas registradas</label>
        <label><input type="checkbox" data-s12-field="showWordCloud" ${c.showWordCloud?'checked':''}> Nube de palabras</label>
        <label><input type="checkbox" data-s12-field="showNote" ${c.showNote?'checked':''}> Nota</label>
        <label>Cantidad lista <input style="width:64px" type="number" min="1" max="10" value="${c.recentCount}" data-s12-field="recentCount"></label>
      </div>
      <div class="s12-note"><label>Nota personalizada<input type="text" value="${escHtml(c.note)}" placeholder="Ej. Datos del formulario institucional…" data-s12-field="note"></label></div>
    </details>`;
  }

  async function persistConfig(container,event) {
    const control=event.target?.closest?.('[data-s12-field]');
    const item=control?.closest?.('[data-s12-id]');
    if (!control || !item) return;
    ensureState();
    const cfg=state.section12.annexes[item.dataset.s12Id];
    if(!cfg) return;
    const fieldName=control.dataset.s12Field;
    if (control.type==='checkbox') cfg[fieldName]=control.checked;
    else if (fieldName==='order' || fieldName==='recentCount') cfg[fieldName]=Math.max(1,Number(control.value)||1);
    else cfg[fieldName]=clean(control.value);
    if (typeof save==='function') await save();
  }

  if (typeof renderDNF === 'function') {
    const previousRenderDNF=renderDNF;
    renderDNF=function renderDNFSection12(){
      ensureState();injectStyles();previousRenderDNF();
      const root=document.getElementById('content');
      if(!root || root.querySelector('#section12Annexes')) return;
      const annexes=buildAnnexes();
      root.insertAdjacentHTML('beforeend',`
        <div class="section-title" id="section12Annexes" style="margin-top:30px"><div><h2>12. Anexos</h2><p>Visuales automáticos construidos desde las respuestas válidas del período. No se pegan capturas manuales.</p></div></div>
        <div class="card">
          <p><strong>Configuración de anexos</strong></p>
          <p class="small muted">Por defecto se incluyen las preguntas con datos. Puedes decidir qué anexos mostrar y su forma de visualización. Los campos nominales o sensibles no forman parte de esta galería.</p>
          <div class="grid cards" style="margin-top:12px">
            <div class="metric"><span>Configurados</span><strong>${annexes.length}</strong></div>
            <div class="metric"><span>Con datos</span><strong>${annexes.filter(x=>x.responseCount>0).length}</strong></div>
            <div class="metric"><span>Incluidos en PDF</span><strong>${activeAnnexes().length}</strong></div>
          </div>
          <div class="s12-annex-grid">${annexes.map(annexConfigHtml).join('')}</div>
        </div>`);
      const box=root.querySelector('#section12Annexes')?.nextElementSibling;
      if(box && !box.dataset.s12Bound){
        box.dataset.s12Bound='1';
        box.addEventListener('change',event=>persistConfig(box,event));
      }
    };
  }

  ensureState();
  window.__DOCFORMACION_DNF_ANNEXES=buildAnnexes;
  window.__DOCFORMACION_DNF_ACTIVE_ANNEXES=activeAnnexes;
  window.__DOCFORMACION_SECTION12_DEFINITIONS=DEFINITIONS.map(item=>({...item}));
  window.__DOCFORMACION_SECTION12_DATA_READY=true;
})();
