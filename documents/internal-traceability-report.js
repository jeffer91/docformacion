(() => {
  'use strict';

  const clean = value => String(value ?? '').trim();
  const key = value => clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ');

  const previousModel = window.docformacionModel;
  if (!previousModel?.reportRows || !previousModel?.planRows) return;

  window.docformacionModel = Object.freeze({
    ...previousModel,
    reportRows() {
      const plans = previousModel.planRows();
      const byCode = new Map(plans.map(row => [clean(row.dnfCode), row]));
      const byCareerAction = new Map(plans.map(row => [key(row.career) + '|' + key(row.action), row]));
      return previousModel.reportRows().map(row => {
        const plan = byCode.get(clean(row.dnfCode)) || byCareerAction.get(key(row.career) + '|' + key(row.action));
        return {
          ...row,
          needText:clean(row.needText || plan?.needText),
          needId:row.needId || plan?.needId || window.docformacionInternalTraceability?.stableNeedId?.(row.career, plan?.needText || row.needText) || ''
        };
      });
    }
  });
})();
