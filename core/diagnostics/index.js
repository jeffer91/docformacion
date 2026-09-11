(() => {
  'use strict';

  const clean = value => String(value ?? '').trim();

  function periodLabel() {
    const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const fmt = value => {
      const match = clean(value).match(/^(\d{4})-(\d{2})/);
      if (!match) return clean(value) || 'Sin definir';
      return (months[Number(match[2]) - 1] || match[2]) + ' ' + match[1];
    };
    const start = fmt(state?.period?.start);
    const end = fmt(state?.period?.end);
    return start + ' - ' + end;
  }

  function statusFor(type) {
    try {
      if (typeof documentStatus === 'function') return documentStatus(type);
    } catch (_error) {}
    return { ready:false, issues:[{kind:'system', text:'No fue posible calcular el estado del documento.'}], warnings:[] };
  }

  function sourceLabel(value, fallback) {
    return clean(value) || fallback;
  }

  function origins() {
    const dnf = state?.dnfTemplateFlow || {};
    const workflow = state?.workflowV3 || {};
    return [
      { label:'Carreras', value:sourceLabel(dnf.careersFileName || dnf.careerFileName, 'Modelo interno del período') },
      { label:'Detección de Necesidades', value:sourceLabel(dnf.dnfFileName || dnf.fileName, 'Modelo interno del período') },
      { label:'Plan de Formación', value:sourceLabel(workflow.planFileName, 'Modelo interno del período') },
      { label:'Informe de Cumplimiento', value:sourceLabel(workflow.reportFileName, 'Modelo interno del período') },
      { label:'Firebase', value:state?.integrations?.firebase?.lastReadAt ? 'Última lectura: ' + state.integrations.firebase.lastReadAt : 'Sin lectura registrada' }
    ];
  }

  function sectionState(type) {
    const manifest = window.DOCFORMACION_MANIFEST?.documents?.[type];
    const status = statusFor(type);
    return (manifest?.sections || []).map(section => ({
      ...section,
      status: status.ready ? 'ready' : 'dependent',
      note: status.ready ? 'Datos mínimos del documento completos' : 'Depende de pendientes del documento'
    }));
  }

  function collect() {
    const dnf = statusFor('dnf');
    const plan = statusFor('plan');
    const informe = statusFor('informe');
    const activePeriod = !!clean(state?.period?.start) && !!clean(state?.period?.end);

    return {
      period: {
        active: activePeriod,
        id: window.docformacionModel?.periodId || '',
        label: periodLabel()
      },
      data: {
        careers: (state?.careers || []).length,
        teachers: (state?.teachers || []).length,
        coordinations: (state?.coordinations || []).length,
        needs: (state?.coordinations || []).reduce((sum, c) => sum + (Array.isArray(c.needItems) ? c.needItems.filter(item => clean(item?.text)).length : 0), 0)
      },
      documents: {
        dnf: { ...dnf, sections:sectionState('dnf') },
        plan: { ...plan, sections:sectionState('plan') },
        informe: { ...informe, sections:sectionState('informe') }
      },
      origins: origins(),
      build: window.DOCFORMACION_BUILD || 'local'
    };
  }

  window.docformacionDiagnostics = Object.freeze({ collect });
})();
