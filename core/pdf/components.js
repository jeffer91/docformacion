(() => {
  'use strict';

  const clean = value => String(value ?? '').trim();

  function create(doc, layout, ensure, newPage) {
    const { left, bodyW, pageH, bottom } = layout;

    function heading(text, level = 1) {
      const size = level === 1 ? 14 : level === 2 ? 11 : 9.5;
      const lines = doc.splitTextToSize(clean(text), bodyW);
      ensure(lines.length * 5 + 8);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(size);
      doc.setTextColor(30);
      doc.text(lines, left, layout.y(), { lineHeightFactor: 1.12 });
      layout.advance(lines.length * 5 + 4);
    }

    function paragraph(text, opts = {}) {
      const size = opts.size || 9.2;
      const lineH = opts.lineH || 4.7;
      doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
      doc.setFontSize(size);
      doc.setTextColor(opts.muted ? 90 : 35);
      const lines = doc.splitTextToSize(clean(text), bodyW);
      lines.forEach(line => {
        ensure(lineH);
        doc.text(line, left, layout.y());
        layout.advance(lineH);
      });
      layout.advance(2);
    }

    function bullet(text) {
      const lines = doc.splitTextToSize(clean(text), bodyW - 7);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(35);
      lines.forEach((line, index) => {
        ensure(4.6);
        if (index === 0) doc.text('•', left + 1, layout.y());
        doc.text(line, left + 6, layout.y());
        layout.advance(4.6);
      });
      layout.advance(1);
    }

    function table(headers, rows, weights) {
      if (!rows?.length) {
        paragraph('Sin registros disponibles para esta sección.', { muted: true });
        return;
      }
      const total = (weights || headers.map(() => 1)).reduce((a, b) => a + b, 0);
      const widths = (weights || headers.map(() => 1)).map(value => bodyW * value / total);
      const pad = 1.4;
      const fontSize = 7.2;
      const lineH = 3.2;
      const wrap = (value, width, bold = false) => {
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setFontSize(fontSize);
        return doc.splitTextToSize(clean(value) || ' ', Math.max(5, width - pad * 2));
      };
      const rowHeight = (row, bold = false) => Math.max(...row.map((cell, index) => wrap(cell, widths[index], bold).length)) * lineH + pad * 2;
      const draw = (row, head = false) => {
        const h = rowHeight(row, head);
        ensure(h);
        let x = left;
        row.forEach((cell, index) => {
          if (head) {
            doc.setFillColor(43, 82, 108);
            doc.rect(x, layout.y(), widths[index], h, 'F');
          }
          doc.setDrawColor(150);
          doc.rect(x, layout.y(), widths[index], h);
          doc.setFont('helvetica', head ? 'bold' : 'normal');
          doc.setFontSize(fontSize);
          doc.setTextColor(head ? 255 : 35);
          doc.text(wrap(cell, widths[index], head), x + pad, layout.y() + pad + 2.3, { lineHeightFactor: 1.05 });
          x += widths[index];
        });
        layout.advance(h);
        doc.setTextColor(35);
      };
      draw(headers, true);
      rows.forEach(row => {
        const h = rowHeight(row, false);
        if (layout.y() + h > pageH - bottom) {
          newPage();
          draw(headers, true);
        }
        draw(row, false);
      });
      layout.advance(3);
    }

    function metricTable(rows) {
      table(['Indicador', 'Resultado'], rows, [68, 32]);
    }

    function barChart(title, data) {
      heading(title, 2);
      if (!data?.length) {
        paragraph('Sin datos para graficar.', { muted: true });
        return;
      }
      const max = Math.max(...data.map(item => Number(item.value || 0)), 1);
      const x = left + 58;
      const width = bodyW - 65;
      const rowH = 8;
      data.forEach(item => {
        ensure(rowH);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(45);
        doc.text(doc.splitTextToSize(clean(item.label), 52)[0] || '', left, layout.y() + 4.5);
        doc.setFillColor(228, 234, 241);
        doc.rect(x, layout.y(), width, 4, 'F');
        doc.setFillColor(48, 92, 126);
        doc.rect(x, layout.y(), width * (Number(item.value || 0) / max), 4, 'F');
        doc.setFont('helvetica', 'bold');
        doc.text(String(item.value), x + width + 2, layout.y() + 3.5);
        layout.advance(rowH);
      });
      layout.advance(2);
    }

    function note(text) {
      paragraph(text, { size: 7.7, muted: true });
    }

    return Object.freeze({ heading, paragraph, bullet, table, metricTable, barChart, note });
  }

  window.docformacionPdfComponents = Object.freeze({ create });
})();
