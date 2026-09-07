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

  function waitForFrame(frame) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('No se pudo preparar el documento para PDF.')), 12000);
      frame.onload = () => {
        clearTimeout(timer);
        resolve();
      };
    });
  }

  async function generateStableFlowPdf(payload) {
    if (typeof window.html2pdf !== 'function') {
      return { ok: false, error: 'El generador PDF no se cargó. Recarga la página e inténtalo nuevamente.' };
    }

    let frame = null;
    try {
      frame = document.createElement('iframe');
      frame.setAttribute('aria-hidden', 'true');
      frame.style.position = 'fixed';
      frame.style.left = '0';
      frame.style.top = '0';
      frame.style.width = '794px';
      frame.style.height = '1123px';
      frame.style.border = '0';
      frame.style.background = '#fff';
      frame.style.pointerEvents = 'none';
      frame.style.zIndex = '-2147483647';

      const loaded = waitForFrame(frame);
      document.body.appendChild(frame);
      frame.srcdoc = payload.html || '';
      await loaded;

      const doc = frame.contentDocument;
      if (!doc?.body) return { ok: false, error: 'No se pudo preparar el contenido del PDF.' };

      const guardStyle = doc.createElement('style');
      guardStyle.textContent = `
        html{width:210mm!important;min-width:210mm!important;max-width:210mm!important;margin:0!important;padding:0!important;background:#fff!important}
        body{width:180mm!important;max-width:180mm!important;margin:0 auto!important;padding:0!important;background:#fff!important;overflow-x:hidden!important}
        table{max-width:100%!important}
        th,td,p,div,span{overflow-wrap:anywhere}
        img{max-width:100%}
        .rgi-header,.signature-table{width:180mm!important;max-width:180mm!important}
      `;
      doc.head.appendChild(guardStyle);

      if (doc.fonts?.ready) {
        await Promise.race([doc.fonts.ready, new Promise(resolve => setTimeout(resolve, 1500))]);
      }
      await new Promise(resolve => frame.contentWindow.requestAnimationFrame(() => frame.contentWindow.requestAnimationFrame(resolve)));

      const bodyRect = doc.body.getBoundingClientRect();
      const overflowX = Math.max(doc.body.scrollWidth, doc.documentElement.scrollWidth) - Math.ceil(bodyRect.width);
      if (overflowX > 12) {
        const tables = [...doc.querySelectorAll('table')];
        tables.forEach(table => {
          table.style.width = '100%';
          table.style.maxWidth = '100%';
          table.style.tableLayout = 'fixed';
        });
      }

      const filename = payload.filename || 'documento.pdf';
      const worker = window.html2pdf().set({
        margin: [15, 15, 15, 15],
        filename,
        image: { type: 'jpeg', quality: 0.96 },
        html2canvas: {
          scale: 1.5,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 794,
          scrollX: 0,
          scrollY: 0,
          imageTimeout: 10000
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait',
          compress: true
        },
        pagebreak: {
          mode: ['css', 'legacy'],
          before: '.page-break',
          avoid: ['tr', '.avoid', '.rgi-header', '.signature-table']
        }
      }).from(doc.body).toPdf();

      const pdf = await worker.get('pdf');
      const blob = pdf.output('blob');
      if (!blob || !blob.size) return { ok: false, error: 'El PDF se generó vacío.' };

      saveBlob(blob, filename);
      return {
        ok: true,
        downloaded: true,
        filePath: filename,
        pages: typeof pdf.getNumberOfPages === 'function' ? pdf.getNumberOfPages() : undefined,
        size: blob.size,
        renderer: 'stable-web-geometry'
      };
    } catch (error) {
      console.error('[DocFormación] Falló el render estable del PDF:', error);
      return { ok: false, error: error?.message || String(error) };
    } finally {
      if (frame?.parentNode) frame.remove();
    }
  }

  api.generatePDF = async function geometrySafeGeneratePDF(payload) {
    // La DNF mantiene su paginador exacto y su respaldo especializado.
    if (payload?.exactPages) return previousGeneratePDF(payload);

    const stable = await generateStableFlowPdf(payload);
    if (stable?.ok) return stable;

    console.warn('[DocFormación] El render estable falló; se intenta el generador anterior.', stable?.error || stable);
    return previousGeneratePDF(payload);
  };
})();