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

  function filename(type, ctx, draft = false) {
    const base = safeFilePart(ctx.documentCode(type) + ' - ' + ctx.documentTitle(type));
    return (draft ? 'BORRADOR - ' : '') + base + '.pdf';
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

  function finalQuality(type, ctx) {
    return window.docformacionFinalQuality?.preflight?.(type, ctx) || { ready:true, missing:[] };
  }

  async function build(type, options = {}) {
    const modules = dependencies();
    await window.docformacionInstitutionAssets?.ensureLogo?.();
    const ctx = modules.context.build();
    const document = modules.manifest.documents?.[type];
    if (!document) throw new Error('Documento no declarado: ' + type + '.');
    if (!ctx.period.active) throw new Error('Selecciona o crea un período antes de generar el PDF.');

    const draft = options.draft === true;
    const readiness = modules.validation.documentReadiness(type, ctx);
    const quality = finalQuality(type, ctx);
    if (!draft && (!readiness.ready || !quality.ready)) {
      const pending = [...new Set([...(readiness.missing || []), ...(quality.missing || [])])];
      throw new Error('El documento todavía tiene pendientes: ' + pending.join(', ') + '.');
    }
    if (!readiness.ready && !options.allowDraft && !draft) {
      throw new Error('El documento todavía tiene pendientes: ' + (readiness.missing || []).join(', ') + '.');
    }

    const documentTitle = ctx.documentTitle(type);
    const pdfTitle = draft ? 'BORRADOR - ' + documentTitle : documentTitle;
    const subject = pdfTitle + ' · ' + ctx.period.label;

    emitProgress(type, 4, 'preparing', { draft });
    const writer = modules.pdf.createWriter({
      title: pdfTitle,
      subject,
      author: clean(modules.manifest.author || modules.manifest.organization || 'ITSQMET'),
      initialHeader: false,
      firstPageFooter: false,
      header: () => ({
        organization: clean(modules.manifest.organization || 'ITSQMET · UNIDAD DE GESTIÓN DE PROCESOS ACADÉMICOS'),
        title: draft ? 'BORRADOR - ' + documentTitle : documentTitle,
        period: ctx.period.label,
        code: ctx.documentCode(type),
        section: '',
        draft
      }),
      footer: (page, pages) => (draft ? 'BORRADOR · ' : '') + documentTitle + ' · ' + ctx.period.label + ' · Página ' + page + ' de ' + pages
    });

    writer.cover({
      organization: clean(modules.manifest.organization || 'ITSQMET · UNIDAD DE GESTIÓN DE PROCESOS ACADÉMICOS'),
      title: documentTitle,
      period: ctx.period.label,
      code: ctx.documentCode(type),
      version: clean(ctx.period.version || '1.0'),
      draft,
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
      if (draft && !sectionState.ready) {
        const sectionMissing = (sectionState.missing || []).filter(Boolean);
        writer.note('BORRADOR: ' + (sectionMissing.length ? sectionMissing.join(', ') : 'esta sección todavía tiene información pendiente') + '.');
      }
      try {
        modules.renderers.render(type, section, writer, ctx);
      } catch (error) {
        if (!draft && !options.allowDraft) throw error;
        console.warn('[DocFormación] Sección incompleta en borrador:', section.id, error);
        writer.note('Contenido pendiente: esta sección no pudo completarse con la información disponible al momento.');
      }
      emitProgress(type, Math.min(90, 10 + Math.round(((index + 1) / Math.max(1, sections.length)) * 78)), 'render', {
        section: section.id,
        sectionIndex: index + 1,
        sectionTotal: sections.length,
        draft
      });
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    emitProgress(type, 94, 'assembling', { draft });
    const result = writer.finish({
      title: pdfTitle,
      subject,
      author: clean(modules.manifest.author || modules.manifest.organization || 'ITSQMET')
    });
    const name = filename(type, ctx, draft);
    if (options.download !== false) downloadBlob(result.blob, name);
    emitProgress(type, 100, 'done', { pages:result.pages, size:result.size, draft });
    return { ...result, filename:name, type, readiness, quality, draft };
  }

  async function generate(type) {
    const button = document.getElementById('generateCurrent') || document.querySelector('[data-generate="' + type + '"]');
    const old = button?.textContent || 'Generar PDF';
    if (button) {
      button.disabled = true;
      button.textContent = 'Generando PDF…';
    }
    try {
      const result = await build(type, { download:true, draft:false });
      if (typeof toast === 'function') toast('PDF final generado correctamente');
      return result;
    } catch (error) {
      console.error('[DocFormación] PDF documental:', error);
      emitProgress(type, 0, 'error', { message:error?.message || String(error) });
      if (typeof toast === 'function') toast('No se pudo generar el PDF final: ' + (error?.message || error));
      return null;
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = old;
      }
    }
  }

  async function generateDraft(type, sourceButton = null) {
    const button = sourceButton || document.querySelector('[data-download-draft="' + type + '"]');
    const old = button?.textContent || 'Descargar borrador PDF';
    if (button) {
      button.disabled = true;
      button.textContent = 'Generando borrador…';
    }
    try {
      const result = await build(type, { download:true, allowDraft:true, draft:true });
      if (typeof toast === 'function') toast('Borrador PDF generado con la información disponible');
      return result;
    } catch (error) {
      console.error('[DocFormación] Borrador PDF:', error);
      emitProgress(type, 0, 'error', { message:error?.message || String(error), draft:true });
      if (typeof toast === 'function') toast('No se pudo generar el borrador PDF: ' + (error?.message || error));
      return null;
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = old;
      }
    }
  }

  window.docformacionDocumentPdf = Object.freeze({ build, generate, generateDraft, filename });

  generateDocument = generate;
})();
