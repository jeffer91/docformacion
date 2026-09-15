(() => {
  'use strict';

  const clean = value => String(value ?? '').trim();

  // Refuerzo final del flujo DNF: después de confirmar una importación válida,
  // persiste las justificaciones, guarda el estado y vuelve a renderizar.
  // Esto evita que la tarjeta quede visualmente en "Pendiente" aunque el Excel
  // ya haya sido aplicado correctamente.
  const previousConfirmExcelAnalysis = confirmExcelAnalysis;
  confirmExcelAnalysis = async function confirmExcelAnalysisDnfRefresh() {
    const pending = typeof pendingExcelImport !== 'undefined' ? pendingExcelImport : null;
    const scope = pending?.scope || window.__DOCFORMACION_TEMPLATE_IMPORT_SCOPE || '';
    const rows = Array.isArray(pending?.analysis?.safeSheets?.NECESIDADES)
      ? pending.analysis.safeSheets.NECESIDADES.map(row => ({ ...row }))
      : Array.isArray(pending?.sheets?.NECESIDADES)
        ? pending.sheets.NECESIDADES.map(row => ({ ...row }))
        : null;

    const result = await previousConfirmExcelAnalysis();
    if (scope !== 'dnf' || !rows?.length) return result;

    // La reconstrucción de needItems ocurre durante applyExcel. Persistimos una
    // segunda vez sobre el estado definitivo para garantizar correspondencia 1:1.
    window.docformacionDnfPriorityState?.persistJustifications?.(rows);

    const priority = window.docformacionValidation?.priorityJustificationState?.();
    const allComplete = !!priority?.ready && Number(priority.complete || 0) === Number(priority.total || 0);

    if (allComplete) {
      // El flujo base ya registra dnfImported. Solo reforzamos el guardado del
      // estado definitivo después de añadir las justificaciones.
      if (typeof save === 'function') await save();
      if (typeof render === 'function') render();
      toast('DNF aplicada correctamente · ' + priority.complete + '/' + priority.total + ' necesidades completas');
    } else {
      if (typeof save === 'function') await save();
      if (typeof render === 'function') render();
      toast('DNF aplicada, pero faltan ' + Number(priority?.incomplete || 0) + ' justificación(es) por validar');
    }
    return result;
  };
})();
