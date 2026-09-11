(() => {
  'use strict';

  const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const SOURCE_CATALOG = Object.freeze({
    legal: Object.freeze({ version:'legal-ec-2026-09', label:'Base legal institucional' }),
    bibliography: Object.freeze({ version:'bibliografia-formacion-2026-09', label:'Bibliografía institucional de Formación' })
  });
  const DEFAULT_LEGAL = [
    ['Constitución de la República del Ecuador','Marco constitucional de la educación superior y de la mejora continua institucional.'],
    ['Ley Orgánica de Educación Superior (LOES)','Calidad, aseguramiento de la calidad y perfeccionamiento del personal académico.'],
    ['Reglamento de Carrera y Escalafón del Personal Académico','Perfeccionamiento y desarrollo profesional del personal académico.'],
    ['Modelo de Evaluación Externa 2024 para Institutos Superiores Técnicos y Tecnológicos','Planificación sustentada en necesidades institucionales y evidencias de seguimiento.']
  ];
  const DEFAULT_BIBLIOGRAPHY = [
    'Asamblea Nacional del Ecuador. Constitución de la República del Ecuador.',
    'Asamblea Nacional del Ecuador. Ley Orgánica de Educación Superior (LOES).',
    'Consejo de Educación Superior. Reglamento de Carrera y Escalafón del Personal Académico del Sistema de Educación Superior.',
    'Consejo de Aseguramiento de la Calidad de la Educación Superior. (2024). Modelo de evaluación externa para institutos superiores técnicos y tecnológicos.',
    'UNESCO. (2019). Marco de competencias de los docentes en materia de TIC.',
    'Vaillant, D., & Marcelo, C. (2015). Desarrollo profesional docente: ¿cómo se aprende a enseñar?',
    'Zabalza, M. A. (2007). Competencias docentes del profesorado universitario.'
  ];

  const clean = value => String(value ?? '').trim();

  function periodLabel() {
    const fmt = value => {
      const match = clean(value).match(/^(\d{4})-(\d{2})/);
      if (!match) return clean(value);
      return (MONTHS[Number(match[2]) - 1] || match[2]) + ' ' + match[1];
    };
    const start = fmt(state?.period?.start);
    const end = fmt(state?.period?.end);
    return start && end ? start + ' - ' + end : (start || end || 'Período sin definir');
  }

  function documentTitle(type) {
    return clean(window.DOCFORMACION_MANIFEST?.documents?.[type]?.title)
      || (type === 'dnf'
        ? 'Detección de Necesidades de Formación'
        : type === 'plan'
          ? 'Plan de Formación Docente'
          : 'Informe de Cumplimiento del Plan de Formación Docente');
  }

  function documentCode(type) {
    if (typeof syncPeriodCodes === 'function') syncPeriodCodes(state.period);
    if (type === 'dnf') return clean(state?.period?.dnfCode) || 'UGPA-RGI1-01-PRO-31';
    if (type === 'plan') return clean(state?.period?.planCode) || 'UGPA-RGI2-01-PRO-31';
    return clean(state?.period?.reportCode) || 'UGPA-RGI3-01-PRO-31';
  }

  function hasExplicitLegal() {
    return Array.isArray(state?.baseLegal) && state.baseLegal.some(item => clean(item?.name || item?.title));
  }

  function explicitBibliographyRows() {
    const rows = Array.isArray(state?.bibliography) ? state.bibliography : [];
    return rows
      .map(item => clean(typeof item === 'string' ? item : item?.text || item?.reference))
      .filter(Boolean);
  }

  function sourceConfirmations() {
    const stored = state?.period?.sourceConfirmations || {};
    const explicitLegal = hasExplicitLegal();
    const explicitBibliography = explicitBibliographyRows().length > 0;
    return {
      legal: {
        confirmed: explicitLegal || clean(stored.legalVersion) === SOURCE_CATALOG.legal.version,
        version: explicitLegal ? 'datos-del-periodo' : SOURCE_CATALOG.legal.version,
        mode: explicitLegal ? 'period-data' : 'institutional-template'
      },
      bibliography: {
        confirmed: explicitBibliography || clean(stored.bibliographyVersion) === SOURCE_CATALOG.bibliography.version,
        version: explicitBibliography ? 'datos-del-periodo' : SOURCE_CATALOG.bibliography.version,
        mode: explicitBibliography ? 'period-data' : 'institutional-template'
      }
    };
  }

  function legalRows() {
    if (hasExplicitLegal()) {
      return state.baseLegal
        .map(item => [clean(item?.name || item?.title), clean(item?.application || item?.content || item?.provision)])
        .filter(row => row[0]);
    }
    return DEFAULT_LEGAL.map(row => [...row]);
  }

  function bibliographyRows() {
    const cleanRows = explicitBibliographyRows();
    return cleanRows.length ? cleanRows : [...DEFAULT_BIBLIOGRAPHY];
  }

  function genericLines() {
    const section = Array.isArray(state?.section6?.genericLines) ? state.section6.genericLines : [];
    const sectionRows = section
      .map(value => typeof value === 'string' ? clean(value) : clean(value?.name))
      .filter(Boolean);
    if (sectionRows.length) return sectionRows;
    return (Array.isArray(state?.settings?.genericLines) ? state.settings.genericLines : [])
      .map(clean)
      .filter(Boolean);
  }

  function build() {
    const model = window.docformacionModel;
    if (!model) throw new Error('El modelo de datos del período no está disponible.');
    const snapshot = model.snapshot();
    const confirmations = sourceConfirmations();
    return {
      period: {
        ...snapshot.period,
        active: !!snapshot.periodId,
        id: snapshot.periodId,
        label: periodLabel()
      },
      careers: model.activeCareers(),
      allCareers: model.careers(),
      teachers: snapshot.shared.teachers,
      coordinations: snapshot.shared.coordinations,
      authorities: snapshot.shared.authorities,
      needs: model.needs(),
      plan: model.planRows(),
      report: model.reportRows(),
      genericLines: genericLines(),
      legal: legalRows(),
      bibliography: bibliographyRows(),
      sourceConfirmations: confirmations,
      documentTitle,
      documentCode,
      origins: {
        careers: clean(state?.dnfTemplateFlow?.careersFileName) || 'Modelo interno del período',
        needs: clean(state?.dnfTemplateFlow?.dnfFileName) || 'Modelo interno del período',
        plan: clean(state?.workflowV3?.planFileName) || 'Modelo interno del período',
        report: clean(state?.workflowV3?.reportFileName) || 'Modelo interno del período',
        legal: hasExplicitLegal()
          ? 'Datos del período'
          : SOURCE_CATALOG.legal.label + ' · ' + SOURCE_CATALOG.legal.version + (confirmations.legal.confirmed ? ' · confirmada' : ' · pendiente de confirmación'),
        bibliography: explicitBibliographyRows().length
          ? 'Datos del período'
          : SOURCE_CATALOG.bibliography.label + ' · ' + SOURCE_CATALOG.bibliography.version + (confirmations.bibliography.confirmed ? ' · confirmada' : ' · pendiente de confirmación')
      }
    };
  }

  window.docformacionDocumentContext = Object.freeze({
    build,
    periodLabel,
    documentTitle,
    documentCode,
    sourceCatalog: SOURCE_CATALOG,
    sourceConfirmations
  });
})();
