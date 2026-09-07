(() => {
  const qualityDnfHtml = dnfHtml;

  const TOC = [
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

  function unwrap(el) {
    const parent = el?.parentNode;
    if (!parent) return;
    while (el.firstChild) parent.insertBefore(el.firstChild, el);
    el.remove();
  }

  function transformQualityBody(doc) {
    doc.querySelector('.cover')?.remove();

    [...doc.querySelectorAll('.q-section')].forEach(section => {
      const heading = section.querySelector(':scope > .h1');
      if (heading) heading.className = 'sec-title';
      section.classList.remove('q-new-page');
    });

    [...doc.querySelectorAll('.q-sub')].forEach(sub => {
      const heading = sub.querySelector(':scope > .h2');
      if (heading) heading.className = 'sub-title';
    });

    [...doc.querySelectorAll('.q-career-block')].forEach(block => {
      block.classList.add('career-profile-block');
    });

    // El paginador institucional trabaja con bloques hermanos para poder
    // repartir títulos, párrafos y tablas sin cortar contenido importante.
    [...doc.querySelectorAll('.q-sub')].forEach(unwrap);
    [...doc.querySelectorAll('.q-section')].forEach(unwrap);

    return doc.body.innerHTML;
  }

  function coverBody() {
    const p = state.period || {};
    return `
      <div class="cover-body">
        <div class="cover-title">
          <h1>Detección de Necesidades de Formación</h1>
          <div class="period">${esc(periodLabel())}</div>
        </div>
        <table class="signature-table">
          <tr class="sig-space">
            <td><span class="sig-label">ELABORADO POR:</span></td>
            <td><span class="sig-label">REVISADO POR:</span></td>
            <td><span class="sig-label">APROBADO POR:</span></td>
          </tr>
          <tr class="sig-name">
            <td><span class="label-inline">NOMBRE:</span>${esc(p.preparedBy || '')}</td>
            <td><span class="label-inline">NOMBRE:</span>${esc(p.reviewedBy || '')}</td>
            <td><span class="label-inline">NOMBRE:</span>${esc(p.approvedBy || '')}</td>
          </tr>
          <tr class="sig-role-row">
            <td><span class="label-inline">CARGO:</span>${esc(p.preparedRole || '')}</td>
            <td><span class="label-inline">CARGO:</span>${esc(p.reviewedRole || '')}</td>
            <td><span class="label-inline">CARGO:</span>${esc(p.approvedRole || '')}</td>
          </tr>
        </table>
      </div>`;
  }

  function indexBody() {
    return '<div class="sec-title">Índice general</div><table class="toc">' +
      TOC.map((label, index) => '<tr><td>' + esc(label) + '</td><td>' + (index + 3) + '</td></tr>').join('') +
      '</table>';
  }

  function exactQualityCss(sourceDoc) {
    const styles = [...sourceDoc.head.querySelectorAll('style')];
    const quality = styles.length ? styles[styles.length - 1].textContent : '';
    return `<style>${quality}
      .sec-title{font-size:17pt!important;line-height:1.15!important;margin:18pt 0 9pt!important;break-after:avoid!important;page-break-after:avoid!important;color:#1f2d3d!important}
      .sub-title{font-size:11.5pt!important;line-height:1.2!important;margin:12pt 0 6pt!important;break-after:avoid!important;page-break-after:avoid!important;color:#26384a!important}
      .pdf-body p{line-height:1.18!important;margin:0 0 6pt!important;text-indent:0!important;orphans:3;widows:3}
      .pdf-body ul,.pdf-body ol{margin:4pt 0 9pt;padding-left:19pt}
      .pdf-body li{margin:0 0 4pt;line-height:1.18;orphans:2;widows:2}
      .q-table-block{margin:9pt 0 6pt!important}
      .q-career-block{margin:0 0 15pt!important}
      .q-legal-card{break-inside:avoid!important;page-break-inside:avoid!important}
      .q-kpis,.q-mini-kpis,.q-flow,.q-insight,.q-interpret{break-inside:avoid!important;page-break-inside:avoid!important}
      .toc{width:100%;border-collapse:collapse;margin-top:5mm}
      .toc td{padding:2.1mm 1.5mm;border-bottom:.45pt solid #d6dbe0;font-size:9pt}
      .toc td:last-child{text-align:right;width:13%;font-weight:700}
    </style>`;
  }

  dnfHtml = function exactInstitutionalDnfHtml() {
    const qualityHtml = qualityDnfHtml();
    const parsed = new DOMParser().parseFromString(qualityHtml, 'text/html');
    const sourceBody = transformQualityBody(parsed);
    const title = 'Detección de Necesidades de Formación';
    const code = state.period?.dnfCode || '';

    // Tres páginas fuente son suficientes: el motor web toma todos los bloques
    // de la tercera página y los repagina dinámicamente conservando el encabezado,
    // pie, numeración, tablas y reglas anti-huérfanos del documento institucional.
    const pages = [
      dnfPage(title, code, 1, 3, coverBody(), 'cover-page'),
      dnfPage(title, code, 2, 3, indexBody(), 'index-page'),
      dnfPage(title, code, 3, 3, sourceBody, 'source-page')
    ];

    let html = htmlDoc(title, '<div class="pdf-document">' + pages.join('') + '</div>', true);
    html = html.replace('</head>', exactQualityCss(parsed) + '</head>');
    return html;
  };
})();