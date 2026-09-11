(() => {
  'use strict';

  const DOCS = Object.freeze([
    { type:'dnf', view:'doc-dnf', title:'Detección de Necesidades' },
    { type:'plan', view:'doc-plan', title:'Plan de Formación' },
    { type:'informe', view:'doc-informe', title:'Informe de Cumplimiento' }
  ]);
  const VIEW_TO_TYPE = Object.freeze(Object.fromEntries(DOCS.map(item => [item.view, item.type])));
  const activeTab = { dnf:'info', plan:'info', informe:'info' };
  let lastDocumentType = 'dnf';
  let observer = null;
  let topbarObserver = null;
  let scheduled = false;

  const safe = value => typeof esc === 'function' ? esc(String(value ?? '')) : String(value ?? '');
  const previousSetView = setView;

  function currentType() {
    return VIEW_TO_TYPE[typeof currentView === 'string' ? currentView : ''] || '';
  }

  function readiness(type) {
    const ctx = window.docformacionDocumentContext?.build?.();
    return window.docformacionValidation?.documentReadiness?.(type, ctx) || { ready:false, missing:['Estado no disponible'] };
  }

  function elementState(type, id) {
    return window.docformacionDocumentElements?.readiness?.(type, id) || { ready:false, missing:['Estado no disponible'] };
  }

  function sectionState(type, section) {
    return window.docformacionSectionPdf?.sectionReadiness?.(type, section) || { ready:false, missing:['Estado no disponible'] };
  }

  function openPeriodControl(id) {
    const button = document.getElementById(id);
    if (button) button.click();
  }

  function ensureShell() {
    const topbar = document.querySelector('.topbar');
    if (!topbar) return null;

    let shell = document.getElementById('svdNavigation');
    if (!shell) {
      shell = document.createElement('div');
      shell.id = 'svdNavigation';
      shell.className = 'svd-navigation';
      shell.innerHTML = `
        <div class="svd-navigation-inner">
          <div class="svd-document-row">
            <div id="svdDocumentPanel" class="svd-document-panel" aria-label="Documentos"></div>
            <details class="svd-more">
              <summary>Más</summary>
              <div class="svd-more-menu">
                <button type="button" data-svd-period="openPeriodStatus">Estado del período</button>
                <button type="button" data-svd-period="openPeriodCreator">Crear período</button>
                <hr>
                <button type="button" data-svd-view="periodo">Datos del período</button>
                <button type="button" data-svd-view="carreras">Carreras</button>
                <button type="button" data-svd-view="docentes">Docentes</button>
                <button type="button" data-svd-view="configuracion">Configuración</button>
                <button type="button" data-svd-view="diagnostico">Diagnóstico</button>
              </div>
            </details>
          </div>
          <div id="svdSectionTabs" class="svd-section-tabs" aria-label="Secciones del documento"></div>
        </div>`;
      topbar.insertAdjacentElement('afterend', shell);
      shell.querySelectorAll('[data-svd-view]').forEach(button => {
        button.onclick = () => {
          const details = button.closest('details');
          if (details) details.open = false;
          setView(button.dataset.svdView);
        };
      });
      shell.querySelectorAll('[data-svd-period]').forEach(button => {
        button.onclick = () => {
          const details = button.closest('details');
          if (details) details.open = false;
          openPeriodControl(button.dataset.svdPeriod);
        };
      });
    }
    return shell;
  }

  function renderDocumentPanel() {
    const panel = document.getElementById('svdDocumentPanel');
    if (!panel) return;
    const selected = currentType() || lastDocumentType;
    panel.innerHTML = DOCS.map(item => {
      const state = readiness(item.type);
      const isSelected = selected === item.type && !!currentType();
      const subtitle = state.ready ? 'Listo' : (state.missing?.length ? `${state.missing.length} pendiente${state.missing.length === 1 ? '' : 's'}` : 'Pendiente');
      return `<button type="button" class="svd-document-button${isSelected ? ' selected' : ''}" data-svd-document="${item.type}" ${isSelected ? 'aria-current="page"' : ''}>
        <span class="svd-document-title">${safe(item.title)}</span>
        <span class="svd-document-meta">${safe(subtitle)}${state.ready ? '<i class="svd-status-dot ready" aria-label="Listo"></i>' : '<i class="svd-status-dot pending" aria-label="Pendiente"></i>'}</span>
      </button>`;
    }).join('');
    panel.querySelectorAll('[data-svd-document]').forEach(button => {
      button.onclick = () => {
        const item = DOCS.find(doc => doc.type === button.dataset.svdDocument);
        if (item) setView(item.view);
      };
    });
  }

  function tabItems(type) {
    const sections = window.DOCFORMACION_MANIFEST?.documents?.[type]?.sections || [];
    return [
      { id:'info', title:'Información', ready:null, kind:'info' },
      { id:'cover', title:'Portada', ready:elementState(type, 'cover').ready, kind:'element' },
      { id:'header', title:'Cabecera', ready:elementState(type, 'header').ready, kind:'element' },
      ...sections.map(section => ({ id:section.id, title:section.title, ready:sectionState(type, section).ready, kind:'section' }))
    ];
  }

  function renderSectionTabs(type) {
    const tabs = document.getElementById('svdSectionTabs');
    if (!tabs) return;
    if (!type) {
      tabs.innerHTML = '';
      tabs.hidden = true;
      return;
    }
    tabs.hidden = false;
    const items = tabItems(type);
    if (!items.some(item => item.id === activeTab[type])) activeTab[type] = 'info';
    tabs.innerHTML = items.map(item => {
      const selected = item.id === activeTab[type];
      const dot = item.ready === false ? '<i class="svd-tab-dot pending" aria-label="Pendiente"></i>' : '';
      return `<button type="button" class="svd-tab${selected ? ' selected' : ''}" data-svd-tab="${safe(item.id)}" data-kind="${safe(item.kind)}" role="tab" aria-selected="${selected ? 'true' : 'false'}">${safe(item.title)}${dot}</button>`;
    }).join('');
    tabs.querySelectorAll('[data-svd-tab]').forEach(button => {
      button.onclick = () => {
        activeTab[type] = button.dataset.svdTab;
        renderSectionTabs(type);
        applyActiveTab(type);
      };
    });
  }

  function setVisible(node, visible) {
    if (!node) return;
    node.classList.toggle('svd-hidden', !visible);
  }

  function applyActiveTab(type) {
    if (!type || currentType() !== type) return;
    const root = document.getElementById('content');
    if (!root) return;
    const selected = activeTab[type] || 'info';
    const elementsPanel = document.getElementById('documentElementsPanel');
    const workspace = document.getElementById('sectionWorkspace');
    const regularChildren = [...root.children].filter(node => node !== elementsPanel && node !== workspace);

    regularChildren.forEach(node => setVisible(node, selected === 'info'));
    setVisible(elementsPanel, selected === 'cover' || selected === 'header');
    setVisible(workspace, selected !== 'info' && selected !== 'cover' && selected !== 'header');

    if (elementsPanel) {
      elementsPanel.querySelector('.document-elements-head')?.classList.add('svd-hidden');
      elementsPanel.querySelectorAll('.document-element-card').forEach(card => setVisible(card, card.dataset.elementId === selected));
    }

    if (workspace) {
      workspace.querySelector('.section-workspace-head')?.classList.add('svd-hidden');
      workspace.querySelectorAll('.document-section').forEach(section => setVisible(section, section.dataset.sectionId === selected));
    }
  }

  function syncTopbar() {
    const type = currentType();
    if (!type) return;
    const title = document.getElementById('viewTitle');
    const subtitle = document.getElementById('viewSubtitle');
    if (title) title.textContent = 'DocFormación';
    if (subtitle) subtitle.textContent = 'Gestión documental';
  }

  function syncTopbarHeight() {
    const topbar = document.querySelector('.topbar');
    if (!topbar) return;
    const height = Math.ceil(topbar.getBoundingClientRect().height);
    document.documentElement.style.setProperty('--svd-topbar-height', `${height}px`);
  }

  function observeTopbar() {
    const topbar = document.querySelector('.topbar');
    if (!topbar) return;
    syncTopbarHeight();
    if (typeof ResizeObserver === 'function') {
      topbarObserver?.disconnect?.();
      topbarObserver = new ResizeObserver(syncTopbarHeight);
      topbarObserver.observe(topbar);
    } else {
      window.addEventListener('resize', syncTopbarHeight, { passive:true });
    }
  }

  function sync() {
    ensureShell();
    const type = currentType();
    if (type) lastDocumentType = type;
    renderDocumentPanel();
    renderSectionTabs(type);
    syncTopbar();
    syncTopbarHeight();
    if (type) applyActiveTab(type);
  }

  function scheduleSync() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      sync();
    });
  }

  setView = function svdSetView(view) {
    previousSetView(view);
    const type = VIEW_TO_TYPE[view] || '';
    if (type) {
      lastDocumentType = type;
      if (!activeTab[type]) activeTab[type] = 'info';
    }
    scheduleSync();
  };

  function injectStyles() {
    if (document.getElementById('svd2Styles')) return;
    const style = document.createElement('style');
    style.id = 'svd2Styles';
    style.textContent = `
      :root{--svd-topbar-height:64px}
      .sidebar{display:none!important}.app-shell{display:block!important;min-height:100vh}.main{width:100%;min-width:0}
      .topbar{min-height:58px;height:auto;padding:9px 20px;position:sticky;top:0;z-index:50;gap:14px}.topbar>div:first-child{min-width:140px}.topbar h1{font-size:16px;margin:0 0 2px}.topbar p{font-size:10px;margin:0}.period-topbar-right{gap:6px!important}.period-topbar-right button,.period-topbar-right select{font-size:10px!important}.save-state{font-size:10px;padding:6px 9px}.period-count,.period-status-btn,.period-create-btn{display:none!important}
      .period-main-filter{padding:6px 8px!important;gap:6px!important}.period-main-filter-copy small{display:none!important}.period-main-filter-copy span{font-size:8px!important}.period-main-filter select{width:250px!important;max-width:31vw!important;padding:7px 8px!important;font-size:11px!important}.period-status-pill{font-size:9px!important;padding:4px 7px!important}
      .svd-navigation{position:sticky;top:var(--svd-topbar-height);z-index:45;background:#fff;border-bottom:1px solid var(--line);box-shadow:0 3px 10px rgba(23,59,103,.035)}.svd-navigation-inner{max-width:1280px;margin:0 auto;padding:9px 20px 0}.svd-document-row{display:flex;align-items:stretch;gap:9px;min-width:0}.svd-document-panel{display:flex;gap:8px;overflow-x:auto;min-width:0;flex:1;padding-bottom:7px;scrollbar-width:thin}
      .svd-document-button{position:relative;display:flex;flex-direction:column;gap:3px;align-items:flex-start;min-width:185px;max-width:270px;padding:9px 12px;border:1px solid #dde4ee;border-radius:10px;background:#fff;color:#26364b;text-align:left;cursor:pointer;flex:0 0 auto}.svd-document-button:hover{background:#f8fafc}.svd-document-button.selected{background:#fbfcfe;border-color:#cfd9e6;box-shadow:inset 0 -3px 0 var(--accent)}.svd-document-title{font-size:11px;font-weight:800;line-height:1.25}.svd-document-meta{display:flex;align-items:center;gap:6px;font-size:9px;color:#7a8798}.svd-status-dot,.svd-tab-dot{display:inline-block;border-radius:999px;flex:0 0 auto}.svd-status-dot{width:7px;height:7px}.svd-tab-dot{width:6px;height:6px;margin-left:5px}.svd-status-dot.ready{background:#1f8a63}.svd-status-dot.pending,.svd-tab-dot.pending{background:#d6a62a}
      .svd-more{position:relative;flex:0 0 auto}.svd-more>summary{list-style:none;cursor:pointer;border:1px solid #dde4ee;border-radius:9px;padding:8px 11px;background:#f8fafc;color:#40516a;font-size:10px;font-weight:800}.svd-more>summary::-webkit-details-marker{display:none}.svd-more-menu{position:absolute;right:0;top:calc(100% + 6px);width:195px;padding:7px;border:1px solid #dfe5ef;border-radius:11px;background:#fff;box-shadow:0 15px 35px rgba(15,39,68,.14);display:grid;gap:3px;z-index:80}.svd-more-menu hr{width:100%;border:0;border-top:1px solid #edf0f4;margin:4px 0}.svd-more-menu button{border:0;background:transparent;text-align:left;padding:8px 9px;border-radius:7px;color:#344258;font-size:10px;cursor:pointer}.svd-more-menu button:hover{background:#f1f5f9}
      .svd-section-tabs{display:flex;gap:2px;overflow-x:auto;white-space:nowrap;border-top:1px solid #eef1f5;padding:0;scrollbar-width:thin}.svd-section-tabs[hidden]{display:none}.svd-tab{position:relative;border:0;background:transparent;color:#6d798b;padding:9px 10px 8px;font-size:10px;font-weight:750;cursor:pointer;flex:0 0 auto}.svd-tab:hover{color:#173b67;background:#f8fafc}.svd-tab.selected{color:#173b67}.svd-tab.selected:after{content:'';position:absolute;left:8px;right:8px;bottom:0;height:2px;background:var(--accent);border-radius:999px}
      .content{max-width:1280px;margin:0 auto;padding:17px 20px 36px}.section-title{margin:16px 0 9px}.section-title h2{font-size:15px}.section-title p{font-size:10px}.card{padding:15px;border-radius:12px}.simple-doc-card{padding:15px}.simple-doc-card .status-head h3{font-size:14px}.status-badge.blocked,.status-badge.pending{background:#fff3d8!important;color:#8a6400!important}.section-state.draft{background:#fff3d8!important;color:#8a6400!important}.canonical-doc-status .issue-count{display:none}.canonical-doc-status .ready-message{font-size:11px;padding:10px}.canonical-missing-list{margin:8px 0 0!important;padding-left:18px!important}.svd-hidden{display:none!important}
      #documentElementsPanel,#sectionWorkspace{margin-top:0!important;border-radius:12px}.document-element-grid{grid-template-columns:1fr!important;padding:0!important}.document-element-card{border:0!important;border-radius:0!important;padding:16px!important}.document-element-card p{max-width:720px}#sectionWorkspace .section-list{display:block}.document-section{border:0!important;padding:16px!important}.document-section-main{align-items:start}.document-section-copy p{display:none}.section-details{margin-top:11px}.section-actions{align-self:start}.dnf-template-heading p{max-width:680px}.dnf-template-card{padding:14px!important}.dnf-template-card .small{font-size:10px}
      @media(max-width:900px){.topbar{padding:9px 13px;align-items:flex-start;flex-wrap:wrap}.topbar>div:first-child{width:100%}.period-topbar-right{width:100%;overflow-x:auto;padding-bottom:3px;flex-wrap:nowrap!important}.period-main-filter{flex:1;min-width:280px}.period-main-filter select{width:210px!important;max-width:none!important}.svd-navigation-inner{padding:8px 13px 0}.svd-document-button{min-width:165px}.content{padding:14px 13px 28px}.svd-document-row{align-items:flex-start}.document-section-main{grid-template-columns:1fr}.section-actions{margin-left:41px;flex-wrap:wrap}.section-actions button{flex:1}.document-element-actions button{flex:1}}
    `;
    document.head.appendChild(style);
  }

  injectStyles();
  document.body.dataset.svd = '2.0';
  ensureShell();
  observeTopbar();

  const content = document.getElementById('content');
  if (content) {
    observer = new MutationObserver(scheduleSync);
    observer.observe(content, { childList:true, subtree:true });
  }

  if (typeof currentView === 'string' && currentView === 'inicio') setView('doc-dnf');
  else sync();
})();
