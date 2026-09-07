(() => {
  const api = window.docformacion;
  if (!api || typeof api.generatePDF !== 'function') return;

  const TYPE_LABELS = {
    dnf: 'Detección de Necesidades de Formación',
    plan: 'Plan de Formación Docente',
    informe: 'Informe de Cumplimiento del Plan de Formación'
  };
  const hideTimers = new Map();

  function injectStyles() {
    if (document.getElementById('pdfProgressUiStyles')) return;
    const style = document.createElement('style');
    style.id = 'pdfProgressUiStyles';
    style.textContent = `
      .pdf-progress-shell{margin:12px 0 2px;padding:10px 12px;border:1px solid #d8e2ec;border-radius:10px;background:#f7f9fb;transition:opacity .2s ease}
      .pdf-progress-shell[hidden]{display:none!important}
      .pdf-progress-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:7px;font-size:11px;color:#324a5f}
      .pdf-progress-head strong{font-size:11px;color:#173f67;white-space:nowrap}
      .pdf-progress-track{width:100%;height:8px;border-radius:999px;background:#e4eaf0;overflow:hidden}
      .pdf-progress-fill{height:100%;width:0;border-radius:999px;background:#173f67;transition:width .28s ease}
      .pdf-progress-detail{margin-top:6px;font-size:10px;color:#637689}
      .pdf-progress-shell[data-state="done"]{background:#f2faf6;border-color:#cfe8da}
      .pdf-progress-shell[data-state="done"] .pdf-progress-fill{background:#2f7b58}
      .pdf-progress-shell[data-state="done"] .pdf-progress-head strong{color:#2f7b58}
      .pdf-progress-shell[data-state="error"]{background:#fff6f5;border-color:#f0d2cf}
      .pdf-progress-shell[data-state="error"] .pdf-progress-fill{background:#a23b34}
      .pdf-progress-shell[data-state="error"] .pdf-progress-head strong{color:#a23b34}
    `;
    document.head.appendChild(style);
  }

  function inferType(payload = {}) {
    const filename = String(payload.filename || '').toLowerCase();
    if (filename.includes('informe')) return 'informe';
    if (filename.includes('plan de formación')) return 'plan';
    if (filename.includes('necesidades')) return 'dnf';
    return window.__DOCFORMACION_ACTIVE_PDF_TYPE || 'dnf';
  }

  function findCard(type) {
    const statusCard = document.querySelector(`[data-status-type="${type}"]`);
    if (statusCard) return statusCard;

    const homeButton = document.querySelector(`[data-generate="${type}"]`);
    if (homeButton) return homeButton.closest('.card') || homeButton.parentElement;

    const currentButton = document.getElementById('generateCurrent');
    if (currentButton) return currentButton.closest('.card') || currentButton.parentElement;

    return null;
  }

  function ensureProgress(type) {
    injectStyles();
    const card = findCard(type);
    if (!card) return null;

    let shell = card.querySelector(`[data-pdf-progress="${type}"]`);
    if (shell) return shell;

    shell = document.createElement('div');
    shell.className = 'pdf-progress-shell';
    shell.dataset.pdfProgress = type;
    shell.hidden = true;
    shell.innerHTML = `
      <div class="pdf-progress-head">
        <span>Generando PDF</span>
        <strong data-pdf-progress-percent>0%</strong>
      </div>
      <div class="pdf-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
        <div class="pdf-progress-fill"></div>
      </div>
      <div class="pdf-progress-detail">Preparando documento…</div>
    `;

    const actions = card.querySelector('.doc-actions');
    if (actions?.parentNode) actions.parentNode.insertBefore(shell, actions);
    else card.appendChild(shell);
    return shell;
  }

  function phaseLabel(detail) {
    const phase = detail.phase || 'render';
    if (phase === 'starting' || phase === 'preparing') return 'Preparando documento…';
    if (phase === 'layout') return 'Ajustando formato A4…';
    if (phase === 'fallback') return 'Reorganizando contenido para que encaje correctamente…';
    if (phase === 'assembling') return 'Armando el archivo PDF…';
    if (phase === 'downloading') return 'Preparando la descarga…';
    if (phase === 'done') return 'PDF descargado correctamente.';
    if (phase === 'error') return detail.message ? `Error: ${detail.message}` : 'No se pudo generar el PDF.';
    if (detail.total && Number.isFinite(Number(detail.current))) {
      return `Renderizando página ${Number(detail.current)} de ${Number(detail.total)}…`;
    }
    return 'Generando páginas del documento…';
  }

  function calculatePercent(detail) {
    if (Number.isFinite(Number(detail.percent))) return Math.max(0, Math.min(100, Math.round(Number(detail.percent))));
    if (detail.phase === 'done') return 100;
    if (detail.phase === 'downloading') return 96;
    if (detail.phase === 'assembling') return 92;
    if (detail.phase === 'layout') return 25;
    if (detail.phase === 'preparing' || detail.phase === 'starting') return 5;
    if (detail.phase === 'error') return 0;
    const total = Number(detail.total);
    const current = Number(detail.current);
    if (total > 0 && Number.isFinite(current)) {
      return Math.max(5, Math.min(90, Math.round(5 + (current / total) * 85)));
    }
    return 10;
  }

  function showProgress(type, detail = {}) {
    const shell = ensureProgress(type);
    if (!shell) return;

    const oldTimer = hideTimers.get(type);
    if (oldTimer) {
      clearTimeout(oldTimer);
      hideTimers.delete(type);
    }

    const percent = calculatePercent(detail);
    const fill = shell.querySelector('.pdf-progress-fill');
    const pct = shell.querySelector('[data-pdf-progress-percent]');
    const text = shell.querySelector('.pdf-progress-detail');
    const track = shell.querySelector('.pdf-progress-track');

    shell.hidden = false;
    shell.dataset.state = detail.phase === 'error' ? 'error' : detail.phase === 'done' ? 'done' : 'working';
    if (fill) fill.style.width = `${percent}%`;
    if (pct) pct.textContent = `${percent}%`;
    if (text) text.textContent = phaseLabel(detail);
    if (track) track.setAttribute('aria-valuenow', String(percent));

    if (detail.phase === 'done') {
      hideTimers.set(type, setTimeout(() => {
        shell.hidden = true;
        shell.dataset.state = '';
      }, 3000));
    } else if (detail.phase === 'error') {
      hideTimers.set(type, setTimeout(() => {
        shell.hidden = true;
        shell.dataset.state = '';
      }, 6500));
    }
  }

  window.addEventListener('docformacion-pdf-progress', event => {
    const detail = event?.detail || {};
    const type = detail.type || window.__DOCFORMACION_ACTIVE_PDF_TYPE;
    if (!type || !TYPE_LABELS[type]) return;
    showProgress(type, detail);
  });

  const previousGeneratePDF = api.generatePDF.bind(api);
  api.generatePDF = async function progressAwareGeneratePDF(payload) {
    const type = inferType(payload);
    window.__DOCFORMACION_ACTIVE_PDF_TYPE = type;
    showProgress(type, { type, percent: 2, phase: 'starting' });

    try {
      const result = await previousGeneratePDF(payload);
      if (result?.ok) {
        showProgress(type, { type, percent: 100, phase: 'done' });
      } else {
        showProgress(type, { type, percent: 0, phase: 'error', message: result?.error || 'No se pudo generar el PDF.' });
      }
      return result;
    } catch (error) {
      showProgress(type, { type, percent: 0, phase: 'error', message: error?.message || String(error) });
      throw error;
    } finally {
      setTimeout(() => {
        if (window.__DOCFORMACION_ACTIVE_PDF_TYPE === type) window.__DOCFORMACION_ACTIVE_PDF_TYPE = '';
      }, 3500);
    }
  };
})();