(() => {
  'use strict';

  const clean = value => String(value ?? '').trim();

  function pct(part, total) {
    const denominator = Number(total || 0);
    return denominator ? (Number(part || 0) * 100) / denominator : 0;
  }

  function pctText(value) {
    return Number(value || 0).toLocaleString('es-EC', { maximumFractionDigits: 1 }) + '%';
  }

  function counts(rows, getter) {
    const out = {};
    (rows || []).forEach(row => {
      const label = clean(getter(row)) || 'Sin información';
      out[label] = (out[label] || 0) + 1;
    });
    return out;
  }

  function sum(rows, getter) {
    return (rows || []).reduce((total, row) => total + Number(getter(row) || 0), 0);
  }

  function average(rows, getter) {
    const list = rows || [];
    return list.length ? sum(list, getter) / list.length : 0;
  }

  window.docformacionBaseCalculations = Object.freeze({
    clean,
    pct,
    pctText,
    counts,
    sum,
    average
  });
})();
