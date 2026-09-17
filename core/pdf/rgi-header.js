(() => {
  'use strict';

  const clean = value => String(value ?? '').trim();

  function identity(organization = '') {
    const raw = clean(organization);
    const parts = raw.split(/\s*[·|]\s*/).filter(Boolean);
    if (parts.length >= 2) {
      return {
        institution: clean(parts[0]) || 'ITSQMET',
        unit: clean(parts.slice(1).join(' · '))
      };
    }
    return {
      institution: /^ITSQMET$/i.test(raw) ? raw : 'ITSQMET',
      unit: /^ITSQMET$/i.test(raw) ? '' : raw
    };
  }

  function centerLines(doc, text, x, y, width, height, opts = {}) {
    const value = clean(text);
    if (!value) return;
    const size = Number(opts.size || 8.5);
    const lineHeight = Number(opts.lineHeight || 3.8);
    const maxWidth = Math.max(8, width - Number(opts.paddingX || 5));
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(25);
    const lines = doc.splitTextToSize(value, maxWidth);
    const totalHeight = Math.max(lineHeight, lines.length * lineHeight);
    const startY = y + (height - totalHeight) / 2 + lineHeight * 0.78;
    doc.text(lines, x + width / 2, startY, {
      align:'center',
      lineHeightFactor:1.05
    });
  }

  function logoSource(meta = {}) {
    return {
      dataUrl: clean(meta.logoDataUrl || window.DOCFORMACION_LOGO_DATA_URL),
      format: clean(meta.logoFormat || window.DOCFORMACION_LOGO_FORMAT || 'JPEG'),
      ratio: Number(meta.logoAspectRatio || window.DOCFORMACION_LOGO_ASPECT_RATIO || (240 / 95))
    };
  }

  function singleLineFit(doc, value, maxWidth, preferred = 7.0, minimum = 4.6) {
    const text = clean(value);
    let size = preferred;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(size);
    while (size > minimum && doc.getTextWidth(text) > maxWidth) {
      size -= 0.2;
      doc.setFontSize(size);
    }
    return Math.max(minimum, size);
  }

  function draw(doc, pageW, meta = {}) {
    const x = 15;
    const y = 15;
    const width = Math.min(180, pageW - 30);
    const colA = width * 0.25;
    const colB = width * 0.50;
    const colC = width * 0.25;
    const row1 = 8;
    const row2 = 20;
    const height = row1 + row2;
    const parts = identity(meta.organization);
    const institution = clean(meta.institution || parts.institution || 'ITSQMET');
    const unit = clean(meta.unit || parts.unit);
    const title = clean(meta.title);
    const period = clean(meta.period);
    const code = clean(meta.code).replace(/\s+/g, ' ');
    const logo = logoSource(meta);

    doc.setFillColor(255, 255, 255);
    doc.rect(x, y, width, height, 'F');
    doc.setDrawColor(0);
    doc.setLineWidth(.22);
    doc.rect(x, y, width, height);
    doc.setLineWidth(.18);
    doc.line(x + colA, y, x + colA, y + height);
    doc.line(x + colA + colB, y, x + colA + colB, y + height);
    doc.line(x + colA, y + row1, x + colA + colB, y + row1);

    let logoDrawn = false;
    if (logo.dataUrl && typeof doc.addImage === 'function') {
      try {
        const maxW = Math.min(36, colA - 7);
        const maxH = Math.min(15, height - 10);
        const ratio = Number.isFinite(logo.ratio) && logo.ratio > 0 ? logo.ratio : (240 / 95);
        let logoW = maxW;
        let logoH = logoW / ratio;
        if (logoH > maxH) {
          logoH = maxH;
          logoW = logoH * ratio;
        }
        doc.addImage(
          logo.dataUrl,
          logo.format || 'JPEG',
          x + (colA - logoW) / 2,
          y + 4,
          logoW,
          logoH
        );
        logoDrawn = true;
      } catch (error) {
        console.warn('[DocFormación] No se pudo dibujar el logo institucional en el encabezado:', error);
      }
    }

    if (!logoDrawn) {
      centerLines(doc, institution, x, y, colA, height - 5, { size:10, bold:true, paddingX:6, lineHeight:4.2 });
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.8);
    doc.setTextColor(55);
    doc.text(institution || 'ITSQMET', x + colA / 2, y + height - 2.6, { align:'center' });

    centerLines(doc, unit || 'UNIDAD RESPONSABLE', x + colA, y, colB, row1, {
      size:8.2,
      bold:true,
      paddingX:6,
      lineHeight:3.3
    });

    const centerX = x + colA;
    const centerY = y + row1;
    const content = [title, period].filter(Boolean);
    if (content.length) {
      doc.setTextColor(25);
      const titleLines = title ? doc.splitTextToSize(title, colB - 8) : [];
      const periodLines = period ? doc.splitTextToSize(period, colB - 8) : [];
      const titleLineH = 3.8;
      const periodLineH = 3.6;
      const gap = title && period ? 2.1 : 0;
      const totalH = titleLines.length * titleLineH + gap + periodLines.length * periodLineH;
      let textY = centerY + (row2 - totalH) / 2 + 3;
      if (titleLines.length) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.6);
        doc.text(titleLines, centerX + colB / 2, textY, { align:'center', lineHeightFactor:1.05 });
        textY += titleLines.length * titleLineH + gap;
      }
      if (periodLines.length) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.1);
        doc.text(periodLines, centerX + colB / 2, textY, { align:'center', lineHeightFactor:1.05 });
      }
    }

    const codeX = x + colA + colB;
    doc.setTextColor(25);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text('Código:', codeX + colC / 2, y + 9.2, { align:'center' });
    if (code) {
      const fontSize = singleLineFit(doc, code, colC - 3.5, 6.8, 4.6);
      doc.setFontSize(fontSize);
      doc.text(code, codeX + colC / 2, y + 17.2, { align:'center' });
    }

    return Object.freeze({ x, y, width, height, bottom:y + height, columns:[colA,colB,colC], rows:[row1,row2] });
  }

  window.docformacionRgiHeader = Object.freeze({ draw, identity, logoSource, singleLineFit });
})();
