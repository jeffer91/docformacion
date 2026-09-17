(() => {
  'use strict';

  const clean = value => String(value ?? '').trim();
  const norm = value => clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ');

  const PRIORITIES = Object.freeze(['Alta','Media','Baja']);
  const FORBIDDEN_OUTPUT = Object.freeze(['[object Object]','undefined','null']);

  function pct(value, total) {
    const denominator = Number(total || 0);
    if (!denominator) return 0;
    return Number(value || 0) * 100 / denominator;
  }

  function pctText(value) {
    return Number(value || 0).toLocaleString('es-EC', { maximumFractionDigits:1 }) + ' %';
  }

  function humanDate(value) {
    const text = clean(value);
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? match[3] + '/' + match[2] + '/' + match[1] : text;
  }

  function sentence(value) {
    const text = clean(value).replace(/\s+/g, ' ');
    if (!text) return '';
    return /[.!?]$/.test(text) ? text : text + '.';
  }

  function formationOnly(value) {
    return sentence(clean(value)
      .replace(/formaci[oó]n\s+y\s+capacitaci[oó]n/gi, 'formación')
      .replace(/capacitaci[oó]n\s+y\s+formaci[oó]n/gi, 'formación')
      .replace(/\bcapacitaci[oó]n\b/gi, 'formación'));
  }

  function uniqueText(values) {
    const seen = new Set();
    return (values || []).map(clean).filter(value => {
      const key = norm(value);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function legalRows(ctx) {
    const map = new Map();
    (ctx?.legal || []).forEach(row => {
      const reference = clean(row?.[0]);
      const application = formationOnly(row?.[1]);
      if (!reference) return;
      const key = norm(reference);
      const current = map.get(key) || { reference, applications:[] };
      if (application && !current.applications.some(item => norm(item) === norm(application))) {
        current.applications.push(application);
      }
      map.set(key, current);
    });
    return [...map.values()].map(item => [
      item.reference,
      item.applications.length ? item.applications.join(' ') : 'Sustenta el proceso institucional de formación.'
    ]);
  }

  function bibliographyRows(ctx) {
    return uniqueText(ctx?.bibliography || []).map(value => sentence(value));
  }

  function coverageState(ctx) {
    const coverage = window.docformacionDnfCoverage?.state?.(ctx);
    if (coverage) return coverage;
    const active = Number(ctx?.careers?.length || 0);
    const represented = new Set((ctx?.needs || []).map(row => norm(row.career)).filter(Boolean));
    const withNeeds = (ctx?.careers || []).filter(career => represented.has(norm(career.name))).length;
    return {
      active,
      withNeeds,
      applicable:active > 0,
      value:active > 0 ? withNeeds * 100 / active : 0,
      text:active > 0 ? pctText(withNeeds * 100 / active) : 'No aplica'
    };
  }

  function metrics(ctx) {
    return window.docformacionDocumentCalculations?.dnf?.(ctx) || {
      byPriority:{ Alta:0, Media:0, Baja:0 },
      byCareer:{},
      byProgram:{},
      diagnosed:0,
      coverage:0
    };
  }

  function methodology(ctx) {
    const raw = ctx?.methodology || {};
    return {
      approach:clean(raw.approach),
      startDate:clean(raw.startDate),
      endDate:clean(raw.endDate),
      instruments:clean(raw.instruments),
      participants:Array.isArray(raw.participants)
        ? raw.participants.map(item => ({ actor:clean(item?.actor), percentage:Number(item?.percentage || 0) })).filter(item => item.actor && item.percentage > 0)
        : [],
      techniques:Array.isArray(raw.techniques)
        ? raw.techniques.map(item => ({ name:clean(item?.name), description:clean(item?.description) })).filter(item => item.name)
        : [],
      sources:uniqueText(Array.isArray(raw.sources) ? raw.sources : []),
      liftingProcedure:clean(raw.liftingProcedure),
      analysisProcedure:clean(raw.analysisProcedure),
      validationResponsible:clean(raw.validationResponsible),
      validationMechanism:clean(raw.validationMechanism),
      evidenceDescription:clean(raw.evidenceDescription)
    };
  }

  function badTokenExists(value) {
    const text = clean(value);
    return FORBIDDEN_OUTPUT.some(token => text.includes(token));
  }

  function collectStrings(value, out = []) {
    if (typeof value === 'string') out.push(value);
    else if (Array.isArray(value)) value.forEach(item => collectStrings(item, out));
    else if (value && typeof value === 'object') Object.values(value).forEach(item => collectStrings(item, out));
    return out;
  }

  function preflight(type, ctxArg) {
    const ctx = ctxArg || window.docformacionDocumentContext?.build?.();
    if (type !== 'dnf') return { ready:true, missing:[] };
    const missing = [];
    if (!ctx?.period?.active) missing.push('período activo');
    if (!clean(ctx?.documentCode?.('dnf'))) missing.push('código documental');

    const methodState = window.docformacionDnfMethodology?.readiness?.(ctx);
    if (!methodState?.ready) {
      (methodState?.missing || ['metodología de la Detección de Necesidades completa']).forEach(value => missing.push(value));
    }

    const needs = ctx?.needs || [];
    if (!needs.length) missing.push('necesidades de formación');
    if (needs.some(row => !clean(row.career) || !clean(row.need))) missing.push('carrera y necesidad completas en todos los registros');
    if (needs.some(row => !PRIORITIES.includes(clean(row.priority)))) missing.push('prioridad válida en todas las necesidades');
    if (needs.some(row => !clean(row.priorityJustification))) missing.push('justificación de prioridad en todas las necesidades');

    if (!(ctx?.genericLines || []).length) missing.push('Formación Intelectual Genérica');
    if (!legalRows(ctx).length) missing.push('base legal');
    if (!bibliographyRows(ctx).length) missing.push('bibliografía');

    const strings = collectStrings({ methodology:methodology(ctx), needs, legal:ctx?.legal, bibliography:ctx?.bibliography });
    if (strings.some(badTokenExists)) missing.push('contenido técnico sin valores inválidos como [object Object], undefined o null');

    return { ready:missing.length === 0, missing:[...new Set(missing)] };
  }

  function renderMethodology(writer, ctx) {
    const data = methodology(ctx);

    writer.heading('Enfoque metodológico', 2);
    if (data.approach) writer.paragraph(sentence(data.approach));

    writer.heading('Participantes del diagnóstico', 2);
    writer.paragraph('La participación se expresa únicamente en porcentajes y representa la composición relativa de los actores que intervinieron en el levantamiento.');
    if (data.participants.length) {
      writer.table(
        ['Actor','Participación'],
        data.participants.map(item => [item.actor, pctText(item.percentage)]),
        [72,28]
      );
    }

    writer.heading('Técnicas de levantamiento', 2);
    if (data.techniques.length) {
      writer.table(
        ['Técnica','Aplicación durante la detección'],
        data.techniques.map(item => [item.name, sentence(item.description)]),
        [30,70]
      );
    }

    writer.heading('Fuentes de información', 2);
    data.sources.forEach(source => writer.bullet(sentence(source)));

    writer.heading('Período e instrumentos de levantamiento', 2);
    if (data.startDate || data.endDate || data.instruments) {
      const dates = data.startDate && data.endDate
        ? 'El levantamiento se desarrolló entre el ' + humanDate(data.startDate) + ' y el ' + humanDate(data.endDate) + '.'
        : '';
      const instruments = data.instruments ? ' Los instrumentos utilizados fueron: ' + sentence(data.instruments) : '';
      writer.paragraph((dates + instruments).trim());
    }

    writer.heading('Procedimiento de levantamiento', 2);
    if (data.liftingProcedure) writer.paragraph(sentence(data.liftingProcedure));

    writer.heading('Procedimiento de análisis e identificación de necesidades', 2);
    if (data.analysisProcedure) writer.paragraph(sentence(data.analysisProcedure));

    writer.heading('Criterios institucionales de identificación y priorización', 2);
    writer.paragraph(window.docformacionDnfMethodology?.detectionCriteria || 'Se reconoce una necesidad de formación cuando la evidencia del diagnóstico demuestra una brecha o requerimiento de fortalecimiento pertinente para el desarrollo académico de una carrera activa.');
    writer.paragraph(window.docformacionDnfMethodology?.priorityCriteria || 'Las necesidades se priorizan institucionalmente como Alta, Media o Baja de acuerdo con su urgencia, pertinencia e incidencia en el desarrollo académico.');

    writer.heading('Validación institucional', 2);
    if (data.validationResponsible || data.validationMechanism) {
      const responsible = data.validationResponsible ? 'La validación estuvo a cargo de ' + sentence(data.validationResponsible) : '';
      const mechanism = data.validationMechanism ? ' El mecanismo aplicado fue: ' + sentence(data.validationMechanism) : '';
      writer.paragraph((responsible + mechanism).trim());
    }
    writer.paragraph('Como control técnico complementario, el proceso verifica la estructura de los registros, la correspondencia con las carreras activas, los campos obligatorios, las duplicidades y los valores de prioridad antes de consolidar la información.');

    writer.heading('Evidencias del diagnóstico', 2);
    if (data.evidenceDescription) writer.paragraph(sentence(data.evidenceDescription));

    const coverage = coverageState(ctx);
    writer.heading('Procesamiento, consolidación y trazabilidad', 2);
    writer.paragraph('Los registros validados se consolidan en una fuente institucional única para el período. Se mantienen las relaciones entre cada necesidad, su posterior planificación y el seguimiento del cumplimiento, sin exigir identificadores manuales al usuario. La cobertura diagnóstica corresponde a ' + (coverage.text || 'No aplica') + ' de las carreras activas.');
  }

  function renderDnf(section, writer, ctx) {
    const calc = metrics(ctx);
    const coverage = coverageState(ctx);
    const needs = ctx?.needs || [];
    const byPriority = calc.byPriority || {};
    const total = needs.length;
    const highPct = pct(byPriority.Alta || 0, total);

    switch (section?.id) {
      case 'DNF-01-introduccion':
        writer.paragraph('La formación y el desarrollo profesional del personal académico constituyen componentes permanentes de la calidad de la educación superior. La Detección de Necesidades de Formación identifica y organiza necesidades verificables por carrera para orientar decisiones institucionales de planificación, priorización y seguimiento.');
        writer.paragraph('Para el período ' + ctx.period.label + ', el proceso consolida la información validada y mantiene la trazabilidad entre el diagnóstico, el Plan de Formación y el Informe de Cumplimiento.');
        writer.metricTable([
          ['Carreras activas del período', String(coverage.active || 0)],
          ['Carreras con necesidades registradas', String(coverage.withNeeds || 0)],
          ['Cobertura de registro por carreras', coverage.text || 'No aplica'],
          ['Necesidades registradas', String(total)]
        ]);
        return true;

      case 'DNF-02-base-legal':
        writer.paragraph('La Detección de Necesidades de Formación se sustenta en la normativa y en los referentes institucionales vinculados con la calidad, el perfeccionamiento académico y la mejora continua.');
        writer.table(['Referencia normativa','Aplicación en la DNF'], legalRows(ctx), [40,60]);
        return true;

      case 'DNF-03-alineacion':
        writer.paragraph('La DNF se integra a la planificación institucional y convierte necesidades verificables en insumos para el Plan de Formación.');
        [
          'PEDI: orienta prioridades de fortalecimiento del talento humano.',
          'POA: traduce las prioridades institucionales en actividades, responsables, metas e indicadores.',
          'Gestión académica: vincula las decisiones de formación con las necesidades de las carreras y la mejora continua.',
          'Aseguramiento de la calidad: requiere evidencia del diagnóstico, la planificación, la ejecución y el seguimiento.'
        ].forEach(writer.bullet);
        return true;

      case 'DNF-04-metodologia':
        renderMethodology(writer, ctx);
        return true;

      case 'DNF-05-caracterizacion':
        writer.metricTable([
          ['Carreras activas del período', String(coverage.active || 0)],
          ['Carreras con necesidades registradas', String(coverage.withNeeds || 0)],
          ['Cobertura de registro por carreras', coverage.text || 'No aplica'],
          ['Necesidades específicas', String(total)],
          ['Prioridad Alta', String(byPriority.Alta || 0)],
          ['Prioridad Media', String(byPriority.Media || 0)],
          ['Prioridad Baja', String(byPriority.Baja || 0)]
        ]);
        writer.barChart('Necesidades por prioridad', PRIORITIES.map(priority => ({ label:priority, value:byPriority[priority] || 0 })));
        writer.table(
          ['Nivel de formación','Carreras','Porcentaje'],
          Object.entries(calc.byProgram || {}).map(([name, count]) => [name, String(count), pctText(pct(count, coverage.active || 0))]),
          [55,20,25]
        );
        return true;

      case 'DNF-06-lineas':
        (ctx.careers || []).forEach(career => {
          const careerRows = needs.filter(row => norm(row.career) === norm(career.name));
          writer.heading(career.name, 2);
          writer.table(
            ['Necesidad específica','Prioridad','Justificación de prioridad'],
            careerRows.map(row => [row.need, row.priority, sentence(row.priorityJustification)]),
            [45,15,40]
          );
        });
        return true;

      case 'DNF-06-generica':
        writer.paragraph('Las líneas de Formación Intelectual Genérica complementan las necesidades específicas por carrera y orientan acciones transversales de desarrollo académico. No sustituyen las necesidades diagnosticadas para cada carrera.');
        (ctx.genericLines || []).forEach(line => writer.bullet(sentence(line)));
        return true;

      case 'DNF-07-cobertura':
        writer.paragraph('La cobertura institucional corresponde al porcentaje de carreras activas que cuentan con al menos una necesidad de formación registrada durante el período. Este indicador no representa el porcentaje de docentes participantes ni de beneficiarios del Plan de Formación.');
        writer.table(
          ['Carrera','Nivel de formación','Necesidades registradas'],
          (ctx.careers || []).map(career => {
            const count = needs.filter(row => norm(row.career) === norm(career.name)).length;
            return [career.name, career.program || 'No registrado', String(count)];
          }),
          [55,30,15]
        );
        writer.metricTable([
          ['Carreras activas del período', String(coverage.active || 0)],
          ['Carreras con necesidades registradas', String(coverage.withNeeds || 0)],
          ['Cobertura de registro por carreras', coverage.text || 'No aplica']
        ]);
        return true;

      case 'DNF-08-resumen':
        writer.paragraph('El diagnóstico del período ' + ctx.period.label + ' registra necesidades en ' + (coverage.withNeeds || 0) + ' de ' + (coverage.active || 0) + ' carreras activas y consolida ' + total + ' necesidades específicas.');
        writer.metricTable([
          ['Cobertura de registro por carreras', coverage.text || 'No aplica'],
          ['Prioridad Alta', String(byPriority.Alta || 0)],
          ['Prioridad Media', String(byPriority.Media || 0)],
          ['Prioridad Baja', String(byPriority.Baja || 0)],
          ['Líneas de Formación Intelectual Genérica', String((ctx.genericLines || []).length)]
        ]);
        writer.bullet('La cobertura institucional alcanza ' + (coverage.text || 'No aplica') + ' de las carreras activas.');
        writer.bullet('Las necesidades de prioridad Alta representan ' + pctText(highPct) + ' del total identificado.');
        writer.bullet('Las necesidades específicas por carrera se complementan con ' + (ctx.genericLines || []).length + ' línea(s) de Formación Intelectual Genérica de carácter transversal.');
        return true;

      case 'DNF-09-conclusiones':
        writer.bullet('La cobertura de registro por carreras alcanza ' + (coverage.text || 'No aplica') + ': ' + (coverage.withNeeds || 0) + ' de ' + (coverage.active || 0) + ' carreras activas cuentan con al menos una necesidad de formación identificada.');
        writer.bullet('Se consolidaron ' + total + ' necesidades específicas; ' + (byPriority.Alta || 0) + ' corresponden a prioridad Alta, ' + (byPriority.Media || 0) + ' a prioridad Media y ' + (byPriority.Baja || 0) + ' a prioridad Baja.');
        writer.bullet('Las necesidades de prioridad Alta concentran ' + pctText(highPct) + ' del diagnóstico y requieren atención preferente en el Plan de Formación.');
        writer.bullet('La Formación Intelectual Genérica complementa el diagnóstico específico por carrera mediante líneas transversales de desarrollo académico.');
        writer.bullet('La trazabilidad institucional permite relacionar cada necesidad con su planificación y posterior seguimiento del cumplimiento.');
        return true;

      case 'DNF-10-recomendaciones':
        [
          'Priorizar en el Plan de Formación las necesidades clasificadas como Alta, considerando su justificación y pertinencia académica.',
          'Definir para cada necesidad la acción de formación correspondiente, el nivel de formación, el programa o título proyectado y los mecanismos de verificación aplicables.',
          'Mantener la relación entre la Detección de Necesidades, el Plan de Formación y el Informe de Cumplimiento durante todo el período.',
          'Conservar las evidencias que sustentan el levantamiento, el análisis y la validación institucional de las necesidades.',
          'Utilizar los resultados del Informe de Cumplimiento como retroalimentación para el siguiente ciclo de Detección de Necesidades de Formación.'
        ].forEach(writer.bullet);
        return true;

      case 'DNF-11-bibliografia':
        bibliographyRows(ctx).forEach(writer.bullet);
        return true;

      case 'DNF-12-anexos':
        writer.heading('Matriz consolidada de necesidades de formación', 2);
        writer.table(
          ['Carrera','Necesidad','Prioridad','Justificación de prioridad'],
          needs.map(row => [row.career, row.need, row.priority, sentence(row.priorityJustification)]),
          [24,36,12,28]
        );
        writer.note('La matriz consolidada constituye el anexo de trazabilidad del diagnóstico. Las líneas de Formación Intelectual Genérica se presentan en su sección específica para evitar duplicidad de contenido.');
        return true;

      default:
        return false;
    }
  }

  const previousRenderers = window.docformacionSectionRenderers;
  if (previousRenderers?.render) {
    window.docformacionSectionRenderers = Object.freeze({
      ...previousRenderers,
      __dnfFinalQuality:true,
      render(type, section, writer, ctx) {
        if (type === 'dnf' && renderDnf(section, writer, ctx)) return;
        return previousRenderers.render(type, section, writer, ctx);
      }
    });
  }

  const previousValidation = window.docformacionValidation;
  if (previousValidation?.documentReadiness) {
    window.docformacionValidation = Object.freeze({
      ...previousValidation,
      documentReadiness(type, ctxArg) {
        const ctx = ctxArg || window.docformacionDocumentContext?.build?.();
        const result = previousValidation.documentReadiness(type, ctx);
        if (type !== 'dnf') return result;
        const quality = preflight(type, ctx);
        return {
          ...result,
          ready:result.ready === true && quality.ready,
          missing:[...new Set([...(result.missing || []), ...quality.missing])],
          finalQuality:quality
        };
      },
      finalQualityPreflight:preflight
    });
  }

  window.docformacionFinalQuality = Object.freeze({
    preflight,
    legalRows,
    bibliographyRows,
    renderDnf,
    formationOnly
  });
})();
