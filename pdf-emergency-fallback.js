(() => {
  const api = window.docformacion;
  if (!api || typeof api.generatePDF !== 'function') return;

  const previousGeneratePDF = api.generatePDF.bind(api);

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

  async function generateFlowPdf(payload) {
    if (typeof window.html2pdf !== 'function') {
      return { ok: false, error: 'No está disponible el generador PDF de respaldo.' };
    }

    let host = null;
    try {
      const parsed = new DOMParser().parseFromString(payload.html || '', 'text/html');
      const pages = [...parsed.querySelectorAll('.pdf-document > .pdf-page')];
      if (!pages.length) return { ok: false, error: 'No se encontró contenido de la DNF.' };

      const cover = pages[0]?.querySelector('.pdf-body')?.innerHTML || '';
      const index = pages[1]?.querySelector('.pdf-body')?.innerHTML || '';
      const source = pages.slice(2).map(page => page.querySelector('.pdf-body')?.innerHTML || '').join('');
      const styles = [...parsed.head.querySelectorAll('style')].map(style => style.textContent || '').join('\n');

      host = document.createElement('div');
      host.style.position = 'fixed';
      host.style.left = '0';
      host.style.top = '0';
      host.style.width = '794px';
      host.style.background = '#fff';
      host.style.pointerEvents = 'none';
      host.style.zIndex = '-2147483647';
      host.innerHTML = `
        <style>
          ${styles}
          .pdf-emergency-root{font-family:Arial,Helvetica,sans-serif;color:#111;background:#fff;width:180mm;max-width:180mm;margin:0 auto;font-size:9pt;line-height:1.2;overflow-x:hidden}
          .pdf-emergency-page{min-height:267mm;box-sizing:border-box;page-break-after:always;break-after:page;padding:0;width:180mm;max-width:180mm}
          .pdf-emergency-flow{padding:0;width:180mm;max-width:180mm}
          .pdf-emergency-flow .q-section,.pdf-emergency-flow .q-sub{display:block!important}
          .pdf-emergency-flow .q-career-block,.pdf-emergency-flow .career-profile-block{break-inside:auto!important;page-break-inside:auto!important}
          .pdf-emergency-flow .q-table-block,.pdf-emergency-flow .apa-table-block{break-inside:auto!important;page-break-inside:auto!important}
          .pdf-emergency-flow table{width:100%!important;max-width:100%!important;border-collapse:collapse!important;page-break-inside:auto!important;table-layout:auto!important}
          .pdf-emergency-flow thead{display:table-header-group!important}
          .pdf-emergency-flow tr{break-inside:avoid!important;page-break-inside:avoid!important}
          .pdf-emergency-flow th,.pdf-emergency-flow td{font-size:8pt!important;line-height:1.12!important;padding:3px 4px!important;overflow-wrap:anywhere!important}
          .pdf-emergency-flow .sec-title{font-size:15pt!important;line-height:1.15!important;margin:14pt 0 7pt!important;break-after:avoid!important}
          .pdf-emergency-flow .sub-title,.pdf-emergency-flow .h2{font-size:10.5pt!important;line-height:1.18!important;margin:9pt 0 4pt!important;break-after:avoid!important}
          .pdf-emergency-flow .q-legal-card,.pdf-emergency-flow .q-insight,.pdf-emergency-flow .q-interpret{break-inside:avoid!important;page-break-inside:avoid!important}
          .pdf-emergency-flow .pdf-page,.pdf-emergency-flow .pdf-body{height:auto!important;min-height:0!important;max-height:none!important;overflow:visible!important}
          .pdf-emergency-root img{max-width:100%!important}
        </style>
        <div class="pdf-emergency-root">
          <section class="pdf-emergency-page">${cover}</section>
          <section class="pdf-emergency-page">${index}</section>
          <main class="pdf-emergency-flow">${source}</main>
        </div>`;

      document.body.appendChild(host);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      if (document.fonts?.ready) {
        await Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 1200))]);
      }

      const root = host.querySelector('.pdf-emergency-root');
      const filename = payload.filename || 'Deteccion_Necesidades_Formacion.pdf';
      const worker = window.html2pdf().set({
        margin: [15, 15, 15, 15],
        filename,
        image: { type: 'jpeg', quality: 0.92 },
        html2canvas: {
          scale: 1.15,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 794,
          scrollX: 0,
          scrollY: 0,
          imageTimeout: 8000
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', compress: true },
        pagebreak: {
          mode: ['css', 'legacy'],
          avoid: ['tr', '.q-legal-card', '.q-insight', '.q-interpret']
        }
      }).from(root).toPdf();

      const pdf = await worker.get('pdf');
      const blob = pdf.output('blob');
      if (!blob || !blob.size) return { ok: false, error: 'El PDF de respaldo se generó vacío.' };

      saveBlob(blob, filename);
      return {
        ok: true,
        downloaded: true,
        filePath: filename,
        pages: typeof pdf.getNumberOfPages === 'function' ? pdf.getNumberOfPages() : undefined,
        recovered: true,
        recoveryMode: 'continuous-flow-zero-origin'
      };
    } catch (error) {
      console.error('[DocFormación] Falló el generador PDF de respaldo:', error);
      return { ok: false, error: error?.message || String(error) };
    } finally {
      if (host?.parentNode) host.remove();
    }
  }

  api.generatePDF = async function finalGeneratePDF(payload) {
    if (!payload?.exactPages) return previousGeneratePDF(payload);

    let result;
    try {
      result = await previousGeneratePDF(payload);
    } catch (error) {
      console.warn('[DocFormación] El paginador institucional lanzó una excepción; activando respaldo continuo.', error);
      result = { ok: false, error: error?.message || String(error) };
    }

    if (result?.ok) return result;

    console.warn('[DocFormación] Activando PDF continuo de respaldo:', result?.error || result);
    const fallback = await generateFlowPdf(payload);
    if (fallback?.ok) return fallback;

    return {
      ok: false,
      error: fallback?.error || result?.error || 'No se pudo generar el PDF de Detección de Necesidades de Formación.'
    };
  };
})();