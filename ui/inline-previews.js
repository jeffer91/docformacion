(() => {
  'use strict';

  let observer = null;
  let mutationObserver = null;
  let scheduled = false;
  const rendered = new WeakSet();

  const clean = value => String(value ?? '').trim();
  const escHtml = value => clean(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  function currentDocumentType() {
    if (typeof currentView === 'undefined') return '';
    if (currentView === 'doc-dnf') return 'dnf';
    if (currentView === 'doc-plan') return 'plan';
    if (currentView === 'doc-informe') return 'informe';
    return '';
  }

  function injectStyles() {
    if (document.getElementById('inlineDocumentPreviewStyles')) return;
    const style = document.createElement('style');
    style.id = 'inlineDocumentPreviewStyles';
    style.textContent = `
      .document-element-grid{grid-template-columns:1fr!important}
      .document-section-copy p{display:none!important}
      .document-section .preview-section,.document-element-card .preview-doc-element{display:none!important}
      .document-section{padding-bottom:18px}.document-section-main{align-items:flex-start}
      .section-details{margin-top:9px!important}

      .inline-preview-slot{margin:12px 0 0 41px;border:1px solid #dfe5ef;border-radius:12px;overflow:hidden;background:#f4f6f9;position:relative;pointer-events:auto}
      .document-element-card .inline-preview-slot{margin:4px 0 0}
      .inline-preview-loading,.inline-preview-error{min-height:110px;display:flex;align-items:center;justify-content:center;padding:22px;text-align:center;color:#66758a;font-size:11px;line-height:1.5;background:#f8fafc}
      .inline-preview-error{color:#8a5a1d;background:#fff8e8}
      .inline-preview-caption{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 11px;border-top:1px solid #e3e8ef;background:#fff;color:#6f7d90;font-size:10px}
      .inline-preview-caption strong{color:#334155;font-size:10px}

      .inline-preview-paper{background:#fff;padding:26px 30px;color:#111827;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.45;min-height:120px}
      .inline-preview-paper h1{margin:0 0 15px;font-size:20px;line-height:1.2;color:#111827}.inline-preview-paper h2{margin:18px 0 8px;font-size:14px;line-height:1.25;color:#111827}.inline-preview-paper h3{margin:14px 0 7px;font-size:12px;color:#111827}
      .inline-preview-paper p{margin:0 0 10px}.inline-preview-bullet{display:flex;gap:8px;margin:0 0 7px}.inline-preview-bullet:before{content:'•';font-weight:900;flex:0 0 auto}
      .inline-preview-note{margin:10px 0;padding:9px 11px;border-left:3px solid #c9a84c;background:#fff9eb;color:#6d5720;border-radius:4px}
      .inline-preview-table-wrap{overflow-x:auto;margin:10px 0 14px}.inline-preview-table{width:100%;border-collapse:collapse;table-layout:auto;font-size:10px}.inline-preview-table th{background:#285674;color:#fff;font-weight:700;text-align:left;padding:6px 7px;border:1px solid #cbd5df}.inline-preview-table td{padding:6px 7px;border:1px solid #cbd5df;vertical-align:top;color:#1f2937;background:#fff}
      .inline-preview-metrics th:first-child{width:68%}.inline-preview-metrics td:last-child{font-weight:700}
      .inline-preview-chart{margin:12px 0 16px}.inline-preview-chart-title{font-weight:800;margin-bottom:8px}.inline-preview-chart-row{display:grid;grid-template-columns:minmax(90px,160px) 1fr 46px;gap:9px;align-items:center;margin:7px 0}.inline-preview-chart-track{height:12px;border-radius:999px;background:#edf1f5;overflow:hidden}.inline-preview-chart-bar{height:100%;background:#285674;border-radius:999px}.inline-preview-chart-value{text-align:right;font-weight:700}

      .inline-preview-rgi{border:1px solid #2b3440;display:grid;grid-template-columns:25% 50% 25%;min-height:92px;margin-bottom:24px}.inline-preview-rgi>div{border-right:1px solid #2b3440;display:flex;align-items:center;justify-content:center;text-align:center;padding:8px}.inline-preview-rgi>div:last-child{border-right:0}.inline-preview-logo img{max-width:86%;max-height:60px;object-fit:contain}.inline-preview-logo span{font-weight:800;font-size:10px}.inline-preview-rgi-center{display:block!important;padding:0!important}.inline-preview-rgi-unit{font-weight:800;padding:8px;border-bottom:1px solid #2b3440}.inline-preview-rgi-title{padding:12px 8px}.inline-preview-rgi-title strong{display:block;margin-bottom:4px}.inline-preview-code{display:block!important}.inline-preview-code strong{display:block;margin-bottom:7px;font-size:9px}.inline-preview-code span{font-size:9px;overflow-wrap:anywhere}
      .inline-preview-signatures{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid #2b3440;margin-top:30px}.inline-preview-signature{min-height:112px;padding:10px;border-right:1px solid #2b3440;display:flex;flex-direction:column}.inline-preview-signature:last-child{border-right:0}.inline-preview-signature strong{font-size:9px}.inline-preview-sign-line{height:40px;border-bottom:1px solid #9aa3ad;margin:0 18px 9px}.inline-preview-signature span{font-size:9px;margin-top:4px}

      @media(max-width:820px){.inline-preview-slot{margin-left:0}.inline-preview-paper{padding:20px 16px}.inline-preview-rgi{grid-template-columns:24% 52% 24%}.inline-preview-signatures{grid-template-columns:1fr}.inline-preview-signature{border-right:0;border-bottom:1px solid #2b3440}.inline-preview-signature:last-child{border-bottom:0}.inline-preview-chart-row{grid-template-columns:82px 1fr 38px}}
    `;
    document.head.appendChild(style);
  }

  function writerFactory() {
    const parts = [];
    const text = value => escHtml(value);
    const rowHtml = row => `<tr>${(row || []).map(cell => `<td>${text(cell)}</td>`).join('')}</tr>`;
    const writer = {
      heading:(value, level = 2) => {
        const tag = level <= 1 ? 'h1' : (level === 2 ? 'h2' : 'h3');
        parts.push(`<${tag}>${text(value)}</${tag}>`);
      },
      paragraph:value => {
        if (clean(value)) parts.push(`<p>${text(value)}</p>`);
      },
      bullet:value => {
        if (clean(value)) parts.push(`<div class="inline-preview-bullet"><span>${text(value)}</span></div>`);
      },
      note:value => {
        if (clean(value)) parts.push(`<div class="inline-preview-note">${text(value)}</div>`);
      },
      table:(headers, rows) => {
        const head = (headers || []).map(value => `<th>${text(value)}</th>`).join('');
        parts.push(`<div class="inline-preview-table-wrap"><table class="inline-preview-table"><thead><tr>${head}</tr></thead><tbody>${(rows || []).map(rowHtml).join('')}</tbody></table></div>`);
      },
      metricTable:rows => {
        parts.push(`<div class="inline-preview-table-wrap"><table class="inline-preview-table inline-preview-metrics"><thead><tr><th>Indicador</th><th>Resultado</th></tr></thead><tbody>${(rows || []).map(rowHtml).join('')}</tbody></table></div>`);
      },
      barChart:(title, items) => {
        const list = Array.isArray(items) ? items : [];
        const max = Math.max(1, ...list.map(item => Number(item?.value || 0)));
        parts.push(`<div class="inline-preview-chart"><div class="inline-preview-chart-title">${text(title)}</div>${list.map(item => {
          const value = Number(item?.value || 0);
          const width = Math.max(0, Math.min(100, value * 100 / max));
          return `<div class="inline-preview-chart-row"><span>${text(item?.label)}</span><div class="inline-preview-chart-track"><div class="inline-preview-chart-bar" style="width:${width}%"></div></div><span class="inline-preview-chart-value">${text(value)}</span></div>`;
        }).join('')}</div>`);
      },
      pageBreak:() => {},
      ensureSpace:() => {},
      space:() => {},
      output:() => parts.join('')
    };
    return writer;
  }

  function sectionState(type, section, ctx) {
    try {
      return window.docformacionValidation?.sectionReadiness?.(type, section, ctx) || { ready:true, missing:[] };
    } catch (_error) {
      return { ready:true, missing:[] };
    }
  }

  function renderSection(type, id) {
    const sections = window.DOCFORMACION_MANIFEST?.documents?.[type]?.sections || [];
    const section = sections.find(item => item.id === id);
    if (!section) throw new Error('No se encontró la sección solicitada.');
    const ctx = window.docformacionDocumentContext?.build?.();
    if (!ctx) throw new Error('No se pudo construir el contexto documental.');
    const readiness = sectionState(type, section, ctx);
    const writer = writerFactory();
    writer.heading(section.title, 1);
    if (!readiness.ready && readiness.missing?.length) {
      writer.note('Vista borrador. Falta completar: ' + readiness.missing.join(', ') + '.');
    }
    window.docformacionSectionRenderers?.render?.(type, section, writer, ctx);
    return { html:writer.output(), readiness };
  }

  function authority(ctx, key, roleKey) {
    return {
      name:clean(ctx?.authorities?.[key]) || 'Pendiente',
      role:clean(ctx?.authorities?.[roleKey]) || 'Pendiente'
    };
  }

  function renderRgiHeader(type, ctx, manifest) {
    const logo = clean(window.DOCFORMACION_LOGO_DATA_URL);
    return `<div class="inline-preview-rgi">
      <div class="inline-preview-logo">${logo ? `<img src="${logo}" alt="Logo institucional">` : '<span>ITSQMET</span>'}</div>
      <div class="inline-preview-rgi-center"><div class="inline-preview-rgi-unit">UNIDAD DE GESTIÓN DE PROCESOS ACADÉMICOS</div><div class="inline-preview-rgi-title"><strong>${escHtml(ctx.documentTitle(type))}</strong><span>${escHtml(ctx.period.label)}</span></div></div>
      <div class="inline-preview-code"><strong>Código:</strong><span>${escHtml(ctx.documentCode(type))}</span></div>
    </div>`;
  }

  function renderElement(type, id) {
    const ctx = window.docformacionDocumentContext?.build?.();
    const manifest = window.DOCFORMACION_MANIFEST || {};
    if (!ctx) throw new Error('No se pudo construir el contexto documental.');
    let readiness = { ready:true, missing:[] };
    try { readiness = window.docformacionValidation?.elementReadiness?.(type, id, ctx) || readiness; } catch (_error) {}

    const header = renderRgiHeader(type, ctx, manifest);
    if (id === 'header') {
      return {
        html:`<div class="inline-preview-paper">${header}<p>Esta cabecera se utiliza en las páginas interiores del documento.</p></div>`,
        readiness
      };
    }

    const prepared = authority(ctx, 'preparedBy', 'preparedRole');
    const reviewed = authority(ctx, 'reviewedBy', 'reviewedRole');
    const approved = authority(ctx, 'approvedBy', 'approvedRole');
    const signature = (label, item) => `<div class="inline-preview-signature"><strong>${escHtml(label)}</strong><div class="inline-preview-sign-line"></div><span>NOMBRE: ${escHtml(item.name)}</span><span>CARGO: ${escHtml(item.role)}</span></div>`;
    const pending = !readiness.ready && readiness.missing?.length
      ? `<div class="inline-preview-note">Vista borrador. Falta completar: ${escHtml(readiness.missing.join(', '))}.</div>`
      : '';
    return {
      html:`<div class="inline-preview-paper">${header}${pending}<div class="inline-preview-signatures">${signature('ELABORADO POR:', prepared)}${signature('REVISADO POR:', reviewed)}${signature('APROBADO POR:', approved)}</div></div>`,
      readiness
    };
  }

  function slotHtml(label) {
    return `<div class="inline-preview-loading">Preparando ${escHtml(label)}…</div>`;
  }

  function ensureSectionSlot(card, type) {
    const id = clean(card.dataset.sectionId);
    if (!id || card.querySelector('.inline-preview-slot')) return null;
    const slot = document.createElement('div');
    slot.className = 'inline-preview-slot';
    slot.dataset.previewKind = 'section';
    slot.dataset.previewId = id;
    slot.dataset.previewType = type;
    slot.innerHTML = slotHtml('la vista previa');
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

  function buildPreview(slot) {
    if (!slot?.isConnected || rendered.has(slot)) return;
    const type = clean(slot.dataset.previewType);
    const kind = clean(slot.dataset.previewKind);
    const id = clean(slot.dataset.previewId);
    if (!type || !kind || !id) return;
    rendered.add(slot);
    try {
      const result = kind === 'element' ? renderElement(type, id) : renderSection(type, id);
      const status = result.readiness?.ready ? 'Completa' : 'Borrador';
      slot.innerHTML = `${result.html}<div class="inline-preview-caption"><strong>Vista previa directa</strong><span>${status}</span></div>`;
    } catch (error) {
      slot.innerHTML = `<div class="inline-preview-error">No se pudo preparar esta vista previa. ${escHtml(error?.message || error)}</div>`;
    }
  }

  function observeSlot(slot) {
    if (!slot || rendered.has(slot)) return;
    if (typeof IntersectionObserver !== 'function') {
      buildPreview(slot);
      return;
    }
    if (!observer) {
      observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          observer.unobserve(entry.target);
          buildPreview(entry.target);
        });
      }, { rootMargin:'120px 0px' });
    }
    observer.observe(slot);
  }

  function refreshCopy() {
    const workspaceCopy = document.querySelector('.section-workspace-head p');
    if (workspaceCopy) workspaceCopy.textContent = 'La vista previa se muestra directamente sin abrir otro visor.';
    const elementCopy = document.querySelector('.document-elements-head p');
    if (elementCopy) elementCopy.textContent = 'Portada y cabecera se muestran directamente para revisión.';
    document.querySelectorAll('.section-details summary').forEach(summary => {
      if (summary.textContent !== 'Detalles técnicos') summary.textContent = 'Detalles técnicos';
    });
  }

  function enhance() {
    scheduled = false;
    const type = currentDocumentType();
    if (!type) return;
    refreshCopy();
    document.querySelectorAll('.document-section[data-section-id]').forEach(card => {
      const slot = ensureSectionSlot(card, type) || card.querySelector('.inline-preview-slot');
      observeSlot(slot);
    });
    document.querySelectorAll('.document-element-card[data-element-id]').forEach(card => {
      const slot = ensureElementSlot(card, type) || card.querySelector('.inline-preview-slot');
      observeSlot(slot);
    });
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(enhance);
  }

  injectStyles();
  const content = document.getElementById('content');
  if (content) {
    mutationObserver = new MutationObserver(schedule);
    mutationObserver.observe(content, { childList:true });
  }
  schedule();

  window.docformacionInlinePreviews = Object.freeze({
    refresh:schedule,
    renderSection,
    renderElement,
    activeCount:() => document.querySelectorAll('.inline-preview-slot').length
  });
})();