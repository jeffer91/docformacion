(() => {
  'use strict';

  const PRIORITIES = ['Alta','Media','Baja'];
  const MODALITIES = ['Presencial','Virtual','Híbrida'];
  const SUPPORTS = ['Sin apoyo económico','Económico','Convenio / beca','Gestión interna'];
  const FOLLOW_STATUSES = ['No iniciado','En proceso','Finalizado','No ejecutado'];
  const clean = value => String(value ?? '').trim();
  const key = value => clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ');

  function needsFingerprint(rows) {
    return (rows || []).map(row => [row.code,row.career,row.need,row.priority].map(clean).join('|'))
      .sort((a,b) => a.localeCompare(b, 'es'))
      .join('||');
  }

  function planFingerprint(rows) {
    return (rows || []).map(row => [
      row.dnfCode,row.career,row.needText,row.priority,row.action,row.modality,
      row.plannedStart,row.plannedEnd,row.indicator,Number(row.targetPercent || 0),
      row.evidence,row.responsibleRole,row.supportType,Number(row.supportAmount || 0),row.observations
    ].map(clean).join('|')).sort((a,b) => a.localeCompare(b, 'es')).join('||');
  }

  function planRowMissing(row) {
    const missing = [];
    if (!clean(row.action)) missing.push('acción');
    if (!MODALITIES.includes(clean(row.modality))) missing.push('modalidad');
    if (!/^\d{4}-\d{2}$/.test(clean(row.plannedStart))) missing.push('inicio');
    if (!/^\d{4}-\d{2}$/.test(clean(row.plannedEnd))) missing.push('fin');
    if (clean(row.plannedEnd) && clean(row.plannedStart) && clean(row.plannedEnd) < clean(row.plannedStart)) missing.push('fin posterior al inicio');
    if (!clean(row.indicator)) missing.push('indicador');
    if (!(Number(row.targetPercent) > 0 && Number(row.targetPercent) <= 100)) missing.push('meta');
    if (!clean(row.evidence)) missing.push('medio de verificación');
    if (!clean(row.responsibleRole)) missing.push('responsable institucional');
    if (!SUPPORTS.includes(clean(row.supportType))) missing.push('tipo de apoyo');
    if (row.supportType === 'Económico' && !(Number(row.supportAmount) > 0)) missing.push('monto');
    return missing;
  }

  function reportRowMissing(row) {
    const missing = [];
    if (!FOLLOW_STATUSES.includes(clean(row.status))) missing.push('estado');
    if (['En proceso','Finalizado'].includes(row.status)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(clean(row.realStart))) missing.push('inicio real');
      if (!(Number(row.progress) > 0 && Number(row.progress) <= 100)) missing.push('avance');
      if (!clean(row.evidenceTitle)) missing.push('evidencia');
    }
    if (row.status === 'Finalizado' && Number(row.progress) !== 100) missing.push('avance 100%');
    if (row.status === 'No ejecutado' && !clean(row.observation)) missing.push('motivo');
    return missing;
  }

  function careerCatalog(ctx) {
    const unknown = ctx.allCareers.filter(row => !['Activa','Inactiva'].includes(row.status));
    const imported = state?.dnfTemplateFlow?.careersImported === true;
    const missing = [];
    if (!imported) missing.push('plantilla de carreras confirmada');
    if (!ctx.careers.length) missing.push('al menos una carrera activa');
    if (unknown.length) missing.push('estado Activa/Inactiva de todas las carreras');
    return { ready: missing.length === 0, missing };
  }

  function dnf(ctx) {
    const catalog = careerCatalog(ctx);
    const missing = [...catalog.missing];
    const imported = state?.dnfTemplateFlow?.dnfImported === true;
    if (!imported) missing.push('plantilla DNF confirmada');
    if (!ctx.needs.length) missing.push('necesidades DNF');
    if (ctx.needs.some(row => !PRIORITIES.includes(row.priority))) missing.push('prioridad válida para todas las necesidades');
    const represented = new Set(ctx.needs.map(row => key(row.career)));
    const uncovered = ctx.careers.filter(row => !represented.has(key(row.name)));
    if (uncovered.length) missing.push('al menos una necesidad por carrera activa');
    return { ready: missing.length === 0, missing: [...new Set(missing)] };
  }

  function plan(ctx) {
    const dnfState = dnf(ctx);
    const missing = dnfState.ready ? [] : ['DNF completa'];
    const workflow = state?.workflowV3 || {};
    if (workflow.planImported !== true) missing.push('plantilla del Plan confirmada');
    if (!ctx.plan.length) missing.push('acciones del Plan');
    if (workflow.planImported === true && workflow.planSourceFingerprint !== needsFingerprint(ctx.needs)) {
      missing.push('Plan actualizado respecto de la DNF vigente');
    }
    const invalid = ctx.plan.filter(row => planRowMissing(row).length);
    if (invalid.length) missing.push('campos obligatorios de todas las acciones del Plan');
    return { ready: missing.length === 0, missing: [...new Set(missing)], invalidRows: invalid.length };
  }

  function report(ctx) {
    const planState = plan(ctx);
    const missing = planState.ready ? [] : ['Plan de Formación completo'];
    const workflow = state?.workflowV3 || {};
    if (workflow.reportImported !== true) missing.push('plantilla del Informe confirmada');
    if (!ctx.report.length) missing.push('seguimiento del Informe');
    if (workflow.reportImported === true && workflow.reportSourceFingerprint !== planFingerprint(ctx.plan)) {
      missing.push('Informe actualizado respecto del Plan vigente');
    }
    const invalid = ctx.report.filter(row => reportRowMissing(row).length);
    if (invalid.length) missing.push('campos obligatorios de todo el seguimiento');
    return { ready: missing.length === 0, missing: [...new Set(missing)], invalidRows: invalid.length };
  }

  function dataAvailability(ctx) {
    const catalog = careerCatalog(ctx);
    const dnfState = dnf(ctx);
    const planState = plan(ctx);
    const reportState = report(ctx);
    const activeKeys = new Set(ctx.careers.map(row => key(row.name)));
    const coordKeys = new Set(ctx.coordinations.map(row => key(row.carrera)));
    return {
      periodo: { ready: !!ctx.period.active, label: 'período activo' },
      carreras: { ready: catalog.ready, label: catalog.missing.join(', ') || 'carreras' },
      docentes: { ready: ctx.teachers.length > 0, label: 'docentes' },
      coordinaciones: {
        ready: activeKeys.size > 0 && [...activeKeys].every(item => coordKeys.has(item)),
        label: 'coordinaciones de las carreras activas'
      },
      necesidades: { ready: dnfState.ready, label: dnfState.missing.join(', ') || 'necesidades DNF' },
      lineasGenericas: { ready: ctx.genericLines.length > 0, label: 'líneas genéricas' },
      baseLegal: { ready: ctx.legal.length > 0, label: 'base legal' },
      bibliografia: { ready: ctx.bibliography.length > 0, label: 'bibliografía' },
      plan: { ready: planState.ready, label: planState.missing.join(', ') || 'Plan' },
      seguimiento: { ready: reportState.ready, label: reportState.missing.join(', ') || 'seguimiento' }
    };
  }

  function sectionReadiness(type, section, ctxArg) {
    const ctx = ctxArg || window.docformacionDocumentContext?.build?.();
    if (!ctx) return { ready:false, missing:['contexto documental'], details:{} };
    const missing = [];
    if (!ctx.period.active) missing.push('período activo');
    const availability = dataAvailability(ctx);
    (section?.data || []).forEach(name => {
      const item = availability[name];
      if (item && !item.ready) missing.push(item.label || name);
    });
    return {
      ready: missing.length === 0,
      missing: [...new Set(missing)],
      details: availability
    };
  }

  function documentReadiness(type, ctxArg) {
    const ctx = ctxArg || window.docformacionDocumentContext?.build?.();
    if (!ctx?.period?.active) return { ready:false, missing:['período activo'] };
    if (type === 'dnf') return dnf(ctx);
    if (type === 'plan') return plan(ctx);
    if (type === 'informe') return report(ctx);
    return { ready:false, missing:['tipo de documento desconocido'] };
  }

  window.docformacionValidation = Object.freeze({
    needsFingerprint,
    planFingerprint,
    planRowMissing,
    reportRowMissing,
    careerCatalog,
    dnf,
    plan,
    report,
    sectionReadiness,
    documentReadiness
  });
})();
