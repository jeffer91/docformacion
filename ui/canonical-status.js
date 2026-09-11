(() => {
  'use strict';

  const TITLES = {
    dnf:'Detección de Necesidades de Formación',
    plan:'Plan de Formación Docente',
    informe:'Informe de Cumplimiento del Plan de Formación'
  };

  const VIEWS = { dnf:'doc-dnf', plan:'doc-plan', informe:'doc-informe' };
  const html = value => typeof esc === 'function' ? esc(String(value ?? '')) : String(value ?? '');

  function readiness(type) {
    const ctx = window.docformacionDocumentContext?.build?.();
    return window.docformacionValidation?.documentReadiness?.(type, ctx) || {
      ready:false,
      missing:['validación documental no disponible']
    };
  }

  function pendingCountLabel(count) {
    return count === 1 ? '1 pendiente por completar' : count + ' pendientes por completar';
  }

  function missingList(items) {
    if (!items?.length) return '';
    return '<ul class="canonical-home-missing">' + items.map(item => '<li>' + html(item) + '</li>').join('') + '</ul>';
  }

  statusCard = function canonicalStatusCard(type, title = TITLES[type] || type) {
    const state = readiness(type);
    const missing = Array.isArray(state.missing) ? state.missing : [];
    return `<div class="status-card simple-doc-card canonical-home-card" data-status-type="${html(type)}">
      <div class="status-head">
        <h3>${html(title)}</h3>
        <span class="status-badge ${state.ready ? 'ready' : 'blocked'}">${state.ready ? 'Listo' : 'Pendiente'}</span>
      </div>
      ${state.ready
        ? `<div class="ready-message">Portada, cabecera y secciones obligatorias están completas.</div>
           <div class="doc-actions"><button class="primary" data-generate="${html(type)}">Generar PDF</button></div>`
        : `<div class="missing-heading">${html(pendingCountLabel(missing.length))}</div>
           ${missingList(missing)}
           <div class="doc-actions"><button class="secondary" data-open-document="${html(type)}">Abrir documento</button></div>`}
    </div>`;
  };

  completionAlert = function canonicalCompletionAlert(type) {
    const state = readiness(type);
    const missing = Array.isArray(state.missing) ? state.missing : [];
    if (state.ready) return '<div class="alert-strip success"><div><strong>Documento listo</strong>Portada, cabecera y secciones obligatorias están completas.</div></div>';
    return `<div class="alert-strip warning"><div><strong>${html(pendingCountLabel(missing.length))}</strong>Revisa el documento para completar lo pendiente.</div></div>`;
  };

  renderHome = function canonicalRenderHome() {
    const content = document.getElementById('content');
    if (!content) return;
    content.innerHTML = `
      <div class="simple-home-head">
        <h2>Documentos de Formación Docente</h2>
        <p>Todos los estados se calculan con la misma validación utilizada por cada documento y por Diagnóstico.</p>
      </div>
      <div class="status-grid simple-status-grid">
        ${statusCard('dnf', TITLES.dnf)}
        ${statusCard('plan', TITLES.plan)}
        ${statusCard('informe', TITLES.informe)}
      </div>`;

    content.querySelectorAll('[data-open-document]').forEach(button => {
      button.onclick = () => setView(VIEWS[button.dataset.openDocument]);
    });
    content.querySelectorAll('[data-generate]').forEach(button => {
      button.onclick = () => window.docformacionDocumentPdf?.generate?.(button.dataset.generate);
    });
  };

  function normalizeTemplateCards(root = document) {
    root.querySelectorAll?.('.dnf-template-card .status-badge.ready').forEach(badge => {
      if (String(badge.textContent || '').trim() === 'Lista') badge.textContent = 'Carga válida';
    });
  }

  function injectStyles() {
    if (document.getElementById('canonicalStatusStyles')) return;
    const style = document.createElement('style');
    style.id = 'canonicalStatusStyles';
    style.textContent = `
      .canonical-home-missing{margin:10px 0 0;padding-left:18px;color:#64748a;font-size:11px;line-height:1.55}
      .canonical-home-card .doc-actions{margin-top:12px}
      .dnf-template-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;width:100%;max-width:100%!important}
      .dnf-template-card{min-width:0}
      @media(max-width:820px){.dnf-template-grid{grid-template-columns:1fr!important}}
    `;
    document.head.appendChild(style);
  }

  let scheduled = false;
  function scheduleNormalize() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      normalizeTemplateCards(document.getElementById('content') || document);
    });
  }

  injectStyles();
  const content = document.getElementById('content');
  if (content) {
    new MutationObserver(scheduleNormalize).observe(content, { childList:true, subtree:true });
    scheduleNormalize();
  }

  const activeView = document.querySelector('.nav-item.active')?.dataset?.view;
  if (activeView === 'inicio') renderHome();
})();