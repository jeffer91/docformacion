(() => {
  'use strict';

  const clean = value => String(value ?? '').trim();

  function asStatus(type, ctx) {
    const result = window.docformacionValidation?.documentReadiness?.(type, ctx)
      || { ready:false, missing:['Validación no disponible'] };
    return {
      ready: !!result.ready,
      issues: (result.missing || []).map(text => ({ kind:'canonical-validation', text })),
      warnings: [],
      missing: result.missing || []
    };
  }

  function sectionState(type, ctx) {
    const manifest = window.DOCFORMACION_MANIFEST?.documents?.[type];
    return (manifest?.sections || []).map(section => {
      const readiness = window.docformacionValidation?.sectionReadiness?.(type, section, ctx)
        || { ready:false, missing:['validación no disponible'] };
      return {
        ...section,
        status: readiness.ready ? 'ready' : 'draft',
        note: readiness.ready ? 'Datos requeridos disponibles' : 'Pendiente: ' + readiness.missing.join(', '),
        missing: readiness.missing
      };
    });
  }

  function origins(ctx) {
    return [
      { label:'Carreras', value:ctx.origins.careers },
      { label:'Detección de Necesidades', value:ctx.origins.needs },
      { label:'Plan de Formación', value:ctx.origins.plan },
      { label:'Informe de Cumplimiento', value:ctx.origins.report },
      { label:'Base legal', value:ctx.origins.legal },
      { label:'Bibliografía', value:ctx.origins.bibliography },
      { label:'Firebase', value:state?.integrations?.firebase?.lastReadAt ? 'Última lectura: ' + state.integrations.firebase.lastReadAt : 'Sin lectura registrada' }
    ];
  }

  function collect() {
    const context = window.docformacionDocumentContext?.build?.();
    if (!context) return null;
    const activeRecord = window.docformacionPeriods?.activeRecord?.() || null;
    const dnf = asStatus('dnf', context);
    const plan = asStatus('plan', context);
    const informe = asStatus('informe', context);

    return {
      period: {
        active: !!context.period.active,
        id: context.period.id,
        label: context.period.label,
        status: clean(activeRecord?.status || context.period.status || 'Activo'),
        lockedVersions: activeRecord?.lockedVersions || null
      },
      data: {
        careers: context.allCareers.length,
        activeCareers: context.careers.length,
        teachers: context.teachers.length,
        coordinations: context.coordinations.length,
        needs: context.needs.length,
        plan: context.plan.length,
        report: context.report.length
      },
      documents: {
        dnf: { ...dnf, sections:sectionState('dnf', context) },
        plan: { ...plan, sections:sectionState('plan', context) },
        informe: { ...informe, sections:sectionState('informe', context) }
      },
      origins: origins(context),
      sectionPreview: {
        enabled: !!window.docformacionSectionPdf,
        mode: 'PDF individual + vista previa por sección'
      },
      pdfCore: {
        enabled: !!window.docformacionPdfCore,
        fullDocument: !!window.docformacionDocumentPdf,
        sectionRenderer: !!window.docformacionSectionRenderers
      },
      versions: {
        build: window.DOCFORMACION_BUILD || 'local',
        manifest: window.DOCFORMACION_MANIFEST?.version || 'sin-versión'
      }
    };
  }

  window.docformacionDiagnostics = Object.freeze({ collect });
})();
