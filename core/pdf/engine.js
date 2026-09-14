(() => {
  'use strict';

  function createWriter(options = {}) {
    if (!window.jspdf?.jsPDF) throw new Error('No se cargó el motor PDF. Recarga la aplicación.');
    if (!window.docformacionPdfComponents) throw new Error('No se cargaron los componentes PDF del Core.');
    if (!window.docformacionRgiHeader) throw new Error('No se cargó el encabezado RGI institucional.');

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      unit: 'mm',
      format: 'a4',
      orientation: options.orientation || 'portrait',
      compress: true,
      putOnlyUsedFonts: true,
      precision: 2
    });

    const pageW = options.orientation === 'landscape' ? 297 : 210;
    const pageH = options.orientation === 'landscape' ? 210 : 297;
    const left = Number(options.left || 18);
    const right = Number(options.right || 18);
    const top = Number(options.top || 50);
    const bottom = Number(options.bottom || 18);
    const bodyW = pageW - left - right;
    let y = top;

    const layout = {
      pageW,
      pageH,
      left,
      right,
      top,
      bottom,
      bodyW,
      y: () => y,
      setY: value => { y = Number(value); },
      advance: value => { y += Number(value || 0); }
    };

    function header() {
      const headerData = typeof options.header === 'function' ? options.header() : (options.header || {});
      window.docformacionRgiHeader.draw(doc, pageW, headerData);
    }

    function newPage() {
      doc.addPage();
      header();
      y = top;
    }

    function ensure(height) {
      if (y + Number(height || 0) > pageH - bottom) newPage();
    }

    const components = window.docformacionPdfComponents.create(doc, layout, ensure, newPage);

    function finish(meta = {}) {
      const pages = doc.getNumberOfPages();
      for (let page = 1; page <= pages; page++) {
        if (page === 1 && options.firstPageFooter === false) continue;
        doc.setPage(page);
        doc.setFillColor(255);
        doc.rect(0, pageH - 13, pageW, 13, 'F');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.6);
        doc.setTextColor(105);
        const footer = typeof options.footer === 'function'
          ? options.footer(page, pages)
          : String(options.footer || ('Página ' + page + ' de ' + pages));
        doc.text(footer, pageW / 2, pageH - 8, { align: 'center' });
      }
      doc.setProperties({
        title: String(meta.title || options.title || ''),
        subject: String(meta.subject || options.subject || ''),
        author: String(meta.author || options.author || '')
      });
      const blob = doc.output('blob');
      if (!blob?.size) throw new Error('El PDF generado está vacío.');
      return { blob, pages, size: blob.size };
    }

    if (options.initialHeader !== false) header();

    return Object.freeze({
      ...components,
      newPage,
      ensure,
      finish,
      raw: doc,
      layout
    });
  }

  window.docformacionPdfCore = Object.freeze({ createWriter });
})();
