(() => {
  'use strict';

  const clean = value => String(value ?? '').trim();

  function currentDocumentType() {
    if (typeof currentView === 'undefined') return '';
    if (currentView === 'doc-dnf') return 'dnf';
    if (currentView === 'doc-plan') return 'plan';
    if (currentView === 'doc-informe') return 'informe';
    return '';
  }

  function documentStatus(type) {
    const ctx = window.docformacionDocumentContext?.build?.();
    if (!ctx || !window.docformacionValidation?.documentReadiness) return null;
    return window.docformacionValidation.documentReadiness(type, ctx);
  }

  function ensureDraftButton() {
    const type = currentDocumentType();
    if (!type) return;

    const card = document.querySelector('.single-document');
    if (!card) return;

    const status = documentStatus(type);
    const existing = card.querySelector('[data-download-draft]');

    if (!status || status.ready) {
      existing?.remove();
      return;
    }

    let actions = card.querySelector('.canonical-doc-actions');
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'canonical-doc-actions';
      card.appendChild(actions);
    }

    if (existing) {
      existing.dataset.downloadDraft = type;
      return;
    }

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'secondary';
    button.dataset.downloadDraft = type;
    button.textContent = 'Descargar borrador PDF';
    button.title = 'Genera un PDF con toda la información disponible hasta este momento, aunque existan secciones pendientes.';
    button.onclick = () => window.docformacionDocumentPdf?.generateDraft?.(type, button);
    actions.prepend(button);
  }

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      ensureDraftButton();
    });
  }

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList:true, subtree:true });

  if (typeof renderDocumentView === 'function') {
    const previousRenderDocumentView = renderDocumentView;
    renderDocumentView = function draftPdfDocumentView(type) {
      const result = previousRenderDocumentView(type);
      schedule();
      return result;
    };
  }

  schedule();

  window.docformacionDraftPdfUi = Object.freeze({
    ensure:ensureDraftButton,
    currentDocumentType,
    status:documentStatus
  });
})();
