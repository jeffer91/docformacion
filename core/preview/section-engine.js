(() => {
  'use strict';

  const clean = value => String(value ?? '').trim();

  function getSection(type, sectionId) {
    const sections = window.DOCFORMACION_MANIFEST?.documents?.[type]?.sections || [];
    return sections.find(section => section.id === sectionId) || null;
  }

  function safeFilePart(value) {
    return clean(value)
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function filename(type, section, ctx) {
    return safeFilePart(
      ctx.documentCode(type) + ' - ' +
      ctx.documentTitle(type) + ' - ' +
      section.id + ' - ' + section.title
    ) + '.pdf';
  }

  function ensureDependencies() {
    const required = [
      ['DOCFORMACION_MANIFEST', window.DOCFORMACION_MANIFEST],
      ['docformacionDocumentContext', window.docformacionDocumentContext],
      ['docformacionValidation', window.docformacionValidation],
      ['docformacionPdfCore', window.docformacionPdfCore],
      ['docformacionSectionRenderers', window.docformacionSectionRenderers]
    ];
    const missing = required.filter(([, value]) => !value).map(([name]) => name);
    if (missing.length) throw new Error('Faltan módulos del motor documental: ' + missing.join(', ') + '.');
  }

  function sectionReadiness(type, section) {
    ensureDependencies();
    const ctx = window.docformacionDocumentContext.build();
    return window.docformacionValidation.sectionReadiness(type, section, ctx);
  }

  async function build(type, sectionId, options = {}) {
    ensureDependencies();
    const section = getSection(type, sectionId);
    if (!section) throw new Error('La sección solicitada no existe en el manifiesto.');

    const ctx = window.docformacionDocumentContext.build();
    if (!ctx.period.active) throw new Error('Selecciona o crea un período antes de generar una sección.');

    const readiness = window.docformacionValidation.sectionReadiness(type, section, ctx);
    const manifest = window.DOCFORMACION_MANIFEST;
    const writer = window.docformacionPdfCore.createWriter({
      title: section.title,
      subject: ctx.documentTitle(type) + ' · ' + ctx.period.label,
      author: clean(manifest.author || manifest.organization || 'ITSQMET'),
      header: () => ({
        organization: clean(manifest.organization || manifest.title),
        title: ctx.documentTitle(type),
        period: ctx.period.label,
        code: ctx.documentCode(type),
        section: section.id
      }),
      footer: (page, pages) => section.id + ' · ' + ctx.period.label + ' · Página ' + page + ' de ' + pages
    });

    writer.heading(section.title, 1);
    writer.note('Documento: ' + ctx.documentTitle(type) + ' · Sección independiente ' + section.id + '.');
    if (!readiness.ready) {
      writer.note('Vista borrador: faltan datos requeridos: ' + readiness.missing.join(', ') + '.');
    }

    window.docformacionSectionRenderers.render(type, section, writer, ctx);
    const result = writer.finish({
      title: section.title,
      subject: ctx.documentTitle(type) + ' · ' + ctx.period.label,
      author: clean(manifest.author || manifest.organization || 'ITSQMET')
    });
    const name = filename(type, section, ctx);

    if (options.download) {
      const url = URL.createObjectURL(result.blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = name;
      anchor.style.display = 'none';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    }

    return {
      ...result,
      filename: name,
      section,
      type,
      readiness
    };
  }

  window.docformacionSectionPdf = Object.freeze({
    build,
    getSection,
    sectionReadiness,
    list(type) {
      return window.DOCFORMACION_MANIFEST?.documents?.[type]?.sections || [];
    }
  });
})();
