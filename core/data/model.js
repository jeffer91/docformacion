(() => {
  'use strict';

  const PRIORITIES = ['Alta', 'Media', 'Baja'];
  const CAREER_STATUS = ['Activa', 'Inactiva'];

  const clean = value => String(value ?? '').trim();
  const key = value => clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ');

  function periodIdFor(start, end) {
    const a = clean(start);
    const b = clean(end);
    return a && b ? a + '_' + b : '';
  }

  function periodId() {
    return periodIdFor(state?.period?.start, state?.period?.end);
  }

  function activePeriodRecord() {
    const manager = state?.periodManager;
    if (!manager || !Array.isArray(manager.periods)) return null;
    const canonicalId = periodId();
    return manager.periods.find(item => periodIdFor(item?.start, item?.end) === canonicalId)
      || manager.periods.find(item => item?.id === manager.activeId)
      || null;
  }

  function careerStatus(name) {
    const statuses = state?.section7?.careerStatus || {};
    const raw = clean(statuses[key(name)]?.status || statuses[name]?.status);
    return CAREER_STATUS.includes(raw) ? raw : '';
  }

  function careers() {
    return (Array.isArray(state?.careers) ? state.careers : []).map(item => ({
      ...item,
      name: clean(item?.name),
      program: clean(item?.program),
      status: careerStatus(item?.name)
    }));
  }

  function activeCareers() {
    return careers().filter(item => item.status === 'Activa');
  }

  function needs() {
    const active = new Set(activeCareers().map(item => key(item.name)));
    const rows = [];
    (Array.isArray(state?.coordinations) ? state.coordinations : []).forEach((coord, careerIndex) => {
      const career = clean(coord?.carrera);
      if (!active.has(key(career))) return;
      const items = Array.isArray(coord?.needItems) ? coord.needItems : [];
      items.forEach((item, needIndex) => {
        const text = clean(item?.text);
        if (!text) return;
        const priority = clean(item?.priorityOverride);
        rows.push({
          code: clean(item?.dnfCode) || ('DNF-' + String(careerIndex + 1).padStart(2, '0') + '-' + String(needIndex + 1).padStart(2, '0')),
          career,
          need: text,
          priority: PRIORITIES.includes(priority) ? priority : '',
          source: 'state.coordinations.needItems'
        });
      });
    });
    return rows;
  }

  function canonicalPlanRows() {
    const source = Array.isArray(state?.needPlan)
      ? state.needPlan
      : (Array.isArray(state?.plan) ? state.plan : []);
    return source.map(row => ({
      dnfCode: clean(row?.dnfCode || row?.needKey || row?.code),
      career: clean(row?.career),
      needText: clean(row?.needText || row?.need),
      priority: clean(row?.priority),
      action: clean(row?.action || row?.program),
      modality: clean(row?.modality),
      plannedStart: clean(row?.plannedStart),
      plannedEnd: clean(row?.plannedEnd),
      indicator: clean(row?.indicator),
      targetPercent: Number(row?.targetPercent || 0),
      evidence: clean(row?.evidence),
      responsibleRole: clean(row?.responsibleRole),
      supportType: clean(row?.supportType),
      supportAmount: Number(row?.supportAmount || 0),
      observations: clean(row?.observations),
      source: Array.isArray(state?.needPlan) ? 'state.needPlan' : 'state.plan'
    })).filter(row => row.dnfCode || row.action || row.needText);
  }

  function canonicalReportRows() {
    const source = Array.isArray(state?.needFollowup)
      ? state.needFollowup
      : (Array.isArray(state?.followup) ? state.followup : []);
    return source.map(row => ({
      dnfCode: clean(row?.dnfCode || row?.needKey),
      career: clean(row?.career),
      action: clean(row?.action),
      status: clean(row?.status),
      realStart: clean(row?.realStart),
      progress: Number(row?.progress || 0),
      evidenceTitle: clean(row?.evidenceTitle),
      evidencePath: clean(row?.evidencePath),
      observation: clean(row?.observation),
      source: Array.isArray(state?.needFollowup) ? 'state.needFollowup' : 'state.followup'
    })).filter(row => row.dnfCode || row.action || row.status);
  }

  function shared() {
    const record = activePeriodRecord();
    return {
      careers: careers(),
      activeCareers: activeCareers(),
      teachers: Array.isArray(state?.teachers) ? state.teachers : [],
      coordinations: Array.isArray(state?.coordinations) ? state.coordinations : [],
      authorities: {
        preparedBy: clean(state?.period?.preparedBy),
        preparedRole: clean(state?.period?.preparedRole),
        reviewedBy: clean(state?.period?.reviewedBy),
        reviewedRole: clean(state?.period?.reviewedRole),
        approvedBy: clean(state?.period?.approvedBy),
        approvedRole: clean(state?.period?.approvedRole)
      },
      periodStatus: clean(record?.status || state?.period?.status || 'Activo')
    };
  }

  function documentData(type) {
    if (type === 'dnf') {
      return {
        needs: needs(),
        genericLines: Array.isArray(state?.settings?.genericLines) ? state.settings.genericLines : []
      };
    }
    if (type === 'plan') return { plan: canonicalPlanRows() };
    if (type === 'informe') return { followup: canonicalReportRows() };
    return {};
  }

  function snapshot() {
    return {
      periodId: periodId(),
      period: {
        ...(state?.period || {}),
        status: shared().periodStatus
      },
      shared: shared(),
      documents: {
        dnf: documentData('dnf'),
        plan: documentData('plan'),
        informe: documentData('informe')
      }
    };
  }

  window.docformacionModel = Object.freeze({
    get periodId() { return periodId(); },
    get shared() { return shared(); },
    periodIdFor,
    careerStatus,
    careers,
    activeCareers,
    needs,
    planRows: canonicalPlanRows,
    reportRows: canonicalReportRows,
    documentData,
    snapshot
  });
})();
