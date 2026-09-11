(() => {
  'use strict';

  let previewUrl = '';
  let observer = null;
  let scheduled = false;
  const html = value => typeof esc === 'function' ? esc(value) : String(value ?? '');

  function currentDocumentType() {
    if (typeof currentView === 'undefined') return '';
    if (currentView === 'doc-dnf') return 'dnf';
    if (currentView === 'doc-plan') return 'plan';
    if (currentView === 'doc-informe') return 'informe';
    return '';
  }

  function periodReady() {
    return !!String(state?.period?.start ?? '').trim() && !!String(state?.period?.end ?? '').trim();
  }

  function ensureDialog() {
    if (document.getElementById('sectionPreviewDialog')) return;
    const dialog = document.createElement('dialog');
    dialog.id = 'sectionPreviewDialog';
    dialog.className = 'section-preview-dialog';
    dialog.innerHTML = `
      <div class="section-preview-shell">
        <div class="dialog-header section-preview-head">
          <div><h2 id="sectionPreviewTitle">Vista previa de sección</h2><p id="sectionPreviewMeta"></p></div>
          <button type="button" class="icon-btn" id="closeSectionPreview">×</button>
        </div>
        <div class="section-preview-frame-wrap"><iframe id="sectionPreviewFrame" title="Vista previa PDF"></iframe></div>
        <div class="dialog-actions">
          <button type="button" class="secondary" id="closeSectionPreviewBottom">Cerrar</button>
          <button type="button" class="primary" id="downloadPreviewSection">Descargar PDF de sección</button>
        </div>
      </div>`;
    document.body.appendChild(dialog);

    const close = () => {
      if (dialog.open) dialog.close();
      const frame = document.getElementById('sectionPreviewFrame');
      if (frame) frame.removeAttribute('src');
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        previewUrl = '';
      }
      dialog.dataset.type = '';
      dialog.dataset.section = '';
    };
    document.getElementById('closeSectionPreview').onclick = close;
    document.getElementById('closeSectionPreviewBottom').onclick = close;
    dialog.addEventListener('cancel', event => {
      event.preventDefault();
      close();
    });
    document.getElementById('downloadPreviewSection').onclick = async () => {
      const type = dialog.dataset.type;
      const sectionId = dialog.dataset.section;
      if (!type || !sectionId) return;
      const button = document.getElementById('downloadPreviewSection');
      const old = button.textContent;
      button.disabled = true;
      button.textContent = 'Generando…';
      try {
        await window.docformacionSectionPdf.build(type, sectionId, { download:true });
        if (typeof toast === 'function') toast('PDF de sección descargado');
      } catch (error) {
        if (typeof toast === 'function') toast('No se pudo generar la sección: ' + (error?.message || error));
      } finally {
        button.disabled = false;
        button.textContent = old;
      }
    };
  }

  function injectStyles() {
    if (document.getElementById('documentSectionsStyles')) return;
    const style = document.createElement('style');
    style.id = 'documentSectionsStyles';
    style.textContent = `
      .section-workspace{margin-top:20px;border:1px solid #dfe5ef;border-radius:14px;background:#fff;overflow:hidden}
      .section-workspace-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:18px;border-bottom:1px solid #e7ecf3;background:#fbfcfe}
      .section-workspace-head h3{margin:0 0 5px;font-size:17px;color:#172033}.section-workspace-head p{margin:0;color:#6b788b;font-size:12px;line-height:1.45}
      .section-progress{min-width:180px;text-align:right}.section-progress strong{display:block;font-size:13px;color:#173b67}.section-progress-bar{height:7px;border-radius:999px;background:#e8edf4;overflow:hidden;margin-top:7px}.section-progress-bar span{display:block;height:100%;background:#173b67}
      .section-list{display:grid}.document-section{padding:15px 18px;border-top:1px solid #eef1f5}.document-section:first-child{border-top:0}.document-section-main{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:16px;align-items:center}
      .document-section-copy{display:flex;gap:12px;min-width:0}.section-number{width:32px;height:32px;border-radius:9px;background:#eef3f8;color:#173b67;font-weight:900;font-size:12px;display:flex;align-items:center;justify-content:center;flex:0 0 auto}.document-section-copy h4{margin:0 0 4px;font-size:14px;color:#1d2736}.document-section-copy p{margin:0;font-size:11px;color:#788598}
      .section-state{display:inline-flex;align-items:center;padding:4px 8px;border-radius:999px;font-size:10px;font-weight:800;margin-left:7px}.section-state.ready{background:#e9f6ef;color:#2d6a49}.section-state.draft{background:#fff4dd;color:#865b15}
      .section-actions{display:flex;gap:8px;align-items:center}.section-actions button{white-space:nowrap}.section-details{margin:10px 0 0 44px}.section-details summary{cursor:pointer;color:#64748a;font-size:11px;font-weight:800}.section-contract{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:9px}.section-contract>div{background:#f8fafc;border:1px solid #e6ebf2;border-radius:8px;padding:9px}.section-contract strong{display:block;font-size:9px;text-transform:uppercase;letter-spacing:.04em;color:#7a8799;margin-bottom:4px}.section-contract span{font-size:11px;color:#344154;line-height:1.4}.section-missing{margin-top:8px;font-size:10px;color:#8a5b1e}
      .section-preview-dialog{width:min(1100px,96vw);height:min(860px,94vh);padding:0;border:0;border-radius:14px;overflow:hidden}.section-preview-dialog::backdrop{background:rgba(15,23,42,.58)}.section-preview-shell{height:100%;display:grid;grid-template-rows:auto minmax(0,1fr) auto;background:#fff}.section-preview-head{padding:16px 18px;border-bottom:1px solid #e4e9f0}.section-preview-head h2{margin:0 0 4px}.section-preview-head p{margin:0;color:#6f7d90}.section-preview-frame-wrap{min-height:0;background:#eef1f5;padding:10px}.section-preview-frame-wrap iframe{width:100%;height:100%;border:0;border-radius:8px;background:#fff}.section-preview-shell>.dialog-actions{padding:12px 16px;border-top:1px solid #e4e9f0;background:#fff}
      @media(max-width:820px){.section-workspace-head{flex-direction:column}.section-progress{width:100%;text-align:left}.document-section-main{grid-template-columns:1fr}.section-actions{margin-left:44px;flex-wrap:wrap}.section-contract{grid-template-columns:1fr}.section-details{margin-left:44px}}
    `;
    document.head.appendChild(style);
  }

  function listSections(type) {
    return window.DOCFORMACION_MANIFEST?.documents?.[type]?.sections || [];
  }

  async function previewSection(button) {
    ensureDialog();
    const type = button.dataset.type;
    const sectionId = button.dataset.section;
    const old = button.textContent;
    button.disabled = true;
    button.textContent = 'Generando…';
    try {
      const result = await window.docformacionSectionPdf.build(type, sectionId, { download:false });
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      previewUrl = URL.createObjectURL(result.blob);
      const dialog = document.getElementById('sectionPreviewDialog');
      dialog.dataset.type = type;
      dialog.dataset.section = sectionId;
      document.getElementById('sectionPreviewTitle').textContent = result.section.title;
      document.getElementById('sectionPreviewMeta').textContent = result.section.id + ' · ' + (result.readiness.ready ? 'Sección completa' : 'Vista borrador') + ' · ' + result.pages + ' página(s)';
      document.getElementById('sectionPreviewFrame').src = previewUrl;
      dialog.showModal();
    } catch (error) {
      if (typeof toast === 'function') toast('No se pudo abrir la vista previa: ' + (error?.message || error));
    } finally {
      button.disabled = false;
      button.textContent = old;
    }
  }

  async function downloadSection(button) {
    const type = button.dataset.type;
    const sectionId = button.dataset.section;
    const old = button.textContent;
    button.disabled = true;
    button.textContent = 'Generando…';
    try {
      await window.docformacionSectionPdf.build(type, sectionId, { download:true });
      if (typeof toast === 'function') toast('PDF de sección generado');
    } catch (error) {
      if (typeof toast === 'function') toast('No se pudo generar el PDF: ' + (error?.message || error));
    } finally {
      button.disabled = false;
      button.textContent = old;
    }
  }

  function bindActions(root) {
    root.querySelectorAll('.preview-section').forEach(button => button.onclick = () => previewSection(button));
    root.querySelectorAll('.download-section').forEach(button => button.onclick = () => downloadSection(button));
  }

  function appendWorkspace(type) {
    const engine = window.docformacionSectionPdf;
    const content = document.getElementById('content');
    if (!engine || !content || currentDocumentType() !== type) return;
    if (document.getElementById('sectionWorkspace')) return;
    const sections = listSections(type);
    if (!sections.length) return;

    const states = sections.map(section => ({ section, ...engine.sectionReadiness(type, section) }));
    const complete = states.filter(item => item.ready).length;
    const percent = sections.length ? Math.round(complete * 100 / sections.length) : 0;
    const wrapper = document.createElement('div');
    wrapper.id = 'sectionWorkspace';
    wrapper.className = 'section-workspace';
    wrapper.innerHTML = `
      <div class="section-workspace-head">
        <div><h3>Secciones del documento</h3><p>La vista previa y el PDF individual usan exactamente el mismo modelo, validaciones, cálculos y renderizadores que el PDF completo.</p></div>
        <div class="section-progress"><strong>${complete} de ${sections.length} secciones completas</strong><div class="section-progress-bar"><span style="width:${percent}%"></span></div></div>
      </div>
      <div class="section-list">
        ${states.map((item,index) => {
          const section = item.section;
          const missing = item.missing || [];
          return `<div class="document-section" data-section-id="${html(section.id)}">
            <div class="document-section-main">
              <div class="document-section-copy"><div class="section-number">${String(index + 1).padStart(2,'0')}</div><div><h4>${html(section.title)}<span class="section-state ${item.ready ? 'ready' : 'draft'}">${item.ready ? 'Completa' : 'Borrador'}</span></h4><p>${html(section.id)}</p></div></div>
              <div class="section-actions"><button class="secondary preview-section" data-type="${html(type)}" data-section="${html(section.id)}" ${!periodReady() ? 'disabled' : ''}>Vista previa</button><button class="secondary download-section" data-type="${html(type)}" data-section="${html(section.id)}" ${!periodReady() ? 'disabled' : ''}>PDF de sección</button></div>
            </div>
            <details class="section-details"><summary>Datos, cálculos y componentes</summary><div class="section-contract"><div><strong>Datos</strong><span>${html((section.data || []).join(', ') || '—')}</span></div><div><strong>Cálculos</strong><span>${html((section.calculations || []).join(', ') || '—')}</span></div><div><strong>Componentes</strong><span>${html((section.components || []).join(', ') || '—')}</span></div></div>${missing.length ? `<div class="section-missing">Pendiente: ${html(missing.join(', '))}</div>` : ''}</details>
          </div>`;
        }).join('')}
      </div>`;
    content.appendChild(wrapper);
    bindActions(wrapper);
  }

  function scheduleEnhance() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      const type = currentDocumentType();
      if (type) appendWorkspace(type);
    });
  }

  function startObserver() {
    const content = document.getElementById('content');
    if (!content || observer) return;
    observer = new MutationObserver(scheduleEnhance);
    observer.observe(content, { childList:true, subtree:false });
    scheduleEnhance();
  }

  injectStyles();
  ensureDialog();
  startObserver();
})();
