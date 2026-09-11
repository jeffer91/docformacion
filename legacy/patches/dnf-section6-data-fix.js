(() => {
  'use strict';

  const SECTION6_LEVELS = ['Tecnología Universitaria','Ingeniería','Licenciatura','Maestría','Doctorado','Tecnología Universitaria / Ingeniería'];
  const DEFAULT_GENERIC_FORMATION = [
    'Educación',
    'Innovación y Tecnología Educativa',
    'Investigación y Pensamiento Crítico',
    'Ética y Valores',
    'Gestión Educativa y Liderazgo'
  ];

  const clean = (value='') => String(value ?? '').trim();
  const newId = (prefix='s6') => prefix + '_' + Math.random().toString(36).slice(2,9) + Date.now().toString(36);

  function activeCareerNames() {
    const seen = new Set();
    const out = [];
    (state.teachers || []).forEach(t => {
      const name = clean(t.carrera);
      if (!name || (typeof validCareerName === 'function' && !validCareerName(name))) return;
      const key = typeof careerKey === 'function' ? careerKey(name) : name.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      const canonical = (state.careers || []).find(cr => (typeof careerKey === 'function' ? careerKey(cr.name) : clean(cr.name).toLowerCase()) === key)?.name || name;
      out.push(canonical);
    });
    return out;
  }

  function emptyCareerProfile(career) {
    return {
      career,
      description:'',
      specificLines:[],
      academicSuggestions:[]
    };
  }

  function emptyGenericLine(name='') {
    return {
      id:newId('generic'),
      name,
      tecnologia:[],
      licenciatura:[],
      maestria:[],
      doctorado:[]
    };
  }

  function ensureSection6() {
    state.section6 = state.section6 && typeof state.section6 === 'object' ? state.section6 : {};
    state.section6.careers = state.section6.careers && typeof state.section6.careers === 'object' ? state.section6.careers : {};
    state.section6.careerOrder = Array.isArray(state.section6.careerOrder) ? state.section6.careerOrder : [];
    state.section6.genericLines = Array.isArray(state.section6.genericLines) ? state.section6.genericLines : [];

    const active = activeCareerNames();
    const activeKeys = new Set(active.map(name => careerKey(name)));
    const preserved = state.section6.careerOrder.filter(name => activeKeys.has(careerKey(name)));
    active.forEach(name => {
      if (!preserved.some(existing => careerKey(existing) === careerKey(name))) preserved.push(name);
      const key = careerKey(name);
      const current = state.section6.careers[key] || emptyCareerProfile(name);
      current.career = name;
      current.description = clean(current.description);
      current.specificLines = Array.isArray(current.specificLines) ? current.specificLines.map(item => ({
        id:item?.id || newId('line'),
        line:clean(item?.line),
        justification:clean(item?.justification)
      })) : [];
      current.academicSuggestions = Array.isArray(current.academicSuggestions) ? current.academicSuggestions.map(item => ({
        id:item?.id || newId('acad'),
        level:clean(item?.level),
        programs:Array.isArray(item?.programs) ? item.programs.map(clean).filter(Boolean) : clean(item?.programs).split('|').map(clean).filter(Boolean),
        justification:clean(item?.justification)
      })) : [];
      state.section6.careers[key] = current;
    });
    state.section6.careerOrder = preserved;

    if (!state.section6.genericLines.length) {
      state.section6.genericLines = DEFAULT_GENERIC_FORMATION.map(name => emptyGenericLine(name));
    } else {
      state.section6.genericLines = state.section6.genericLines.map(item => ({
        id:item?.id || newId('generic'),
        name:clean(item?.name),
        tecnologia:Array.isArray(item?.tecnologia) ? item.tecnologia.map(clean).filter(Boolean) : clean(item?.tecnologia).split('|').map(clean).filter(Boolean),
        licenciatura:Array.isArray(item?.licenciatura) ? item.licenciatura.map(clean).filter(Boolean) : clean(item?.licenciatura).split('|').map(clean).filter(Boolean),
        maestria:Array.isArray(item?.maestria) ? item.maestria.map(clean).filter(Boolean) : clean(item?.maestria).split('|').map(clean).filter(Boolean),
        doctorado:Array.isArray(item?.doctorado) ? item.doctorado.map(clean).filter(Boolean) : clean(item?.doctorado).split('|').map(clean).filter(Boolean)
      }));
    }
    return state.section6;
  }

  function careerProfile(name) {
    ensureSection6();
    return state.section6.careers[careerKey(name)];
  }

  function programsToText(list) {
    return (Array.isArray(list) ? list : []).join(' | ');
  }

  function textToPrograms(value) {
    return clean(value).split(/\s*\|\s*|\s*\n\s*/).map(clean).filter(Boolean);
  }

  function section6IncompleteCareers() {
    ensureSection6();
    return state.section6.careerOrder.filter(name => {
      const p = careerProfile(name);
      const lines = p.specificLines.filter(x => clean(x.line) || clean(x.justification));
      const academics = p.academicSuggestions.filter(x => clean(x.level) || x.programs.length || clean(x.justification));
      if (!clean(p.description)) return true;
      if (!lines.length || lines.some(x => !clean(x.line) || !clean(x.justification))) return true;
      if (!academics.length || academics.some(x => !clean(x.level) || !x.programs.length || !clean(x.justification))) return true;
      return false;
    });
  }

  function genericMatrixIncomplete() {
    ensureSection6();
    if (!state.section6.genericLines.length) return true;
    return state.section6.genericLines.some(line =>
      !clean(line.name) || !line.tecnologia.length || !line.licenciatura.length || !line.maestria.length || !line.doctorado.length
    );
  }

  if (typeof documentStatus === 'function') {
    const previousDocumentStatus = documentStatus;
    documentStatus = function documentStatusSection6(type) {
      ensureSection6();
      const result = previousDocumentStatus(type);
      if (type !== 'dnf') return result;

      const active = activeCareerNames();
      const activeKeys = new Set(active.map(name => careerKey(name)));
      const issues = [];
      (result.issues || []).forEach(issue => {
        if (issue.kind === 'career-empty' && active.length) return;
        if ((issue.kind === 'career-needs' || issue.kind === 'coordinator') && Array.isArray(issue.names)) {
          const names = issue.names.filter(name => activeKeys.has(careerKey(name)));
          if (!names.length) return;
          issues.push({...issue, names, text:names.length + (issue.kind === 'career-needs' ? ' carrera(s) activa(s) sin necesidad de formación definida' : ' carrera(s) activa(s) sin coordinador definido')});
          return;
        }
        if (issue.kind === 'need-priority') {
          const count = active.flatMap(name => ensureNeedItems(name).filter(item => clean(item.text) && !clean(item.priorityOverride))).length;
          if (!count) return;
          issues.push({...issue, count, text:count + ' necesidad(es) de carreras activas sin prioridad definida'});
          return;
        }
        issues.push(issue);
      });

      const incomplete = section6IncompleteCareers();
      if (incomplete.length) {
        issues.push({
          kind:'section6-careers',
          count:incomplete.length,
          text:incomplete.length + ' carrera(s) activa(s) con la sección 6.2 incompleta',
          view:'necesidades'
        });
      }
      if (genericMatrixIncomplete()) {
        issues.push({
          kind:'section6-generic',
          text:'Completar la matriz de Formación Intelectual Genérica (6.3)',
          view:'necesidades'
        });
      }
      return {...result, issues, ready:issues.length === 0, missing:issues.map(x => x.text)};
    };
  }

  function renderCareerCard(name,index,total) {
    const p = careerProfile(name);
    const lines = p.specificLines.length ? p.specificLines : [{id:'draft-line-'+careerKey(name),line:'',justification:''}];
    const academics = p.academicSuggestions.length ? p.academicSuggestions : [{id:'draft-acad-'+careerKey(name),level:'',programs:[],justification:''}];
    return `
      <details class="card s6-career-card" data-s6-career-card="${esc(name)}" ${index===0?'open':''}>
        <summary style="cursor:pointer"><strong>6.2.${index+1}. Carrera: ${esc(name)}</strong><span class="small muted" style="margin-left:10px">${p.specificLines.length} línea(s) · ${p.academicSuggestions.length} nivel(es)</span></summary>
        <div style="margin-top:16px">
          <div class="toolbar" style="justify-content:flex-end;margin-bottom:12px">
            <button type="button" class="secondary compact s6-move-career" data-career="${esc(name)}" data-dir="-1" ${index===0?'disabled':''}>Subir</button>
            <button type="button" class="secondary compact s6-move-career" data-career="${esc(name)}" data-dir="1" ${index===total-1?'disabled':''}>Bajar</button>
          </div>
          <div class="field wide"><label>Descripción / caracterización de necesidades de formación</label><textarea class="s6-description" data-career="${esc(name)}" rows="5" placeholder="Describe las necesidades formativas de la carrera">${esc(p.description)}</textarea></div>

          <div class="section-title" style="margin-top:18px"><div><h3>Líneas de formación específicas sugeridas</h3><p>Registra la línea y su justificación técnica. No existe límite fijo de tres.</p></div><button type="button" class="secondary s6-add-line" data-career="${esc(name)}">+ Agregar línea de formación</button></div>
          <div class="table-wrap"><table class="table"><thead><tr><th>Línea de formación específica</th><th>Justificación técnica</th><th></th></tr></thead><tbody>
            ${lines.map(item=>`<tr data-s6-line-row="${esc(item.id)}" data-career="${esc(name)}"><td><input class="s6-line-text" value="${esc(item.line)}" placeholder="Línea específica"></td><td><textarea class="s6-line-just" rows="3" placeholder="Justificación técnica">${esc(item.justification)}</textarea></td><td><button type="button" class="danger s6-remove-line">Eliminar</button></td></tr>`).join('')}
          </tbody></table></div>

          <div class="section-title" style="margin-top:18px"><div><h3>Carreras sugeridas para la formación docente</h3><p>Nivel, programas sugeridos y justificación. Separa varios programas con “|”.</p></div><button type="button" class="secondary s6-add-academic" data-career="${esc(name)}">+ Agregar nivel/programa</button></div>
          <div class="table-wrap"><table class="table"><thead><tr><th>Nivel de formación</th><th>Carreras / programas sugeridos</th><th>Justificación</th><th></th></tr></thead><tbody>
            ${academics.map(item=>`<tr data-s6-academic-row="${esc(item.id)}" data-career="${esc(name)}"><td><select class="s6-academic-level">${optionList(SECTION6_LEVELS,item.level)}</select></td><td><textarea class="s6-academic-programs" rows="3" placeholder="Programa 1 | Programa 2">${esc(programsToText(item.programs))}</textarea></td><td><textarea class="s6-academic-just" rows="3" placeholder="Justificación">${esc(item.justification)}</textarea></td><td><button type="button" class="danger s6-remove-academic">Eliminar</button></td></tr>`).join('')}
          </tbody></table></div>
        </div>
      </details>`;
  }

  function renderGenericMatrix() {
    ensureSection6();
    return `
      <div class="section-title" style="margin-top:26px"><div><h2>6.3. Formación Intelectual Genérica</h2><p>Matriz transversal editable por nivel académico. Separa varios programas con “|”.</p></div><button type="button" class="secondary" id="s6AddGeneric">+ Agregar línea genérica</button></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Línea Genérica</th><th>Tecnología</th><th>Licenciatura</th><th>Maestría</th><th>Doctorado</th><th></th></tr></thead><tbody>
        ${state.section6.genericLines.map(item=>`<tr data-s6-generic-row="${esc(item.id)}"><td><input class="s6-generic-name" value="${esc(item.name)}"></td><td><textarea class="s6-generic-tech" rows="3" placeholder="Programa 1 | Programa 2">${esc(programsToText(item.tecnologia))}</textarea></td><td><textarea class="s6-generic-lic" rows="3">${esc(programsToText(item.licenciatura))}</textarea></td><td><textarea class="s6-generic-mae" rows="3">${esc(programsToText(item.maestria))}</textarea></td><td><textarea class="s6-generic-doc" rows="3">${esc(programsToText(item.doctorado))}</textarea></td><td><button type="button" class="danger s6-remove-generic">Eliminar</button></td></tr>`).join('')}
      </tbody></table></div>`;
  }

  renderDNF = function renderDNFSection6() {
    ensureSection6();
    const active = activeCareerNames();
    const careers = active.length ? active : dnfCareerNames();
    careers.forEach(name => ensureNeedItems(name));
    const allNeeds = careers.flatMap(name => ensureNeedItems(name).filter(item => norm(item.text)));
    const highPriority = allNeeds.filter(item => item.priorityOverride === 'Alta').length;
    const genericCount = (state.settings.genericLines || []).filter(norm).length;
    const ordered = state.section6.careerOrder;

    $('#content').innerHTML = `
      ${completionAlert('dnf')}
      <div class="section-title"><div><h2>Carga Excel de la DNF</h2><p>La plantilla DNF incluye docentes, necesidades, líneas específicas y matrices de formación.</p></div>${excelActions('dnf')}</div>
      <div class="grid cards">
        ${metric('Carreras activas',active.length)}
        ${metric('Necesidades específicas',allNeeds.length)}
        ${metric('Prioridad alta',highPriority)}
        ${metric('Líneas genéricas',genericCount)}
      </div>

      <div class="section-title"><div><h2>Coordinadores por carrera activa</h2><p>Se muestran las carreras que poseen docentes en el período.</p></div></div>
      <div class="table-wrap">${careers.length?`<table class="table needs-table"><thead><tr><th>Carrera</th><th>Coordinador</th></tr></thead><tbody>${careers.map(name=>{const coord=ensureCoordination(name);return `<tr><td><strong>${esc(name)}</strong></td><td><input class="coord-input" data-career="${esc(name)}" value="${esc(coord?.coordinador||'')}" placeholder="Nombre del coordinador"></td></tr>`}).join('')}</tbody></table>`:'<div class="empty">Carga docentes para identificar las carreras activas del período.</div>'}</div>

      <div class="section-title"><div><h2>Necesidades específicas por carrera</h2><p>Necesidades base y prioridad que alimentan el diagnóstico.</p></div></div>
      <div class="table-wrap">${careers.length?`<table class="table needs-table"><thead><tr><th>Carrera</th><th>Necesidad de formación</th><th>Prioridad</th><th></th></tr></thead><tbody>${careers.map(name=>{
        const items=ensureNeedItems(name);const viewItems=items.length?items:[{id:needId(name,0),text:'',priorityOverride:''}];
        return viewItems.map((item,i)=>`<tr><td><strong>${esc(name)}</strong>${i===viewItems.length-1&&items.length<3?`<div class="inline-note"><button class="ghost add-need" data-career="${esc(name)}">+ Agregar necesidad</button></div>`:''}</td><td><input class="need-item-input" data-career="${esc(name)}" data-need-id="${esc(item.id)}" value="${esc(item.text)}" placeholder="Necesidad requerida por la carrera"></td><td><select class="need-priority-input" data-career="${esc(name)}" data-need-id="${esc(item.id)}"><option value="">Seleccionar prioridad</option>${['Alta','Media','Baja'].map(x=>'<option '+(item.priorityOverride===x?'selected':'')+'>'+x+'</option>').join('')}</select></td><td>${items.length>1?`<button class="danger remove-need" data-career="${esc(name)}" data-need-id="${esc(item.id)}">Eliminar</button>`:''}</td></tr>`).join('');
      }).join('')}</tbody></table>`:'<div class="empty">No existen carreras activas.</div>'}</div>

      <div class="section-title"><div><h2>Líneas genéricas institucionales del diagnóstico</h2><p>Estas líneas se conservan para las secciones generales de la DNF.</p></div><button class="secondary" id="addGeneric">+ Línea</button></div>
      <div class="card" id="genericList">${state.settings.genericLines.map((g,i)=>`<div class="generic-line"><input data-generic="${i}" value="${esc(g)}"><button class="danger delete-generic" data-i="${i}">Eliminar</button></div>`).join('')}</div>

      <div class="section-title" style="margin-top:30px"><div><h2>6. Líneas de Formación por Coordinación Académica</h2><p>6.1 se calcula desde la fecha tentativa de cada docente. Aquí se configura 6.2 y 6.3.</p></div></div>
      ${ordered.length ? ordered.map((name,index)=>renderCareerCard(name,index,ordered.length)).join('') : '<div class="empty">Carga docentes para generar las carreras activas de la sección 6.2.</div>'}
      ${renderGenericMatrix()}
      <div class="dialog-actions"><button type="button" class="primary" id="s6Save">Guardar Sección 6</button></div>`;

    bindExcelActions('dnf',$('#content'));
    refreshDNFMissingStyles();
    $$('.coord-input,.need-item-input,.need-priority-input').forEach(el=>{
      el.addEventListener('input',refreshDNFMissingStyles);
      el.addEventListener('change',refreshDNFMissingStyles);
    });

    $('#addGeneric').onclick=()=>{state.settings.genericLines.push('Nueva línea genérica');save();renderDNF();};
    $$('.delete-generic').forEach(b=>b.onclick=()=>{state.settings.genericLines.splice(Number(b.dataset.i),1);save();renderDNF();});
    $$('[data-generic]').forEach(inp=>inp.onchange=()=>{state.settings.genericLines[Number(inp.dataset.generic)]=inp.value;save();});
    $$('.coord-input').forEach(inp=>inp.onchange=async()=>{ensureCoordination(inp.dataset.career).coordinador=inp.value;await save();});
    $$('.need-item-input').forEach(inp=>inp.onchange=async()=>{const items=ensureNeedItems(inp.dataset.career);let item=items.find(x=>x.id===inp.dataset.needId);if(!item){item={id:inp.dataset.needId,text:'',priorityOverride:''};items.push(item);}item.text=norm(inp.value);const coord=ensureCoordination(inp.dataset.career);coord.needItems=items.filter(x=>x.text);coord.needsOverride='';coord.priorityOverride='';await save();renderDNF();});
    $$('.need-priority-input').forEach(sel=>sel.onchange=async()=>{const items=ensureNeedItems(sel.dataset.career);const item=items.find(x=>x.id===sel.dataset.needId);if(item)item.priorityOverride=sel.value;const coord=ensureCoordination(sel.dataset.career);coord.needItems=items;coord.priorityOverride='';await save();});
    $$('.add-need').forEach(btn=>btn.onclick=async()=>{const items=ensureNeedItems(btn.dataset.career);if(items.length>=3){toast('Máximo 3 necesidades por carrera');return;}items.push({id:needId(btn.dataset.career,Date.now()),text:'Nueva necesidad',priorityOverride:''});ensureCoordination(btn.dataset.career).needItems=items;await save();renderDNF();});
    $$('.remove-need').forEach(btn=>btn.onclick=async()=>{const coord=ensureCoordination(btn.dataset.career);coord.needItems=ensureNeedItems(btn.dataset.career).filter(x=>x.id!==btn.dataset.needId);await save();renderDNF();});

    $$('.s6-move-career').forEach(btn=>btn.onclick=async()=>{const name=btn.dataset.career,dir=Number(btn.dataset.dir),i=state.section6.careerOrder.findIndex(x=>careerKey(x)===careerKey(name)),j=i+dir;if(i<0||j<0||j>=state.section6.careerOrder.length)return;[state.section6.careerOrder[i],state.section6.careerOrder[j]]=[state.section6.careerOrder[j],state.section6.careerOrder[i]];await save();renderDNF();});
    $$('.s6-add-line').forEach(btn=>btn.onclick=async()=>{careerProfile(btn.dataset.career).specificLines.push({id:newId('line'),line:'',justification:''});await save();renderDNF();});
    $$('.s6-remove-line').forEach(btn=>btn.onclick=async()=>{const row=btn.closest('[data-s6-line-row]'),profile=careerProfile(row.dataset.career);profile.specificLines=profile.specificLines.filter(x=>x.id!==row.dataset.s6LineRow);await save();renderDNF();});
    $$('.s6-add-academic').forEach(btn=>btn.onclick=async()=>{careerProfile(btn.dataset.career).academicSuggestions.push({id:newId('acad'),level:'',programs:[],justification:''});await save();renderDNF();});
    $$('.s6-remove-academic').forEach(btn=>btn.onclick=async()=>{const row=btn.closest('[data-s6-academic-row]'),profile=careerProfile(row.dataset.career);profile.academicSuggestions=profile.academicSuggestions.filter(x=>x.id!==row.dataset.s6AcademicRow);await save();renderDNF();});
    $('#s6AddGeneric').onclick=async()=>{state.section6.genericLines.push(emptyGenericLine('Nueva línea genérica'));await save();renderDNF();};
    $$('.s6-remove-generic').forEach(btn=>btn.onclick=async()=>{const row=btn.closest('[data-s6-generic-row]');state.section6.genericLines=state.section6.genericLines.filter(x=>x.id!==row.dataset.s6GenericRow);await save();renderDNF();});

    $('#s6Save').onclick=async()=>{
      $$('.s6-career-card').forEach(card=>{
        const name=card.dataset.s6CareerCard,profile=careerProfile(name);
        profile.description=clean(card.querySelector('.s6-description')?.value);
        profile.specificLines=[...card.querySelectorAll('[data-s6-line-row]')].map(row=>({id:row.dataset.s6LineRow.startsWith('draft-')?newId('line'):row.dataset.s6LineRow,line:clean(row.querySelector('.s6-line-text')?.value),justification:clean(row.querySelector('.s6-line-just')?.value)})).filter(x=>x.line||x.justification);
        profile.academicSuggestions=[...card.querySelectorAll('[data-s6-academic-row]')].map(row=>({id:row.dataset.s6AcademicRow.startsWith('draft-')?newId('acad'):row.dataset.s6AcademicRow,level:clean(row.querySelector('.s6-academic-level')?.value),programs:textToPrograms(row.querySelector('.s6-academic-programs')?.value),justification:clean(row.querySelector('.s6-academic-just')?.value)})).filter(x=>x.level||x.programs.length||x.justification);
      });
      state.section6.genericLines=[...document.querySelectorAll('[data-s6-generic-row]')].map(row=>({
        id:row.dataset.s6GenericRow,
        name:clean(row.querySelector('.s6-generic-name')?.value),
        tecnologia:textToPrograms(row.querySelector('.s6-generic-tech')?.value),
        licenciatura:textToPrograms(row.querySelector('.s6-generic-lic')?.value),
        maestria:textToPrograms(row.querySelector('.s6-generic-mae')?.value),
        doctorado:textToPrograms(row.querySelector('.s6-generic-doc')?.value)
      })).filter(x=>x.name||x.tecnologia.length||x.licenciatura.length||x.maestria.length||x.doctorado.length);
      await save();
      renderDNF();
      toast('Sección 6 actualizada');
    };
  };

  function sheet(name,headers,descriptions,rows,widths) { return {name,headers,descriptions,rows,widths}; }
  if (typeof excelTemplatePayload === 'function') {
    const previousExcelTemplatePayload = excelTemplatePayload;
    excelTemplatePayload = function excelTemplatePayloadSection6(scope,includeData) {
      ensureSection6();
      const payload=previousExcelTemplatePayload(scope,includeData);
      if (!['dnf','global'].includes(scope)) return payload;
      const active=state.section6.careerOrder;
      const specificRows=[];
      const academicRows=[];
      active.forEach((name,index)=>{
        const p=careerProfile(name);
        const lines=includeData?p.specificLines:[{line:'',justification:''}];
        (lines.length?lines:[{line:'',justification:''}]).forEach((item,lineIndex)=>specificRows.push([index+1,name,lineIndex===0?(includeData?p.description:''):'',includeData?item.line:'',includeData?item.justification:'']));
        const academics=includeData?p.academicSuggestions:[{level:'',programs:[],justification:''}];
        (academics.length?academics:[{level:'',programs:[],justification:''}]).forEach(item=>academicRows.push([index+1,name,includeData?item.level:'',includeData?programsToText(item.programs):'',includeData?item.justification:'']));
      });
      const genericRows=(includeData?state.section6.genericLines:DEFAULT_GENERIC_FORMATION.map(name=>emptyGenericLine(name))).map(item=>[item.name,programsToText(item.tecnologia),programsToText(item.licenciatura),programsToText(item.maestria),programsToText(item.doctorado)]);
      payload.sheets.push(
        sheet('FORMACION_ESPECIFICA',['ORDEN_CARRERA','CARRERA','DESCRIPCION_NECESIDADES','LINEA_ESPECIFICA','JUSTIFICACION_TECNICA'],['Orden de aparición en 6.2.','Carrera activa del período.','Descripción de necesidades; basta completarla en la primera fila de la carrera.','Línea de formación específica.','Justificación técnica.'],specificRows.length?specificRows:[[1,'','','','']],[14,42,70,48,70]),
        sheet('FORMACION_ACADEMICA',['ORDEN_CARRERA','CARRERA','NIVEL_FORMACION','PROGRAMAS_SUGERIDOS','JUSTIFICACION'],['Orden de aparición en 6.2.','Carrera activa del período.','Nivel: Tecnología Universitaria, Ingeniería, Licenciatura, Maestría, Doctorado o combinación pertinente.','Varios programas separados con |.','Justificación de la sugerencia.'],academicRows.length?academicRows:[[1,'','','','']],[14,42,34,60,70]),
        sheet('FORMACION_GENERICA',['LINEA_GENERICA','TECNOLOGIA','LICENCIATURA','MAESTRIA','DOCTORADO'],['Nombre editable de la línea transversal.','Programas separados con |.','Programas separados con |.','Programas separados con |.','Programas separados con |.'],genericRows,[42,44,44,44,44])
      );
      return payload;
    };
  }

  try {
    if (typeof EXCEL_MODULES !== 'undefined') {
      EXCEL_MODULES.FORMACION_ESPECIFICA={module:'dnf',label:'Detección de Necesidades',view:'necesidades'};
      EXCEL_MODULES.FORMACION_ACADEMICA={module:'dnf',label:'Detección de Necesidades',view:'necesidades'};
      EXCEL_MODULES.FORMACION_GENERICA={module:'dnf',label:'Detección de Necesidades',view:'necesidades'};
    }
  } catch (_e) {}

  if (typeof excelImportContext === 'function') {
    const previousExcelImportContext=excelImportContext;
    excelImportContext=function excelImportContextSection6(scope,kind='') {
      const context=previousExcelImportContext(scope,kind);
      if (!kind && ['dnf','global'].includes(scope) && Array.isArray(context.sheets)) {
        context.sheets=[...new Set([...context.sheets,'FORMACION_ESPECIFICA','FORMACION_ACADEMICA','FORMACION_GENERICA'])];
      }
      return context;
    };
  }

  if (typeof applyExcel === 'function') {
    const previousApplyExcel=applyExcel;
    applyExcel=function applyExcelSection6(sheets) {
      previousApplyExcel(sheets);
      ensureSection6();
      const specific=sheets?.FORMACION_ESPECIFICA||[];
      const academics=sheets?.FORMACION_ACADEMICA||[];
      const generic=sheets?.FORMACION_GENERICA||[];
      const orderMap=new Map();
      specific.forEach(row=>{
        const name=clean(row.CARRERA);if(!name)return;const p=careerProfile(name);if(!p)return;
        const order=Number(row.ORDEN_CARRERA)||999;orderMap.set(careerKey(name),Math.min(orderMap.get(careerKey(name))||999,order));
        if(clean(row.DESCRIPCION_NECESIDADES)) p.description=clean(row.DESCRIPCION_NECESIDADES);
      });
      if(specific.length){
        activeCareerNames().forEach(name=>{const p=careerProfile(name);p.specificLines=[];});
        specific.forEach(row=>{const name=clean(row.CARRERA),line=clean(row.LINEA_ESPECIFICA),just=clean(row.JUSTIFICACION_TECNICA);if(!name||(!line&&!just))return;const p=careerProfile(name);if(p)p.specificLines.push({id:newId('line'),line,justification:just});});
      }
      if(academics.length){
        activeCareerNames().forEach(name=>{const p=careerProfile(name);p.academicSuggestions=[];});
        academics.forEach(row=>{const name=clean(row.CARRERA);if(!name)return;const p=careerProfile(name);if(!p)return;const order=Number(row.ORDEN_CARRERA)||999;orderMap.set(careerKey(name),Math.min(orderMap.get(careerKey(name))||999,order));p.academicSuggestions.push({id:newId('acad'),level:clean(row.NIVEL_FORMACION),programs:textToPrograms(row.PROGRAMAS_SUGERIDOS),justification:clean(row.JUSTIFICACION)});});
      }
      if(orderMap.size) state.section6.careerOrder.sort((a,b)=>(orderMap.get(careerKey(a))||999)-(orderMap.get(careerKey(b))||999));
      if(generic.length){
        state.section6.genericLines=generic.map(row=>({id:newId('generic'),name:clean(row.LINEA_GENERICA),tecnologia:textToPrograms(row.TECNOLOGIA),licenciatura:textToPrograms(row.LICENCIATURA),maestria:textToPrograms(row.MAESTRIA),doctorado:textToPrograms(row.DOCTORADO)})).filter(x=>x.name||x.tecnologia.length||x.licenciatura.length||x.maestria.length||x.doctorado.length);
      }
    };
  }

  ensureSection6();
  window.__DOCFORMACION_SECTION6_DATA_READY=true;
})();