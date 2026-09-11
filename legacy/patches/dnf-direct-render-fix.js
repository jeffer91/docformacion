(() => {
  const api = window.docformacion;
  if (!api || typeof api.generatePDF !== 'function') return;

  const previousGeneratePDF = api.generatePDF.bind(api);
  const isWeb = location.protocol === 'http:' || location.protocol === 'https:';
  const ENGINE = 'dnf-direct-document-write-v2';

  function emit(percent, phase, extra = {}) {
    window.dispatchEvent(new CustomEvent('docformacion-pdf-progress', {
      detail: {
        type: 'dnf',
        engine: ENGINE,
        build: window.DOCFORMACION_BUILD || '',
        percent: Math.max(0, Math.min(100, Math.round(Number(percent) || 0))),
        phase,
        ...extra
      }
    }));
  }

  function pause(ms = 0) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function assertNotAborted(payload) {
    if (payload?.__dfAbort?.aborted) {
      throw new Error(payload.__dfAbort.reason || 'Generación cancelada.');
    }
  }

  function withTimeout(promise, ms, message) {
    let timer = null;
    return Promise.race([
      Promise.resolve(promise).finally(() => {
        if (timer) clearTimeout(timer);
      }),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms);
      })
    ]);
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

  function canvasToJpegBlob(canvas, quality = 0.8) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('No se pudo convertir la página a imagen.')),
        'image/jpeg',
        quality
      );
    });
  }

  function createRenderSurface(html) {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    frame.style.position = 'fixed';
    frame.style.left = '0';
    frame.style.top = '0';
    frame.style.width = '794px';
    frame.style.height = '1123px';
    frame.style.border = '0';
    frame.style.opacity = '0.001';
    frame.style.pointerEvents = 'none';
    frame.style.zIndex = '-2147483647';
    frame.style.background = '#fff';
    document.body.appendChild(frame);

    const doc = frame.contentDocument;
    if (!doc) {
      frame.remove();
      throw new Error('No se pudo crear la superficie local de render.');
    }

    doc.open();
    doc.write(html || '');
    doc.close();
    return { frame, doc };
  }

  function addRenderGuard(doc) {
    const style = doc.createElement('style');
    style.id = 'dnf-direct-render-guard';
    style.textContent = `
      html,body{margin:0!important;padding:0!important;background:#fff!important;overflow:visible!important}
      .pdf-document{margin:0!important;padding:0!important;background:#fff!important}
      .pdf-page{width:210mm!important;height:297mm!important;min-width:210mm!important;max-width:210mm!important;min-height:297mm!important;max-height:297mm!important;box-sizing:border-box!important;overflow:hidden!important;margin:0!important;background:#fff!important;position:relative!important}
      .pdf-page table{max-width:100%!important}
      .pdf-page img,.pdf-page svg{max-width:100%!important}
      .pdf-page .pdf-body{overflow:hidden!important;transform-origin:top left!important}
    `;
    doc.head.appendChild(style);
  }

  async function waitForPages(doc, payload, timeoutMs = 5000) {
    const started = performance.now();
    while (performance.now() - started < timeoutMs) {
      assertNotAborted(payload);
      const pages = [...doc.querySelectorAll('.pdf-document > .pdf-page')];
      if (pages.length >= 3) return pages;
      await pause(40);
    }
    throw new Error('El HTML de la DNF no contiene las páginas institucionales esperadas.');
  }

  function fitOverflow(page) {
    const body = page.querySelector('.pdf-body');
    if (!body) return { ratio: 1, overflow: false };

    body.style.transform = '';
    body.style.width = '';
    body.style.maxWidth = '';

    const h = Math.max(1, body.clientHeight);
    const w = Math.max(1, body.clientWidth);
    const sh = Math.max(h, body.scrollHeight);
    const sw = Math.max(w, body.scrollWidth);
    const ratio = Math.min(1, (h - 2) / sh, (w - 2) / sw);

    if (ratio < 0.998) {
      const safe = Math.max(0.56, ratio * 0.995);
      body.style.transform = `scale(${safe})`;
      body.style.transformOrigin = 'top left';
      return { ratio: safe, overflow: true };
    }
    return { ratio: 1, overflow: false };
  }

  async function renderPage(page, index, total, payload) {
    assertNotAborted(payload);
    const pctStart = 12 + (index / total) * 78;
    emit(pctStart, 'render', { current: index, total, stage: 'render' });
    await pause(0);

    const options = scale => ({
      scale,
      useCORS: true,
      allowTaint: false,
      logging: false,
      backgroundColor: '#ffffff',
      imageTimeout: 5000,
      removeContainer: true,
      width: page.clientWidth,
      height: page.clientHeight,
      windowWidth: page.clientWidth,
      windowHeight: page.clientHeight,
      scrollX: 0,
      scrollY: 0
    });

    try {
      return await withTimeout(
        window.html2canvas(page, options(total >= 50 ? 0.9 : 1.0)),
        22000,
        `La página ${index + 1} tardó demasiado en renderizarse.`
      );
    } catch (firstError) {
      assertNotAborted(payload);
      console.warn('[DocFormación] Reintentando página DNF en modo ligero:', index + 1, firstError);
      emit(pctStart, 'fallback', { current: index + 1, total, stage: 'page-retry' });
      return withTimeout(
        window.html2canvas(page, options(0.72)),
        18000,
        `La página ${index + 1} no pudo renderizarse ni en modo ligero.`
      );
    }
  }

  async function renderDnfDirect(payload) {
    if (typeof window.html2canvas !== 'function' || !window.jspdf?.jsPDF) {
      return { ok: false, error: 'No están disponibles html2canvas/jsPDF para generar la DNF.' };
    }

    let frame = null;
    try {
      assertNotAborted(payload);
      emit(3, 'preparing', { stage: 'surface-direct' });
      await pause(0);

      const surface = createRenderSurface(payload.html || '');
      frame = surface.frame;
      const doc = surface.doc;

      assertNotAborted(payload);
      emit(5, 'preparing', { stage: 'structure-direct' });
      addRenderGuard(doc);

      const pages = await withTimeout(
        waitForPages(doc, payload, 5000),
        6000,
        'La estructura de la DNF no estuvo disponible a tiempo.'
      );

      if (doc.fonts?.ready) {
        await Promise.race([doc.fonts.ready, pause(900)]);
      }
      assertNotAborted(payload);
      await pause(20);

      emit(8, 'layout', { current: 0, total: pages.length, stage: 'validate-pages' });
      const adjusted = [];
      for (let i = 0; i < pages.length; i++) {
        assertNotAborted(payload);
        const fit = fitOverflow(pages[i]);
        if (fit.overflow) adjusted.push({ page: i + 1, scale: fit.ratio });
        if ((i + 1) % 8 === 0) {
          emit(8 + ((i + 1) / pages.length) * 4, 'layout', { current: i + 1, total: pages.length, stage: 'validate-pages' });
          await pause(0);
        }
      }

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
        compress: true,
        putOnlyUsedFonts: true,
        precision: 2
      });

      for (let i = 0; i < pages.length; i++) {
        assertNotAborted(payload);
        let canvas = null;
        try {
          canvas = await renderPage(pages[i], i, pages.length, payload);
          assertNotAborted(payload);
          const jpegBlob = await withTimeout(
            canvasToJpegBlob(canvas, pages.length >= 50 ? 0.76 : 0.82),
            12000,
            `La página ${i + 1} tardó demasiado en convertirse a imagen.`
          );
          const bytes = new Uint8Array(await jpegBlob.arrayBuffer());
          if (i > 0) pdf.addPage('a4', 'portrait');
          pdf.addImage(bytes, 'JPEG', 0, 0, 210, 297, `dnf-direct-${i}`, 'FAST');
          emit(12 + ((i + 1) / pages.length) * 78, 'render', { current: i + 1, total: pages.length, stage: 'render' });
        } finally {
          if (canvas) {
            canvas.width = 1;
            canvas.height = 1;
          }
        }
        await pause((i + 1) % 2 === 0 ? 12 : 0);
      }

      assertNotAborted(payload);
      emit(93, 'assembling', { current: pages.length, total: pages.length, adjustedPages: adjusted });
      await pause(20);
      const blob = pdf.output('blob');
      if (!blob?.size) throw new Error('El PDF se generó vacío.');

      assertNotAborted(payload);
      emit(97, 'downloading', { current: pages.length, total: pages.length });
      const filename = payload.filename || 'Deteccion_Necesidades_Formacion.pdf';
      saveBlob(blob, filename);
      emit(100, 'done', { current: pages.length, total: pages.length, adjustedPages: adjusted });

      return {
        ok: true,
        downloaded: true,
        filePath: filename,
        pages: pages.length,
        size: blob.size,
        adjustedPages: adjusted,
        renderer: ENGINE
      };
    } catch (error) {
      console.error('[DocFormación] Falló el generador directo de DNF:', error);
      emit(0, 'error', { message: error?.message || String(error) });
      return { ok: false, error: error?.message || String(error), renderer: ENGINE };
    } finally {
      if (frame?.parentNode) frame.remove();
    }
  }

  window.__DOCFORMACION_RENDER_DNF_DIRECT = renderDnfDirect;
  window.__DOCFORMACION_DNF_RENDERER = ENGINE;

  api.generatePDF = async function dnfDirectGeneratePDF(payload) {
    if (!isWeb || !payload?.exactPages) return previousGeneratePDF(payload);
    return renderDnfDirect(payload);
  };
})();