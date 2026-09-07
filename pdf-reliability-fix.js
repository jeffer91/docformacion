(() => {
  const api = window.docformacion;
  if (!api || typeof api.generatePDF !== 'function') return;

  const originalGeneratePDF = api.generatePDF.bind(api);

  function injectCompactCss(html, level = 'compact') {
    if (!html || typeof html !== 'string') return html;

    const compact = level === 'safe';
    const css = compact ? `
      <style id="pdf-reliability-safe">
        .pdf-body{font-size:8.5pt!important;line-height:1.12!important}
        .pdf-body p{font-size:8.5pt!important;line-height:1.12!important;margin:0 0 4pt!important}
        .pdf-body li{font-size:8.5pt!important;line-height:1.12!important;margin-bottom:2.5pt!important}
        .sec-title{font-size:14.5pt!important;margin:12pt 0 6pt!important}
        .sub-title{font-size:10pt!important;margin:8pt 0 4pt!important}
        .mini-title{font-size:9.2pt!important;margin:6pt 0 3pt!important}
        .q-legal-card,.q-career-block,.q-insight,.q-interpret,.q-kpis,.q-mini-kpis{margin-top:5pt!important;margin-bottom:5pt!important;padding-top:5pt!important;padding-bottom:5pt!important}
        table.data th,table.data td,.q-table th,.q-table td{font-size:7.7pt!important;line-height:1.08!important;padding:2.2px 3px!important}
        .apa-table-number,.apa-table-title,.apa-table-note,.apa-table-analysis{font-size:8pt!important;line-height:1.1!important}
        .q-bars,.q-flow{margin-top:4pt!important;margin-bottom:5pt!important}
      </style>`
      : `
      <style id="pdf-reliability-compact">
        .pdf-body{font-size:9.1pt!important;line-height:1.15!important}
        .pdf-body p{font-size:9.1pt!important;line-height:1.15!important;margin:0 0 5pt!important}
        .pdf-body li{font-size:9.1pt!important;line-height:1.15!important;margin-bottom:3pt!important}
        .sec-title{font-size:15.5pt!important;margin:15pt 0 7pt!important}
        .sub-title{font-size:10.7pt!important;margin:9pt 0 5pt!important}
        .q-legal-card,.q-career-block,.q-insight,.q-interpret,.q-kpis,.q-mini-kpis{margin-top:6pt!important;margin-bottom:7pt!important}
        table.data th,table.data td,.q-table th,.q-table td{font-size:8.2pt!important;line-height:1.12!important;padding:2.8px 3.5px!important}
        .apa-table-number,.apa-table-title,.apa-table-note,.apa-table-analysis{font-size:8.5pt!important;line-height:1.12!important}
      </style>`;

    return html.includes('</head>') ? html.replace('</head>', css + '</head>') : css + html;
  }

  async function runWithCanvasCap(payload, maxScale) {
    const current = window.html2canvas;
    if (typeof current !== 'function') return originalGeneratePDF(payload);

    window.html2canvas = (element, options = {}) => {
      const requested = Number(options.scale) || 1;
      return current(element, {
        ...options,
        scale: Math.min(requested, maxScale),
        logging: false,
        imageTimeout: Math.min(Number(options.imageTimeout) || 8000, 8000)
      });
    };

    try {
      return await originalGeneratePDF(payload);
    } finally {
      window.html2canvas = current;
    }
  }

  api.generatePDF = async function reliableGeneratePDF(payload) {
    // El DNF puede superar varias decenas de páginas. Se limita la resolución
    // de captura desde el primer intento para evitar picos de memoria del navegador.
    const exact = !!payload?.exactPages;
    const first = exact
      ? await runWithCanvasCap(payload, 1.0)
      : await originalGeneratePDF(payload);

    if (first?.ok || !exact) return first;

    console.warn('[DocFormación] Reintentando PDF DNF en modo compacto:', first?.error || first);

    const compactPayload = {
      ...payload,
      html: injectCompactCss(payload.html, 'compact')
    };
    const second = await runWithCanvasCap(compactPayload, 0.9);
    if (second?.ok) {
      return { ...second, recovered: true, recoveryMode: 'compact' };
    }

    console.warn('[DocFormación] Reintentando PDF DNF en modo seguro:', second?.error || second);

    const safePayload = {
      ...payload,
      html: injectCompactCss(payload.html, 'safe')
    };
    const third = await runWithCanvasCap(safePayload, 0.78);
    if (third?.ok) {
      return { ...third, recovered: true, recoveryMode: 'safe' };
    }

    return {
      ok: false,
      error: third?.error || second?.error || first?.error || 'No se pudo generar el PDF de Detección de Necesidades de Formación.'
    };
  };
})();