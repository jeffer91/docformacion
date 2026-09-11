(() => {
  'use strict';

  function createWriter(options = {}) {
    if (!window.jspdf?.jsPDF) throw new Error('No se cargó el motor PDF. Recarga la aplicación.');
    if (!window.docformacionPdfComponents) throw new Error('No se cargaron los componentes PDF del Core.');

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
    const top = Number(options.top || 42);
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
      const organization = String(headerData.organization || '').trim();
      const title = String(headerData.title || '').trim();
      const period = String(headerData.period || '').trim();
      const code = String(headerData.code || '').trim();
      const section = String(headerData.section || '').trim();

      doc.setDrawColor(155);
      doc.setLineWidth(.2);
      doc.rect(15, 10, pageW - 30, 25);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(35);
      if (organization) doc.text(organization, 18, 16);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      if (title) doc.text(title, 18, 22);
      if (period) doc.text(period, 18, 28);
      doc.setFont('helvetica', 'bold');
      if (code) doc.text(code, pageW - 18, 22, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      if (section) doc.text(section, pageW - 18, 28, { align: 'right' });
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

    header();

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
