(() => {
  'use strict';

  const clean = value => String(value ?? '').trim();
  const normKey = value => clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ');

  function formatPercent(value) {
    const number = Number(value || 0);
    const text = Number.isInteger(number)
      ? String(number)
      : number.toLocaleString('es-EC', { maximumFractionDigits:2 });
    return text + ' %';
  }

  function coverageState(ctxArg) {
    const ctx = ctxArg || window.docformacionDocumentContext?.build?.() || {};
    const active = Array.isArray(ctx.careers) ? ctx.careers.length : 0;
    const activeKeys = new Set((ctx.careers || []).map(row => normKey(row.name)).filter(Boolean));
    const withNeeds = new Set(
      (ctx.needs || [])
        .map(row => normKey(row.career))
        .filter(value => value && activeKeys.has(value))
    ).size;
    const applicable = active > 0;
    const percent = applicable ? (withNeeds * 100) / active : null;
    return {
      active,
      withNeeds,
      applicable,
      percent,
      text:applicable ? formatPercent(percent) : 'No aplica'
    };
  }

  // Enriquece el cálculo canónico sin cambiar el contrato numérico heredado de coverage.
  const previousCalculations = window.docformacionDocumentCalculations;
  if (previousCalculations?.dnf) {
    window.docformacionDocumentCalculations = Object.freeze({
      ...previousCalculations,
      dnf(ctx) {
        const result = previousCalculations.dnf(ctx);
        const coverage = coverageState(ctx);
        return {
          ...result,
          diagnosed:coverage.withNeeds,
          careersWithNeeds:coverage.withNeeds,
          totalActiveCareers:coverage.active,
          coverage:coverage.applicable ? coverage.percent : 0,
          coverageApplicable:coverage.applicable,
          coverageText:coverage.text
        };
      }
    });
  }

  function renderIntroduction(writer, ctx) {
    const coverage = coverageState(ctx);
    writer.paragraph('La formación y el desarrollo profesional del personal académico constituyen componentes permanentes de la calidad de la educación superior. La Detección de Necesidades de Formación organiza evidencia por carrera para orientar decisiones de planificación, priorización y seguimiento.');
    writer.paragraph('Para el período ' + ctx.period.label + ', la aplicación mantiene una fuente única de datos y conserva la trazabilidad de cada necesidad mediante un código DNF que posteriormente se reutiliza en el Plan de Formación y en el Informe de Cumplimiento.');
    writer.metricTable([
      ['Carreras activas del período', String(coverage.active)],
      ['Carreras con necesidades registradas', String(coverage.withNeeds)],
      ['Cobertura de registro por carreras', coverage.text],
      ['Necesidades registradas', String((ctx.needs || []).length)]
    ]);
  }

  function renderMethodology(writer, ctx) {
    const coverage = coverageState(ctx);
    const data = ctx.methodology || {};
    const criteria = window.docformacionDnfPriority?.criteria || {};

    writer.paragraph('El diagnóstico adopta un enfoque institucional, descriptivo y de priorización. La unidad de análisis es cada necesidad concreta de formación asociada a una carrera activa.');
    writer.heading('Cobertura y fuentes', 2);
    writer.paragraph('La cobertura por carreras corresponde al porcentaje de carreras activas que cuentan con al menos una necesidad de formación académica registrada durante el período.');
    if (coverage.applicable) {
      writer.paragraph('De las ' + coverage.active + ' carreras activas, ' + coverage.withNeeds + ' registran necesidades, lo que representa una cobertura del ' + coverage.text + ' de las carreras activas. Este resultado no mide el porcentaje de docentes participantes ni de beneficiarios del Plan de Formación.');
    } else {
      writer.paragraph('El período no registra carreras activas; por tanto, la cobertura de registro por carreras es No aplica. Este resultado no mide el porcentaje de docentes participantes ni de beneficiarios del Plan de Formación.');
    }
    writer.paragraph('La información se recopiló mediante ' + (clean(data.method) || '—') + ', durante ' + (clean(data.dates) || '—') + ', con la participación de ' + (clean(data.participants) || '—') + '. Se utilizaron como fuentes ' + (clean(data.sources) || '—') + '.');
    writer.paragraph('La revisión y validación de las necesidades estuvo a cargo de ' + (clean(data.validationResponsible) || '—') + ', mediante ' + (clean(data.validationMechanism) || '—') + '. Los respaldos del proceso se identifican en ' + (clean(data.evidenceReference) || '—') + '.');

    writer.heading('Criterios de priorización', 2);
    writer.paragraph('Las necesidades de formación académica se clasifican según la relevancia de la brecha identificada y su incidencia en las funciones del personal docente:');
    writer.bullet('Alta: ' + (criteria.Alta || 'La brecha afecta directamente la formación académica requerida para las funciones docentes y requiere atención preferente.'));
    writer.bullet('Media: ' + (criteria.Media || 'La formación contribuye al fortalecimiento del perfil académico y puede atenderse de manera progresiva.'));
    writer.bullet('Baja: ' + (criteria.Baja || 'La formación complementa el desarrollo académico y puede programarse posteriormente.'));
    writer.paragraph('Cada necesidad incorpora una justificación de la prioridad asignada, sustentada en la información del diagnóstico.');
  }

  function renderCharacterization(writer, ctx) {
    const calc = window.docformacionBaseCalculations;
    const metrics = window.docformacionDocumentCalculations?.dnf?.(ctx) || {};
    const coverage = coverageState(ctx);
    const byPriority = metrics.byPriority || {};
    const byProgram = metrics.byProgram || {};

    writer.metricTable([
      ['Carreras activas del período', String(coverage.active)],
      ['Carreras con necesidades registradas', String(coverage.withNeeds)],
      ['Cobertura de registro por carreras', coverage.text],
      ['Necesidades específicas', String((ctx.needs || []).length)],
      ['Prioridad Alta', String(byPriority.Alta || 0)],
      ['Prioridad Media', String(byPriority.Media || 0)],
      ['Prioridad Baja', String(byPriority.Baja || 0)]
    ]);
    writer.barChart('Necesidades por prioridad', ['Alta','Media','Baja'].map(priority => ({ label:priority, value:byPriority[priority] || 0 })));
    writer.table(
      ['Nivel de formación','Carreras','Porcentaje'],
      Object.entries(byProgram).map(([name, count]) => [
        name,
        String(count),
        coverage.active > 0 ? calc.pctText(calc.pct(count, coverage.active)) : 'No aplica'
      ]),
      [55,20,25]
    );
  }

  function renderCoverage(writer, ctx) {
    const metrics = window.docformacionDocumentCalculations?.dnf?.(ctx) || {};
    const coverage = coverageState(ctx);
    const byCareer = metrics.byCareer || {};

    writer.paragraph('La cobertura por carreras corresponde al porcentaje de carreras activas que cuentan con al menos una necesidad de formación académica registrada durante el período.');
    if (coverage.applicable) {
      writer.paragraph('De las ' + coverage.active + ' carreras activas, ' + coverage.withNeeds + ' registran necesidades, lo que representa una cobertura del ' + coverage.text + ' de las carreras activas. Este resultado no mide el porcentaje de docentes participantes ni de beneficiarios del Plan de Formación.');
    } else {
      writer.paragraph('El período no registra carreras activas; por tanto, la cobertura de registro por carreras es No aplica. Este resultado no mide el porcentaje de docentes participantes ni de beneficiarios del Plan de Formación.');
    }
    writer.table(
      ['Carrera','Nivel de formación','Necesidades registradas'],
      (ctx.careers || []).map(career => [career.name, career.program || '—', String(byCareer[career.name] || 0)]),
      [55,30,15]
    );
    writer.metricTable([
      ['Carreras activas del período', String(coverage.active)],
      ['Carreras con necesidades registradas', String(coverage.withNeeds)],
      ['Cobertura de registro por carreras', coverage.text]
    ]);
  }

  function renderExecutiveSummary(writer, ctx) {
    const metrics = window.docformacionDocumentCalculations?.dnf?.(ctx) || {};
    const coverage = coverageState(ctx);
    const byPriority = metrics.byPriority || {};
    writer.paragraph('El diagnóstico del período ' + ctx.period.label + ' registra necesidades en ' + coverage.withNeeds + ' de ' + coverage.active + ' carreras activas y consolida ' + (ctx.needs || []).length + ' necesidades específicas.');
    writer.metricTable([
      ['Cobertura de registro por carreras', coverage.text],
      ['Prioridad Alta', String(byPriority.Alta || 0)],
      ['Prioridad Media', String(byPriority.Media || 0)],
      ['Prioridad Baja', String(byPriority.Baja || 0)],
      ['Líneas genéricas', String((ctx.genericLines || []).length)]
    ]);
    writer.paragraph('La cobertura de registro por carreras no representa participación docente ni beneficiarios del Plan de Formación. La prioridad y la trazabilidad mediante CODIGO_DNF permiten trasladar cada necesidad al Plan de Formación sin duplicar información.');
  }

  function renderConclusions(writer, ctx) {
    const metrics = window.docformacionDocumentCalculations?.dnf?.(ctx) || {};
    const coverage = coverageState(ctx);
    const byPriority = metrics.byPriority || {};
    if (coverage.applicable) {
      writer.bullet('La cobertura de registro por carreras alcanza ' + coverage.text + ': ' + coverage.withNeeds + ' de ' + coverage.active + ' carreras activas cuentan con al menos una necesidad registrada.');
    } else {
      writer.bullet('La cobertura de registro por carreras es No aplica porque el período no registra carreras activas.');
    }
    writer.bullet('Se identificaron ' + (ctx.needs || []).length + ' necesidades específicas, de las cuales ' + (byPriority.Alta || 0) + ' son de prioridad Alta.');
    writer.bullet('La cobertura de registro por carreras no mide el porcentaje de docentes participantes ni de beneficiarios del Plan de Formación.');
    writer.bullet('La trazabilidad mediante CODIGO_DNF mantiene la relación entre diagnóstico, planificación y seguimiento.');
    writer.bullet('Las líneas genéricas complementan las necesidades específicas sin sustituirlas.');
  }

  const previousRenderers = window.docformacionSectionRenderers;
  if (previousRenderers?.render) {
    window.docformacionSectionRenderers = Object.freeze({
      ...previousRenderers,
      __dnfCoverageByCareer:true,
      render(type, section, writer, ctx) {
        if (type !== 'dnf') return previousRenderers.render(type, section, writer, ctx);
        switch (section?.id) {
          case 'DNF-01-introduccion': return renderIntroduction(writer, ctx);
          case 'DNF-04-metodologia': return renderMethodology(writer, ctx);
          case 'DNF-05-caracterizacion': return renderCharacterization(writer, ctx);
          case 'DNF-07-cobertura': return renderCoverage(writer, ctx);
          case 'DNF-08-resumen': return renderExecutiveSummary(writer, ctx);
          case 'DNF-09-conclusiones': return renderConclusions(writer, ctx);
          default: return previousRenderers.render(type, section, writer, ctx);
        }
      }
    });
  }

  window.docformacionDnfCoverage = Object.freeze({
    state:coverageState,
    formatPercent
  });
})();
