(() => {
  const api = window.docformacion;
  if (!api || typeof api.generatePDF !== 'function') return;

  const previousGeneratePDF = api.generatePDF.bind(api);
  const STALL_MS = 55000;
  const TOTAL_MS = 300000;

  function isDnf(payload = {}) {
    return !!payload?.exactPages || /necesidades/i.test(String(payload?.filename || ''));
  }

  function emitError(message) {
    window.dispatchEvent(new CustomEvent('docformacion-pdf-progress', {
      detail: {
        type: 'dnf',
        percent: 0,
        phase: 'error',
        engine: window.__DOCFORMACION_DNF_RENDERER || 'dnf-final-router',
        build: window.DOCFORMACION_BUILD || '',
        message
      }
    }));
  }

  async function runDnf(payload) {
    const renderer = window.__DOCFORMACION_RENDER_DNF_DIRECT;
    if (typeof renderer !== 'function') {
      throw new Error('El motor directo de DNF no está cargado. Recarga la aplicación.');
    }

    const abort = { aborted: false, reason: '' };
    const routedPayload = { ...payload, exactPages: true, __dfAbort: abort };
    let lastProgressAt = performance.now();
    const startedAt = performance.now();
    let rejectWatchdog;

    const watchdogPromise = new Promise((_, reject) => {
      rejectWatchdog = reject;
    });

    const onProgress = event => {
      const d = event?.detail || {};
      if (d.type !== 'dnf') return;
      if (d.phase === 'done' || d.phase === 'error') return;
      lastProgressAt = performance.now();
    };
    window.addEventListener('docformacion-pdf-progress', onProgress);

    const interval = setInterval(() => {
      const now = performance.now();
      const idle = now - lastProgressAt;
      const total = now - startedAt;
      if (idle > STALL_MS) {
        abort.aborted = true;
        abort.reason = `La generación se detuvo sin avance durante ${Math.floor(idle / 1000)} segundos.`;
        clearInterval(interval);
        rejectWatchdog(new Error(abort.reason));
      } else if (total > TOTAL_MS) {
        abort.aborted = true;
        abort.reason = 'La generación superó el límite de 5 minutos.';
        clearInterval(interval);
        rejectWatchdog(new Error(abort.reason));
      }
    }, 3000);

    window.__DOCFORMACION_ABORT_PDF = () => {
      if (abort.aborted) return;
      abort.aborted = true;
      abort.reason = 'Generación cancelada por el usuario.';
      clearInterval(interval);
      rejectWatchdog(new Error(abort.reason));
    };

    try {
      const result = await Promise.race([
        Promise.resolve(renderer(routedPayload)),
        watchdogPromise
      ]);
      return result;
    } catch (error) {
      emitError(error?.message || String(error));
      return {
        ok: false,
        error: error?.message || String(error),
        renderer: window.__DOCFORMACION_DNF_RENDERER || 'dnf-final-router'
      };
    } finally {
      clearInterval(interval);
      window.removeEventListener('docformacion-pdf-progress', onProgress);
      if (window.__DOCFORMACION_ABORT_PDF) window.__DOCFORMACION_ABORT_PDF = null;
    }
  }

  api.generatePDF = async function finalPdfRouter(payload) {
    if (isDnf(payload) && (location.protocol === 'http:' || location.protocol === 'https:')) {
      return runDnf(payload);
    }
    return previousGeneratePDF(payload);
  };

  window.__DOCFORMACION_PDF_ROUTER = 'final-router-v1';
})();