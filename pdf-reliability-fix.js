(() => {
  const api = window.docformacion;
  if (!api || typeof api.generatePDF !== 'function') return;

  const originalGeneratePDF = api.generatePDF.bind(api);

  function normalizeExactDnfHtml(html) {
    if (!html || typeof html !== 'string') return html;

    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const careerBlocks = [...doc.querySelectorAll('.career-profile-block, .q-career-block')];

      careerBlocks.forEach(block => {
        const parent = block.parentNode;
        if (!parent) return;

        const fragment = doc.createDocumentFragment();
        [...block.children].forEach((child, index) => {
          const node = child.cloneNode(true);

          // El bloque completo de una carrera podía superar una hoja A4 y el
          // paginador lo trataba como indivisible. Convertimos su título en un
          // bloque normal y dejamos tabla/interpretación como hermanos para que
          // puedan pasar a la página siguiente sin reducir todo a texto diminuto.
          if (index === 0 && node.classList?.contains('h2')) {
            node.classList.remove('h2');
            node.classList.add('sub-title', 'career-title');
          }

          if (node.classList?.contains('q-mini-kpis')) {
            node.classList.add('career-summary');
          }

          fragment.appendChild(node);
        });

        parent.replaceChild(fragment, block);
      });

      const style = doc.createElement('style');
      style.id = 'dnf-pagination-structure-fix';
      style.textContent = `
        .career-title{border-top:1px solid #d7dce1;padding-top:6pt;margin-top:10pt!important}
        .career-title:first-of-type{border-top:0;padding-top:0}
        .career-summary,.q-interpret,.q-career-meta{break-inside:avoid!important;page-break-inside:avoid!important}
        .q-career-table,.q-table-block{break-inside:auto!important;page-break-inside:auto!important}
      `;
      doc.head.appendChild(style);

      return '<!doctype html>' + doc.documentElement.outerHTML;
    } catch (error) {
      console.warn('[DocFormación] No se pudo normalizar la estructura DNF:', error);
      return html;
    }
  }

  function injectCompactCss(html, level = 'compact') {
    if (!html || typeof html !== 'string') return html;

    let css = '';
    if (level === 'ultra') {
      css = `
      <style id="pdf-reliability-ultra">
        .pdf-body{font-size:7.7pt!important;line-height:1.08!important}
        .pdf-body p{font-size:7.7pt!important;line-height:1.08!important;margin:0 0 2.8pt!important}
        .pdf-body li{font-size:7.7pt!important;line-height:1.08!important;margin-bottom:1.8pt!important}
        .sec-title{font-size:12.8pt!important;margin:8pt 0 4pt!important}
        .sub-title,.h2{font-size:9pt!important;margin:5pt 0 2.5pt!important}
        .mini-title{font-size:8.2pt!important;margin:4pt 0 2pt!important}
        .q-legal-card{margin:3pt 0 4pt!important;padding:4pt!important}
        .q-kpis,.q-mini-kpis,.q-flow,.q-insight,.q-interpret,.q-bars{margin-top:2.5pt!important;margin-bottom:3pt!important;padding-top:2pt!important;padding-bottom:2pt!important}
        .q-table-block{margin:3pt 0!important}
        table.data th,table.data td,.q-table th,.q-table td{font-size:6.9pt!important;line-height:1.03!important;padding:1.5px 2px!important}
        .apa-table-number,.apa-table-title,.apa-table-note,.apa-table-analysis{font-size:7.1pt!important;line-height:1.05!important;margin-top:2pt!important;margin-bottom:2pt!important}
      </style>`;
    } else if (level === 'safe') {
      css = `
      <style id="pdf-reliability-safe">
        .pdf-body{font-size:8.5pt!important;line-height:1.12!important}
        .pdf-body p{font-size:8.5pt!important;line-height:1.12!important;margin:0 0 4pt!important}
        .pdf-body li{font-size:8.5pt!important;line-height:1.12!important;margin-bottom:2.5pt!important}
        .sec-title{font-size:14.5pt!important;margin:12pt 0 6pt!important}
        .sub-title{font-size:10pt!important;margin:8pt 0 4pt!important}
        .mini-title{font-size:9.2pt!important;margin:6pt 0 3pt!important}
        .q-legal-card,.q-insight,.q-interpret,.q-kpis,.q-mini-kpis{margin-top:5pt!important;margin-bottom:5pt!important;padding-top:5pt!important;padding-bottom:5pt!important}
        table.data th,table.data td,.q-table th,.q-table td{font-size:7.7pt!important;line-height:1.08!important;padding:2.2px 3px!important}
        .apa-table-number,.apa-table-title,.apa-table-note,.apa-table-analysis{font-size:8pt!important;line-height:1.1!important}
        .q-bars,.q-flow{margin-top:4pt!important;margin-bottom:5pt!important}
      </style>`;
    } else {
      css = `
      <style id="pdf-reliability-compact">
        .pdf-body{font-size:9.1pt!important;line-height:1.15!important}
        .pdf-body p{font-size:9.1pt!important;line-height:1.15!important;margin:0 0 5pt!important}
        .pdf-body li{font-size:9.1pt!important;line-height:1.15!important;margin-bottom:3pt!important}
        .sec-title{font-size:15.5pt!important;margin:15pt 0 7pt!important}
        .sub-title{font-size:10.7pt!important;margin:9pt 0 5pt!important}
        .q-legal-card,.q-insight,.q-interpret,.q-kpis,.q-mini-kpis{margin-top:6pt!important;margin-bottom:7pt!important}
        table.data th,table.data td,.q-table th,.q-table td{font-size:8.2pt!important;line-height:1.12!important;padding:2.8px 3.5px!important}
        .apa-table-number,.apa-table-title,.apa-table-note,.apa-table-analysis{font-size:8.5pt!important;line-height:1.12!important}
      </style>`;
    }

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

  function saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  async function flowFallback(payload) {
    if (typeof window.html2pdf !== 'function') {
      return { ok: false, error: 'El generador PDF de respaldo no está disponible.' };
    }

    let frame = null;
    try {
      const parsed = new DOMParser().parseFromString(payload.html, 'text/html');
      const pages = [...parsed.querySelectorAll('.pdf-document > .pdf-page')];
      if (!pages.length) return { ok: false, error: 'No se encontró contenido para el PDF de respaldo.' };

      const cover = pages[0]?.querySelector('.pdf-body')?.innerHTML || '';
      const index = pages[1]?.querySelector('.pdf-body')?.innerHTML || '';
      const source = pages.slice(2).map(page => page.querySelector('.pdf-body')?.innerHTML || '').join('');
      const headStyles = [...parsed.head.querySelectorAll('style')].map(style => style.outerHTML).join('');

      const fallbackCss = `
        <style>
          @page{size:A4;margin:13mm 13mm 14mm}
          html,body{background:#fff!important;margin:0!important;padding:0!important;color:#111!important}
          body{font-family:Arial,Helvetica,sans-serif;font-size:9pt;line-height:1.2}
          .flow-page{break-after:page;page-break-after:always;min-height:250mm}
          .flow-content{width:100%}
          .flow-content .q-section,.flow-content .q-sub{display:block!important}
          .flow-content .q-legal-card,.flow-content .q-table-block,.flow-content .q-insight,.flow-content .q-interpret{break-inside:avoid!important;page-break-inside:avoid!important}
          .flow-content table{width:100%!important;border-collapse:collapse!important}
          .flow-content th,.flow-content td{font-size:8pt!important;line-height:1.12!important;padding:3px 4px!important}
          .flow-content .sec-title{font-size:15pt!important;margin:14pt 0 7pt!important;break-after:avoid!important}
          .flow-content .sub-title,.flow-content .h2{font-size:10.5pt!important;margin:9pt 0 4pt!important;break-after:avoid!important}
          .pdf-page,.institution-header,.footer-note{height:auto!important;min-height:0!important;max-height:none!important;overflow:visible!important}
        </style>`;

      const flowHtml = '<!doctype html><html><head><meta charset="UTF-8">' + headStyles + fallbackCss + '</head><body>' +
        '<section class="flow-page">' + cover + '</section>' +
        '<section class="flow-page">' + index + '</section>' +
        '<main class="flow-content">' + source + '</main>' +
        '</body></html>';

      frame = document.createElement('iframe');
      frame.setAttribute('aria-hidden', 'true');
      frame.style.position = 'fixed';
      frame.style.left = '-12000px';
      frame.style.top = '0';
      frame.style.width = '794px';
      frame.style.height = '1123px';
      frame.style.border = '0';
      frame.style.visibility = 'hidden';

      const loaded = new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('No se pudo preparar el PDF de respaldo.')), 10000);
        frame.onload = () => { clearTimeout(timer); resolve(); };
        frame.onerror = () => { clearTimeout(timer); reject(new Error('No se pudo preparar el PDF de respaldo.')); };
      });

      frame.srcdoc = flowHtml;
      document.body.appendChild(frame);
      await loaded;
      if (frame.contentDocument?.fonts?.ready) {
        await Promise.race([frame.contentDocument.fonts.ready, new Promise(resolve => setTimeout(resolve, 1200))]);
      }

      const filename = payload.filename || 'Deteccion_Necesidades_Formacion.pdf';
      const worker = window.html2pdf().set({
        margin: [13, 13, 14, 13],
        filename,
        image: { type: 'jpeg', quality: 0.9 },
        html2canvas: { scale: 1.0, useCORS: true, logging: false, backgroundColor: '#ffffff', windowWidth: 794 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
        pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.q-legal-card', '.q-insight'] }
      }).from(frame.contentDocument.body).toPdf();

      const pdf = await worker.get('pdf');
      const blob = pdf.output('blob');
      if (!blob?.size) return { ok: false, error: 'El PDF de respaldo se generó vacío.' };
      saveBlob(blob, filename);
      return { ok: true, filePath: filename, downloaded: true, recovered: true, recoveryMode: 'flow' };
    } catch (error) {
      return { ok: false, error: error?.message || String(error) };
    } finally {
      if (frame?.parentNode) frame.remove();
    }
  }

  api.generatePDF = async function reliableGeneratePDF(payload) {
    const exact = !!payload?.exactPages;
    const normalizedPayload = exact
      ? { ...payload, html: normalizeExactDnfHtml(payload.html) }
      : payload;

    const first = exact
      ? await runWithCanvasCap(normalizedPayload, 1.0)
      : await originalGeneratePDF(normalizedPayload);

    if (first?.ok || !exact) return first;

    console.warn('[DocFormación] Reintentando PDF DNF en modo compacto:', first?.error || first);
    const second = await runWithCanvasCap({ ...normalizedPayload, html: injectCompactCss(normalizedPayload.html, 'compact') }, 0.9);
    if (second?.ok) return { ...second, recovered: true, recoveryMode: 'compact' };

    console.warn('[DocFormación] Reintentando PDF DNF en modo seguro:', second?.error || second);
    const third = await runWithCanvasCap({ ...normalizedPayload, html: injectCompactCss(normalizedPayload.html, 'safe') }, 0.78);
    if (third?.ok) return { ...third, recovered: true, recoveryMode: 'safe' };

    console.warn('[DocFormación] Reintentando PDF DNF con ajuste ultra:', third?.error || third);
    const fourth = await runWithCanvasCap({ ...normalizedPayload, html: injectCompactCss(normalizedPayload.html, 'ultra') }, 0.68);
    if (fourth?.ok) return { ...fourth, recovered: true, recoveryMode: 'ultra' };

    console.warn('[DocFormación] Usando generador PDF de respaldo en flujo continuo:', fourth?.error || fourth);
    const fallback = await flowFallback({ ...normalizedPayload, html: injectCompactCss(normalizedPayload.html, 'safe') });
    if (fallback?.ok) return fallback;

    return {
      ok: false,
      error: fallback?.error || fourth?.error || third?.error || second?.error || first?.error || 'No se pudo generar el PDF de Detección de Necesidades de Formación.'
    };
  };
})();