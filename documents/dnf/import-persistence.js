(() => {
  'use strict';

  const clean = value => String(value ?? '').trim();
  const normKey = value => clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ');

  function needKey(career, need) {
    return normKey(career) + '|' + normKey(need);
  }

  function importedRowsFromPending(pending) {
    const source = pending?.analysis?.safeSheets?.NECESIDADES || pending?.sheets?.NECESIDADES || [];
    return Array.isArray(source) ? source.map(row => ({ ...row })) : [];
  }

  function candidateStates(loaded) {
    const out = [];
    if (loaded && typeof loaded === 'object') out.push(loaded);

    const manager = loaded?.periodManager;
    if (manager && Array.isArray(manager.periods)) {
      const active = manager.periods.find(item => item?.id === manager.activeId);
      if (active?.snapshot && typeof active.snapshot === 'object') out.push(active.snapshot);
    }
    return out;
  }

  function verifyCandidate(candidate, expectedRows) {
    if (!candidate || typeof candidate !== 'object') return { ok:false, matched:0 };

    const map = new Map();
    (candidate.coordinations || []).forEach(coord => {
      (coord?.needItems || []).forEach(item => {
        const need = clean(item?.text);
        if (!need) return;
        map.set(needKey(coord?.carrera, need), item);
      });
    });

    let matched = 0;
    for (const row of expectedRows) {
      const lookup = needKey(row?.CARRERA, row?.NECESIDAD);
      const stored = map.get(lookup);
      if (!stored) continue;

      const expectedPriority = clean(row?.PRIORIDAD_MANUAL);
      const expectedJustification = clean(
        row?.JUSTIFICACION_PRIORIDAD ?? row?.JUSTIFICACION ?? row?.justificacion
      );
      const storedPriority = clean(stored?.priorityOverride);
      const storedJustification = clean(
        stored?.priorityJustification ?? stored?.priorityReason ?? stored?.justification
      );

      if (expectedPriority && storedPriority !== expectedPriority) continue;
      if (expectedJustification && storedJustification !== expectedJustification) continue;
      matched++;
    }

    const flowReady = candidate?.dnfTemplateFlow?.dnfImported === true;
    return {
      ok: expectedRows.length > 0 && matched === expectedRows.length && flowReady,
      matched,
      flowReady
    };
  }

  function verifyPersistedDnf(loaded, expectedRows) {
    let best = { ok:false, matched:0, flowReady:false };
    candidateStates(loaded).forEach(candidate => {
      const result = verifyCandidate(candidate, expectedRows);
      if (result.ok || result.matched > best.matched) best = result;
    });
    return best;
  }

  // El botón debe representar la acción real: no solo aplicar en memoria, sino guardar.
  const previousRefreshExcelAnalysisApplyButton = refreshExcelAnalysisApplyButton;
  refreshExcelAnalysisApplyButton = function refreshExcelAnalysisApplyButtonWithSaveLabel() {
    const result = previousRefreshExcelAnalysisApplyButton();
    const pending = typeof pendingExcelImport !== 'undefined' ? pendingExcelImport : null;
    if (pending?.scope !== 'dnf' || pending?.kind) return result;

    const button = document.getElementById('applyExcelAnalysis');
    if (!button) return result;
    const selectedOptional = typeof selectedOptionalExcelRows === 'function'
      ? selectedOptionalExcelRows().length
      : 0;
    const total = Number(pending?.analysis?.validRows || 0) + selectedOptional;
    button.textContent = total ? 'Guardar ' + total + ' registro(s)' : 'Guardar datos';
    return result;
  };

  // Flujo DNF con confirmación real de persistencia. El diálogo solo se cierra cuando
  // la información puede volver a leerse desde el almacenamiento de la aplicación.
  const previousConfirmExcelAnalysis = confirmExcelAnalysis;
  confirmExcelAnalysis = async function confirmExcelAnalysisWithPersistenceCheck() {
    const pending = typeof pendingExcelImport !== 'undefined' ? pendingExcelImport : null;
    if (!pending || pending.scope !== 'dnf' || pending.kind) {
      return previousConfirmExcelAnalysis();
    }

    const analysis = pending.analysis || {};
    if (Array.isArray(analysis.errors) && analysis.errors.length) {
      toast('Corrige los errores del Excel antes de guardarlo');
      return;
    }

    const finalSheets = {};
    Object.entries(pending.sheets || {}).forEach(([name, rows]) => {
      finalSheets[name] = Array.isArray(rows) ? rows.map(row => ({ ...row })) : [];
    });

    const optionalSelected = typeof selectedOptionalExcelRows === 'function'
      ? selectedOptionalExcelRows()
      : [];
    optionalSelected.forEach(({ sheet, row }) => {
      if (!finalSheets[sheet]) finalSheets[sheet] = [];
      finalSheets[sheet].push({ ...row });
    });

    const expectedRows = Array.isArray(finalSheets.NECESIDADES) && finalSheets.NECESIDADES.length
      ? finalSheets.NECESIDADES.map(row => ({ ...row }))
      : importedRowsFromPending(pending);

    if (!expectedRows.length) {
      toast('No hay registros DNF válidos para guardar');
      return;
    }

    const button = document.getElementById('applyExcelAnalysis');
    if (button) {
      button.disabled = true;
      button.textContent = 'Guardando…';
    }

    try {
      applySpecificExcelImport('', finalSheets);

      // Garantiza que la justificación quede en el estado definitivo después de
      // reconstruir needItems.
      window.docformacionDnfPriorityState?.persistJustifications?.(expectedRows);

      // save() sincroniza también el snapshot del período activo.
      if (typeof save === 'function') await save();

      // Segunda escritura controlada: esta sí devuelve resultado y permite saber si
      // el almacenamiento aceptó realmente el estado.
      const writeResult = await window.docformacion.saveData(state);
      if (!writeResult?.ok) {
        throw new Error(writeResult?.error || 'El almacenamiento rechazó el guardado.');
      }

      const loaded = await window.docformacion.loadData();
      if (!loaded || loaded.__error) {
        throw new Error(loaded?.__error || 'No se pudo volver a leer la información guardada.');
      }

      const verification = verifyPersistedDnf(loaded, expectedRows);
      if (!verification.ok) {
        throw new Error(
          'La verificación encontró ' + verification.matched + ' de ' + expectedRows.length +
          ' necesidades guardadas correctamente.'
        );
      }

      const saveState = document.getElementById('saveState');
      if (saveState) saveState.textContent = 'Guardado';

      closeExcelAnalysisDialog();
      if (typeof render === 'function') render();
      toast('DNF guardada correctamente · ' + expectedRows.length + ' registro(s)');
    } catch (error) {
      console.error('No se pudo persistir la DNF', error);
      const saveState = document.getElementById('saveState');
      if (saveState) saveState.textContent = 'Error al guardar';
      toast('No se pudo guardar la DNF: ' + clean(error?.message || error));

      // Se mantiene abierto el diálogo para que el usuario pueda reintentar sin
      // volver a seleccionar el archivo.
      if (button) {
        button.disabled = false;
        refreshExcelAnalysisApplyButton();
      }
    }
  };

  // app.js enlaza el botón antes de que los módulos DNF sustituyan confirmExcelAnalysis.
  // Reenlazamos con una función delegada para que el clic siempre use la versión más
  // reciente de confirmExcelAnalysis, incluida esta verificación de persistencia.
  const applyButton = document.getElementById('applyExcelAnalysis');
  if (applyButton) {
    applyButton.onclick = () => confirmExcelAnalysis();
  }
})();
