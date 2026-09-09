(() => {
  'use strict';

  const CURRENT_LEVELS = ['Tecnólogo Superior','Tecnólogo Universitario','Licenciatura / Ingeniería','Maestría / Maestría Tecnológica','Doctorado'];
  const PROGRAM_LEVELS = ['Tecnología Superior','Tecnología Universitaria','Técnico Superior'];
  const UPDATE_CATEGORIES = [
    'Áreas pedagógicas',
    'TIC, IA o plataformas digitales',
    'Normativas o estándares',
    'Áreas técnicas o disciplinares específicas'
  ];

  const clean = (value='') => String(value ?? '').trim();
  const key = value => clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ');
  const pct = (part,total) => total ? part * 100 / total : 0;

  function teachers() {
    return Array.isArray(state?.teachers) ? state.teachers : [];
  }

  function ensureSection8() {
    teachers().forEach(t => {
      if (!Object.prototype.hasOwnProperty.call(t,'areaActualizacionCategoria')) t.areaActualizacionCategoria = '';
    });
  }

  function yesNo(value) {
    const raw = key(value);
    if (!raw) return '';
    if (raw === 'si' || raw.startsWith('si ')) return 'Sí';
    if (raw === 'no' || raw.startsWith('no ')) return 'No';
    return '';
  }

  function normalizeAllowed(value,allowed) {
    const raw = clean(value);
    if (!raw) return '';
    const found = allowed.find(item => key(item) === key(raw));
    return found || '';
  }

  function activeCareerKeySet() {
    if (typeof window.__DOCFORMACION_SECTION7_ACTIVE_CAREERS === 'function') {
      return new Set(window.__DOCFORMACION_SECTION7_ACTIVE_CAREERS().map(key));
    }
    return new Set((state.careers || []).map(cr => key(cr.name)).filter(Boolean));
  }

  function programForCareer(name) {
    const wanted = key(name);
    return clean((state.careers || []).find(cr => key(cr.name) === wanted)?.program);
  }

  function groupedExact(values) {
    const map = new Map();
    values.map(clean).filter(Boolean).forEach(value => {
      const k = key(value);
      const current = map.get(k) || {label:value,count:0};
      current.count++;
      map.set(k,current);
    });
    const total = [...map.values()].reduce((sum,item)=>sum+item.count,0);
    const rows = [...map.values()]
      .map(item => ({...item,percentage:pct(item.count,total)}))
      .sort((a,b)=>b.count-a.count || a.label.localeCompare(b.label,'es'));
    return {total,rows};
  }

  function buildMetrics() {
    ensureSection8();
    const all = teachers();

    const levelCounts = Object.fromEntries(CURRENT_LEVELS.map(level => [level,0]));
    all.forEach(t => {
      const level = normalizeAllowed(t.nivelActual,CURRENT_LEVELS);
      if (level) levelCounts[level]++;
    });
    const levelTotal = Object.values(levelCounts).reduce((a,b)=>a+b,0);
    const fourthCount = levelCounts['Maestría / Maestría Tecnológica'] + levelCounts['Doctorado'];
    const belowFourthCount = levelTotal - fourthCount;

    const availabilityCounts = {'Sí':0,'No':0};
    all.forEach(t => { const value=yesNo(t.dispuesto); if(value) availabilityCounts[value]++; });
    const availabilityTotal = availabilityCounts.Sí + availabilityCounts.No;

    const updateCounts = {'Sí':0,'No':0};
    all.forEach(t => { const value=yesNo(t.actualizacionReciente); if(value) updateCounts[value]++; });
    const updateTotal = updateCounts.Sí + updateCounts.No;

    const updateAreaCounts = Object.fromEntries(UPDATE_CATEGORIES.map(category => [category,0]));
    all.forEach(t => {
      if (yesNo(t.actualizacionReciente) !== 'Sí') return;
      const category = normalizeAllowed(t.areaActualizacionCategoria,UPDATE_CATEGORIES);
      if (category) updateAreaCounts[category]++;
    });
    const updateAreaTotal = Object.values(updateAreaCounts).reduce((a,b)=>a+b,0);

    const activeKeys = activeCareerKeySet();
    const programCounts = Object.fromEntries(PROGRAM_LEVELS.map(level => [level,0]));
    all.forEach(t => {
      const careerKeyValue = key(t.carrera);
      if (!careerKeyValue || (activeKeys.size && !activeKeys.has(careerKeyValue))) return;
      const level = normalizeAllowed(programForCareer(t.carrera),PROGRAM_LEVELS);
      if (level) programCounts[level]++;
    });
    const programTotal = Object.values(programCounts).reduce((a,b)=>a+b,0);

    const interests = groupedExact(all.map(t => t.areaInteres));

    let availabilityInterpretation = 'una distribución equilibrada';
    if (!availabilityTotal) availabilityInterpretation = 'ausencia de información suficiente';
    else if (availabilityCounts.Sí > availabilityCounts.No) availabilityInterpretation = 'una tendencia favorable';
    else if (availabilityCounts.Sí < availabilityCounts.No) availabilityInterpretation = 'una disposición limitada';

    return {
      diagnosticTotal: all.length,
      level: {
        counts: levelCounts,
        total: levelTotal,
        fourthCount,
        belowFourthCount,
        fourthPct: pct(fourthCount,levelTotal),
        belowFourthPct: pct(belowFourthCount,levelTotal)
      },
      availability: {
        counts: availabilityCounts,
        total: availabilityTotal,
        yesPct: pct(availabilityCounts.Sí,availabilityTotal),
        noPct: pct(availabilityCounts.No,availabilityTotal),
        interpretation: availabilityInterpretation
      },
      update: {
        counts: updateCounts,
        total: updateTotal,
        yesPct: pct(updateCounts.Sí,updateTotal),
        noPct: pct(updateCounts.No,updateTotal)
      },
      updateAreas: {
        counts: updateAreaCounts,
        total: updateAreaTotal,
        percentages: Object.fromEntries(UPDATE_CATEGORIES.map(category => [category,pct(updateAreaCounts[category],updateAreaTotal)]))
      },
      programLevels: {
        counts: programCounts,
        total: programTotal,
        percentages: Object.fromEntries(PROGRAM_LEVELS.map(level => [level,pct(programCounts[level],programTotal)]))
      },
      interests,
      meta: {
        currentLevels:[...CURRENT_LEVELS],
        programLevels:[...PROGRAM_LEVELS],
        updateCategories:[...UPDATE_CATEGORIES]
      }
    };
  }

  if (typeof openTeacher === 'function') {
    const previousOpenTeacher = openTeacher;
    openTeacher = function openTeacherSection8(teacherId=null,returnView=null,focusField='') {
      ensureSection8();
      previousOpenTeacher(teacherId,returnView,focusField);
      const root = document.getElementById('teacherFields');
      if (!root || root.querySelector('[name="areaActualizacionCategoria"]')) return;
      const teacher = teacherId ? teacherById(teacherId) : {};
      root.insertAdjacentHTML('beforeend',field(
        'Categoría de la actualización reciente',
        'areaActualizacionCategoria',
        teacher?.areaActualizacionCategoria || '',
        'select',
        UPDATE_CATEGORIES,
        false,
        'Se utiliza en el Resumen Ejecutivo. Completar solo cuando exista formación o actualización reciente; no se clasifica automáticamente el texto libre.'
      ));
      const control = root.querySelector('[name="areaActualizacionCategoria"]');
      control?.addEventListener('input',refreshTeacherMissingStyles);
      control?.addEventListener('change',refreshTeacherMissingStyles);
    };
  }

  if (typeof renderDNF === 'function') {
    const previousRenderDNF = renderDNF;
    renderDNF = function renderDNFSection8() {
      ensureSection8();
      previousRenderDNF();
      const root = document.getElementById('content');
      if (!root || root.querySelector('#section8AutomaticSummary')) return;
      const m = buildMetrics();
      const fmt=(value,total)=>total ? Number(value||0).toLocaleString('es-EC',{maximumFractionDigits:1})+'%' : '—';
      root.insertAdjacentHTML('beforeend',`
        <div class="section-title" id="section8AutomaticSummary" style="margin-top:30px"><div><h2>8. Resumen Ejecutivo</h2><p>100 % automático. No existen campos manuales propios para esta sección.</p></div></div>
        <div class="grid cards">
          ${metric('Docentes considerados',m.diagnosticTotal)}
          ${metric('Cuarto nivel',fmt(m.level.fourthPct,m.level.total))}
          ${metric('Dispuestos a estudiar',fmt(m.availability.yesPct,m.availability.total))}
          ${metric('Actualización reciente',fmt(m.update.yesPct,m.update.total))}
        </div>
        <div class="card"><p class="small muted">El resumen reutiliza los datos consolidados de las secciones anteriores. Los porcentajes no se escriben manualmente y cada indicador conserva su propio número de respuestas válidas.</p></div>`);
    };
  }

  function cloneSheet(sheet) {
    return {
      ...sheet,
      headers:[...(sheet.headers || [])],
      descriptions:[...(sheet.descriptions || [])],
      rows:(sheet.rows || []).map(row => [...row]),
      widths:[...(sheet.widths || [])]
    };
  }

  if (typeof excelTemplatePayload === 'function') {
    const previousExcelTemplatePayload = excelTemplatePayload;
    excelTemplatePayload = function excelTemplatePayloadSection8(scope,includeData) {
      ensureSection8();
      const payload = previousExcelTemplatePayload(scope,includeData);
      payload.sheets = (payload.sheets || []).map(raw => {
        const sheet = cloneSheet(raw);
        if (sheet.name !== 'DOCENTES' || sheet.headers.includes('CATEGORIA_ACTUALIZACION')) return sheet;
        sheet.headers.push('CATEGORIA_ACTUALIZACION');
        sheet.descriptions.push('Categoría explícita de la actualización reciente: Áreas pedagógicas; TIC, IA o plataformas digitales; Normativas o estándares; Áreas técnicas o disciplinares específicas. No se infiere desde texto libre.');
        sheet.widths.push(44);
        sheet.rows = (sheet.rows || []).map(row => {
          if (!includeData) return [...row,''];
          const teacher = teachers().find(t => String(t.cedula || '') === String(row[0] || '')) || {};
          return [...row,teacher.areaActualizacionCategoria || ''];
        });
        return sheet;
      });
      return payload;
    };
  }

  if (typeof applyExcel === 'function') {
    const previousApplyExcel = applyExcel;
    applyExcel = function applyExcelSection8(sheets) {
      previousApplyExcel(sheets);
      ensureSection8();
      (sheets?.DOCENTES || []).forEach(row => {
        const cedula = clean(row.CEDULA);
        if (!cedula || !Object.prototype.hasOwnProperty.call(row,'CATEGORIA_ACTUALIZACION')) return;
        const teacher = teachers().find(t => String(t.cedula || '') === cedula);
        if (!teacher) return;
        teacher.areaActualizacionCategoria = normalizeAllowed(row.CATEGORIA_ACTUALIZACION,UPDATE_CATEGORIES);
      });
    };
  }

  ensureSection8();
  window.__DOCFORMACION_DNF_METRICS = buildMetrics;
  window.__DOCFORMACION_SECTION8_UPDATE_CATEGORIES = [...UPDATE_CATEGORIES];
  window.__DOCFORMACION_SECTION8_DATA_READY = true;
})();
