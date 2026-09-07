(() => {
  const api = window.docformacion;
  if (!api || typeof api.generatePDF !== 'function') return;

  const previousGeneratePDF = api.generatePDF.bind(api);
  const isWeb = location.protocol === 'http:' || location.protocol === 'https:';

  function documentType(payload = {}) {
    const value = String(payload.filename || '').toLowerCase();
    if (value.includes('informe')) return 'informe';
    if (value.includes('plan de formación')) return 'plan';
    if (value.includes('necesidades')) return 'dnf';
    return window.__DOCFORMACION_ACTIVE_PDF_TYPE || 'plan';
  }

  function emit(payload, current, total, phase = 'render', extra = {}) {
    window.dispatchEvent(new CustomEvent('docformacion-pdf-progress', {
      detail: { type: documentType(payload), current, total, phase, ...extra }
    }));
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

  function waitForFrame(frame) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('No se pudo preparar el documento para PDF.')), 12000);
      frame.onload = () => {
        clearTimeout(timer);
        resolve();
      };
    });
  }

  function injectRasterCss(doc) {
    const style = doc.createElement('style');
    style.textContent = `
      html,body{margin:0!important;padding:0!important;width:210mm!important;max-width:210mm!important;background:#fff!important;overflow:visible!important}
      body{font-family:Arial,Helvetica,sans-serif!important}
      .df-raster-root{width:210mm!important;margin:0!important;padding:0!important;background:#fff!important}
      .df-raster-page{width:210mm!important;height:297mm!important;min-height:297mm!important;max-height:297mm!important;margin:0!important;padding:15mm!important;background:#fff!important;overflow:hidden!important;box-sizing:border-box!important;display:block!important;position:relative!important}
      .df-raster-inner{width:180mm!important;height:267mm!important;min-height:267mm!important;max-height:267mm!important;margin:0!important;padding:0!important;display:flex!important;flex-direction:column!important;overflow:hidden!important;box-sizing:border-box!important;background:#fff!important}
      .df-raster-content{width:180mm!important;max-width:180mm!important;min-height:0!important;flex:1 1 auto!important;overflow:hidden!important;background:#fff!important}
      .df-raster-footer{flex:0 0 auto!important;margin-top:2mm!important;text-align:center!important;font-size:7.5pt!important;line-height:1.1!important;color:#666!important}
      .df-raster-page .rgi-header{width:180mm!important;max-width:180mm!important;flex:0 0 auto!important;margin:0 0 5mm 0!important}
      .df-raster-page .cover{width:180mm!important;max-width:180mm!important;height:267mm!important;min-height:267mm!important;max-height:267mm!important;margin:0!important;padding:0!important;overflow:hidden!important;page-break-after:auto!important;break-after:auto!important}
      .df-raster-page .signature-table{width:180mm!important;max-width:180mm!important;table-layout:fixed!important}
      .df-raster-page table.data{width:100%!important;max-width:100%!important;table-layout:fixed!important;border-collapse:collapse!important}
      .df-raster-page table.data th,.df-raster-page table.data td{font-size:7.7pt!important;line-height:1.18!important;padding:3.5px 4px!important;vertical-align:top!important;overflow-wrap:anywhere!important;word-break:normal!important}
      .df-raster-page table.data th{font-weight:700!important;text-align:center!important}
      .df-raster-page img{max-width:100%!important}
      .df-raster-page .page-break{display:none!important}
      .df-raster-page .footer{position:static!important;left:auto!important;right:auto!important;bottom:auto!important}
    `;
    doc.head.appendChild(style);
  }

  function makeContentPage(doc, root, headerTemplate, footerText) {
    const page = doc.createElement('section');
    page.className = 'df-raster-page';

    const inner = doc.createElement('div');
    inner.className = 'df-raster-inner';

    if (headerTemplate) inner.appendChild(headerTemplate.cloneNode(true));

    const content = doc.createElement('div');
    content.className = 'df-raster-content';
    inner.appendChild(content);

    if (footerText) {
      const footer = doc.createElement('div');
      footer.className = 'df-raster-footer';
      footer.textContent = footerText;
      inner.appendChild(footer);
    }

    page.appendChild(inner);
    root.appendChild(page);
    return { page, content };
  }

  function makeCoverPage(doc, root, cover) {
    const page = doc.createElement('section');
    page.className = 'df-raster-page';
    const inner = doc.createElement('div');
    inner.className = 'df-raster-inner';
    const clonedCover = cover.cloneNode(true);
    clonedCover.classList.add('df-cover-clone');
    inner.appendChild(clonedCover);
    page.appendChild(inner);
    root.appendChild(page);
    return page;
  }

  function overflows(element) {
    return element.scrollHeight > element.clientHeight + 2 || element.scrollWidth > element.clientWidth + 2;
  }

  function tableParts(doc, sourceTable) {
    const table = sourceTable.cloneNode(false);
    table.className = sourceTable.className;
    [...sourceTable.attributes].forEach(attr => table.setAttribute(attr.name, attr.value));
    table.style.width = '100%';
    table.style.maxWidth = '100%';
    table.style.tableLayout = 'fixed';

    const headRows = [];
    const bodyRows = [];
    [...sourceTable.rows].forEach(row => {
      if (row.closest('thead') || row.querySelector('th')) headRows.push(row);
      else bodyRows.push(row);
    });

    const thead = doc.createElement('thead');
    headRows.forEach(row => thead.appendChild(row.cloneNode(true)));
    if (headRows.length) table.appendChild(thead);

    const tbody = doc.createElement('tbody');
    table.appendChild(tbody);
    return { table, tbody, bodyRows };
  }

  function paginateFlow(doc, sourceNodes, root, headerTemplate, footerText) {
    const pages = [];
    let built = null;

    const newPage = () => {
      built = makeContentPage(doc, root, headerTemplate, footerText);
      pages.push(built.page);
      return built;
    };

    const ensurePage = () => built || newPage();

    const appendRegular = sourceNode => {
      ensurePage();
      const clone = sourceNode.cloneNode(true);
      built.content.appendChild(clone);
      if (!overflows(built.content)) return;

      built.content.removeChild(clone);
      const hadContent = built.content.children.length > 0;
      if (hadContent) newPage();
      built.content.appendChild(clone);

      // Un único bloque excepcionalmente largo no debe romper la geometría horizontal.
      // Se compacta solamente ese bloque; las tablas se dividen por filas aparte.
      if (overflows(built.content)) {
        clone.style.fontSize = '8.5pt';
        clone.style.lineHeight = '1.2';
        clone.style.maxWidth = '100%';
        clone.style.overflowWrap = 'anywhere';
      }
    };

    const appendTable = sourceTable => {
      ensurePage();
      const rows = [...sourceTable.rows].filter(row => !(row.closest('thead') || row.querySelector('th')));
      if (!rows.length) {
        appendRegular(sourceTable);
        return;
      }

      let part = tableParts(doc, sourceTable);
      built.content.appendChild(part.table);

      // Si ni siquiera el encabezado entra en el espacio restante, inicia una nueva página.
      if (overflows(built.content) && built.content.children.length > 1) {
        built.content.removeChild(part.table);
        newPage();
        part = tableParts(doc, sourceTable);
        built.content.appendChild(part.table);
      }

      let rowsOnPart = 0;
      rows.forEach(row => {
        const clone = row.cloneNode(true);
        part.tbody.appendChild(clone);
        rowsOnPart++;

        if (!overflows(built.content)) return;

        part.tbody.removeChild(clone);
        rowsOnPart--;

        newPage();
        part = tableParts(doc, sourceTable);
        built.content.appendChild(part.table);
        part.tbody.appendChild(clone);
        rowsOnPart = 1;

        // Si una sola fila es extraordinariamente alta, compacta solo esa fila.
        if (overflows(built.content)) {
          clone.style.fontSize = '7pt';
          clone.style.lineHeight = '1.08';
        }
      });
    };

    sourceNodes.forEach(node => {
      if (node.matches?.('table.data')) appendTable(node);
      else appendRegular(node);
    });

    return pages;
  }

  async function renderRasterPdf(payload) {
    if (!window.html2canvas || !window.jspdf?.jsPDF) {
      return { ok: false, error: 'No están disponibles los componentes necesarios para generar el PDF.' };
    }

    let frame = null;
    try {
      emit(payload, 0, 0, 'preparing', { percent: 4 });

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
      frame.style.zIndex = '-2147483647';

      const loaded = waitForFrame(frame);
      document.body.appendChild(frame);
      frame.srcdoc = payload.html || '';
      await loaded;

      const doc = frame.contentDocument;
      if (!doc?.body) throw new Error('No se pudo preparar el contenido del PDF.');
      injectRasterCss(doc);

      if (doc.fonts?.ready) {
        await Promise.race([doc.fonts.ready, new Promise(resolve => setTimeout(resolve, 1500))]);
      }
      await new Promise(resolve => frame.contentWindow.requestAnimationFrame(() => frame.contentWindow.requestAnimationFrame(resolve)));

      const children = [...doc.body.children];
      const cover = children.find(node => node.matches?.('.cover'));
      const headerTemplate = children.find(node => node.matches?.('.rgi-header,.header'));
      const footerNode = children.find(node => node.matches?.('.footer'));
      const footerText = String(footerNode?.textContent || 'ITSQMET · Unidad de Gestión de Procesos Académicos').trim();

      const sourceNodes = children.filter(node => {
        if (node === cover || node === headerTemplate || node === footerNode) return false;
        if (node.matches?.('.page-break')) return false;
        if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE') return false;
        return true;
      }).map(node => node.cloneNode(true));

      doc.body.innerHTML = '';
      const root = doc.createElement('div');
      root.className = 'df-raster-root';
      doc.body.appendChild(root);

      const pages = [];
      if (cover) pages.push(makeCoverPage(doc, root, cover));
      pages.push(...paginateFlow(doc, sourceNodes, root, headerTemplate, footerText));
      if (!pages.length) throw new Error('No se encontraron páginas para generar el PDF.');

      await new Promise(resolve => frame.contentWindow.requestAnimationFrame(() => frame.contentWindow.requestAnimationFrame(resolve)));
      emit(payload, 0, pages.length, 'layout', { percent: 20 });

      const pdf = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true, precision: 2 });

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i];
        const canvas = await window.html2canvas(page, {
          scale: 1.35,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          imageTimeout: 10000,
          removeContainer: true,
          width: page.clientWidth,
          height: page.clientHeight,
          windowWidth: page.clientWidth,
          windowHeight: page.clientHeight,
          scrollX: 0,
          scrollY: 0
        });

        if (i > 0) pdf.addPage('a4', 'portrait');
        const data = canvas.toDataURL('image/jpeg', 0.94);
        pdf.addImage(data, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
        canvas.width = 1;
        canvas.height = 1;
        emit(payload, i + 1, pages.length, 'render');
        if ((i + 1) % 3 === 0) await new Promise(resolve => setTimeout(resolve, 20));
      }

      emit(payload, pages.length, pages.length, 'assembling');
      const blob = pdf.output('blob');
      if (!blob || !blob.size) throw new Error('El PDF se generó vacío.');

      emit(payload, pages.length, pages.length, 'downloading');
      const filename = payload.filename || 'documento.pdf';
      saveBlob(blob, filename);
      emit(payload, pages.length, pages.length, 'done');

      return { ok: true, downloaded: true, filePath: filename, pages: pages.length, size: blob.size, renderer: 'direct-page-raster' };
    } catch (error) {
      console.error('[DocFormación] Falló el render página por página:', error);
      emit(payload, 0, 0, 'error', { message: error?.message || String(error) });
      return { ok: false, error: error?.message || String(error) };
    } finally {
      if (frame?.parentNode) frame.remove();
    }
  }

  api.generatePDF = async function directPageGeneratePDF(payload) {
    if (!isWeb || payload?.exactPages) return previousGeneratePDF(payload);
    return renderRasterPdf(payload);
  };
})();