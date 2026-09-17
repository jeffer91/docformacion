(() => {
  'use strict';

  const activeUrls = new Map();
  const loading = new Set();
  let observer = null;
  let mutationObserver = null;
  let scheduled = false;

  const clean = value => String(value ?? '').trim();

  function currentDocumentType() {
    if (typeof currentView === 'undefined') return '';
    if (currentView === 'doc-dnf') return 'dnf';
    if (currentView === 'doc-plan') return 'plan';
    if (currentView === 'doc-informe') return 'informe';
    return '';
  }

  function keyFor(type, kind, id) {
    return [type, kind, id].join(':');
  }

  function revoke(key) {
    const entry = activeUrls.get(key);
    if (!entry) return;
    try { URL.revokeObjectURL(entry.url); } catch (_error) {}
    activeUrls.delete(key);
  }

  function cleanupStale() {
    [...activeUrls.entries()].forEach(([key, entry]) => {
      if (!entry?.host?.isConnected) revoke(key);
    });
  }

  function injectStyles() {
    if (document.getElementById('inlineDocumentPreviewStyles')) return;
    const style = document.createElement('style');
    style.id = 'inlineDocumentPreviewStyles';
    style.textContent = `
      .inline-preview-slot{margin-top:12px;border:1px solid #dfe5ef;border-radius:12px;overflow:hidden;background:#eef2f6;min-height:460px;position:relative}
      .document-element-card .inline-preview-slot{min-height:390px;margin-top:4px}
      .inline-preview-frame{display:block;width:100%;height:560px;border:0;background:#fff}
      .document-element-card .inline-preview-frame{height:460px}
      .inline-preview-loading,.inline-preview-error{min-height:460px;display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;color:#66758a;font-size:12px;line-height:1.5;background:#f8fafc}
      .document-element-card .inline-preview-loading,.document-element-card .inline-preview-error{min-height:390px}
      .inline-preview-error{color:#8a5a1d;background:#fff8e8}
      .inline-preview-caption{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 11px;border-top:1px solid #dfe5ef;background:#fff;color:#6f7d90;font-size:10px}
      .inline-preview-caption strong{color:#334155;font-size:10px}
      .document-section{padding-bottom:18px}.document-section-main{align-items:flex-start}
      .document-section .preview-section,.document-element-card .preview-doc-element{display:none!important}
      @media(max-width:820px){.inline-preview-frame{height:470px}.document-element-card .inline-preview-frame{height:420px}.inline-preview-slot,.inline-preview-loading,.inline-preview-error{min-height:390px}}
    `;
    document.head.appendChild(style);
  }

  function slotHtml(label) {
    return `<div class="inline-preview-loading">Generando vista previa de ${label}…</div>`;
  }

  function ensureSectionSlot(card, type) {
    const id = clean(card.dataset.sectionId);
    if (!id || card.querySelector('.inline-preview-slot')) return null;
    const slot = document.createElement('div');
    slot.className = 'inline-preview-slot';
    slot.dataset.previewKind = 'section';
    slot.dataset.previewId = id;
    slot.dataset.previewType = type;
    slot.innerHTML = slotHtml('la sección');
    const details = card.querySelector('.section-details');
    if (details) card.insertBefore(slot, details);
    else card.appendChild(slot);
    card.querySelector('.preview-section')?.remove();
    return slot;
  }

  function ensureElementSlot(card, type) {
    const id = clean(card.dataset.elementId);
    if (!id || card.querySelector('.inline-preview-slot')) return null;
    const slot = document.createElement('div');
    slot.className = 'inline-preview-slot';
    slot.dataset.previewKind = 'element';
    slot.dataset.previewId = id;
    slot.dataset.previewType = type;
    slot.innerHTML = slotHtml(id === 'cover' ? 'la portada' : 'la cabecera');
    const actions = card.querySelector('.document-element-actions');
    if (actions) card.insertBefore(slot, actions);
    else card.appendChild(slot);
    card.querySelector('.preview-doc-element')?.remove();
    return slot;
  }

  async function buildPreview(slot) {
    if (!slot?.isConnected) return;
    const type = clean(slot.dataset.previewType);
    const kind = clean(slot.dataset.previewKind);
    const id = clean(slot.dataset.previewId);
    const key = keyFor(type, kind, id);
    if (!type || !kind || !id || loading.has(key) || activeUrls.has(key)) return;

    loading.add(key);
    try {
      let result;
      if (kind === 'element') {
        result = await window.docformacionDocumentElements?.build?.(type, id, { download:false });
      } else {
        result = await window.docformacionSectionPdf?.build?.(type, id, { download:false });
      }
      if (!result?.blob) throw new Error('No se obtuvo el PDF de vista previa.');
      if (!slot.isConnected) return;

      revoke(key);
      const url = URL.createObjectURL(result.blob);
      activeUrls.set(key, { url, host:slot });
      const status = result.readiness?.ready ? 'Completa' : 'Borrador';
      const pages = Number(result.pages || 1);
      slot.innerHTML = `
        <iframe class="inline-preview-frame" title="Vista previa directa" src="${url}#toolbar=0&navpanes=0&scrollbar=1&view=FitH"></iframe>
        <div class="inline-preview-caption"><strong>Vista previa directa</strong><span>${status} · ${pages} página${pages === 1 ? '' : 's'}</span></div>`;
    } catch (error) {
      if (slot.isConnected) {
        slot.innerHTML = `<div class="inline-preview-error">No se pudo generar esta vista previa. ${clean(error?.message || error)}</div>`;
      }
    } finally {
      loading.delete(key);
    }
  }

  function observeSlot(slot) {
    if (!slot) return;
    if (!observer) {
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          observer.unobserve(entry.target);
          buildPreview(entry.target);
        });
      }, { rootMargin:'240px 0px' });
    }
    observer.observe(slot);
  }

  function refreshCopy() {
    const workspaceCopy = document.querySelector('.section-workspace-head p');
    if (workspaceCopy) workspaceCopy.textContent = 'La vista previa de cada sección se muestra directamente debajo de su título.';
    const elementCopy = document.querySelector('.document-elements-head p');
    if (elementCopy) elementCopy.textContent = 'Portada y cabecera se muestran directamente para revisión visual.';
  }

  function enhance() {
    scheduled = false;
    cleanupStale();
    const type = currentDocumentType();
    if (!type) return;
    refreshCopy();

    document.querySelectorAll('.document-section[data-section-id]').forEach(card => {
      const slot = ensureSectionSlot(card, type) || card.querySelector('.inline-preview-slot');
      if (slot && !activeUrls.has(keyFor(type, 'section', slot.dataset.previewId))) observeSlot(slot);
    });

    document.querySelectorAll('.document-element-card[data-element-id]').forEach(card => {
      const slot = ensureElementSlot(card, type) || card.querySelector('.inline-preview-slot');
      if (slot && !activeUrls.has(keyFor(type, 'element', slot.dataset.previewId))) observeSlot(slot);
    });
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(enhance);
  }

  injectStyles();
  const content = document.getElementById('content');
  if (content) {
    mutationObserver = new MutationObserver(schedule);
    mutationObserver.observe(content, { childList:true, subtree:true });
  }
  schedule();

  window.docformacionInlinePreviews = Object.freeze({
    refresh:schedule,
    cleanup:cleanupStale,
    activeCount:() => activeUrls.size
  });
})();