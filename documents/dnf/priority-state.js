(() => {
  'use strict';

  const SHEET = 'NECESIDADES';
  const HEADER = 'JUSTIFICACION_PRIORIDAD';
  const clean = value => String(value ?? '').trim();
  const key = value => clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ');

  function needKey(career, need) {
    return key(career) + '|' + key(need);
  }

  function readJustification(row) {
    return clean(row?.[HEADER] ?? row?.JUSTIFICACION ?? row?.justificacion);
  }

  function justificationMapFromState() {
    const map = new Map();
    (state?.coordinations || []).forEach(coord => {
      (coord?.needItems || []).forEach(item => {
        if (!clean(item?.text)) return;
        map.set(needKey(coord.carrera, item.text), clean(item.priorityJustification));
      });
    });
    return map;
  }

  function persistJustifications(rows) {
    const byNeed = new Map();
    (rows || []).forEach(row => {
      const career = clean(row?.CARRERA ?? row?.Carrera ?? row?.carrera);
      const need = clean(row?.NECESIDAD ?? row?.NECESIDAD_DE_FORMACION ?? row?.Necesidad);
      if (!career || !need) return;
      byNeed.set(needKey(career, need), readJustification(row));
    });

    let matched = 0;
    let complete = 0;
    (state?.coordinations || []).forEach(coord => {
      (coord?.needItems || []).forEach(item => {
        const lookup = needKey(coord.carrera, item.text);
        if (!byNeed.has(lookup)) return;
        matched++;
        item.priorityJustification = byNeed.get(lookup);
        if (clean(item.priorityJustification)) complete++;
      });
    });

    window.__DOCFORMACION_DNF_PRIORITY_APPLY_RESULT = {
      expected:byNeed.size,
      matched,
      complete,
      ready:byNeed.size > 0 && matched === byNeed.size && complete === byNeed.size
    };
    return window.__DOCFORMACION_DNF_PRIORITY_APPLY_RESULT;
  }

  // La justificación forma parte del estado canónico de cada necesidad. Se persiste
  // después de reconstruir needItems para que nunca se pierda durante una importación.
  const previousApplyExcel = applyExcel;
  applyExcel = function applyExcelCanonicalPriorityState(sheets) {
    const rows = Array.isArray(sheets?.[SHEET]) ? sheets[SHEET] : null;
    const isDnfPriorityImport = rows && rows.some(row => Object.prototype.hasOwnProperty.call(row || {}, HEADER));
    const result = previousApplyExcel(sheets);
    if (isDnfPriorityImport) persistJustifications(rows);
    return result;
  };

  // El modelo expone la justificación directamente desde el estado persistido. Esto
  // evita que validación, PDF y UI dependan de un parche visual o de la sesión actual.
  const previousModel = window.docformacionModel;
  if (previousModel?.needs) {
    window.docformacionModel = Object.freeze({
      ...previousModel,
      needs() {
        const map = justificationMapFromState();
        return previousModel.needs().map(row => ({
          ...row,
          priorityJustification:map.get(needKey(row.career, row.need)) || ''
        }));
      }
    });
  }

  // Sustituye el mensaje genérico por una comprobación real de la DNF aplicada.
  const previousConfirmExcelAnalysis = confirmExcelAnalysis;
  confirmExcelAnalysis = async function confirmExcelAnalysisCanonicalPriorityState() {
    const importScope = window.__DOCFORMACION_TEMPLATE_IMPORT_SCOPE;
    window.__DOCFORMACION_DNF_PRIORITY_APPLY_RESULT = null;
    const result = await previousConfirmExcelAnalysis();
    if (importScope !== 'dnf') return result;

    const applied = window.__DOCFORMACION_DNF_PRIORITY_APPLY_RESULT;
    const priority = window.docformacionValidation?.priorityJustificationState?.();
    if (applied?.ready && priority?.ready) {
      toast('DNF aplicada correctamente · ' + priority.complete + '/' + priority.total + ' necesidades con justificación');
    } else if (priority) {
      toast('DNF aplicada, pero faltan ' + priority.incomplete + ' justificación(es) por validar');
    }
    return result;
  };

  window.docformacionDnfPriorityState = Object.freeze({
    persistJustifications,
    state:justificationMapFromState
  });
})();
