(() => {
  'use strict';

  const clean = value => String(value ?? '').trim();
  const ELEMENTS = Object.freeze([
    Object.freeze({
      id: 'cover',
      title: 'Portada',
      description: 'Primera página institucional del documento: título, período, código, versión y responsables.'
    }),
    Object.freeze({
      id: 'header',
      title: 'Cabecera',
      description: 'Cabecera institucional utilizada en las páginas interiores del documento.'
    })
  ]);

  function dependencies() {
    const values = {
      manifest: window.DOCFORMACION_MANIFEST,
      context: window.docformacionDocumentContext,
      validation: window.docformacionValidation,
      pdf: window.docformacionPdfCore
    };
    const missing = Object.entries(values).filter(([, value]) => !value).map(([name]) => name);
    if (missing.length) throw new Error('Faltan módulos para previsualizar elementos documentales: ' + missing.join(', ') + '.');
    return values;
  }

  function getElement(elementId) {
    return ELEMENTS.find(item => item.id === elementId) || null;
  }

  function readiness(type, elementId, ctxArg) {
    const modules = dependencies();
    const ctx = ctxArg || modules.context.build();
    return modules.validation.elementReadiness(type, elementId, ctx);
  }

  function safeFilePart(value) {
    return clean(value).replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim();
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  function headerData(type, ctx, manifest) {
    return {
      organization: clean(manifest.organization || manifest.title),
      title: ctx.documentTitle(type),
      period: ctx.period.label,
      code: ctx.documentCode(type),
      section: ''
    };
  }

  async function build(type, elementId, options = {}) {
    const modules = dependencies();
    const element = getElement(elementId);
    if (!element) throw new Error('Elemento documental no reconocido: ' + elementId + '.');
    const ctx = modules.context.build();
    const document = modules.manifest.documents?.[type];
    if (!document) throw new Error('Documento no declarado: ' + type + '.');

    const state = readiness(type, elementId, ctx);
    const common = {
      title: element.title + ' · ' + ctx.documentTitle(type),
      subject: ctx.documentTitle(type) + ' · ' + ctx.period.label,
      author: clean(modules.manifest.author || modules.manifest.organization || 'ITSQMET')
    };

    let writer;
    if (elementId === 'cover') {
      writer = modules.pdf.createWriter({
        ...common,
        initialHeader: false,
        firstPageFooter: false
      });
      writer.cover({
        organization: clean(modules.manifest.organization || modules.manifest.title),
        title: ctx.documentTitle(type),
        period: ctx.period.label,
        code: ctx.documentCode(type),
        version: clean(ctx.period.version || '1.0'),
        signatures: [
          { label:'ELABORADO POR:', name:ctx.authorities?.preparedBy, role:ctx.authorities?.preparedRole },
          { label:'REVISADO POR:', name:ctx.authorities?.reviewedBy, role:ctx.authorities?.reviewedRole },
          { label:'APROBADO POR:', name:ctx.authorities?.approvedBy, role:ctx.authorities?.approvedRole }
        ]
      });
    } else {
      writer = modules.pdf.createWriter({
        ...common,
        firstPageFooter: false,
        header: () => headerData(type, ctx, modules.manifest)
      });
      writer.heading('Muestra de cabecera institucional', 1);
      writer.paragraph('Esta vista permite comprobar la cabecera que se repetirá en las páginas interiores del documento.');
      writer.note('La portada permanece independiente y no utiliza esta cabecera.');
    }

    if (!state.ready) writer.note('Vista borrador: faltan ' + state.missing.join(', ') + '.');
    const result = writer.finish(common);
    const filename = safeFilePart(ctx.documentCode(type) + ' - ' + ctx.documentTitle(type) + ' - ' + element.title) + '.pdf';
    if (options.download) downloadBlob(result.blob, filename);

    return { ...result, filename, type, element, readiness: state };
  }

  window.docformacionDocumentElements = Object.freeze({
    list() { return ELEMENTS; },
    getElement,
    readiness,
    build
  });
})();