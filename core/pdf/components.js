(() => {
  'use strict';

  const clean = value => String(value ?? '').trim();

  function create(doc, layout, ensure, newPage) {
    const { left, bodyW, pageH, bottom, pageW, top } = layout;

    function cover(meta = {}) {
      const title = clean(meta.title);
      const period = clean(meta.period);
      const signatures = Array.isArray(meta.signatures) ? meta.signatures : [];
      const draft = meta.draft === true;

      window.docformacionRgiHeader.draw(doc, pageW, meta);

      if (draft) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.setTextColor(150);
        doc.text('BORRADOR', pageW / 2, 78, { align:'center' });
        doc.setDrawColor(185);
        doc.setLineWidth(.35);
        doc.roundedRect(pageW / 2 - 34, 65, 68, 18, 2, 2);
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(35);
      const titleLines = doc.splitTextToSize(title, pageW - 50);
      const titleY = draft ? 112 : 106;
      doc.text(titleLines, pageW / 2, titleY, { align:'center', lineHeightFactor:1.15 });
      doc.setFontSize(13);
      if (period) doc.text(period, pageW / 2, titleY + titleLines.length * 8 + 10, { align:'center' });

      if (signatures.length) {
        const x = 15;
        const tableW = pageW - 30;
        const colW = tableW / signatures.length;
        const y = pageH - 62;
        const h = 42;
        doc.setDrawColor(90);
        doc.rect(x, y, tableW, h);
        for (let index = 1; index < signatures.length; index++) doc.line(x + colW * index, y, x + colW * index, y + h);
        doc.line(x, y + 19, x + tableW, y + 19);
        doc.line(x, y + 29, x + tableW, y + 29);
        signatures.forEach((entry, index) => {
          const cx = x + colW * index;
          doc.setFont('helvetica','bold');
          doc.setFontSize(7);
          doc.setTextColor(35);
          doc.text(clean(entry.label), cx + 3, y + 5);

          // Espacio real para firma: no se imprime ningún placeholder de firma o QR.
          doc.setDrawColor(145);
          doc.setLineWidth(.18);
          doc.line(cx + 8, y + 14, cx + colW - 8, y + 14);

          doc.setFont('helvetica','normal');
          doc.setFontSize(6.7);
          doc.text(doc.splitTextToSize('NOMBRE: ' + clean(entry.name), colW - 6), cx + 3, y + 25, { lineHeightFactor:1.05 });
          doc.text(doc.splitTextToSize('CARGO: ' + clean(entry.role), colW - 6), cx + 3, y + 34, { lineHeightFactor:1.05 });
        });
      }
    }

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
      const value = clean(text);
      if (!value) return;
      const size = opts.size || 9.2;
      const lineH = opts.lineH || 4.7;
      doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
      doc.setFontSize(size);
      doc.setTextColor(opts.muted ? 90 : 35);
      const lines = doc.splitTextToSize(value, bodyW);
      lines.forEach(line => {
        ensure(lineH);
        doc.text(line, left, layout.y());
        layout.advance(lineH);
      });
      layout.advance(2);
    }

    function bullet(text) {
      const value = clean(text);
      if (!value) return;
      const lines = doc.splitTextToSize(value, bodyW - 7);
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

      const headerHeight = rowHeight(headers, true);
      const firstRowHeight = rowHeight(rows[0], false);
      ensure(headerHeight + firstRowHeight);
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
      if (!data?.length) {
        heading(title, 2);
        paragraph('Sin datos para graficar.', { muted: true });
        return;
      }
      const rowH = 8;
      const titleLines = doc.splitTextToSize(clean(title), bodyW);
      const titleBlock = titleLines.length * 5 + 8;
      const chartBlock = data.length * rowH + 3;
      // El título y todas las barras se mantienen juntos para evitar filas huérfanas.
      ensure(titleBlock + chartBlock);
      heading(title, 2);

      const max = Math.max(...data.map(item => Number(item.value || 0)), 1);
      const x = left + 58;
      const width = bodyW - 65;
      data.forEach(item => {
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

    return Object.freeze({ cover, heading, paragraph, bullet, table, metricTable, barChart, note });
  }

  window.docformacionPdfComponents = Object.freeze({ create });
})();
