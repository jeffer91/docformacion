(() => {
  'use strict';

  const base = () => window.docformacionBaseCalculations;
  const key = value => String(value ?? '').trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ');

  function dnf(ctx) {
    const calc = base();
    const diagnosed = new Set(ctx.needs.map(row => key(row.career))).size;
    return {
      diagnosed,
      coverage: calc.pct(diagnosed, ctx.careers.length),
      byPriority: calc.counts(ctx.needs, row => row.priority),
      byCareer: calc.counts(ctx.needs, row => row.career),
      byProgram: calc.counts(ctx.careers, row => row.program)
    };
  }

  function plan(ctx) {
    const calc = base();
    return {
      byPriority: calc.counts(ctx.plan, row => row.priority),
      byLevel: calc.counts(ctx.plan, row => row.formationLevel),
      careers: new Set(ctx.plan.map(row => key(row.career)).filter(Boolean)).size,
      averageDuration: calc.average(ctx.plan.filter(row => Number(row.durationYears) > 0), row => row.durationYears),
      // Alias heredados para componentes antiguos que todavía puedan consultarlos.
      byModality:{},
      economicSupport:0
    };
  }

  function report(ctx) {
    const calc = base();
    const byStatus = calc.counts(ctx.report, row => row.status);
    const started = ctx.report.filter(row => ['En proceso','Finalizado'].includes(row.status)).length;
    const finished = byStatus.Finalizado || 0;
    const notExecuted = byStatus['No ejecutado'] || 0;
    return {
      byStatus,
      started,
      finished,
      notExecuted,
      averageProgress: calc.average(ctx.report, row => row.progress),
      completion: calc.pct(finished, ctx.report.length)
    };
  }

  window.docformacionDocumentCalculations = Object.freeze({ dnf, plan, report });
})();