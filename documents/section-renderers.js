(() => {
  'use strict';

  const PRIORITIES = ['Alta','Media','Baja'];
  const FOLLOW_STATUSES = ['No iniciado','En proceso','Finalizado','No ejecutado'];
  const clean = value => String(value ?? '').trim();
  const key = value => clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ');

  function base() {
    if (!window.docformacionBaseCalculations) throw new Error('No se cargó la capa base de cálculos.');
    return window.docformacionBaseCalculations;
  }

  function calculations() {
    if (!window.docformacionDocumentCalculations) throw new Error('No se cargaron los cálculos documentales.');
    return window.docformacionDocumentCalculations;
  }

  function renderDnf(section, w, ctx) {
    const calc = base();
    const metrics = calculations().dnf(ctx);
    const rows = ctx.needs;
    const active = ctx.careers;
    const byPriority = metrics.byPriority;
    const byCareer = metrics.byCareer;
    const byProgram = metrics.byProgram;

    switch (section.id) {
      case 'DNF-01-introduccion':
        w.paragraph('La formación y el desarrollo profesional del personal académico constituyen componentes permanentes de la calidad de la educación superior. La Detección de Necesidades de Formación organiza evidencia por carrera para orientar decisiones de planificación, priorización y seguimiento.');
        w.paragraph('Para el período ' + ctx.period.label + ', la aplicación mantiene una fuente única de datos y conserva la trazabilidad de cada necesidad mediante un código DNF que posteriormente se reutiliza en el Plan de Formación y en el Informe de Cumplimiento.');
        w.metricTable([
          ['Carreras activas', String(active.length)],
          ['Necesidades registradas', String(rows.length)],
          ['Cobertura diagnóstica', calc.pctText(metrics.coverage)]
        ]);
        return;
      case 'DNF-02-base-legal':
        w.paragraph('La DNF se sustenta en disposiciones nacionales, referentes de aseguramiento de la calidad e instrumentos institucionales vinculados con el perfeccionamiento académico y la mejora continua.');
        w.table(['Referencia','Aplicación al proceso'], ctx.legal, [40,60]);
        return;
      case 'DNF-03-alineacion':
        w.paragraph('La DNF se integra a la planificación institucional y convierte necesidades verificables en insumos para el Plan de Formación Docente.');
        [
          'PEDI: orienta prioridades de fortalecimiento del talento humano.',
          'POA: transforma prioridades en actividades, responsables, metas e indicadores.',
          'Gestión académica: vincula la formación con necesidades de las carreras y mejora continua.',
          'Aseguramiento de la calidad: exige evidencia de diagnóstico, planificación, ejecución y seguimiento.'
        ].forEach(w.bullet);
        return;
      case 'DNF-04-metodologia':
        w.paragraph('El diagnóstico adopta un enfoque institucional, descriptivo y de priorización. La unidad de análisis es cada necesidad concreta de formación asociada a una carrera activa.');
        w.heading('Cobertura y fuentes', 2);
        w.paragraph('Se consideran ' + active.length + ' carrera(s) activa(s). Se registraron necesidades en ' + metrics.diagnosed + ' carrera(s), equivalente a ' + calc.pctText(metrics.coverage) + ' de cobertura. La información variable se obtiene de las plantillas institucionales y se valida antes de incorporarse al documento.');
        [
          'Carrera y nivel de formación.',
          'Necesidad concreta de formación.',
          'Prioridad institucional: Alta, Media o Baja.',
          'Código DNF persistente para trazabilidad.'
        ].forEach(w.bullet);
        return;
      case 'DNF-05-caracterizacion':
        w.metricTable([
          ['Carreras activas', String(active.length)],
          ['Carreras diagnosticadas', String(metrics.diagnosed)],
          ['Cobertura diagnóstica', calc.pctText(metrics.coverage)],
          ['Necesidades específicas', String(rows.length)],
          ['Prioridad Alta', String(byPriority.Alta || 0)],
          ['Prioridad Media', String(byPriority.Media || 0)],
          ['Prioridad Baja', String(byPriority.Baja || 0)]
        ]);
        w.barChart('Necesidades por prioridad', PRIORITIES.map(priority => ({ label: priority, value: byPriority[priority] || 0 })));
        w.table(
          ['Nivel de formación','Carreras','Porcentaje'],
          Object.entries(byProgram).map(([name, count]) => [name, String(count), calc.pctText(calc.pct(count, active.length))]),
          [55,20,25]
        );
        return;
      case 'DNF-06-lineas':
        active.forEach(career => {
          const careerRows = rows.filter(row => key(row.career) === key(career.name));
          w.heading(career.name, 2);
          w.table(['Código','Necesidad específica','Prioridad'], careerRows.map(row => [row.code, row.need, row.priority]), [18,64,18]);
        });
        w.heading('Formación Intelectual Genérica', 2);
        ctx.genericLines.forEach(w.bullet);
        return;
      case 'DNF-07-cobertura':
        w.paragraph('La cobertura institucional considera las carreras activas del período y verifica que el diagnóstico incluya necesidades para cada una de ellas.');
        w.table(
          ['Carrera','Nivel de formación','Necesidades'],
          active.map(career => [career.name, career.program || '—', String(byCareer[career.name] || 0)]),
          [55,30,15]
        );
        w.metricTable([
          ['Carreras activas', String(active.length)],
          ['Carreras diagnosticadas', String(metrics.diagnosed)],
          ['Cobertura', calc.pctText(metrics.coverage)]
        ]);
        return;
      case 'DNF-08-resumen':
        w.paragraph('El diagnóstico del período ' + ctx.period.label + ' cubre ' + metrics.diagnosed + ' de ' + active.length + ' carreras activas y consolida ' + rows.length + ' necesidades específicas.');
        w.metricTable([
          ['Cobertura diagnóstica', calc.pctText(metrics.coverage)],
          ['Prioridad Alta', String(byPriority.Alta || 0)],
          ['Prioridad Media', String(byPriority.Media || 0)],
          ['Prioridad Baja', String(byPriority.Baja || 0)],
          ['Líneas genéricas', String(ctx.genericLines.length)]
        ]);
        w.paragraph('La prioridad y la trazabilidad mediante CODIGO_DNF permiten trasladar cada necesidad al Plan de Formación sin duplicar información.');
        return;
      case 'DNF-09-conclusiones':
        w.bullet('La cobertura diagnóstica alcanza ' + calc.pctText(metrics.coverage) + ' del catálogo activo del período.');
        w.bullet('Se identificaron ' + rows.length + ' necesidades específicas, de las cuales ' + (byPriority.Alta || 0) + ' son de prioridad Alta.');
        w.bullet('La trazabilidad mediante CODIGO_DNF mantiene la relación entre diagnóstico, planificación y seguimiento.');
        w.bullet('Las líneas genéricas complementan las necesidades específicas sin sustituirlas.');
        return;
      case 'DNF-10-recomendaciones':
        [
          'Priorizar en el Plan de Formación las necesidades clasificadas como Alta.',
          'Mantener visible el CODIGO_DNF durante planificación, ejecución y seguimiento.',
          'Definir para cada acción modalidad, cronograma, indicador, meta, responsable, medio de verificación y recursos.',
          'Utilizar los resultados del Informe de Cumplimiento como retroalimentación para el siguiente período.'
        ].forEach(w.bullet);
        return;
      case 'DNF-11-bibliografia':
        ctx.bibliography.forEach(w.bullet);
        return;
      case 'DNF-12-anexos':
        w.heading('Matriz de trazabilidad DNF', 2);
        w.table(['Código','Carrera','Necesidad','Prioridad'], rows.map(row => [row.code,row.career,row.need,row.priority]), [16,25,44,15]);
        w.heading('Matriz de Formación Intelectual Genérica', 2);
        w.table(['Línea genérica'], ctx.genericLines.map(line => [line]), [100]);
        w.barChart('Distribución de necesidades por prioridad', PRIORITIES.map(priority => ({ label:priority, value:byPriority[priority] || 0 })));
        return;
      default:
        throw new Error('No existe renderizador DNF para ' + section.id + '.');
    }
  }

  function renderPlan(section, w, ctx) {
    const metrics = calculations().plan(ctx);
    const rows = ctx.plan;
    switch (section.id) {
      case 'PLAN-01-introduccion':
        w.paragraph('El Plan de Formación Docente del período ' + ctx.period.label + ' transforma las necesidades validadas en la DNF en acciones institucionales planificadas, manteniendo como unidad de trazabilidad el CODIGO_DNF.');
        return;
      case 'PLAN-02-objetivo':
        w.paragraph('Planificar acciones de formación pertinentes y verificables para atender las necesidades priorizadas, definiendo modalidad, cronograma, indicadores, metas, responsables, medios de verificación y recursos.');
        return;
      case 'PLAN-03-diagnostico':
        w.metricTable([
          ['Necesidades incorporadas', String(rows.length)],
          ['Carreras con acciones', String(metrics.careers)],
          ['Prioridad Alta', String(metrics.byPriority.Alta || 0)],
          ['Prioridad Media', String(metrics.byPriority.Media || 0)],
          ['Prioridad Baja', String(metrics.byPriority.Baja || 0)],
          ['Apoyo económico previsto', metrics.economicSupport ? 'USD ' + metrics.economicSupport.toLocaleString('es-EC', { minimumFractionDigits:2 }) : 'No registrado']
        ]);
        w.barChart('Acciones por modalidad', Object.entries(metrics.byModality).map(([label,value]) => ({ label,value })));
        return;
      case 'PLAN-04-matriz':
        w.table(
          ['Código','Carrera','Necesidad','Prioridad','Acción','Modalidad','Inicio - Fin','Meta'],
          rows.map(row => [row.dnfCode,row.career,row.needText,row.priority,row.action,row.modality,(row.plannedStart || '—') + ' - ' + (row.plannedEnd || '—'),row.targetPercent ? row.targetPercent + '%' : '—']),
          [12,17,22,10,19,10,14,8]
        );
        return;
      case 'PLAN-05-indicadores':
        w.table(['Código','Indicador','Medio de verificación','Responsable'], rows.map(row => [row.dnfCode,row.indicator || '—',row.evidence || '—',row.responsibleRole || '—']), [17,28,30,25]);
        return;
      case 'PLAN-06-recursos':
        w.table(
          ['Código','Tipo de apoyo','Monto','Observaciones'],
          rows.map(row => [row.dnfCode,row.supportType || '—',row.supportType === 'Económico' ? 'USD ' + Number(row.supportAmount || 0).toLocaleString('es-EC',{minimumFractionDigits:2}) : '—',row.observations || '—']),
          [18,25,17,40]
        );
        return;
      case 'PLAN-07-seguimiento':
        w.paragraph('El seguimiento se realizará por CODIGO_DNF y acción planificada. El Informe de Cumplimiento registrará para cada acción su estado, fecha de inicio real cuando corresponda, porcentaje de avance, evidencia y resultado u observación.');
        return;
      case 'PLAN-08-conclusiones':
        w.bullet('El Plan incorpora ' + rows.length + ' acción(es) vinculadas directamente con necesidades validadas de ' + metrics.careers + ' carrera(s).');
        w.bullet('La trazabilidad se mantiene desde la DNF mediante un código único y persistente.');
        w.bullet('Las acciones cuentan con criterios mínimos de ejecución y verificación.');
        return;
      default:
        throw new Error('No existe renderizador del Plan para ' + section.id + '.');
    }
  }

  function renderReport(section, w, ctx) {
    const calc = base();
    const metrics = calculations().report(ctx);
    const rows = ctx.report;
    switch (section.id) {
      case 'INF-01-objeto':
        w.paragraph('Presentar el nivel de cumplimiento del Plan de Formación Docente correspondiente al período ' + ctx.period.label + ', manteniendo la trazabilidad con la DNF mediante el CODIGO_DNF.');
        return;
      case 'INF-02-alcance':
        w.paragraph('El informe consolida resultados por necesidad y acción institucional. El seguimiento conserva la relación DNF → Plan → Informe y evita duplicar identificadores.');
        return;
      case 'INF-03-resumen':
        w.metricTable([
          ['Acciones planificadas', String(rows.length)],
          ['Iniciadas o finalizadas', String(metrics.started)],
          ['Finalizadas', String(metrics.finished)],
          ['No ejecutadas', String(metrics.notExecuted)],
          ['Avance promedio', calc.pctText(metrics.averageProgress)],
          ['Cumplimiento final', calc.pctText(metrics.completion)]
        ]);
        w.barChart('Acciones por estado', FOLLOW_STATUSES.map(status => ({ label:status, value:metrics.byStatus[status] || 0 })));
        return;
      case 'INF-04-seguimiento':
        w.table(
          ['Código','Carrera','Acción','Estado','Inicio real','Avance','Evidencia'],
          rows.map(row => [row.dnfCode,row.career || '—',row.action || '—',row.status || '—',row.realStart || '—',row.progress + '%',row.evidenceTitle || '—']),
          [13,18,27,13,12,8,19]
        );
        return;
      case 'INF-05-evidencias':
        w.table(['Código','Archivo / referencia','Resultado u observación'], rows.map(row => [row.dnfCode,row.evidencePath || row.evidenceTitle || '—',row.observation || '—']), [18,32,50]);
        return;
      case 'INF-06-analisis':
        w.paragraph('De ' + rows.length + ' acciones planificadas, ' + metrics.started + ' registran inicio o finalización y ' + metrics.finished + ' se encuentran finalizadas. El avance promedio institucional es ' + calc.pctText(metrics.averageProgress) + ' y el cumplimiento final por acciones finalizadas es ' + calc.pctText(metrics.completion) + '.');
        return;
      case 'INF-07-conclusiones':
        w.bullet('La trazabilidad DNF → Plan → Informe se mantiene mediante CODIGO_DNF.');
        w.bullet('Se finalizaron ' + metrics.finished + ' de ' + rows.length + ' acciones planificadas para el período.');
        w.bullet('El avance promedio registrado es ' + calc.pctText(metrics.averageProgress) + '.');
        return;
      case 'INF-08-recomendaciones':
        w.bullet('Priorizar el cierre y la evidencia de las acciones que permanezcan En proceso o No iniciadas.');
        w.bullet('Documentar el motivo de las acciones No ejecutadas y utilizarlo como insumo para el siguiente ciclo de DNF.');
        w.bullet('Retroalimentar el siguiente período con los resultados consolidados.');
        return;
      default:
        throw new Error('No existe renderizador del Informe para ' + section.id + '.');
    }
  }

  function render(type, section, writer, context) {
    if (type === 'dnf') return renderDnf(section, writer, context);
    if (type === 'plan') return renderPlan(section, writer, context);
    if (type === 'informe') return renderReport(section, writer, context);
    throw new Error('Tipo de documento no soportado: ' + type + '.');
  }

  window.docformacionSectionRenderers = Object.freeze({ render });
})();
