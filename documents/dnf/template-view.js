(() => {
  'use strict';

  let observer = null;
  let scheduled = false;

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

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      addViewButtons(document.getElementById('content'));
    });
  }

  function start() {
    const content = document.getElementById('content');
    if (!content || observer) return;
    observer = new MutationObserver(schedule);
    observer.observe(content, { childList:true, subtree:true });
    schedule();
  }

  start();
})();
