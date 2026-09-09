(() => {
  'use strict';

  const api = window.docformacion;
  if (!api || typeof api.generatePDF !== 'function' || !window.jspdf?.jsPDF) return;

  const previousGeneratePDF = api.generatePDF.bind(api);
  const OriginalJsPDF = window.jspdf.jsPDF;
  const ENGINE = 'dnf-vector-jspdf-v4-methodology';
  const CM = 72 / 2.54;
  const BODY = {
    left: 72,
    right: 72,
    top: 150,
    bottom: 72,
    fontSize: 12,
    lineHeight: 24,
    paragraphIndent: 36
  };
  const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

  const METHODOLOGY = [
    { type:'h1', text:'4. Metodología y Enfoque' },
    { type:'p', text:'La detección de necesidades de formación docente en el ITSQMET se sustenta en un enfoque metodológico de diagnóstico participativo institucional, basado en la identificación de brechas reales entre el perfil requerido del docente y su situación actual. Esta metodología se fundamenta en el principio de mejora continua, reconociendo que el fortalecimiento del talento humano es un eje estratégico para garantizar la calidad académica, la coherencia curricular y el cumplimiento del modelo pedagógico institucional.' },
    { type:'p', text:'El proceso se desarrolló mediante una articulación entre actores institucionales, análisis de información de origen cualitativo y cuantitativo, y revisión de lineamientos externos. Se tomaron como insumos los perfiles de titulación docente, los requerimientos del modelo educativo, los indicadores de acreditación nacional y los planes de desarrollo institucional. La integración de estas fuentes permitió una caracterización precisa de las necesidades, facilitando la priorización y planificación estructurada del Plan de Formación Docente.' },

    { type:'h2', text:'4.1. Objetivo General' },
    { type:'p', text:'Identificar de manera técnica y contextualizada las brechas de formación académica existentes en el cuerpo docente del ITSQMET, con el fin de establecer prioridades y lineamientos que permitan estructurar un Plan de Formación pertinente, articulado a los objetivos institucionales, el perfil de carrera docente, el modelo pedagógico y los criterios de calidad definidos por el ente acreditador nacional.' },

    { type:'h2', text:'4.2. Objetivos Específicos' },
    { type:'bullet', text:'Identificar el universo de docentes activos en el ITSQMET y clasificar su información por modalidad contractual, sede, y nivel de formación.' },
    { type:'bullet', text:'Diagnosticar la formación académica actual del cuerpo docente mediante el análisis de registros institucionales y validación con las unidades responsables.' },
    { type:'bullet', text:'Contrastar el perfil académico identificado con los requerimientos normativos, institucionales y de acreditación para evidenciar brechas.' },
    { type:'bullet', text:'Categorizar y priorizar las necesidades de formación docente según criterios técnicos, considerando la relación con el perfil de egreso, carga académica y áreas críticas.' },
    { type:'bullet', text:'Consolidar los resultados obtenidos en un informe técnico que oriente la formulación del Plan de Formación Docente institucional.' },

    { type:'h2', text:'4.3. Estrategia de levantamiento de información' },
    { type:'p', text:'Para identificar de manera precisa las necesidades de formación docente en el ITSQMET, se implementó una estrategia de levantamiento de información basada en un enfoque mixto. Esta estrategia combinó métodos cuantitativos y cualitativos que permitieron recopilar, contrastar y validar datos desde múltiples perspectivas institucionales, promoviendo un análisis integral, contextualizado y alineado con los objetivos estratégicos de la institución.' },
    { type:'p', text:'El proceso se ejecutó en dos niveles. Por un lado, se aplicó una encuesta estructurada dirigida a la totalidad del cuerpo docente, con el objetivo de identificar niveles de formación alcanzados, intereses de desarrollo profesional y brechas autoidentificadas. Por otro lado, se realizaron entrevistas semiestructuradas a Coordinadores de Carrera para captar información técnica y contextual, validar hallazgos y establecer criterios de priorización institucional.' },

    { type:'h3', text:'4.3.1. Métodos cuantitativos utilizados' },
    { type:'p', text:'El componente cuantitativo se sustentó en el diseño y aplicación de una encuesta digital autoadministrada, estructurada por bloques temáticos. La recolección de datos se enfocó en variables como:' },
    { type:'bullet', text:'Nivel de formación académica actual del docente.' },
    { type:'bullet', text:'Áreas prioritarias de interés para formación.' },
    { type:'bullet', text:'Modalidades preferidas de estudio.' },
    { type:'bullet', text:'Disponibilidad horaria y aspiraciones de corto y mediano plazo.' },
    { type:'p', text:'Los resultados fueron analizados con base en porcentajes relativos, permitiendo identificar tendencias globales y diferenciales entre áreas académicas. Esta información constituyó la base para el análisis estadístico y la categorización por tipo de formación requerida (tecnológica, universitaria, maestría, doctorado).' },

    { type:'h3', text:'4.3.2. Métodos cualitativos utilizados' },
    { type:'p', text:'Desde el enfoque cualitativo, se desarrollaron entrevistas semiestructuradas con Coordinadores de Carrera y autoridades académicas. Estas entrevistas permitieron:' },
    { type:'bullet', text:'Validar la información obtenida en las encuestas.' },
    { type:'bullet', text:'Identificar necesidades no manifestadas explícitamente por los docentes.' },
    { type:'bullet', text:'Obtener criterios técnicos para la priorización de formación según pertinencia curricular, perfil docente y visión institucional.' },
    { type:'p', text:'El análisis de contenido de las entrevistas permitió complementar y contextualizar los hallazgos cuantitativos, fortaleciendo la toma de decisiones institucionales con base en una lectura situada de la realidad docente.' }
  ];

  function isDnf(payload = {}) {
    return !!payload?.exactPages || /necesidades/i.test(String(payload?.filename || ''));
  }

  function getPeriod() {
    return (typeof state !== 'undefined' && state?.period) ? state.period : {};
  }

  function formatPeriodPart(value, capitalize = false) {
    const raw = String(value || '').trim();
    const match = raw.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/);
    if (!match) return raw;
    const month = MONTHS[Number(match[2]) - 1] || match[2];
    const text = month + ' ' + match[1];
    return capitalize ? text.charAt(0).toUpperCase() + text.slice(1) : text;
  }

  function periodText(capitalize = false) {
    const p = getPeriod();
    const start = formatPeriodPart(p.start, capitalize);
    const end = formatPeriodPart(p.end, capitalize);
    if (start && end) return start + ' a ' + end;
    return start || end || (capitalize ? 'Período seleccionado' : 'período seleccionado');
  }

  function documentCode() {
    return String(getPeriod().dnfCode || '').trim();
  }

  function documentTitle() {
    return 'Detección de Necesidades de Formación';
  }

  function imageFormat(dataUrl = '') {
    if (/^data:image\/png/i.test(dataUrl)) return 'PNG';
    if (/^data:image\/webp/i.test(dataUrl)) return 'WEBP';
    return 'JPEG';
  }

  function getLogoData() {
    try {
      if (typeof INSTITUTION_LOGO_DATA !== 'undefined' && typeof INSTITUTION_LOGO_DATA === 'string') return INSTITUTION_LOGO_DATA;
    } catch (_error) {}
    return '';
  }

  function fitImage(doc, dataUrl, maxW, maxH) {
    try {
      const props = doc.getImageProperties(dataUrl);
      const ratio = props.width / props.height;
      let w = maxW;
      let h = w / ratio;
      if (h > maxH) {
        h = maxH;
        w = h * ratio;
      }
      return { w, h };
    } catch (_error) {
      return { w: maxW, h: maxH };
    }
  }

  function drawHeader(doc, pageNo) {
    doc.setPage(pageNo);
    const pageW = doc.internal.pageSize.getWidth();
    const totalW = 18 * CM;
    const x = (pageW - totalW) / 2;
    const top = 1.5 * CM;
    const h = 2.8 * CM;
    const colA = totalW * 0.25;
    const colB = totalW * 0.50;
    const colC = totalW * 0.25;
    const row1 = 0.8 * CM;
    const row2 = h - row1;
    const bx = x + colA;
    const cx = bx + colB;

    doc.setDrawColor(70);
    doc.setLineWidth(0.65);
    doc.rect(x, top, totalW, h);
    doc.line(bx, top, bx, top + h);
    doc.line(cx, top, cx, top + h);
    doc.line(bx, top + row1, cx, top + row1);

    const logo = getLogoData();
    if (logo) {
      try {
        const fitted = fitImage(doc, logo, Math.min(colA - 12, 3.8 * CM), Math.min(h - 12, 1.8 * CM));
        doc.addImage(logo, imageFormat(logo), x + (colA - fitted.w) / 2, top + (h - fitted.h) / 2, fitted.w, fitted.h, undefined, 'FAST');
      } catch (_error) {}
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('ITSQMET', x + colA / 2, top + h / 2, { align:'center' });
    }

    doc.setTextColor(30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const unitLines = doc.splitTextToSize('UNIDAD DE GESTIÓN DE PROCESOS ACADÉMICOS', colB - 12);
    doc.text(unitLines, bx + colB / 2, top + (row1 - unitLines.length * 9.2) / 2 + 7.2, { align:'center', lineHeightFactor:1.02 });

    const titleLines = doc.splitTextToSize(documentTitle(), colB - 18);
    const periodLines = doc.splitTextToSize(periodText(true), colB - 18);
    let groupY = top + row1 + (row2 - (titleLines.length * 9.3 + 3 + periodLines.length * 9.1)) / 2 + 7.2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(titleLines, bx + colB / 2, groupY, { align:'center', lineHeightFactor:1.02 });
    groupY += titleLines.length * 9.3 + 3;
    doc.setFontSize(8.2);
    doc.text(periodLines, bx + colB / 2, groupY, { align:'center', lineHeightFactor:1.02 });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.text('Código:', cx + colC / 2, top + h / 2 - 8, { align:'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.1);
    doc.text(doc.splitTextToSize(documentCode(), colC - 14), cx + colC / 2, top + h / 2 + 5, { align:'center', lineHeightFactor:1.05 });
  }

  function createWriter(doc) {
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const bodyW = pageW - BODY.left - BODY.right;
    let y = BODY.top;

    function font(style = 'normal', size = BODY.fontSize) {
      doc.setFont('times', style);
      doc.setFontSize(size);
      doc.setTextColor(0);
    }

    function newPage() {
      doc.addPage();
      const pageNo = doc.getNumberOfPages();
      drawHeader(doc, pageNo);
      font();
      y = BODY.top;
    }

    function ensureSpace(height) {
      if (y + height > pageH - BODY.bottom) newPage();
    }

    function heading(text, level = 1) {
      font('bold', 12);
      const lines = doc.splitTextToSize(String(text || ''), bodyW);
      const before = level === 1 ? 0 : (level === 2 ? 12 : 8);
      const after = level === 1 ? 18 : (level === 2 ? 12 : 8);
      ensureSpace(before + lines.length * BODY.lineHeight + after + BODY.lineHeight * 2);
      y += before;
      doc.text(lines, BODY.left, y, { align:'left', lineHeightFactor:2 });
      y += lines.length * BODY.lineHeight + after;
    }

    function wrap(text, firstWidth, otherWidth) {
      font('normal');
      const words = String(text || '').trim().split(/\s+/).filter(Boolean);
      const lines = [];
      let current = '';
      let available = firstWidth;
      words.forEach(word => {
        const candidate = current ? current + ' ' + word : word;
        if (doc.getTextWidth(candidate) <= available) {
          current = candidate;
        } else {
          if (current) lines.push({ text: current, width: available });
          current = word;
          available = otherWidth;
        }
      });
      if (current) lines.push({ text: current, width: available });
      return lines;
    }

    function drawJustifiedLine(text, x, width, justify) {
      const words = String(text || '').split(/\s+/).filter(Boolean);
      if (!words.length) return;
      font('normal');
      if (!justify || words.length === 1) {
        doc.text(words.join(' '), x, y);
        return;
      }
      const wordsWidth = words.reduce((sum, word) => sum + doc.getTextWidth(word), 0);
      const normalSpace = doc.getTextWidth(' ');
      const gap = Math.max(normalSpace, (width - wordsWidth) / (words.length - 1));
      let cursor = x;
      words.forEach((word, index) => {
        doc.text(word, cursor, y);
        cursor += doc.getTextWidth(word);
        if (index < words.length - 1) cursor += gap;
      });
    }

    function paragraph(text) {
      const firstWidth = bodyW - BODY.paragraphIndent;
      const lines = wrap(text, firstWidth, bodyW);
      let index = 0;
      while (index < lines.length) {
        let available = Math.floor((pageH - BODY.bottom - y) / BODY.lineHeight);
        if (available < 2 && lines.length - index > 1) {
          newPage();
          available = Math.floor((pageH - BODY.bottom - y) / BODY.lineHeight);
        }
        let take = Math.min(Math.max(available, 1), lines.length - index);
        const remaining = lines.length - index - take;
        if (remaining === 1 && take > 2) take -= 1;
        if (take <= 0) {
          newPage();
          continue;
        }
        for (let offset = 0; offset < take; offset++) {
          const absolute = index + offset;
          const first = absolute === 0;
          const x = BODY.left + (first ? BODY.paragraphIndent : 0);
          const width = first ? firstWidth : bodyW;
          const last = absolute === lines.length - 1;
          drawJustifiedLine(lines[absolute].text, x, width, !last);
          y += BODY.lineHeight;
        }
        index += take;
        if (index < lines.length) newPage();
      }
      y += 8;
    }

    function bullet(text) {
      const leftExtra = 30;
      const bulletX = BODY.left + 8;
      const textX = BODY.left + leftExtra;
      const width = bodyW - leftExtra;
      font('normal');
      const lines = wrap(text, width, width);
      let index = 0;
      while (index < lines.length) {
        let available = Math.floor((pageH - BODY.bottom - y) / BODY.lineHeight);
        if (available < 1) {
          newPage();
          available = Math.floor((pageH - BODY.bottom - y) / BODY.lineHeight);
        }
        const take = Math.min(Math.max(available, 1), lines.length - index);
        for (let offset = 0; offset < take; offset++) {
          const absolute = index + offset;
          if (absolute === 0) {
            font('normal');
            doc.text('•', bulletX, y);
          }
          doc.text(lines[absolute].text, textX, y);
          y += BODY.lineHeight;
        }
        index += take;
        if (index < lines.length) newPage();
      }
      y += 2;
    }

    newPage();
    return { heading, paragraph, bullet, newPage, ensureSpace };
  }

  function appendMethodology(doc) {
    if (doc.__docformacionMethodologyAppended) return;
    doc.__docformacionMethodologyAppended = true;

    const writer = createWriter(doc);
    METHODOLOGY.forEach(block => {
      if (block.type === 'h1') writer.heading(block.text, 1);
      else if (block.type === 'h2') writer.heading(block.text, 2);
      else if (block.type === 'h3') writer.heading(block.text, 3);
      else if (block.type === 'bullet') writer.bullet(block.text);
      else writer.paragraph(block.text);
    });
  }

  function redrawFooters(doc) {
    const total = doc.getNumberOfPages();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const period = periodText(true);

    for (let pageNo = 1; pageNo <= total; pageNo++) {
      doc.setPage(pageNo);
      doc.setFillColor(255, 255, 255);
      doc.rect(0, pageH - 44, pageW, 30, 'F');
      doc.setTextColor(105);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      const footer = 'ITSQMET · Unidad de Gestión de Procesos Académicos · ' + period + ' · Página ' + pageNo + ' de ' + total;
      doc.text(footer, pageW / 2, pageH - 24, { align:'center' });
    }
  }

  function WrappedJsPDF(...args) {
    const doc = new OriginalJsPDF(...args);
    const originalSave = doc.save.bind(doc);
    doc.save = function patchedSave(filename, options) {
      const isDnfFile = /necesidades/i.test(String(filename || ''));
      if (isDnfFile) {
        appendMethodology(doc);
        redrawFooters(doc);
        window.__DOCFORMACION_DNF_VECTOR_STAGE = 'cover+introduction+base-legal+alignment+methodology';
        window.__DOCFORMACION_DNF_RENDERER = ENGINE;
      }
      return originalSave(filename, options);
    };
    return doc;
  }

  WrappedJsPDF.API = OriginalJsPDF.API;
  WrappedJsPDF.version = OriginalJsPDF.version;
  Object.setPrototypeOf(WrappedJsPDF, OriginalJsPDF);
  window.jspdf.jsPDF = WrappedJsPDF;

  api.generatePDF = async function methodologyRouter(payload = {}) {
    const result = await previousGeneratePDF(payload);
    if (isDnf(payload) && result?.ok) {
      return {
        ...result,
        renderer: ENGINE,
        scope: 'cover+introduction+base-legal+alignment+methodology'
      };
    }
    return result;
  };

  window.__DOCFORMACION_DNF_VECTOR_STAGE = 'cover+introduction+base-legal+alignment+methodology';
})();
