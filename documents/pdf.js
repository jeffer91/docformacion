(() => {
  'use strict';

  const clean = value => String(value ?? '').trim();

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

  function safeFilePart(value) {
    return clean(value).replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim();
  }

  function filename(type, ctx) {
    return safeFilePart(ctx.documentCode(type) + ' - ' + ctx.documentTitle(type)) + '.pdf';
  }

  function emitProgress(type, percent, phase, extra = {}) {
    window.dispatchEvent(new CustomEvent('docformacion-pdf-progress', {
      detail: { type, percent, phase, build: window.DOCFORMACION_BUILD || 'local', ...extra }
    }));
  }

  function dependencies() {
    const values = {
      manifest: window.DOCFORMACION_MANIFEST,
      context: window.docformacionDocumentContext,
      validation: window.docformacionValidation,
      pdf: window.docformacionPdfCore,
      renderers: window.docformacionSectionRenderers
    };
    const missing = Object.entries(values).filter(([, value]) => !value).map(([name]) => name);
    if (missing.length) throw new Error('Faltan módulos para generar el documento: ' + missing.join(', ') + '.');
    return values;
  }

  async function build(type, options = {}) {
    const modules = dependencies();
    const ctx = modules.context.build();
    const document = modules.manifest.documents?.[type];
    if (!document) throw new Error('Documento no declarado: ' + type + '.');
    if (!ctx.period.active) throw new Error('Selecciona o crea un período antes de generar el PDF.');

    const readiness = modules.validation.documentReadiness(type, ctx);
    if (!readiness.ready && !options.allowDraft) {
      throw new Error('El documento todavía tiene pendientes: ' + readiness.missing.join(', ') + '.');
    }

    emitProgress(type, 4, 'preparing');
    const writer = modules.pdf.createWriter({
      title: ctx.documentTitle(type),
      subject: ctx.documentTitle(type) + ' · ' + ctx.period.label,
      author: clean(modules.manifest.author || modules.manifest.organization || 'ITSQMET'),
      initialHeader: false,
      firstPageFooter: false,
      header: () => ({
        organization: clean(modules.manifest.organization || modules.manifest.title),
        title: ctx.documentTitle(type),
        period: ctx.period.label,
        code: ctx.documentCode(type),
        section: ''
      }),
      footer: (page, pages) => clean(modules.manifest.title) + ' · ' + ctx.period.label + ' · Página ' + page + ' de ' + pages
    });

    writer.cover({
      organization: clean(modules.manifest.organization || modules.manifest.title),
      title: ctx.documentTitle(type),
      period: ctx.period.label,
      code: ctx.documentCode(type),
      version: clean(ctx.period.version || '1.0'),
      signatures: [
        { label:'ELABORADO POR:', name:ctx.authorities.preparedBy, role:ctx.authorities.preparedRole },
        { label:'REVISADO POR:', name:ctx.authorities.reviewedBy, role:ctx.authorities.reviewedRole },
        { label:'APROBADO POR:', name:ctx.authorities.approvedBy, role:ctx.authorities.approvedRole }
      ]
    });

    const sections = document.sections || [];
    for (let index = 0; index < sections.length; index++) {
      const section = sections[index];
      writer.newPage();
      writer.heading(section.title, 1);
      const sectionState = modules.validation.sectionReadiness(type, section, ctx);
      if (!sectionState.ready) writer.note('Vista borrador: ' + sectionState.missing.join(', ') + '.');
      modules.renderers.render(type, section, writer, ctx);
      emitProgress(type, Math.min(90, 10 + Math.round(((index + 1) / Math.max(1, sections.length)) * 78)), 'render', {
        section: section.id,
        sectionIndex: index + 1,
        sectionTotal: sections.length
      });
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    emitProgress(type, 94, 'assembling');
    const result = writer.finish({
      title: ctx.documentTitle(type),
      subject: ctx.documentTitle(type) + ' · ' + ctx.period.label,
      author: clean(modules.manifest.author || modules.manifest.organization || 'ITSQMET')
    });
    const name = filename(type, ctx);
    if (options.download !== false) downloadBlob(result.blob, name);
    emitProgress(type, 100, 'done', { pages:result.pages, size:result.size });
    return { ...result, filename:name, type, readiness };
  }

  async function generate(type) {
    const button = document.getElementById('generateCurrent') || document.querySelector('[data-generate="' + type + '"]');
    const old = button?.textContent || 'Generar PDF';
    if (button) {
      button.disabled = true;
      button.textContent = 'Generando PDF…';
    }
    try {
      const result = await build(type, { download:true });
      if (typeof toast === 'function') toast('PDF generado correctamente');
      return result;
    } catch (error) {
      console.error('[DocFormación] PDF documental:', error);
      emitProgress(type, 0, 'error', { message:error?.message || String(error) });
      if (typeof toast === 'function') toast('No se pudo generar el PDF: ' + (error?.message || error));
      return null;
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = old;
      }
    }
  }

  window.docformacionDocumentPdf = Object.freeze({ build, generate });

  // Punto único de entrada utilizado por la interfaz existente.
  generateDocument = generate;
})();
