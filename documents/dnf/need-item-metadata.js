(() => {
  'use strict';

  const clean = value => String(value ?? '').trim();

  // app.js normalizaba needItems reconstruyendo cada objeto solo con id, text y
  // priorityOverride. Eso eliminaba priorityJustification y dnfCode después de una
  // importación válida. Sustituimos esa normalización por una que conserva todos los
  // metadatos del registro y canoniza únicamente los campos conocidos.
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

  window.docformacionDnfNeedItemMetadata = Object.freeze({
    version: 1,
    normalize(career) {
      return ensureNeedItems(career);
    }
  });
})();
