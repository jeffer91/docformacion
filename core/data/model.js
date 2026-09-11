(() => {
  'use strict';

  function clean(value) {
    return String(value ?? '').trim();
  }

  function periodId() {
    const start = clean(state?.period?.start);
    const end = clean(state?.period?.end);
    return start && end ? start + '_' + end : '';
  }

  function shared() {
    return {
      careers: state?.careers || [],
      teachers: state?.teachers || [],
      coordinations: state?.coordinations || [],
      authorities: {
        preparedBy: clean(state?.period?.preparedBy),
        reviewedBy: clean(state?.period?.reviewedBy),
        approvedBy: clean(state?.period?.approvedBy)
      }
    };
  }

  function documentData(type) {
    if (type === 'dnf') {
      return {
        needs: (state?.coordinations || []).flatMap(c => Array.isArray(c.needItems) ? c.needItems.map(item => ({...item, career:c.carrera})) : []),
        genericLines: state?.settings?.genericLines || []
      };
    }
    if (type === 'plan') {
      return { plan: state?.needPlan || state?.plan || [] };
    }
    if (type === 'informe') {
      return { followup: state?.needFollowup || state?.followup || [] };
    }
    return {};
  }

  function snapshot() {
    return {
      periodId: periodId(),
      period: state?.period || {},
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
    documentData,
    snapshot
  });
})();
