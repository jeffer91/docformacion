(() => {
  'use strict';

  const api = window.docformacion;
  if (!api || typeof api.generatePDF !== 'function') return;

  const previousGeneratePDF = api.generatePDF.bind(api);
  const ENGINE = 'dnf-vector-jspdf-v2';
  const CM = 72 / 2.54;
  const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

  const BODY = {
    left: 72,
    right: 72,
    top: 150,
    bottom: 72,
    fontSize: 12,
    lineHeight: 24,
    paragraphIndent: 36
  };

  const INTRODUCTION = [
    'En el contexto de la educación superior, la calidad académica se encuentra estrechamente relacionada con la formación, cualificación y desarrollo permanente del personal docente. La evolución de los entornos profesionales, los avances tecnológicos, las nuevas metodologías educativas y las transformaciones sociales demandan que las instituciones de educación superior mantengan procesos sistemáticos que permitan identificar las necesidades de formación de su claustro académico y orientar acciones para su fortalecimiento.',
    'La formación docente debe entenderse como un proceso continuo que permite fortalecer y transformar la práctica académica. Díaz Barriga (2006) plantea la formación docente como un proceso permanente de construcción intencional de saberes que posibilita al profesorado reflexionar y transformar su práctica. Desde esta perspectiva, la formación no se limita a la obtención de nuevas titulaciones, sino que constituye un mecanismo para consolidar capacidades académicas, profesionales, investigativas y pedagógicas que respondan a las necesidades de los estudiantes y de la institución. Esta misma relación entre desarrollo profesional docente y calidad educativa constituye uno de los fundamentos del documento institucional vigente.',
    'En el ámbito de la educación superior técnica y tecnológica, esta necesidad adquiere especial relevancia debido a la permanente relación entre la oferta académica, el desarrollo tecnológico y las necesidades del entorno productivo. Tünnermann Bernheim (2008) destaca al personal académico como un componente fundamental de las instituciones de educación superior y vincula directamente su desarrollo profesional con la calidad educativa. En concordancia con este enfoque, el Instituto Superior Tecnológico Quito Metropolitano —ITSQMET— orienta sus procesos de formación docente hacia el fortalecimiento de un claustro académico cualificado, pertinente y articulado con las necesidades de las carreras y las exigencias de aseguramiento de la calidad.',
    '__PERIOD__',
    'El proceso de detección permite, además, analizar las necesidades desde diferentes perspectivas, considerando información relacionada con el nivel académico alcanzado por los docentes, sus intereses de formación, las modalidades de estudio, la disponibilidad para iniciar o continuar estudios y sus aspiraciones académicas de corto y mediano plazo. Estas variables forman parte del componente cuantitativo utilizado en el diagnóstico institucional y permiten establecer tendencias y prioridades para la toma de decisiones.',
    'De manera complementaria, el análisis incorpora información cualitativa obtenida mediante la participación de las coordinaciones académicas, permitiendo validar los resultados obtenidos, identificar necesidades que pueden no encontrarse explícitamente reflejadas en los datos cuantitativos y establecer criterios de priorización de acuerdo con la pertinencia curricular, el perfil docente y las necesidades institucionales. La combinación de ambas fuentes fortalece la comprensión de la realidad del claustro y contribuye a una planificación más contextualizada de la formación docente.',
    'Por tanto, los resultados obtenidos mediante este proceso constituyen un insumo para la planificación del Plan de Formación Docente del ITSQMET, permitiendo definir líneas de formación específicas y transversales, establecer prioridades institucionales y orientar acciones de seguimiento que contribuyan al fortalecimiento progresivo de la cualificación académica del personal docente. De esta manera, la detección de necesidades se integra al ciclo institucional de planificación y mejora continua, procurando que las decisiones relacionadas con la formación docente se encuentren sustentadas en información actualizada y pertinente.'
  ];

  const BASE_LEGAL = [
    {
      title: '2.1. Normativa Constitucional, Legal y Reglamentaria Nacional',
      items: [
        {
          text: 'el Artículo 349 de la Constitución de la República del Ecuador establece: “El Estado garantizará al personal docente, en todos los niveles y modalidades, estabilidad, actualización, formación continua y mejoramiento pedagógico y académico”; y además que “la ley regulará la carrera docente y el escalafón; establecerá un sistema nacional de evaluación del desempeño y la política salarial en todos los niveles”.',
          bold: ['Artículo 349 de la Constitución de la República del Ecuador']
        },
        {
          text: 'el Artículo 26 de la Constitución de la República del Ecuador declara a la educación como un derecho de las personas y un deber ineludible del Estado, y garantiza que el acceso, permanencia, calidad y culminación de los procesos formativos estén bajo su responsabilidad directa, lo cual incluye la calidad del personal docente como condición esencial.',
          bold: ['Artículo 26 de la Constitución de la República del Ecuador']
        },
        {
          text: 'el Artículo 118 de la Ley Orgánica de Educación Superior (LOES) establece: “Las instituciones del Sistema de Educación Superior implementarán políticas de formación y capacitación permanentes para su personal académico. Estas políticas deberán considerar el fortalecimiento de capacidades profesionales, académicas, investigativas y de vinculación con la sociedad”.',
          bold: ['Artículo 118 de la Ley Orgánica de Educación Superior (LOES)']
        },
        {
          text: 'el Artículo 9 de la LOES determina que el Estado, a través de sus instituciones, debe garantizar la calidad de la educación superior, estableciendo estándares para los procesos académicos, incluidos los de formación del talento humano docente.',
          bold: ['Artículo 9 de la LOES']
        },
        {
          text: 'el Artículo 96 de la LOES, sobre requisitos del personal académico, señala que los docentes deberán poseer títulos de tercer y cuarto nivel de conformidad con los niveles de la oferta académica impartida, promoviendo la formación continua como criterio de habilitación.',
          bold: ['Artículo 96 de la LOES']
        },
        {
          text: 'el Artículo 2 del Reglamento de Carrera y Escalafón del Profesor del Sistema de Educación Superior (Acuerdo No. SENESCYT-2019-023) dispone: “La carrera académica se sustentará en criterios técnicos y objetivos relacionados con la formación académica, producción científica, innovación, vinculación con la sociedad y desempeño institucional”. Asimismo, exige procesos de formación planificados y pertinentes para la mejora continua.',
          bold: ['Artículo 2 del Reglamento de Carrera y Escalafón del Profesor del Sistema de Educación Superior (Acuerdo No. SENESCYT-2019-023)']
        }
      ]
    },
    {
      title: '2.2. Normativa del Modelo de Evaluación Externa del CACES',
      items: [
        {
          text: 'el Indicador 3.2.4 del Modelo de Evaluación Externa de Institutos Superiores Técnicos y Tecnológicos (CACES, 2021) establece que: “La institución evidencia la existencia de un plan de formación continua y pertinente del personal académico, que responde a un diagnóstico de necesidades, se encuentra alineado a su planificación institucional y se ejecuta de manera sistemática, con evaluación de resultados”.',
          bold: ['Indicador 3.2.4 del Modelo de Evaluación Externa de Institutos Superiores Técnicos y Tecnológicos (CACES, 2021)']
        },
        {
          text: 'el Criterio 3.2 del mismo modelo señala: “La gestión del personal académico se orienta a garantizar su cualificación, estabilidad, desarrollo profesional y desempeño docente”. En este sentido, se considera obligatoria la existencia de políticas institucionales de formación fundamentadas en evidencia diagnóstica.',
          bold: ['Criterio 3.2 del mismo modelo']
        },
        {
          text: 'el Anexo Técnico del Modelo de Evaluación Externa (CACES, 2021) indica como evidencia requerida para el indicador 3.2.4: “Diagnóstico institucional actualizado de necesidades de formación académica del personal docente, desagregado por carrera, modalidad, nivel de formación y afinidad con la oferta académica”. Además, requiere: “Resultados de la ejecución del plan de formación y mecanismos de seguimiento”.',
          bold: ['Anexo Técnico del Modelo de Evaluación Externa (CACES, 2021)']
        },
        {
          text: 'el documento metodológico del CACES sobre evaluación institucional establece que los procesos de cualificación docente deben guardar pertinencia con el perfil profesional y el plan estratégico de desarrollo institucional, y que dicha formación debe formar parte de una cultura institucional de mejora continua (CACES, 2020, Guía metodológica para la autoevaluación).',
          bold: ['documento metodológico del CACES sobre evaluación institucional']
        }
      ]
    },
    {
      title: '2.3. Normativa Institucional del ITSQMET',
      items: [
        {
          text: 'el Reglamento de Formación y Capacitación de los Docentes del ITSQMET, aprobado mediante resolución institucional en octubre de 2023, establece en su Artículo 6 que: “Todos los docentes del Instituto deberán contar con un Plan de Formación Individual alineado a su perfil profesional, a las necesidades de la carrera en la que se desempeña, y a los lineamientos institucionales de mejora de la calidad académica”.',
          bold: ['Reglamento de Formación y Capacitación de los Docentes del ITSQMET', 'Artículo 6']
        },
        {
          text: 'el mismo reglamento dispone en su Artículo 7 que: “La elaboración del Plan de Formación Institucional se sustentará en un diagnóstico sistemático de necesidades formativas, basado en datos cuantitativos y cualitativos, alineado al Plan Estratégico de Desarrollo Institucional (PEDI) y al Modelo de Evaluación Externa del CACES”.',
          bold: ['Artículo 7']
        },
        {
          text: 'el Plan Estratégico de Desarrollo Institucional (PEDI) 2023–2030 del ITSQMET, aprobado en sesión de Consejo Directivo, establece como uno de sus objetivos estratégicos: “Fortalecer las competencias del talento humano docente mediante procesos de formación planificada, pertinente y sostenible, orientados a la excelencia académica y alineados a la planificación institucional”.',
          bold: ['Plan Estratégico de Desarrollo Institucional (PEDI) 2023–2030 del ITSQMET']
        },
        {
          text: 'el PEDI, en su Eje Estratégico 2: Gestión Académica, incluye como meta operativa 2.2.3: “Implementar un sistema institucional de formación docente con base en diagnósticos anuales y estrategias de acompañamiento profesional y académico”.',
          bold: ['PEDI, en su Eje Estratégico 2: Gestión Académica', 'meta operativa 2.2.3']
        },
        {
          text: 'la Política Institucional de Formación Docente del ITSQMET, también aprobada en 2023, señala como principio rector que: “La formación docente deberá articularse con las necesidades institucionales, los perfiles de egreso de las carreras y las exigencias del entorno profesional y académico”. Esta política establece que la formación debe ser obligatoria, progresiva y compatible con la planificación docente individual.',
          bold: ['Política Institucional de Formación Docente del ITSQMET']
        },
        {
          text: 'el Manual del Proceso de Formación Académica del ITSQMET determina en su fase inicial que la detección de necesidades de formación debe contemplar cinco dimensiones: nivel académico, afinidad con la carrera, trayectoria profesional, requerimientos de acreditación y metas del plan institucional, como condición para elaborar el Plan de Formación Institucional.',
          bold: ['Manual del Proceso de Formación Académica del ITSQMET']
        }
      ]
    }
  ];

  function emit(percent, phase = 'render', extra = {}) {
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

  function responsibleData() {
    const p = getPeriod();
    return [
      {
        label: 'ELABORADO POR:',
        name: String(p.preparedBy || 'MSc. Jefferson Villarreal'),
        role: String(p.preparedRole || 'Gestor de Procesos Académicos')
      },
      {
        label: 'REVISADO POR:',
        name: String(p.reviewedBy || 'Ing. Martha Tomalá'),
        role: String(p.reviewedRole || 'Coordinación General de Carreras')
      },
      {
        label: 'APROBADO POR:',
        name: String(p.approvedBy || 'Dr. Alex León T.'),
        role: String(p.approvedRole || 'Vicerrector')
      }
    ];
  }

  function imageFormat(dataUrl = '') {
    if (/^data:image\/png/i.test(dataUrl)) return 'PNG';
    if (/^data:image\/webp/i.test(dataUrl)) return 'WEBP';
    return 'JPEG';
  }

  function getLogoData() {
    try {
      if (typeof INSTITUTION_LOGO_DATA !== 'undefined' && typeof INSTITUTION_LOGO_DATA === 'string') {
        return INSTITUTION_LOGO_DATA;
      }
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
        const lx = x + (colA - fitted.w) / 2;
        const ly = top + (h - fitted.h) / 2;
        doc.addImage(logo, imageFormat(logo), lx, ly, fitted.w, fitted.h, undefined, 'FAST');
      } catch (_error) {}
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('ITSQMET', x + colA / 2, top + h / 2, { align: 'center' });
    }

    doc.setTextColor(30);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const unit = 'UNIDAD DE GESTIÓN DE PROCESOS ACADÉMICOS';
    const unitLines = doc.splitTextToSize(unit, colB - 12);
    const unitLineH = 9.2;
    const unitY = top + (row1 - unitLines.length * unitLineH) / 2 + 7.2;
    doc.text(unitLines, bx + colB / 2, unitY, { align: 'center', lineHeightFactor: 1.02 });

    const titleLines = doc.splitTextToSize(documentTitle(), colB - 18);
    const periodLines = doc.splitTextToSize(periodText(true), colB - 18);
    const titleLineH = 9.3;
    const periodLineH = 9.1;
    const groupH = titleLines.length * titleLineH + 3 + periodLines.length * periodLineH;
    let groupY = top + row1 + (row2 - groupH) / 2 + 7.2;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text(titleLines, bx + colB / 2, groupY, { align: 'center', lineHeightFactor: 1.02 });
    groupY += titleLines.length * titleLineH + 3;
    doc.setFontSize(8.2);
    doc.text(periodLines, bx + colB / 2, groupY, { align: 'center', lineHeightFactor: 1.02 });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.text('Código:', cx + colC / 2, top + h / 2 - 8, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.1);
    const codeLines = doc.splitTextToSize(documentCode(), colC - 14);
    doc.text(codeLines, cx + colC / 2, top + h / 2 + 5, { align: 'center', lineHeightFactor: 1.05 });
  }

  function drawCover(doc) {
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    drawHeader(doc, 1);

    doc.setTextColor(38);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    const titleLines = doc.splitTextToSize(documentTitle(), 390);
    const titleY = 300;
    doc.text(titleLines, pageW / 2, titleY, { align: 'center', lineHeightFactor: 1.12 });

    doc.setFontSize(15);
    doc.text(periodText(true), pageW / 2, titleY + titleLines.length * 22 + 8, { align: 'center' });

    const totalW = 18 * CM;
    const x = (pageW - totalW) / 2;
    const colW = totalW / 3;
    const y = pageH - 195;
    const row1 = 70;
    const row2 = 25;
    const row3 = 35;
    const totalH = row1 + row2 + row3;

    doc.setDrawColor(95);
    doc.setLineWidth(0.55);
    doc.rect(x, y, totalW, totalH);
    doc.line(x, y + row1, x + totalW, y + row1);
    doc.line(x, y + row1 + row2, x + totalW, y + row1 + row2);
    doc.line(x + colW, y, x + colW, y + totalH);
    doc.line(x + colW * 2, y, x + colW * 2, y + totalH);

    const people = responsibleData();
    people.forEach((person, index) => {
      const cellX = x + index * colW;
      const pad = 5;

      doc.setTextColor(35);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      doc.text(person.label, cellX + pad, y + 12);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.text('NOMBRE:', cellX + pad, y + row1 + 15);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.7);
      const nameLines = doc.splitTextToSize(person.name, colW - 44);
      doc.text(nameLines, cellX + 42, y + row1 + 15, { lineHeightFactor: 1.02 });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.text('CARGO:', cellX + pad, y + row1 + row2 + 15);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.7);
      const roleLines = doc.splitTextToSize(person.role, colW - 40);
      doc.text(roleLines, cellX + 38, y + row1 + row2 + 15, { lineHeightFactor: 1.02 });
    });
  }

  function introductionParagraphs() {
    const period = periodText(false);
    return INTRODUCTION.map(text => {
      if (text !== '__PERIOD__') return text;
      return 'En este marco, el presente documento recoge los resultados del proceso de Detección de Necesidades de Formación correspondiente al período ' + period + ', desarrollado con el personal docente del ITSQMET. Este diagnóstico constituye un instrumento técnico para conocer la situación académica del claustro docente, identificar brechas de formación, reconocer intereses y proyecciones de desarrollo profesional y establecer áreas prioritarias sobre las cuales la institución pueda orientar sus estrategias de formación. Esta finalidad corresponde a la lógica planteada en el documento institucional, en el cual el diagnóstico se concibe como base para la elaboración y actualización del Plan de Formación Docente.';
    });
  }

  function splitStyledSpans(text, boldPhrases = []) {
    const source = String(text || '');
    const phrases = [...new Set((boldPhrases || []).filter(Boolean))].sort((a, b) => b.length - a.length);
    if (!phrases.length) return [{ text: source, style: 'normal' }];

    const matches = [];
    phrases.forEach(phrase => {
      let from = 0;
      while (from < source.length) {
        const index = source.indexOf(phrase, from);
        if (index < 0) break;
        matches.push({ start: index, end: index + phrase.length, style: 'bold' });
        from = index + phrase.length;
      }
    });
    matches.sort((a, b) => a.start - b.start || b.end - a.end);

    const accepted = [];
    let cursor = -1;
    matches.forEach(match => {
      if (match.start >= cursor) {
        accepted.push(match);
        cursor = match.end;
      }
    });

    const spans = [];
    let pos = 0;
    accepted.forEach(match => {
      if (match.start > pos) spans.push({ text: source.slice(pos, match.start), style: 'normal' });
      spans.push({ text: source.slice(match.start, match.end), style: match.style });
      pos = match.end;
    });
    if (pos < source.length) spans.push({ text: source.slice(pos), style: 'normal' });
    return spans;
  }

  function createBodyWriter(doc) {
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const bodyW = pageW - BODY.left - BODY.right;
    let y = BODY.top;

    function setBodyFont(style = 'normal', size = BODY.fontSize) {
      doc.setFont('times', style);
      doc.setFontSize(size);
      doc.setTextColor(0);
    }

    function newPage() {
      doc.addPage();
      const pageNo = doc.getNumberOfPages();
      drawHeader(doc, pageNo);
      setBodyFont();
      y = BODY.top;
    }

    function ensureSpace(height) {
      if (y + height > pageH - BODY.bottom) newPage();
    }

    function heading(text, level = 1) {
      setBodyFont('bold', 12);
      const lines = doc.splitTextToSize(String(text || ''), bodyW);
      const before = level === 1 ? 0 : 12;
      const after = level === 1 ? 18 : 12;
      const height = before + lines.length * BODY.lineHeight + after + BODY.lineHeight * 2;
      ensureSpace(height);
      y += before;
      doc.text(lines, BODY.left, y, { align: 'left', lineHeightFactor: 2 });
      y += lines.length * BODY.lineHeight + after;
    }

    function wrapPlain(text, firstWidth, otherWidth) {
      setBodyFont('normal');
      const words = String(text || '').trim().split(/\s+/).filter(Boolean);
      const lines = [];
      let line = '';
      let available = firstWidth;
      words.forEach(word => {
        const candidate = line ? line + ' ' + word : word;
        if (doc.getTextWidth(candidate) <= available) {
          line = candidate;
        } else {
          if (line) lines.push(line);
          line = word;
          available = otherWidth;
        }
      });
      if (line) lines.push(line);
      return lines;
    }

    function paragraph(text) {
      setBodyFont('normal');
      const lines = wrapPlain(text, bodyW - BODY.paragraphIndent, bodyW);
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
        else if (remaining === 1 && take <= 2 && lines.length - index > 1) {
          newPage();
          continue;
        }
        if (take === 1 && lines.length - index > 1) {
          newPage();
          continue;
        }
        if (take <= 0) {
          newPage();
          continue;
        }

        for (let offset = 0; offset < take; offset++) {
          const absolute = index + offset;
          const x = BODY.left + (absolute === 0 ? BODY.paragraphIndent : 0);
          doc.text(lines[absolute], x, y, { align: 'left' });
          y += BODY.lineHeight;
        }
        index += take;
        if (index < lines.length) newPage();
      }
    }

    function styledWords(spans) {
      const words = [];
      spans.forEach(span => {
        String(span.text || '').trim().split(/\s+/).filter(Boolean).forEach(word => {
          words.push({ word, style: span.style || 'normal' });
        });
      });
      return words;
    }

    function measureWord(item) {
      setBodyFont(item.style || 'normal');
      return doc.getTextWidth(item.word);
    }

    function layoutStyledLines(spans, width) {
      const words = styledWords(spans);
      const lines = [];
      let line = [];
      let lineWidth = 0;
      setBodyFont('normal');
      const baseSpace = doc.getTextWidth(' ');

      words.forEach(item => {
        const wordWidth = measureWord(item);
        const candidate = line.length ? lineWidth + baseSpace + wordWidth : wordWidth;
        if (line.length && candidate > width) {
          lines.push(line);
          line = [item];
          lineWidth = wordWidth;
        } else {
          line.push(item);
          lineWidth = candidate;
        }
      });
      if (line.length) lines.push(line);
      return lines;
    }

    function lineWordWidth(line) {
      return line.reduce((sum, item) => sum + measureWord(item), 0);
    }

    function drawStyledLine(line, x, width, justify) {
      if (!line.length) return;
      const wordsWidth = lineWordWidth(line);
      setBodyFont('normal');
      const normalSpace = doc.getTextWidth(' ');
      const gap = justify && line.length > 1 ? Math.max(normalSpace, (width - wordsWidth) / (line.length - 1)) : normalSpace;
      let cursor = x;

      line.forEach((item, index) => {
        setBodyFont(item.style || 'normal');
        doc.text(item.word, cursor, y);
        cursor += doc.getTextWidth(item.word);
        if (index < line.length - 1) cursor += gap;
      });
    }

    function legalParagraph(text, boldPhrases = []) {
      const indent = BODY.paragraphIndent;
      const contentX = BODY.left + indent;
      const width = bodyW - indent;
      const spans = splitStyledSpans(text, boldPhrases);
      const lines = layoutStyledLines(spans, width);
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
        else if (remaining === 1 && take <= 2 && lines.length - index > 1) {
          newPage();
          continue;
        }
        if (take <= 0) {
          newPage();
          continue;
        }

        for (let offset = 0; offset < take; offset++) {
          const absolute = index + offset;
          if (absolute === 0) {
            setBodyFont('bold');
            doc.text('Que', BODY.left, y);
          }
          const isLastLine = absolute === lines.length - 1;
          drawStyledLine(lines[absolute], contentX, width, !isLastLine);
          y += BODY.lineHeight;
        }
        index += take;
        if (index < lines.length) newPage();
      }
      y += 8;
    }

    newPage();
    return {
      heading,
      paragraph,
      legalParagraph,
      ensureSpace,
      newPage,
      getY: () => y
    };
  }

  function drawApprovedBody(doc) {
    const writer = createBodyWriter(doc);

    writer.heading('1. Introducción', 1);
    const paragraphs = introductionParagraphs();
    paragraphs.forEach((text, index) => {
      emit(22 + (index / Math.max(1, paragraphs.length)) * 28, 'render', { stage: 'introduction', current: index + 1, total: paragraphs.length });
      writer.paragraph(text);
    });

    writer.heading('2. Base Legal', 1);
    BASE_LEGAL.forEach((section, sectionIndex) => {
      writer.heading(section.title, 2);
      section.items.forEach((item, itemIndex) => {
        emit(55 + ((sectionIndex + itemIndex / Math.max(1, section.items.length)) / BASE_LEGAL.length) * 30, 'render', {
          stage: 'base-legal',
          section: sectionIndex + 1,
          current: itemIndex + 1,
          total: section.items.length
        });
        writer.legalParagraph(item.text, item.bold);
      });
    });
  }

  function drawFooters(doc) {
    const total = doc.getNumberOfPages();
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const period = periodText(true);

    for (let pageNo = 1; pageNo <= total; pageNo++) {
      doc.setPage(pageNo);
      doc.setTextColor(105);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.2);
      const footer = 'ITSQMET · Unidad de Gestión de Procesos Académicos · ' + period + ' · Página ' + pageNo + ' de ' + total;
      doc.text(footer, pageW / 2, pageH - 24, { align: 'center' });
    }
  }

  async function generateDnf(payload = {}) {
    if (!window.jspdf?.jsPDF) {
      throw new Error('No se pudo cargar jsPDF. Recarga la aplicación e intenta nuevamente.');
    }

    emit(5, 'start', { stage: 'vector' });
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      unit: 'pt',
      format: 'a4',
      orientation: 'portrait',
      compress: true,
      putOnlyUsedFonts: true
    });

    doc.setProperties({
      title: documentTitle(),
      subject: periodText(true),
      author: 'Instituto Superior Tecnológico Quito Metropolitano - ITSQMET',
      keywords: 'ITSQMET, formación docente, DNF, necesidades de formación'
    });

    emit(12, 'render', { stage: 'cover' });
    drawCover(doc);

    emit(20, 'render', { stage: 'body' });
    drawApprovedBody(doc);

    emit(90, 'render', { stage: 'footer' });
    drawFooters(doc);

    const filename = String(payload.filename || (documentCode() || 'DNF') + ' - Detección de Necesidades de Formación.pdf');
    emit(96, 'save', { stage: 'download' });
    doc.save(filename);
    emit(100, 'done', { stage: 'complete', pages: doc.getNumberOfPages() });

    window.__DOCFORMACION_DNF_RENDERER = ENGINE;
    return {
      ok: true,
      filePath: filename,
      renderer: ENGINE,
      pages: doc.getNumberOfPages(),
      scope: 'cover+introduction+base-legal'
    };
  }

  api.generatePDF = async function vectorDnfRouter(payload = {}) {
    const isWeb = location.protocol === 'http:' || location.protocol === 'https:';
    if (isWeb && isDnf(payload)) {
      try {
        return await generateDnf(payload);
      } catch (error) {
        const message = error?.message || String(error);
        emit(0, 'error', { message });
        return { ok: false, error: message, renderer: ENGINE };
      }
    }
    return previousGeneratePDF(payload);
  };

  window.__DOCFORMACION_DNF_RENDERER = ENGINE;
  window.__DOCFORMACION_DNF_VECTOR_STAGE = 'cover+introduction+base-legal';
})();