(() => {
  // Aplica el estándar maestro de portadas RGI a los documentos no paginados
  // (Plan e Informe) sin alterar la maquetación exacta de la DNF.
  if (typeof basePdfCss !== 'function' || typeof pdfHeader !== 'function' || typeof cover !== 'function') return;

  const previousBasePdfCss = basePdfCss;

  basePdfCss = function institutionalBasePdfCss(exactPages = false) {
    if (exactPages) return previousBasePdfCss(true);

    return `<style>
      @page{size:A4;margin:15mm}
      *{box-sizing:border-box}
      html{margin:0!important;padding:0!important;width:210mm!important;background:#fff!important}
      body{font-family:Arial,Helvetica,sans-serif;color:#111;font-size:10pt;line-height:1.42;margin:0 auto!important;padding:0!important;width:180mm!important;max-width:180mm!important;background:#fff!important;overflow-wrap:anywhere}
      .page-break{page-break-before:always;break-before:page}
      .avoid{page-break-inside:avoid;break-inside:avoid}

      .rgi-header{width:180mm!important;max-width:180mm!important;border-collapse:collapse;table-layout:fixed;margin:0 0 6mm 0;font-size:8.5pt;line-height:1.15}
      .rgi-header col.logo-col{width:45mm}.rgi-header col.center-col{width:90mm}.rgi-header col.code-col{width:45mm}
      .rgi-header td{border:.65pt solid #111;padding:1.2mm 1.6mm;text-align:center;vertical-align:middle;background:#fff}
      .rgi-header .logo-cell{height:28mm}.rgi-header .unit-cell{height:8mm;font-size:9pt;font-weight:600}.rgi-header .doc-cell{height:20mm;font-size:8.8pt;font-weight:700;line-height:1.2}.rgi-header .code-cell{font-size:8.5pt;line-height:1.35}
      .rgi-header .institution-logo{display:block;max-width:38mm;max-height:18mm;width:auto;height:auto;object-fit:contain;margin:0 auto}
      .rgi-header .period-inline{display:block;margin-top:1mm;font-weight:600}

      .cover{height:267mm!important;min-height:267mm!important;max-height:267mm!important;width:180mm!important;display:flex!important;flex-direction:column!important;margin:0!important;padding:0!important;overflow:hidden!important;page-break-after:always;break-after:page;background:#fff}
      .cover-center{flex:1 1 auto;display:flex;align-items:center;justify-content:center;text-align:center;padding:18mm 0 14mm}
      .cover-center h1{margin:0!important;max-width:180mm;font-size:18pt!important;line-height:1.2!important;font-weight:700!important;text-align:center!important}
      .cover-center .cover-period{display:block;margin-top:4mm;font-size:16pt;line-height:1.2;font-weight:700}

      .signature-table{width:180mm!important;max-width:180mm!important;border-collapse:collapse;table-layout:fixed;margin:0!important;font-size:8.5pt;line-height:1.15}
      .signature-table td{width:60mm;border:.6pt solid #111;padding:1mm 1.2mm;vertical-align:top;background:#fff}
      .signature-table .sig-space td{height:24mm;text-align:center;vertical-align:middle}
      .signature-table .sig-name td{height:7.5mm;vertical-align:middle;text-align:left}
      .signature-table .sig-role-row td{height:10.5mm;vertical-align:middle;text-align:left}
      .signature-table .sig-title{display:block;font-weight:700;text-align:center;margin-bottom:5mm}
      .signature-table .sig-area{display:block;font-weight:700;text-align:center}
      .signature-table .label-inline{font-weight:700;margin-right:1mm}

      .h1{font-size:17pt;line-height:1.18;margin:16px 0 9px;break-after:avoid;page-break-after:avoid}
      .h2{font-size:13pt;line-height:1.2;margin:16px 0 7px;break-after:avoid;page-break-after:avoid}
      .h3{font-size:11pt;line-height:1.2;margin:12px 0 6px;break-after:avoid;page-break-after:avoid}
      p{margin:0 0 8px;text-align:justify}
      table.data{width:100%!important;max-width:100%!important;border-collapse:collapse;table-layout:auto;margin:8px 0 12px}
      table.data th,table.data td{border:.6pt solid #666;padding:5px 6px;font-size:8.7pt;line-height:1.25;vertical-align:top;overflow-wrap:anywhere;word-break:normal}
      table.data th{background:#fff;font-weight:700;text-align:center}
      table.data thead{display:table-header-group}
      table.data tr{page-break-inside:avoid;break-inside:avoid}
      .note{font-size:8.5pt;color:#555}.analysis{margin:8px 0 14px}
      .bar{display:grid;grid-template-columns:45mm 1fr 18mm;gap:2mm;align-items:center;margin:6px 0}
      .track{height:12px;background:#e8edf3}.fill{height:100%;background:#365f86}
      .footer{position:fixed;bottom:3mm;left:15mm;right:15mm;text-align:center;font-size:7.5pt;color:#666}
    </style>`;
  };

  pdfHeader = function institutionalRgiHeader(title, code) {
    const period = typeof periodLabel === 'function' ? periodLabel() : '';
    return `<table class="rgi-header">
      <colgroup><col class="logo-col"><col class="center-col"><col class="code-col"></colgroup>
      <tr>
        <td class="logo-cell" rowspan="2"><img class="institution-logo" src="${INSTITUTION_LOGO_DATA}" alt="ITSQMET"></td>
        <td class="unit-cell">UNIDAD DE GESTIÓN DE PROCESOS ACADÉMICOS</td>
        <td class="code-cell" rowspan="2"><strong>Código:</strong><br>${esc(code)}</td>
      </tr>
      <tr>
        <td class="doc-cell">${esc(title)}${period ? `<span class="period-inline">${esc(period)}</span>` : ''}</td>
      </tr>
    </table>`;
  };

  cover = function institutionalRgiCover(title, code) {
    const responsible = {
      preparedBy: 'Mgs. Jefferson Villarreal',
      preparedRole: 'Gestor de Procesos Académicos',
      reviewedBy: 'Ing. Martha Tomalá',
      reviewedRole: 'Coordinadora General de Carreras',
      approvedBy: 'Dr. Alex León',
      approvedRole: 'Vicerrector'
    };
    const period = typeof periodLabel === 'function' ? periodLabel() : '';

    return `<section class="cover">
      ${pdfHeader(title, code)}
      <div class="cover-center"><h1>${esc(title)}${period ? `<span class="cover-period">${esc(period)}</span>` : ''}</h1></div>
      <table class="signature-table">
        <tr class="sig-space">
          <td><span class="sig-title">ELABORADO POR:</span><span class="sig-area">ÁREA DE FIRMA / QR DIGITAL</span></td>
          <td><span class="sig-title">REVISADO POR:</span><span class="sig-area">ÁREA DE FIRMA / QR DIGITAL</span></td>
          <td><span class="sig-title">APROBADO POR:</span><span class="sig-area">ÁREA DE FIRMA / QR DIGITAL</span></td>
        </tr>
        <tr class="sig-name">
          <td><span class="label-inline">NOMBRE:</span>${esc(responsible.preparedBy)}</td>
          <td><span class="label-inline">NOMBRE:</span>${esc(responsible.reviewedBy)}</td>
          <td><span class="label-inline">NOMBRE:</span>${esc(responsible.approvedBy)}</td>
        </tr>
        <tr class="sig-role-row">
          <td><span class="label-inline">CARGO:</span>${esc(responsible.preparedRole)}</td>
          <td><span class="label-inline">CARGO:</span>${esc(responsible.reviewedRole)}</td>
          <td><span class="label-inline">CARGO:</span>${esc(responsible.approvedRole)}</td>
        </tr>
      </table>
    </section>`;
  };
})();