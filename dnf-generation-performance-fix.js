(() => {
  'use strict';

  const api = window.docformacion;
  if (!api || typeof api.generatePDF !== 'function' || !window.jspdf?.jsPDF) return;

  const PreviousJsPDF = window.jspdf.jsPDF;
  const previousGeneratePDF = api.generatePDF.bind(api);
  const ENGINE = 'dnf-generation-performance-v1';

  function isDnf(payload = {}) {
    return !!payload?.exactPages || /necesidades/i.test(String(payload?.filename || ''));
  }

  function emit(percent, phase, extra = {}) {
    window.dispatchEvent(new CustomEvent('docformacion-pdf-progress', {
      detail: {
        type: 'dnf',
        percent,
        phase,
        engine: ENGINE,
        build: window.DOCFORMACION_BUILD || '',
        ...extra
      }
    }));
  }

  function OptimizedJsPDF(...args) {
    // El documento DNF completo ya contiene muchas páginas, tablas y gráficos
    // vectoriales. La compresión síncrona de jsPDF puede bloquear el hilo principal
    // durante el save() y dejar la interfaz aparentemente congelada.
    if (args[0] && typeof args[0] === 'object' && !Array.isArray(args[0])) {
      args[0] = { ...args[0], compress: false };
    }
    return new PreviousJsPDF(...args);
  }

  OptimizedJsPDF.API = PreviousJsPDF.API;
  OptimizedJsPDF.version = PreviousJsPDF.version;
  Object.setPrototypeOf(OptimizedJsPDF, PreviousJsPDF);
  window.jspdf.jsPDF = OptimizedJsPDF;

  function yieldToBrowser() {
    return new Promise(resolve => {
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => setTimeout(resolve, 0));
      } else {
        setTimeout(resolve, 0);
      }
    });
  }

  api.generatePDF = async function optimizedGeneratePDF(payload = {}) {
    if (!isDnf(payload) || !(location.protocol === 'http:' || location.protocol === 'https:')) {
      return previousGeneratePDF(payload);
    }

    // Deja que el navegador pinte el estado de progreso antes de entrar al
    // render vectorial, que es mayoritariamente síncrono.
    emit(2, 'preparing', { stage: 'vector-document' });
    await yieldToBrowser();

    const startedAt = performance.now();
    try {
      const result = await previousGeneratePDF(payload);
      if (result?.ok) {
        return {
          ...result,
          generationMs: Math.round(performance.now() - startedAt),
          optimized: true
        };
      }
      return result;
    } catch (error) {
      emit(0, 'error', { message: error?.message || String(error) });
      throw error;
    }
  };

  window.__DOCFORMACION_DNF_PERFORMANCE_FIX = ENGINE;
})();
