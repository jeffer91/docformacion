(() => {
  const api = window.docformacion;
  if (!api || typeof api.generatePDF !== 'function') return;

  const previousGeneratePDF = api.generatePDF.bind(api);
  const isWeb = location.protocol === 'http:' || location.protocol === 'https:';
  const ENGINE = 'dnf-native-print-v1';

  const EXPECTED_SECTIONS = [
    '1. Introducción',
    '2. Base legal y normativa',
    '3. Alineación institucional y estratégica',
    '4. Metodología y enfoque',
    '5. Caracterización institucional de necesidades',
    '6. Análisis de necesidades y prioridades institucionales',
    '7. Necesidades específicas por carrera',
    '8. Líneas genéricas institucionales de formación',
    '9. Priorización institucional',
    '10. Lineamientos para el Plan de Formación',
    '11. Resumen ejecutivo',
    '12. Conclusiones',
    '13. Recomendaciones',
    '14. Referencias',
    '15. Anexos'
  ];

  function emit(percent, phase = 'layout', extra = {}) {
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

  function normalized(value = '') {
    return String(value).trim().replace(/\s+/g, ' ').toLowerCase();
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
      const timer = setTimeout(() => finish(reject, new Error('La superficie de impresión de la DNF tardó demasiado en cargar.')), 10000);
      frame.onload = () => finish(resolve);
      frame.onerror = () => finish(reject, new Error('No se pudo cargar la superficie de impresión de la DNF.'));
      frame.srcdoc = html || '';
      document.body.appendChild(frame);
    });
  }

  async function waitForStructure(frame, timeoutMs = 6000) {
    const started = performance.now();
    while (performance.now() - started < timeoutMs) {
      const doc = frame.contentDocument;
      const pages = doc ? doc.querySelectorAll('.pdf-document > .pdf-page') : [];
      if (doc?.body && pages.length >= 3) return doc;
      await pause(50);
    }
    throw new Error('La DNF no presentó la estructura institucional de páginas esperada.');
  }

  async function waitForAssets(doc) {
    if (doc.fonts?.ready) {
      await Promise.race([doc.fonts.ready, pause(1800)]);
    }
    const pending = [...doc.images].filter(img => !img.complete).map(img => new Promise(resolve => {
      const done = () => resolve();
      img.addEventListener('load', done, { once: true });
      img.addEventListener('error', done, { once: true });
    }));
    if (pending.length) await Promise.race([Promise.all(pending), pause(3500)]);
  }

  function addLayoutCss(doc) {
    const style = doc.createElement('style');
    style.id = 'dnf-native-layout-guard';
    style.textContent = `
      html,body{margin:0!important;padding:0!important;background:#fff!important;overflow:visible!important}
      .pdf-document{margin:0!important;padding:0!important;background:#fff!important}
      .pdf-page{width:210mm!important;height:297mm!important;min-width:210mm!important;max-width:210mm!important;min-height:297mm!important;max-height:297mm!important;box-sizing:border-box!important;overflow:hidden!important;margin:0!important;background:#fff!important;position:relative!important;transform:none!important}
      .pdf-page .pdf-body{overflow:hidden!important;transform:none!important;width:auto!important;max-width:none!important}
      .pdf-page table{max-width:100%!important}
      .pdf-page img,.pdf-page svg{max-width:100%!important}
      .pdf-page .apa-table-block,.pdf-page .q-table-block{break-inside:auto!important;page-break-inside:auto!important}
      .pdf-page .q-legal-card,.pdf-page .q-insight,.pdf-page .q-interpret,.pdf-page .q-mini-kpis,.pdf-page .q-kpis{break-inside:avoid!important;page-break-inside:avoid!important}
      .pdf-page .dnf-long-block{font-size:8.6pt!important;line-height:1.14!important;overflow-wrap:anywhere!important}
      .pdf-page .dnf-long-block table th,.pdf-page .dnf-long-block table td{font-size:7.3pt!important;line-height:1.08!important;padding:2px 3px!important}
    `;
    doc.head.appendChild(style);
  }

  function addPrintCss(doc) {
    const style = doc.createElement('style');
    style.id = 'dnf-native-print-css';
    style.textContent = `
      @page{size:A4 portrait;margin:0}
      html,body{width:210mm!important;margin:0!important;padding:0!important;background:#fff!important}
      .pdf-document{width:210mm!important;margin:0!important;padding:0!important}
      .pdf-page{width:210mm!important;height:297mm!important;min-height:297mm!important;max-height:297mm!important;margin:0!important;padding:0!important;box-sizing:border-box!important;overflow:hidden!important;break-after:page!important;page-break-after:always!important;box-shadow:none!important;transform:none!important}
      .pdf-page:last-child{break-after:auto!important;page-break-after:auto!important}
      .pdf-page .pdf-body{transform:none!important}
      *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
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
    page.style.transform = 'none';
    const body = page.querySelector('.pdf-body');
    if (!body) throw new Error('La plantilla institucional no contiene cuerpo de página.');
    body.innerHTML = '';
    body.style.transform = 'none';
    return { page, body };
  }

  function headerRows(table) {
    return [...table.rows].filter(row => row.closest('thead') || row.querySelector('th'));
  }

  function dataRows(table) {
    return [...table.rows].filter(row => !(row.closest('thead') || row.querySelector('th')));
  }

  function makeTablePart(doc, sourceBlock, sourceTable, first, continuation) {
    let part;
    if (sourceBlock === sourceTable) {
      part = sourceTable.cloneNode(false);
      const tbody = doc.createElement('tbody');
      headerRows(sourceTable).forEach(row => tbody.appendChild(row.cloneNode(true)));
      part.appendChild(tbody);
      return { part, tbody };
    }

    part = sourceBlock.cloneNode(true);
    const table = part.querySelector('table.data,table');
    if (!table) return null;
    const originalTable = sourceBlock.querySelector('table.data,table');

    [...table.rows].forEach(row => row.remove());
    const tbody = table.tBodies[0] || table.appendChild(doc.createElement('tbody'));
    headerRows(originalTable).forEach(row => tbody.appendChild(row.cloneNode(true)));

    part.querySelector('.apa-table-note')?.remove();
    part.querySelector('.apa-table-analysis')?.remove();

    if (!first) {
      part.querySelector('.apa-table-context')?.remove();
      const number = part.querySelector('.apa-table-number');
      if (number && continuation && !/continuación/i.test(number.textContent || '')) {
        number.textContent = (number.textContent || 'Tabla') + ' (continuación)';
      }
    }
    return { part, tbody };
  }

  function flattenSourceNodes(sourcePages) {
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
    const sourceNodes = flattenSourceNodes(sourcePages);

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
        await pause(0);
        if (bodyOverflows(built.body)) {
          throw new Error('Existe un bloque demasiado extenso para una página A4. Debe dividirse antes de imprimir.');
        }
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
          if (bodyOverflows(built.body)) {
            rowClone.classList.add('dnf-long-block');
            await pause(0);
            if (bodyOverflows(built.body)) {
              throw new Error('Una fila de tabla es demasiado alta para una página A4.');
            }
          }
        }
        if ((r + 1) % 3 === 0) await pause(0);
      }

      if (sourceBlock !== sourceTable) {
        const extras = [sourceBlock.querySelector('.apa-table-note'), sourceBlock.querySelector('.apa-table-analysis')];
        for (const extra of extras) {
          if (!extra) continue;
          const clone = extra.cloneNode(true);
          built.body.appendChild(clone);
          if (bodyOverflows(built.body)) {
            built.body.removeChild(clone);
            startPage();
            built.body.appendChild(clone);
          }
        }
      }
    };

    const totalNodes = Math.max(1, sourceNodes.length);
    for (let i = 0; i < sourceNodes.length; i++) {
      emit(8 + (i / totalNodes) * 42, 'layout', { current: i, total: totalNodes, stage: 'paginate' });
      const node = sourceNodes[i];
      const isTable = node.matches?.('table') || node.classList?.contains('apa-table-block') || node.classList?.contains('q-table-block') || !!node.querySelector?.('table.data');
      if (isTable) await appendTable(node);
      else await appendRegular(node);
      if ((i + 1) % 3 === 0) await pause(0);
    }

    const pages = [...root.querySelectorAll(':scope > .pdf-page')];
    const total = pages.length;
    const sectionPages = new Map();

    pages.forEach((page, idx) => {
      page.dataset.pdfPage = String(idx + 1);
      page.style.transform = 'none';
      page.querySelectorAll('.pdf-body').forEach(body => { body.style.transform = 'none'; });
      const footer = page.querySelector('.footer-note');
      if (footer) {
        const current = footer.textContent || '';
        const base = current.replace(/\s*·\s*Página\s+\d+\s+de\s+\d+\s*$/i, '').trim();
        footer.textContent = (base || 'ITSQMET · Unidad de Gestión de Procesos Académicos') + ' · Página ' + (idx + 1) + ' de ' + total;
      }
      [...page.querySelectorAll('.sec-title')].forEach(title => {
        const key = normalized(title.textContent);
        if (key && !sectionPages.has(key)) sectionPages.set(key, idx + 1);
      });
    });

    [...index.querySelectorAll('.toc tr')].forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length < 2) return;
      const key = normalized(cells[0].textContent);
      if (sectionPages.has(key)) cells[cells.length - 1].textContent = String(sectionPages.get(key));
    });

    return { pages, sectionPages };
  }

  function validateDocument(doc, pages, sectionPages) {
    if (pages.length <= 3) {
      throw new Error('La DNF quedó en solo tres páginas; la repaginación no se completó.');
    }
    if (doc.querySelector('.source-page')) {
      throw new Error('La página fuente temporal no fue reemplazada por páginas finales.');
    }

    const missing = EXPECTED_SECTIONS.filter(label => !sectionPages.has(normalized(label)));
    if (missing.length) {
      throw new Error('La DNF está incompleta. Faltan secciones: ' + missing.join(', '));
    }

    for (const page of pages) {
      const body = page.querySelector('.pdf-body');
      if (body && bodyOverflows(body)) {
        throw new Error('La página ' + page.dataset.pdfPage + ' conserva contenido fuera del área A4.');
      }
      const transformed = [...page.querySelectorAll('.pdf-body')].some(bodyEl => {
        const value = bodyEl.style.transform || '';
        return value && value !== 'none';
      });
      if (transformed) {
        throw new Error('La página ' + page.dataset.pdfPage + ' fue escalada; la DNF debe conservar tamaño de texto real.');
      }
    }
  }

  function cleanupLater(frame) {
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      if (frame?.parentNode) frame.remove();
    };
    try {
      frame.contentWindow?.addEventListener('afterprint', cleanup, { once: true });
    } catch (_error) {}
    setTimeout(cleanup, 120000);
    return cleanup;
  }

  async function printDnf(payload) {
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
      frame.style.opacity = '0.001';
      frame.style.pointerEvents = 'none';
      frame.style.zIndex = '-2147483647';
      frame.style.background = '#fff';

      await waitForFrame(frame, payload.html || '');
      const doc = await waitForStructure(frame);
      addLayoutCss(doc);
      await waitForAssets(doc);
      void doc.body.offsetHeight;
      await pause(25);

      emit(7, 'layout', { stage: 'paginate' });
      const sourcePages = [...doc.querySelectorAll('.pdf-document > .pdf-page')];
      const root = doc.querySelector('.pdf-document');
      if (!root || sourcePages.length < 3) throw new Error('La DNF no contiene la estructura institucional esperada.');

      const result = await paginate(doc, root, sourcePages);
      validateDocument(doc, result.pages, result.sectionPages);
      addPrintCss(doc);
      await waitForAssets(doc);
      void doc.body.offsetHeight;
      await pause(50);

      emit(92, 'assembling', { current: result.pages.length, total: result.pages.length });
      cleanupLater(frame);
      emit(97, 'printing', { current: result.pages.length, total: result.pages.length });

      const target = frame.contentWindow;
      if (!target || typeof target.print !== 'function') throw new Error('El navegador no permitió abrir la impresión del documento.');
      target.focus();
      target.print();

      emit(100, 'done', { current: result.pages.length, total: result.pages.length });
      return {
        ok: true,
        printDialog: true,
        downloaded: false,
        pages: result.pages.length,
        filePath: payload.filename || 'Deteccion_Necesidades_Formacion.pdf',
        renderer: ENGINE
      };
    } catch (error) {
      if (frame?.parentNode) frame.remove();
      console.error('[DocFormación] Falló la impresión vectorial de la DNF:', error);
      emit(0, 'error', { message: error?.message || String(error) });
      return { ok: false, error: error?.message || String(error), renderer: ENGINE };
    }
  }

  api.generatePDF = async function nativeDnfGeneratePDF(payload) {
    if (!isWeb || !payload?.exactPages) return previousGeneratePDF(payload);
    return printDnf(payload);
  };

  window.__DOCFORMACION_DNF_RENDERER = ENGINE;
})();