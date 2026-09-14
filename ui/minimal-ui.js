(() => {
  'use strict';

  let observer = null;
  let scheduled = false;

  const SHORT_TABS = Object.freeze({
    'Alineación Estratégica':'Alineación',
    'Metodología y Enfoque':'Metodología',
    'Caracterización del Diagnóstico':'Diagnóstico',
    'Líneas de Formación por Coordinación Académica':'Líneas',
    'Cobertura Institucional':'Cobertura',
    'Resumen Ejecutivo':'Resumen',
    'Objetivo General':'Objetivo',
    'Diagnóstico y trazabilidad':'Diagnóstico',
    'Matriz del Plan':'Matriz',
    'Indicadores y verificación':'Indicadores',
    'Recursos y apoyos':'Recursos',
    'Seguimiento previsto':'Seguimiento',
    'Objeto del Informe':'Objeto',
    'Alcance y trazabilidad':'Alcance',
    'Resumen de Cumplimiento':'Resumen',
    'Seguimiento por necesidad':'Seguimiento',
    'Evidencias y resultados':'Evidencias'
  });

  function setButtonText(selector, text) {
    document.querySelectorAll(selector).forEach(button => {
      if (button.textContent !== text) button.textContent = text;
    });
  }

  function shortenTabs() {
    document.querySelectorAll('.svd-tab').forEach(button => {
      const textNode = [...button.childNodes].find(node => node.nodeType === Node.TEXT_NODE);
      if (!textNode) return;
      const current = String(textNode.nodeValue || '').trim();
      const short = SHORT_TABS[current];
      if (!short || current === short) return;
      button.dataset.fullLabel = current;
      button.title = current;
      textNode.nodeValue = short;
    });
  }

  function cleanPendingMessage() {
    document.querySelectorAll('.canonical-direct-missing').forEach(node => {
      const raw = String(node.textContent || '');
      const lower = raw.toLowerCase();
      const legal = lower.includes('base legal');
      const bibliography = lower.includes('bibliograf');
      let text = '';

      if (legal && bibliography) text = 'Falta confirmar la base legal y la bibliografía institucional.';
      else if (bibliography) text = 'Falta confirmar la bibliografía institucional.';
      else if (legal) text = 'Falta confirmar la base legal institucional.';

      if (text && node.textContent !== text) node.textContent = text;
    });
  }

  function simplifyTemplateCards() {
    document.querySelectorAll('.dnf-template-card .status-badge.ready').forEach(badge => {
      if (badge.textContent.trim() === 'Lista') badge.textContent = 'Carga válida';
    });

    setButtonText('[data-v2-template]', 'Plantilla');
    setButtonText('[data-v2-current]', 'Datos actuales');
    setButtonText('[data-v2-import]', 'Subir plantilla');
    setButtonText('[data-v2-view]', 'Ver');
  }

  function simplifyActions() {
    document.querySelectorAll('[data-correction-view="configuracion"]').forEach(button => {
      if (/revisar/i.test(button.textContent)) button.textContent = 'Configuración';
    });
    document.querySelectorAll('[data-correction-view="diagnostico"]').forEach(button => {
      if (/revisar/i.test(button.textContent)) button.textContent = 'Diagnóstico';
    });
  }

  function polish() {
    shortenTabs();
    simplifyTemplateCards();
    cleanPendingMessage();
    simplifyActions();
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      polish();
    });
  }

  function injectStyles() {
    if (document.getElementById('minimalUiStyles')) return;
    const style = document.createElement('style');
    style.id = 'minimalUiStyles';
    style.textContent = `
      body{background:#f8fafc}
      .topbar{min-height:50px!important;padding:7px 18px!important;border-bottom:1px solid #edf1f5!important;box-shadow:none!important;background:rgba(255,255,255,.98)}
      .topbar>div:first-child{min-width:118px!important}.topbar h1{font-size:15px!important;letter-spacing:-.01em}.topbar #viewSubtitle{display:none!important}.save-state{background:transparent!important;border:0!important;color:#7a8798!important;padding:5px 7px!important}
      .period-main-filter{border-color:#e7ebf0!important;background:#fff!important;border-radius:9px!important;padding:5px 7px!important}.period-main-filter-copy{display:none!important}.period-main-filter select{width:235px!important;max-width:34vw!important;border-color:#e1e7ee!important;padding:6px 7px!important;font-size:10px!important}.period-status-pill{font-size:8px!important;padding:4px 7px!important}

      .svd-navigation{box-shadow:none!important;border-bottom:1px solid #edf1f5!important}.svd-navigation-inner{max-width:1080px!important;padding:7px 18px 0!important}.svd-document-row{gap:5px!important}.svd-document-panel{gap:3px!important;padding-bottom:5px!important}
      .svd-document-button{min-width:auto!important;max-width:none!important;padding:7px 10px!important;border:0!important;border-radius:8px!important;background:transparent!important;box-shadow:none!important;flex-direction:row!important;align-items:center!important;gap:7px!important}
      .svd-document-button:hover{background:#f4f7fa!important}.svd-document-button.selected{background:#eef3f8!important;box-shadow:none!important;color:#173b67!important}.svd-document-title{font-size:10px!important;white-space:nowrap}.svd-document-meta{font-size:8px!important;white-space:nowrap;color:#8792a2!important}.svd-status-dot{width:6px!important;height:6px!important}
      .svd-more>summary{border-color:#e5eaf0!important;background:#fff!important;padding:7px 10px!important}
      .svd-section-tabs{border-top:0!important;gap:0!important}.svd-tab{padding:8px 8px 7px!important;font-size:9px!important;font-weight:650!important}.svd-tab:hover{background:transparent!important}.svd-tab.selected{font-weight:800!important}.svd-tab.selected:after{left:7px!important;right:7px!important;height:2px!important}.svd-tab-dot{width:5px!important;height:5px!important;margin-left:4px!important}

      .content{max-width:1080px!important;padding:22px 18px 34px!important}.section-title{margin:6px 0 10px!important}.section-title h2{font-size:14px!important;letter-spacing:-.01em}.section-title p{font-size:9px!important;color:#8792a2!important}.dnf-template-heading p{display:none!important}
      .dnf-template-grid{gap:10px!important}.dnf-template-card{padding:14px!important;gap:6px!important;border:1px solid #e8edf2!important;border-radius:11px!important;box-shadow:none!important;background:#fff!important}.dnf-template-card-head{gap:8px!important}.dnf-template-card-head strong{font-size:12px!important}.dnf-template-card-head>div>span{display:none!important}.dnf-template-card p{margin:2px 0 6px!important;font-size:11px!important;color:#344154!important}.dnf-template-card .small.muted{font-size:8px!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#9aa3b1!important}
      .dnf-template-card .toolbar{gap:4px!important;margin-top:4px!important}.dnf-template-card .toolbar .primary{order:-1;padding:7px 10px!important;font-size:9px!important;border-radius:7px!important}.dnf-template-card .toolbar .secondary{padding:7px 8px!important;font-size:9px!important;border-color:transparent!important;background:transparent!important;color:#526174!important}.dnf-template-card .toolbar .secondary:hover{background:#f3f6f9!important}.dnf-template-card .status-badge{font-size:8px!important;padding:4px 7px!important}

      .single-document.canonical-doc-status{max-width:760px!important;margin-top:12px!important;padding:13px!important;border:1px solid #e8edf2!important;border-radius:11px!important;box-shadow:none!important;background:#fff!important}.canonical-doc-status .status-head{margin-bottom:4px!important}.canonical-doc-status .missing-heading{font-size:11px!important;font-weight:800!important}.canonical-doc-status .status-badge{font-size:8px!important;padding:4px 7px!important}.canonical-direct-missing{margin-top:4px!important;padding:5px 0!important;background:transparent!important;color:#6f541c!important;font-size:10px!important}.canonical-doc-actions{justify-content:flex-start!important;gap:4px!important;margin-top:7px!important}.canonical-doc-actions .secondary{background:transparent!important;border-color:transparent!important;color:#526174!important;padding:6px 8px!important;font-size:9px!important}.canonical-doc-actions .secondary:hover{background:#f3f6f9!important}.canonical-doc-actions .primary{padding:7px 10px!important;font-size:9px!important}

      #documentElementsPanel,#sectionWorkspace{border:1px solid #e8edf2!important;box-shadow:none!important}.document-element-card,.document-section{padding:14px!important}.document-element-card p{font-size:10px!important}.section-direct-missing,.document-element-meta{background:#fff9ec!important;border:0!important}.section-details summary{font-weight:650!important;color:#7a8798!important}

      @media(max-width:900px){
        .topbar{padding:7px 12px!important}.period-topbar-right{gap:4px!important}.period-main-filter{flex:1!important;min-width:0!important}.period-main-filter select{width:100%!important;max-width:none!important}
        .svd-navigation-inner{padding-left:12px!important;padding-right:12px!important}.content{padding:18px 12px 28px!important}.svd-document-button{padding:7px 9px!important}.svd-document-meta{display:none!important}
        .dnf-template-grid{grid-template-columns:1fr!important}.single-document.canonical-doc-status{max-width:none!important}
      }
    `;
    document.head.appendChild(style);
  }

  function start() {
    injectStyles();
    const root = document.body;
    if (!root || observer) return;
    observer = new MutationObserver(schedule);
    observer.observe(root, { childList:true, subtree:true, characterData:true });
    polish();
  }

  start();
})();
