(() => {
  function enhance(type, detail = {}) {
    const shell = document.querySelector(`[data-pdf-progress="${type}"]`);
    if (!shell) return;

    let meta = shell.querySelector('[data-pdf-progress-meta]');
    if (!meta) {
      meta = document.createElement('div');
      meta.dataset.pdfProgressMeta = '1';
      meta.style.marginTop = '5px';
      meta.style.fontSize = '9px';
      meta.style.color = '#7a8794';
      shell.appendChild(meta);
    }
    const build = detail.build || window.DOCFORMACION_BUILD || '—';
    const engine = detail.engine || window.__DOCFORMACION_DNF_RENDERER || window.__DOCFORMACION_PDF_ROUTER || 'PDF';
    meta.textContent = `Build ${build} · Motor ${engine}`;

    if (type === 'dnf') {
      const headRight = shell.querySelector('.pdf-progress-head-right');
      if (headRight && !headRight.querySelector('[data-pdf-cancel]')) {
        const cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.dataset.pdfCancel = '1';
        cancel.textContent = 'Cancelar';
        cancel.style.border = '0';
        cancel.style.background = 'transparent';
        cancel.style.color = '#8b3a35';
        cancel.style.fontSize = '10px';
        cancel.style.fontWeight = '700';
        cancel.style.cursor = 'pointer';
        cancel.onclick = () => {
          if (typeof window.__DOCFORMACION_ABORT_PDF === 'function') {
            window.__DOCFORMACION_ABORT_PDF();
          } else {
            location.reload();
          }
        };
        headRight.prepend(cancel);
      }
    }
  }

  window.addEventListener('docformacion-pdf-progress', event => {
    const d = event?.detail || {};
    const type = d.type || 'dnf';
    setTimeout(() => enhance(type, d), 0);
  });
})();