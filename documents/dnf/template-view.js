(() => {
  'use strict';

  function addViewButtons(root) {
    if (!root) return;
    root.querySelectorAll('.excel-toolbar').forEach(toolbar => {
      if (toolbar.querySelector('[data-v2-view]')) return;
      const source = toolbar.querySelector('[data-v2-import],[data-v2-template]');
      if (!source) return;
      const scope = source.dataset.v2Import || source.dataset.v2Template || '';
      if (!['carreras','dnf'].includes(scope)) return;

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'secondary';
      button.dataset.v2View = scope;
      button.textContent = scope === 'carreras' ? 'Ver carreras' : 'Ver datos';
      button.disabled = !!source.disabled;
      button.onclick = () => setView(scope === 'carreras' ? 'carreras' : 'necesidades');
      toolbar.appendChild(button);
    });
  }

  if (typeof renderDocumentView === 'function') {
    const previous = renderDocumentView;
    renderDocumentView = function renderDocumentViewWithTemplateView(type) {
      const result = previous(type);
      if (type === 'dnf') addViewButtons(document.getElementById('content'));
      return result;
    };
  }

  if (typeof renderCareers === 'function') {
    const previous = renderCareers;
    renderCareers = function renderCareersWithTemplateView() {
      const result = previous();
      addViewButtons(document.getElementById('content'));
      return result;
    };
  }

  if (typeof renderDNF === 'function') {
    const previous = renderDNF;
    renderDNF = function renderDNFWithTemplateView() {
      const result = previous();
      addViewButtons(document.getElementById('content'));
      return result;
    };
  }

  addViewButtons(document.getElementById('content'));
  window.__DOCFORMACION_DNF_TEMPLATE_VIEW_FIX = true;
})();
