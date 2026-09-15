(() => {
  'use strict';

  const clean = value => String(value ?? '').trim();
  const key = value => clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ');
  const needKey = (career, need) => key(career) + '|' + key(need);

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

  function savedMetadataMap(loaded) {
    const map = new Map();
    candidateStates(loaded).forEach(candidate => {
      (candidate?.coordinations || []).forEach(coord => {
        (coord?.needItems || []).forEach(item => {
          if (!clean(item?.text)) return;
          const lookup = needKey(coord?.carrera, item?.text);
          const current = map.get(lookup) || {};
          map.set(lookup, { ...current, ...(item || {}) });
        });
      });
    });
    return map;
  }

  function mergeSavedMetadata(loaded) {
    if (typeof state === 'undefined' || !state) return 0;
    const map = savedMetadataMap(loaded);
    let restored = 0;

    (state.coordinations || []).forEach(coord => {
      (coord?.needItems || []).forEach(item => {
        const saved = map.get(needKey(coord?.carrera, item?.text));
        if (!saved) return;

        Object.entries(saved).forEach(([field, value]) => {
          if (['id', 'text', 'priorityOverride'].includes(field)) return;
          const current = item[field];
          const currentEmpty = current === undefined || current === null || clean(current) === '';
          const savedUseful = value !== undefined && value !== null && clean(value) !== '';
          if (currentEmpty && savedUseful) {
            item[field] = value;
            restored++;
          }
        });

        const canonicalJustification = clean(
          item.priorityJustification ?? item.priorityReason ?? item.justification
        );
        if (canonicalJustification && item.priorityJustification !== canonicalJustification) {
          item.priorityJustification = canonicalJustification;
          restored++;
        }
      });
    });
    return restored;
  }

  // app.js normaliza needItems durante el primer render y originalmente reconstruía
  // cada objeto solo con id, text y priorityOverride. Esa reconstrucción eliminaba
  // priorityJustification, dnfCode y cualquier metadato adicional. A partir de aquí
  // la normalización conserva el objeto completo y canoniza solo los campos conocidos.
  ensureNeedItems = function ensureNeedItemsPreservingMetadata(career) {
    const coord = ensureCoordination(career);
    if (!coord) return [];

    if (Array.isArray(coord.needItems) && coord.needItems.length) {
      coord.needItems = coord.needItems
        .map((item, index) => ({
          ...(item || {}),
          id: item?.id || needId(career, index),
          text: clean(item?.text),
          priorityOverride: clean(item?.priorityOverride),
          priorityJustification: clean(
            item?.priorityJustification ?? item?.priorityReason ?? item?.justification
          ),
          dnfCode: clean(item?.dnfCode)
        }))
        .filter(item => item.text);
      return coord.needItems;
    }

    const legacy = clean(coord.needsOverride)
      ? clean(coord.needsOverride).split('|').map(clean).filter(Boolean).slice(0, 3)
      : [];

    coord.needItems = legacy.map((text, index) => ({
      id: needId(career, index),
      text,
      priorityOverride: clean(coord.priorityOverride),
      priorityJustification: '',
      dnfCode: ''
    }));
    return coord.needItems;
  };

  // El init asíncrono de app.js puede alcanzar su primer render antes de que este
  // archivo se cargue. Si ese primer render ya eliminó metadatos en memoria, los
  // recuperamos desde la copia persistida antes de continuar con los módulos DNF.
  const ready = (async () => {
    try {
      const loaded = await window.docformacion?.loadData?.();
      if (!loaded || loaded.__error) return { restored:0, available:false };
      return { restored:mergeSavedMetadata(loaded), available:true };
    } catch (error) {
      console.warn('No se pudo restaurar metadata DNF desde almacenamiento', error);
      return { restored:0, available:false, error:String(error?.message || error) };
    }
  })();

  window.docformacionDnfNeedItemMetadata = Object.freeze({
    version: 2,
    ready,
    restore: mergeSavedMetadata,
    normalize(career) {
      return ensureNeedItems(career);
    }
  });
})();
