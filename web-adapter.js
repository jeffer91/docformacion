(() => {
  // En Electron, preload.js ya expone esta API. En GitHub Pages usamos este adaptador.
  if (window.docformacion) return;

  const STORAGE_KEY = 'docformacion-data-v1';
  const XLSX_CDN = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
  const FIREBASE_READ_URL = 'https://repaso-fire-d8ceb-default-rtdb.firebaseio.com/.json';

  function chooseFile(accept) {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.style.display = 'none';
      input.addEventListener('change', () => {
        const file = input.files && input.files[0] ? input.files[0] : null;
        input.remove();
        resolve(file);
      }, { once: true });
      document.body.appendChild(input);
      input.click();
    });
  }

  function ensureXLSX() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = XLSX_CDN;
      script.onload = () => resolve(window.XLSX);
      script.onerror = () => reject(new Error('No se pudo cargar el lector de Excel.'));
      document.head.appendChild(script);
    });
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

  async function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return { __error: error.message };
    }
  }

  async function saveData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }

  async function pickEvidence() {
    const file = await chooseFile('.pdf,.png,.jpg,.jpeg,.webp,.docx');
    if (!file) return null;
    // En web no guardamos rutas locales por seguridad del navegador.
    return { path: file.name, name: file.name };
  }

  async function readFirebase() {
    try {
      const response = await fetch(FIREBASE_READ_URL, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      });
      if (!response.ok) return { ok: false, error: 'Firebase respondió HTTP ' + response.status };
      const data = await response.json();
      if (data && data.error) return { ok: false, error: String(data.error) };
      return { ok: true, data, readOnly: true, source: FIREBASE_READ_URL };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }

  function sheetToObjects(XLSX, sheet) {
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
    if (!rows.length) return [];
    const headers = (rows[0] || []).map(x => String(x || '').trim());
    let start = 1;
    if (String(rows[1]?.[0] || '').trim().startsWith('[INSTRUCCIONES]')) start = 2;
    return rows.slice(start)
      .filter(row => row.some(value => String(value ?? '').trim() !== ''))
      .map(row => {
        const out = {};
        headers.forEach((header, index) => { if (header) out[header] = row[index] ?? ''; });
        return out;
      });
  }

  async function importExcel() {
    const file = await chooseFile('.xlsx,.xls');
    if (!file) return null;

    try {
      const XLSX = await ensureXLSX();
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
      const sheets = {};
      workbook.SheetNames.forEach((name) => {
        sheets[name.toUpperCase()] = sheetToObjects(XLSX, workbook.Sheets[name]);
      });
      return { ok: true, filePath: file.name, sheets };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }

  function buildExcelSheet(XLSX, spec) {
    const headers = Array.isArray(spec.headers) ? spec.headers : [];
    const descriptions = Array.isArray(spec.descriptions) ? spec.descriptions : [];
    const rows = Array.isArray(spec.rows) ? spec.rows : [];
    const instructionRow = headers.map((_, i) => i === 0
      ? '[INSTRUCCIONES] ' + String(descriptions[i] || 'Completa este campo.')
      : String(descriptions[i] || 'Completa este campo.'));
    const ws = XLSX.utils.aoa_to_sheet([headers, instructionRow, ...rows]);
    ws['!cols'] = (spec.widths || headers.map(() => 22)).map(w => ({ wch: Number(w) || 22 }));
    if (headers.length) {
      ws['!autofilter'] = {
        ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } })
      };
    }
    ws['!rows'] = [{ hpt: 22 }, { hpt: 42 }];
    return ws;
  }

  async function exportExcelTemplate(payload = {}) {
    try {
      const XLSX = await ensureXLSX();
      const wb = XLSX.utils.book_new();
      const sheets = Array.isArray(payload.sheets) ? payload.sheets : [];
      if (!sheets.length) throw new Error('No se definieron hojas para la plantilla.');

      sheets.forEach(spec => {
        const ws = buildExcelSheet(XLSX, spec);
        XLSX.utils.book_append_sheet(wb, ws, String(spec.name || 'HOJA').slice(0, 31));
      });

      const filename = payload.filename || 'FORMACION_DOCENTE_GLOBAL.xlsx';
      const output = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      saveBlob(
        new Blob([output], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        filename
      );
      return { ok: true, filePath: filename };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }

  function emitPdfProgress(current, total, phase='render') {
    window.dispatchEvent(new CustomEvent('docformacion-pdf-progress', {
      detail: { current, total, phase }
    }));
  }

  function canvasToJpegBlob(canvas, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('No se pudo convertir una página del PDF.')),
        'image/jpeg',
        quality
      );
    });
  }


  function unwrapForPagination(body) {
    const selectors = ['.chart-grid', '.two-col', '.three-col'];
    selectors.forEach(selector => {
      [...body.querySelectorAll(selector)].forEach(container => {
        const parent = container.parentNode;
        if (!parent) return;
        [...container.children].forEach(child => parent.insertBefore(child, container));
        container.remove();
      });
    });
  }

  function normalizeRepeatedHeadings(doc) {
    const seen = new Set();
    [...doc.querySelectorAll('.pdf-body .sec-title')].forEach(title => {
      const raw = (title.textContent || '').trim().replace(/\s+/g, ' ');
      const careerContinuation = raw.match(/^(7\.\d+)\s+(?:Carrera:\s*)?(.+?)\s+-\s+(.+)$/i);
      if (careerContinuation) {
        const topic = doc.createElement('div');
        topic.className = 'page-topic';
        const t = careerContinuation[3].trim();
        topic.textContent = t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
        title.replaceWith(topic);
        return;
      }
      const key = raw.toLowerCase();
      if (seen.has(key)) title.remove();
      else seen.add(key);
    });
  }

  function pageSkeleton(doc, template) {
    const page = doc.createElement('section');
    page.className = template.className.replace(/\bcover-page\b/g, '').trim() || 'pdf-page';
    page.classList.add('pdf-page');
    const header = template.querySelector('.institution-header')?.cloneNode(true);
    const body = doc.createElement('div');
    body.className = 'pdf-body content-page';
    const footer = template.querySelector('.footer-note')?.cloneNode(true) || doc.createElement('div');
    footer.className = 'footer-note';
    if (header) page.appendChild(header);
    page.appendChild(body);
    page.appendChild(footer);
    return { page, body, footer };
  }

  function bodyOverflows(body) {
    return body.scrollHeight > body.clientHeight + 2;
  }

  function repaginateExactDocument(doc) {
    const root = doc.querySelector('.pdf-document');
    if (!root) return [...doc.querySelectorAll('.pdf-page')];
    const originals = [...root.querySelectorAll(':scope > .pdf-page')];
    if (originals.length < 3) return originals;

    normalizeRepeatedHeadings(doc);

    const cover = originals[0].cloneNode(true);
    const index = originals[1].cloneNode(true);
    const template = originals.find((p, i) => i > 1 && !p.classList.contains('cover-page')) || originals[2];

    const sourceNodes = [];
    originals.slice(2).forEach(page => {
      const body = page.querySelector('.pdf-body');
      if (!body) return;
      unwrapForPagination(body);
      [...body.children].forEach(child => sourceNodes.push(child.cloneNode(true)));
    });

    root.innerHTML = '';
    root.appendChild(cover);
    root.appendChild(index);

    let currentPage = null;
    let currentBody = null;

    const startPage = () => {
      const built = pageSkeleton(doc, template);
      root.appendChild(built.page);
      currentPage = built.page;
      currentBody = built.body;
      return built;
    };

    const makeTablePart = (block, table, first, continuation) => {
      const part = doc.createElement('div');
      part.className = block.className;

      const context = block.querySelector('.apa-table-context');
      const number = block.querySelector('.apa-table-number');
      const title = block.querySelector('.apa-table-title');

      if (first && context) part.appendChild(context.cloneNode(true));
      if (number) {
        const n = number.cloneNode(true);
        if (continuation) n.textContent = (number.textContent || 'Tabla') + ' (continuación)';
        part.appendChild(n);
      }
      if (title) part.appendChild(title.cloneNode(true));

      const newTable = doc.createElement('table');
      [...table.attributes].forEach(attr => newTable.setAttribute(attr.name, attr.value));
      const tbody = doc.createElement('tbody');
      newTable.appendChild(tbody);
      [...table.rows].filter(row => row.querySelector('th')).forEach(row => tbody.appendChild(row.cloneNode(true)));
      part.appendChild(newTable);
      return { part, tbody };
    };

    const appendApaTableAcrossPages = block => {
      const table = block.querySelector('table.data');
      if (!table) return false;
      const dataRows = [...table.rows].filter(row => !row.querySelector('th'));
      if (!dataRows.length) return false;

      const note = block.querySelector('.apa-table-note');
      const analysis = block.querySelector('.apa-table-analysis');
      let partInfo = null;
      let rowsInPart = 0;
      let first = true;

      const beginPart = () => {
        if (!currentBody || currentBody.children.length) startPage();
        partInfo = makeTablePart(block, table, first, !first);
        currentBody.appendChild(partInfo.part);
        rowsInPart = 0;
        first = false;
      };

      beginPart();

      dataRows.forEach(row => {
        const clone = row.cloneNode(true);
        partInfo.tbody.appendChild(clone);
        rowsInPart++;
        if (!bodyOverflows(currentBody)) return;

        partInfo.tbody.removeChild(clone);
        rowsInPart--;

        if (rowsInPart === 0) {
          partInfo.tbody.appendChild(clone);
          clone.style.fontSize = '8.5pt';
          clone.style.lineHeight = '1.2';
          return;
        }

        beginPart();
        partInfo.tbody.appendChild(clone);
        rowsInPart = 1;
      });

      if (note) {
        const noteClone = note.cloneNode(true);
        partInfo.part.appendChild(noteClone);
        if (bodyOverflows(currentBody)) {
          partInfo.part.removeChild(noteClone);
          startPage();
          const label = doc.createElement('div');
          label.className = 'page-topic';
          label.textContent = 'Nota de ' + (block.querySelector('.apa-table-number')?.textContent || 'tabla');
          currentBody.appendChild(label);
          currentBody.appendChild(noteClone);
        }
      }

      if (analysis) {
        const analysisClone = analysis.cloneNode(true);
        currentBody.appendChild(analysisClone);
        if (bodyOverflows(currentBody)) {
          currentBody.removeChild(analysisClone);
          startPage();
          const label = doc.createElement('div');
          label.className = 'page-topic';
          label.textContent = 'Análisis de ' + (block.querySelector('.apa-table-number')?.textContent || 'tabla');
          currentBody.appendChild(label);
          currentBody.appendChild(analysisClone);
        }
      }

      return true;
    };

    const appendBlock = block => {
      if (!currentBody) startPage();

      if (block.classList?.contains('sec-title') && currentBody.children.length && currentBody.scrollHeight > currentBody.clientHeight * 0.58) {
        startPage();
      }

      currentBody.appendChild(block);
      if (!bodyOverflows(currentBody)) return;

      currentBody.removeChild(block);

      if (block.classList?.contains('apa-table-block') && appendApaTableAcrossPages(block)) {
        return;
      }

      startPage();
      currentBody.appendChild(block);

      if (bodyOverflows(currentBody)) {
        block.classList.add('oversized-pdf-block');
        block.style.fontSize = '9pt';
        block.style.lineHeight = '1.25';
      }
    };

    sourceNodes.forEach(appendBlock);

    const pages = [...root.querySelectorAll(':scope > .pdf-page')];
    const total = pages.length;
    const period = (index.querySelector('.footer-note')?.textContent || '').split('·').slice(2, -1).join('·').trim();

    pages.forEach((page, idx) => {
      page.dataset.pdfPage = String(idx + 1);
      const footer = page.querySelector('.footer-note');
      if (!footer) return;
      if (idx === 0) {
        footer.textContent = '';
      } else {
        footer.textContent = 'ITSQMET · Unidad de Gestión de Procesos Académicos' + (period ? ' · ' + period : '') + ' · Página ' + (idx + 1) + ' de ' + total;
      }
    });

    // Recalculate the visible index after real pagination.
    const sectionPages = new Map();
    pages.forEach((page, idx) => {
      const title = page.querySelector('.sec-title');
      if (!title) return;
      const key = (title.textContent || '').trim().replace(/\s+/g, ' ').toLowerCase();
      if (!sectionPages.has(key)) sectionPages.set(key, idx + 1);
    });
    const tocRows = [...index.querySelectorAll('.toc tr')];
    tocRows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length < 2) return;
      const key = (cells[0].textContent || '').trim().replace(/\s+/g, ' ').toLowerCase();
      if (sectionPages.has(key)) cells[cells.length - 1].textContent = String(sectionPages.get(key));
    });

    const overflowPages = pages
      .map((page, idx) => ({ idx, body: page.querySelector('.pdf-body') }))
      .filter(item => item.body && bodyOverflows(item.body));
    if (overflowPages.length) {
      const pageList = overflowPages.map(item => item.idx + 1).join(', ');
      throw new Error('El documento todavía contiene contenido que no cabe en la(s) página(s) ' + pageList + '. No se descargó para evitar información cortada.');
    }

    return pages;
  }

  async function generateExactPages(payload, frame) {
    if (typeof window.html2canvas !== 'function' || !window.jspdf?.jsPDF) {
      return { ok: false, error: 'No se cargaron las librerías necesarias para crear el PDF.' };
    }

    const pages = repaginateExactDocument(frame.contentDocument);
    if (!pages.length) return { ok: false, error: 'No se encontraron páginas para generar el PDF.' };

    const { jsPDF } = window.jspdf;
    const filename = payload.filename || 'documento.pdf';

    // En documentos largos reducimos ligeramente la resolución para evitar
    // agotar la memoria del navegador sin perder legibilidad en A4.
    const scale = pages.length >= 55 ? 1.0 : pages.length >= 40 ? 1.12 : 1.28;
    const quality = pages.length >= 55 ? 0.76 : pages.length >= 40 ? 0.8 : 0.84;

    const pdf = new jsPDF({
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
      compress: true,
      putOnlyUsedFonts: true,
      precision: 2
    });

    emitPdfProgress(0, pages.length, 'render');

    for (let i = 0; i < pages.length; i++) {
      let canvas = null;
      try {
        canvas = await window.html2canvas(pages[i], {
          scale,
          useCORS: true,
          allowTaint: false,
          logging: false,
          imageTimeout: 8000,
          removeContainer: true,
          backgroundColor: '#ffffff',
          width: pages[i].scrollWidth,
          height: pages[i].scrollHeight,
          windowWidth: pages[i].scrollWidth,
          windowHeight: pages[i].scrollHeight
        });

        const jpegBlob = await canvasToJpegBlob(canvas, quality);
        const imageBytes = new Uint8Array(await jpegBlob.arrayBuffer());

        if (i > 0) pdf.addPage('a4', 'portrait');
        pdf.addImage(
          imageBytes,
          'JPEG',
          0,
          0,
          210,
          297,
          'dnf-page-' + i,
          'FAST'
        );

        emitPdfProgress(i + 1, pages.length, 'render');
      } catch (error) {
        throw new Error('Error al generar la página ' + (i + 1) + ' de ' + pages.length + ': ' + (error?.message || error));
      } finally {
        if (canvas) {
          canvas.width = 1;
          canvas.height = 1;
          canvas = null;
        }
      }

      // Cede tiempo al navegador para liberar memoria y mantener la interfaz activa.
      if ((i + 1) % 3 === 0) {
        await new Promise(resolve => setTimeout(resolve, 20));
      }
    }

    emitPdfProgress(pages.length, pages.length, 'assembling');
    await new Promise(resolve => setTimeout(resolve, 30));

    let pdfBlob;
    try {
      pdfBlob = pdf.output('blob');
    } catch (error) {
      throw new Error('No se pudo ensamblar el archivo PDF: ' + (error?.message || error));
    }

    if (!pdfBlob || !pdfBlob.size) {
      throw new Error('El PDF se generó vacío.');
    }

    saveBlob(pdfBlob, filename);
    emitPdfProgress(pages.length, pages.length, 'done');

    return {
      ok: true,
      filePath: filename,
      downloaded: true,
      pages: pages.length,
      size: pdfBlob.size
    };
  }

  async function generatePDF(payload) {
    let frame = null;
    let timeoutId = null;
    try {
      if (!payload?.html) {
        return { ok: false, error: 'No se recibió contenido para generar el PDF.' };
      }

      frame = document.createElement('iframe');
      frame.setAttribute('aria-hidden', 'true');
      frame.style.position = 'fixed';
      frame.style.left = '-12000px';
      frame.style.top = '0';
      frame.style.width = '794px';
      frame.style.height = '1123px';
      frame.style.border = '0';
      frame.style.background = '#fff';
      frame.style.visibility = 'hidden';

      const loaded = new Promise((resolve, reject) => {
        timeoutId = setTimeout(() => reject(new Error('No se pudo preparar el documento para PDF.')), 10000);
        frame.onload = () => {
          clearTimeout(timeoutId);
          timeoutId = null;
          resolve();
        };
        frame.onerror = () => {
          clearTimeout(timeoutId);
          timeoutId = null;
          reject(new Error('No se pudo preparar el documento para PDF.'));
        };
      });

      frame.srcdoc = payload.html;
      document.body.appendChild(frame);
      await loaded;

      const doc = frame.contentDocument;
      if (!doc?.body) throw new Error('El documento PDF no pudo renderizarse.');

      if (doc.fonts?.ready) {
        await Promise.race([
          doc.fonts.ready,
          new Promise(resolve => setTimeout(resolve, 1500))
        ]);
      }

      if (payload.exactPages || doc.querySelector('.pdf-page')) {
        return await generateExactPages(payload, frame);
      }

      if (typeof window.html2pdf !== 'function') {
        return { ok: false, error: 'El generador PDF no se cargó. Recarga la página e inténtalo nuevamente.' };
      }

      const filename = payload.filename || 'documento.pdf';
      const options = {
        margin: 0,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 794
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
          avoid: ['.avoid', 'tr']
        }
      };

      const work = window.html2pdf().set(options).from(doc.body).save();
      await Promise.race([
        work,
        new Promise((_, reject) => {
          timeoutId = setTimeout(
            () => reject(new Error('La generación del PDF tardó demasiado.')),
            45000
          );
        })
      ]);

      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      return { ok: true, filePath: filename, downloaded: true };
    } catch (error) {
      return { ok: false, error: error?.message || String(error) };
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      if (frame?.parentNode) frame.remove();
    }
  }

  window.docformacion = {
    loadData,
    saveData,
    importExcel,
    exportExcelTemplate,
    pickEvidence,
    generatePDF,
    readFirebase
  };
})();
