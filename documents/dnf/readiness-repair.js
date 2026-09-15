(() => {
  'use strict';

  const PRIORITIES = ['Alta','Media','Baja'];
  const clean = value => String(value ?? '').trim();
  const key = value => clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ');

  function needKey(career, need) {
    return key(career) + '|' + key(need);
  }

  function justificationMap() {
    const map = new Map();
    (state?.coordinations || []).forEach(coord => {
      (coord?.needItems || []).forEach(item => {
        const need = clean(item?.text);
        if (!need) return;
        map.set(
          needKey(coord?.carrera, need),
          clean(item?.priorityJustification ?? item?.priorityReason ?? item?.justification)
        );
      });
    });
    return map;
  }

  function priorityState(ctxArg) {
    const ctx = ctxArg || window.docformacionDocumentContext?.build?.();
    const rows = Array.isArray(ctx?.needs) ? ctx.needs : [];
    const map = justificationMap();
    const incomplete = rows.filter(row => {
      const stored = clean(row?.priorityJustification) || map.get(needKey(row?.career, row?.need)) || '';
      return !stored;
    });
    return {
      ready: rows.length > 0 && incomplete.length === 0,
      total: rows.length,
      complete: Math.max(0, rows.length - incomplete.length),
      incomplete: incomplete.length,
      missing: !rows.length
        ? ['necesidades DNF']
        : (incomplete.length ? ['justificación de prioridad para ' + incomplete.length + ' necesidad(es)'] : [])
    };
  }

  function canonicalDnfCore(ctxArg) {
    const ctx = ctxArg || window.docformacionDocumentContext?.build?.();
    if (!ctx) return { ready:false, missing:['contexto documental'] };

    const missing = [];
    const flow = state?.dnfTemplateFlow || {};
    if (flow.careersImported !== true) missing.push('plantilla de carreras confirmada');
    if (!(ctx.careers || []).length) missing.push('al menos una carrera activa');

    const unknown = (ctx.allCareers || []).filter(row => !['Activa','Inactiva'].includes(clean(row?.status)));
    if (unknown.length) missing.push('estado Activa/Inactiva de todas las carreras');

    if (flow.dnfImported !== true) missing.push('plantilla DNF confirmada');
    if (!(ctx.needs || []).length) missing.push('necesidades DNF');
    if ((ctx.needs || []).some(row => !PRIORITIES.includes(clean(row?.priority)))) {
      missing.push('prioridad válida para todas las necesidades');
    }

    const represented = new Set((ctx.needs || []).map(row => key(row?.career)));
    const uncovered = (ctx.careers || []).filter(row => !represented.has(key(row?.name)));
    if (uncovered.length) missing.push('al menos una necesidad por carrera activa');

    const priority = priorityState(ctx);
    priority.missing.forEach(item => missing.push(item));

    return {
      ready: missing.length === 0,
      missing: [...new Set(missing)],
      priorityJustification: priority
    };
  }

  const previousValidation = window.docformacionValidation;
  if (previousValidation) {
    function dnf(ctxArg) {
      const ctx = ctxArg || window.docformacionDocumentContext?.build?.();
      const core = canonicalDnfCore(ctx);
      const sources = previousValidation.sourceGovernance?.(ctx) || { ready:true, missing:[] };
      const missing = [...(core.missing || []), ...(sources.missing || [])];
      return { ready:missing.length === 0, missing:[...new Set(missing)], priorityJustification:core.priorityJustification };
    }

    window.docformacionValidation = Object.freeze({
      ...previousValidation,
      priorityJustificationState: priorityState,
      dnfCore: canonicalDnfCore,
      dnf
    });
  }

  function repairDnfCards() {
    const root = document.getElementById('content');
    if (!root) return;

    const cards = [...root.querySelectorAll('.dnf-template-card')];
    const dnfCard = cards[1];
    const ctx = window.docformacionDocumentContext?.build?.();
    const core = canonicalDnfCore(ctx);
    const priority = priorityState(ctx);

    if (dnfCard) {
      const badge = dnfCard.querySelector('.status-badge');
      const headStatus = dnfCard.querySelector('.dnf-template-card-head > div > span');
      const note = dnfCard.querySelector('[data-priority-help]');

      if (core.ready) {
        badge?.classList.remove('blocked');
        badge?.classList.add('ready');
        if (badge) badge.textContent = 'Lista';
        if (headStatus) headStatus.textContent = 'Cargada';
        if (note) note.textContent = 'Todas las necesidades tienen prioridad y justificación registrada.';
      } else if (note && priority.total) {
        note.textContent = priority.complete + ' de ' + priority.total + ' necesidades tienen justificación de prioridad registrada.';
      }
    }

    const methodologyCard = root.querySelector('[data-dnf-methodology-card]');
    if (methodologyCard && core.ready) {
      const methodology = window.docformacionValidation?.methodologyState?.(ctx);
      if (!methodology?.ready) {
        methodologyCard.querySelectorAll('[data-methodology-template],[data-methodology-import]').forEach(button => {
          button.disabled = false;
        });
        const paragraph = methodologyCard.querySelector('p');
        if (paragraph) paragraph.textContent = 'Registra cómo se levantaron y validaron las necesidades del período.';
        const headStatus = methodologyCard.querySelector('.dnf-template-card-head > div > span');
        if (headStatus) headStatus.textContent = 'Pendiente';
      }
    }
  }

  const previousRenderDocumentView = renderDocumentView;
  renderDocumentView = function renderDocumentViewWithDnfReadinessRepair(type) {
    const result = previousRenderDocumentView(type);
    if (type === 'dnf') {
      repairDnfCards();
      queueMicrotask(repairDnfCards);
    }
    return result;
  };

  window.docformacionDnfReadinessRepair = Object.freeze({
    priorityState,
    dnfCore: canonicalDnfCore,
    repair: repairDnfCards
  });
})();
