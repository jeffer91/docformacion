(() => {
  const api = window.docformacion;
  if (!api || typeof api.generatePDF !== 'function') return;

  const previousGeneratePDF = api.generatePDF.bind(api);
  const isWeb = location.protocol === 'http:' || location.protocol === 'https:';

  function emit(percent, phase = 'layout', extra = {}) {
    window.dispatchEvent(new CustomEvent('docformacion-pdf-progress', {
      detail: {
        type: 'dnf',
        percent: Math.max(0, Math.min(100, Math.round(Number(percent) || 0))),
        phase,
        ...extra
      }
    }));
  }

  function pause(ms = 0) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // IMPORTANTE: no esperamos requestAnimationFrame dentro del iframe oculto.
  // Chromium puede suspender rAF en iframes totalmente transparentes/clipped,
  // que era la causa de que la DNF quedara indefinidamente en "Preparando".
  async function yieldToUi(ms = 0) {
    await pause(ms);
  }

  function withTimeout(promise, ms, message) {
    let timer;
    return Promise.race([
      promise.finally(() => clearTimeout(timer)),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms);
      })
    ]);
  }

  function waitForFrame(frame, html) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const finish = (fn, value) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        fn(value);
      };
      const timer = setTimeout(() => finish(reject, new Error('La superficie de render de la DNF tardó demasiado en cargar.')), 10000);
      frame.onload = () => finish(resolve);
      frame.onerror = () => finish(reject, new Error('No se pudo cargar la superficie de render de la DNF.'));

      // Asignar srcdoc ANTES de insertar el iframe evita la carrera con about:blank.
      frame.srcdoc = html || '';
      document.body.appendChild(frame);
    });
  }

  async function waitForStructure(frame, timeoutMs = 5000) {
    const started = performance.now();
    while (performance.now() - started < timeoutMs) {
      const doc = frame.contentDocument;
      const pages = doc ? doc.querySelectorAll('.pdf-document > .pdf-page') : [];
      if (doc?.body && pages.length >= 3) return doc;
      await pause(50);
    }
    throw new Error('La DNF se cargó, pero no apareció la estructura institucional de páginas.');
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

  function canvasToJpegBlob(canvas, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('No se pudo convertir una página de la DNF.')),
        'image/jpeg',
        quality
      );
    });
  }

  function addGuardCss(doc) {
    const style = doc.createElement('style');
    style.id = 'dnf-async-render-guard';
    style.textContent = `
      html,body{margin:0!important;padding:0!important;background:#fff!important;overflow:visible!important}
      .pdf-document{margin:0!important;padding:0!important;background:#fff!important}
      .pdf-page{width:210mm!important;height:297mm!important;min-height:297mm!important;max-height:297mm!important;box-sizing:border-box!important;overflow:hidden!important;margin:0!important;background:#fff!important;position:relative!important}
      .pdf-page table{max-width:100%!important}
      .pdf-page img{max-width:100%!important}
      .pdf-page .pdf-body{overflow:hidden!important}
      .pdf-page .apa-table-block,.pdf-page .q-table-block{break-inside:auto!important;page-break-inside:auto!important}
      .pdf-page .q-legal-card,.pdf-page .q-insight,.pdf-page .q-interpret,.pdf-page .q-mini-kpis,.pdf-page .q-kpis{break-inside:avoid!important;page-break-inside:avoid!important}
      .pdf-page .dnf-long-block{font-size:8.6pt!important;line-height:1.14!important;overflow-wrap:anywhere!important}
      .pdf-page .dnf-long-block table th,.pdf-page .dnf-long-block table td{font-size:7.3pt!important;line-height:1.08!important;padding:2px 3px!important}
    `;
    doc.head.appendChild(style);
  }

  function bodyOverflows(body) {
    if (!body) return false;
    return body.scrollHeight > body.clientHeight + 2 || body.scrollWidth > body.clientWidth + 2;
  }

  function cloneTemplatePage(doc, template) {
    const page = template.cloneNode(true);
    page.classList.remove('source-page');
    page.classList.add('dnf-generated-page');
    const body = page.querySelector('.pdf-body');
    if (!body) throw new Error('La plantilla institucional de la DNF no contiene cuerpo de página.');
    body.innerHTML = '';
    return { page, body };
  }

  function headerRows(table) {
    return [...table.rows].filter(row => row.querySelector('th'));
  }

  function dataRows(table) {
    return [...table.rows].filter(row => !row.querySelector('th'));
  }

  function makeTablePart(doc, sourceBlock, sourceTable, first, continuation) {
    let part;
    if (sourceBlock === sourceTable) {
      part = sourceTable.cloneNode(false);
      const tbody = doc.createElement('tbody');
      headerRows(sourceTable).forEach(row => tbody.appendChild(row.cloneNode(true)));
      part.appendChild(tbody);
      return { part, tbody, table: part };
    }

    part = sourceBlock.cloneNode(true);
    const table = part.querySelector('table.data,table');
    if (!table) return null;

    const originalTable = sourceBlock.querySelector('table.data,table');
    [...table.rows].forEach(row => row.remove());
    const tbody = table.tBodies[0] || table.appendChild(doc.createElement('tbody'));
    headerRows(originalTable).forEach(row => tbody.appendChild(row.cloneNode(true)));

    const note = part.querySelector('.apa-table-note');
    const analysis = part.querySelector('.apa-table-analysis');
    if (note) note.remove();
    if (analysis) analysis.remove();

    if (!first) {
      const context = part.querySelector('.apa-table-context');
      if (context) context.remove();
      const number = part.querySelector('.apa-table-number');
      if (number && continuation && !/continuación/i.test(number.textContent || '')) {
        number.textContent = (number.textContent || 'Tabla') + ' (continuación)';
      }
    }

    return { part, tbody, table };
  }

  function flattenSourceNodes(doc, sourcePages) {
    const nodes = [];
    const unwrapClasses = new Set(['q-section', 'q-sub', 'q-career-block', 'career-profile-block']);

    const pushNode = node => {
      if (!node || node.nodeType !== 1) return;
      const shouldUnwrap = [...unwrapClasses].some(cls => node.classList?.contains(cls));
      if (shouldUnwrap && node.children?.length) {
        [...node.children].forEach(child => pushNode(child.cloneNode(true)));
        return;
      }
      nodes.push(node.cloneNode(true));
    };

    sourcePages.slice(2).forEach(page => {
      const body = page.querySelector('.pdf-body');
      if (!body) return;
      [...body.children].forEach(pushNode);
    });
    return nodes;
  }

  async function paginate(doc, root, sourcePages) {
    const cover = sourcePages[0].cloneNode(true);
    const index = sourcePages[1].cloneNode(true);
    const template = sourcePages.find((page, idx) => idx > 1 && page.querySelector('.pdf-body')) || sourcePages[2];
    const sourceNodes = flattenSourceNodes(doc, sourcePages);

    root.innerHTML = '';
    root.appendChild(cover);
    root.appendChild(index);

    let built = null;
    const startPage = () => {
      built = cloneTemplatePage(doc, template);
      root.appendChild(built.page);
      return built;
    };
    const ensurePage = () => built || startPage();

    const appendRegular = async sourceNode => {
      ensurePage();
      const clone = sourceNode.cloneNode(true);
      built.body.appendChild(clone);
      if (!bodyOverflows(built.body)) return;

      built.body.removeChild(clone);
      if (built.body.children.length) startPage();
      built.body.appendChild(clone);

      if (bodyOverflows(built.body)) {
        clone.classList.add('dnf-long-block');
        // Solo cedemos al event loop visible; nunca al rAF del iframe oculto.
        await yieldToUi(0);
      }
    };

    const appendTable = async sourceBlock => {
      const sourceTable = sourceBlock.matches?.('table') ? sourceBlock : sourceBlock.querySelector?.('table.data,table');
      if (!sourceTable) return appendRegular(sourceBlock);

      const rows = dataRows(sourceTable);
      if (!rows.length) return appendRegular(sourceBlock);

      ensurePage();
      let first = true;
      let partInfo = makeTablePart(doc, sourceBlock, sourceTable, true, false);
      if (!partInfo) return appendRegular(sourceBlock);

      built.body.appendChild(partInfo.part);
      if (bodyOverflows(built.body) && built.body.children.length > 1) {
        built.body.removeChild(partInfo.part);
        startPage();
        partInfo = makeTablePart(doc, sourceBlock, sourceTable, true, false);
        built.body.appendChild(partInfo.part);
      }

      let rowsInPart = 0;
      for (let r = 0; r < rows.length; r++) {
        const rowClone = rows[r].cloneNode(true);
        partInfo.tbody.appendChild(rowClone);
        rowsInPart++;

        if (bodyOverflows(built.body)) {
          partInfo.tbody.removeChild(rowClone);
          rowsInPart--;

          if (rowsInPart === 0 && built.body.children.length > 1) {
            built.body.removeChild(partInfo.part);
            startPage();
            partInfo = makeTablePart(doc, sourceBlock, sourceTable, first, !first);
            built.body.appendChild(partInfo.part);
          } else if (rowsInPart > 0) {
            startPage();
            first = false;
            partInfo = makeTablePart(doc, sourceBlock, sourceTable, false, true);
            built.body.appendChild(partInfo.part);
          }

          partInfo.tbody.appendChild(rowClone);
          rowsInPart = 1;
          if (bodyOverflows(built.body)) rowClone.classList.add('dnf-long-block');
        }

        if ((r + 1) % 2 === 0) await yieldToUi(0);
      }

      if (sourceBlock !== sourceTable) {
        const note = sourceBlock.querySelector('.apa-table-note');
        const analysis = sourceBlock.querySelector('.apa-table-analysis');
        for (const extra of [note, analysis]) {
          if (!extra) continue;
          const extraClone = extra.cloneNode(true);
          built.body.appendChild(extraClone);
          if (bodyOverflows(built.body)) {
            built.body.removeChild(extraClone);
            startPage();
            built.body.appendChild(extraClone);
          }
          await yieldToUi(0);
        }
      }
    };

    const totalNodes = Math.max(1, sourceNodes.length);
    for (let i = 0; i < sourceNodes.length; i++) {
      // Emitimos ANTES de procesar el bloque para que la UI no parezca congelada
      // si ese bloque requiere varias mediciones de layout.
      const prePct = 8 + (i / totalNodes) * 17;
      emit(prePct, 'layout', { current: i, total: totalNodes, stage: 'paginate' });
      await yieldToUi(0);

      const node = sourceNodes[i];
      const isTable = node.matches?.('table') || node.classList?.contains('apa-table-block') || node.classList?.contains('q-table-block') || !!node.querySelector?.('table.data');
      if (isTable) await appendTable(node);
      else await appendRegular(node);

      const pct = 8 + ((i + 1) / totalNodes) * 17;
      emit(pct, 'layout', { current: i + 1, total: totalNodes, stage: 'paginate' });
      await yieldToUi(i % 3 === 2 ? 4 : 0);
    }

    const pages = [...root.querySelectorAll(':scope > .pdf-page')];
    const total = pages.length;
    pages.forEach((page, idx) => {
      page.dataset.pdfPage = String(idx + 1);
      const footer = page.querySelector('.footer-note');
      if (!footer) return;
      if (idx === 0) footer.textContent = '';
      else {
        const current = footer.textContent || '';
        const base = current.replace(/\s*·\s*Página\s+\d+\s+de\s+\d+\s*$/i, '').trim();
        footer.textContent = (base || 'ITSQMET · Unidad de Gestión de Procesos Académicos') + ' · Página ' + (idx + 1) + ' de ' + total;
      }
    });

    const sectionPages = new Map();
    pages.forEach((page, idx) => {
      [...page.querySelectorAll('.sec-title')].forEach(title => {
        const key = (title.textContent || '').trim().replace(/\s+/g, ' ').toLowerCase();
        if (key && !sectionPages.has(key)) sectionPages.set(key, idx + 1);
      });
    });
    [...index.querySelectorAll('.toc tr')].forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length < 2) return;
      const key = (cells[0].textContent || '').trim().replace(/\s+/g, ' ').toLowerCase();
      if (sectionPages.has(key)) cells[cells.length - 1].textContent = String(sectionPages.get(key));
    });

    return pages;
  }

  async function renderDnf(payload) {
    if (!window.html2canvas || !window.jspdf?.jsPDF) {
      return { ok: false, error: 'No están disponibles los componentes necesarios para generar el PDF.' };
    }

    let frame = null;
    try {
      emit(3, 'preparing', { stage: 'surface' });
      frame = document.createElement('iframe');
      frame.setAttribute('aria-hidden', 'true');
      frame.tabIndex = -1;
      frame.style.position = 'fixed';
      frame.style.left = '0';
      frame.style.top = '0';
      frame.style.width = '794px';
      frame.style.height = '1123px';
      frame.style.border = '0';
      frame.style.opacity = '0';
      frame.style.pointerEvents = 'none';
      frame.style.zIndex = '-1';
      // No usamos clip-path: Chromium puede suspender el pipeline de layout/paint
      // de superficies totalmente recortadas, aun cuando luego se midan por JS.

      await waitForFrame(frame, payload.html || '');
      emit(5, 'preparing', { stage: 'structure' });

      const doc = await withTimeout(
        waitForStructure(frame, 5000),
        6000,
        'La estructura de la DNF tardó demasiado en estar disponible.'
      );
      addGuardCss(doc);

      if (doc.fonts?.ready) {
        await Promise.race([doc.fonts.ready, pause(900)]);
      }
      // Forzamos una lectura de layout y cedemos al event loop principal.
      void doc.body.offsetHeight;
      await yieldToUi(16);
      emit(7, 'layout', { stage: 'paginate' });

      const sourcePages = [...doc.querySelectorAll('.pdf-document > .pdf-page')];
      if (sourcePages.length < 3) throw new Error('La DNF no contiene la estructura institucional esperada.');
      const root = doc.querySelector('.pdf-document');
      const pages = await paginate(doc, root, sourcePages);
      if (!pages.length) throw new Error('No se encontraron páginas para generar la DNF.');

      void doc.body.offsetHeight;
      await yieldToUi(16);
      emit(27, 'layout', { current: 0, total: pages.length, stage: 'render' });

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true, putOnlyUsedFonts: true, precision: 2 });
      const scale = pages.length >= 50 ? 0.92 : pages.length >= 35 ? 1.0 : 1.08;
      const quality = pages.length >= 50 ? 0.76 : 0.8;

      for (let i = 0; i < pages.length; i++) {
        let canvas = null;
        try {
          emit(27 + (i / pages.length) * 63, 'render', { current: i, total: pages.length, stage: 'render' });
          await yieldToUi(0);

          canvas = await window.html2canvas(pages[i], {
            scale,
            useCORS: true,
            allowTaint: false,
            logging: false,
            backgroundColor: '#ffffff',
            imageTimeout: 8000,
            removeContainer: true,
            width: pages[i].clientWidth,
            height: pages[i].clientHeight,
            windowWidth: pages[i].clientWidth,
            windowHeight: pages[i].clientHeight,
            scrollX: 0,
            scrollY: 0
          });

          const jpegBlob = await canvasToJpegBlob(canvas, quality);
          const bytes = new Uint8Array(await jpegBlob.arrayBuffer());
          if (i > 0) pdf.addPage('a4', 'portrait');
          pdf.addImage(bytes, 'JPEG', 0, 0, 210, 297, 'dnf-async-' + i, 'FAST');

          const percent = 27 + ((i + 1) / pages.length) * 63;
          emit(percent, 'render', { current: i + 1, total: pages.length, stage: 'render' });
        } finally {
          if (canvas) {
            canvas.width = 1;
            canvas.height = 1;
          }
        }
        await yieldToUi((i + 1) % 2 === 0 ? 14 : 0);
      }

      emit(93, 'assembling', { current: pages.length, total: pages.length });
      await yieldToUi(20);
      const blob = pdf.output('blob');
      if (!blob?.size) throw new Error('El PDF se generó vacío.');

      emit(97, 'downloading', { current: pages.length, total: pages.length });
      const filename = payload.filename || 'Deteccion_Necesidades_Formacion.pdf';
      saveBlob(blob, filename);
      emit(100, 'done', { current: pages.length, total: pages.length });

      return { ok: true, downloaded: true, filePath: filename, pages: pages.length, size: blob.size, renderer: 'dnf-async-page-renderer-v2' };
    } catch (error) {
      console.error('[DocFormación] Falló el generador asíncrono de DNF:', error);
      emit(0, 'error', { message: error?.message || String(error) });
      return { ok: false, error: error?.message || String(error) };
    } finally {
      if (frame?.parentNode) frame.remove();
    }
  }

  api.generatePDF = async function dnfAsyncGeneratePDF(payload) {
    if (!isWeb || !payload?.exactPages) return previousGeneratePDF(payload);

    // En web usamos exclusivamente el renderizador DNF v2. Volver al generador
    // anterior tras un fallo podía reintroducir el bloqueo original y dejar la UI
    // sin una respuesta clara.
    return renderDnf(payload);
  };
})();