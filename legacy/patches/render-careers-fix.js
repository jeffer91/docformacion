(() => {
  'use strict';
  if (typeof renderCareers !== 'function') return;

  renderCareers = function renderCareersSelectorFix() {
    $('#content').innerHTML = `
      <div class="alert-strip success"><div><strong>Catálogo precargado</strong>Estas son las carreras que aparecerán inmediatamente en la app. Puedes editar el tipo de programa o agregar nuevas carreras.</div></div>
      <div class="section-title">
        <div><h2>Carreras y programas</h2><p>${(state.careers||[]).length} carreras configuradas.</p></div>
        <div class="toolbar">${excelActions('carreras')}<button class="primary" id="addCareer">+ Agregar carrera</button></div>
      </div>
      <div class="card" id="careerCatalog">
        ${(state.careers||[]).map((cr,i)=>`<div class="catalog-row" data-career-row="${i}">
          <input data-career-name="${i}" value="${esc(cr.name)}" placeholder="Nombre de la carrera">
          <select data-career-program="${i}">${optionList(['Técnico Superior','Tecnología Superior','Tecnología Universitaria','Otro'],cr.program)}</select>
          <button class="danger remove-career" data-i="${i}">Eliminar</button>
        </div>`).join('')}
      </div>
      <div class="dialog-actions"><button class="primary" id="saveCareers">Guardar carreras</button></div>`;

    bindExcelActions('carreras',$('#content'));
    refreshCareerMissingStyles();
    $$('[data-career-name],[data-career-program]').forEach(el=>{
      el.addEventListener('input',refreshCareerMissingStyles);
      el.addEventListener('change',refreshCareerMissingStyles);
    });

    $('#addCareer').onclick=()=>{
      let base='Nueva carrera',name=base,i=2;
      while(state.careers.some(c=>c.name===name)){name=base+' '+i;i++;}
      state.careers.push({name,program:'Tecnología Superior'});
      ensureCoordination(name);
      renderCareers();
    };

    $$('.remove-career').forEach(b=>b.onclick=()=>{
      const i=Number(b.dataset.i),cr=state.careers[i];
      if(state.teachers.some(t=>t.carrera===cr.name)){toast('No puedes eliminar una carrera que ya tiene docentes.');return;}
      if(!confirm('¿Eliminar '+cr.name+'?'))return;
      state.careers.splice(i,1);
      state.coordinations=state.coordinations.filter(x=>x.carrera!==cr.name);
      renderCareers();
    });

    $('#saveCareers').onclick=async()=>{
      $$('[data-career-row]').forEach(row=>{
        const i=Number(row.dataset.careerRow),current=state.careers[i]||{};
        const old=current.name;
        const name=norm(row.querySelector('[data-career-name]').value)||old;
        const program=row.querySelector('[data-career-program]').value||'Por definir';
        if(old!==name){
          state.teachers.filter(t=>t.carrera===old).forEach(t=>t.carrera=name);
          const coord=state.coordinations.find(x=>x.carrera===old);if(coord)coord.carrera=name;
        }
        state.careers[i]={...current,name,program};
        ensureCoordination(name);
      });
      await save();
      toast('Carreras actualizadas');
      renderCareers();
    };
  };

  window.__DOCFORMACION_RENDER_CAREERS_FIXED=true;
})();