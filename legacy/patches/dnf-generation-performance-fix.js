(() => {
  'use strict';

  const api = window.docformacion;
  if (!api || typeof api.generatePDF !== 'function' || !window.jspdf?.jsPDF) return;

  const PreviousJsPDF = window.jspdf.jsPDF;
  const previousGeneratePDF = api.generatePDF.bind(api);
  const ENGINE = 'dnf-generation-performance-v2';
  const OriginalApiSave = PreviousJsPDF.API?.save;

  function isDnf(payload = {}) {
    return !!payload?.exactPages || /necesidades/i.test(String(payload?.filename || ''));
  }

  function isDnfFilename(filename = '') {
    return /necesidades/i.test(String(filename || ''));
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

  // jsPDF arma el documento completo de forma síncrona. Con todas las secciones,
  // tablas y anexos vectoriales, la compresión podía monopolizar el hilo principal
  // durante el save() y dejar el botón indefinidamente en "Generando PDF…".
  function OptimizedJsPDF(...args) {
    if (args[0] && typeof args[0] === 'object' && !Array.isArray(args[0])) {
      args[0] = { ...args[0], compress: false };
    }
    return new PreviousJsPDF(...args);
  }

  OptimizedJsPDF.API = PreviousJsPDF.API;
  OptimizedJsPDF.version = PreviousJsPDF.version;
  Object.setPrototypeOf(OptimizedJsPDF, PreviousJsPDF);
  window.jspdf.jsPDF = OptimizedJsPDF;

  // Para la DNF web usamos una descarga por Blob + enlace temporal. Esto evita
  // depender del saveAs interno de jsPDF después de una cadena larga de wrappers.
  // Las capas de secciones siguen ejecutándose primero porque todas llaman al save()
  // anterior hasta llegar finalmente a esta función base.
  if (typeof OriginalApiSave === 'function' && PreviousJsPDF.API) {
    PreviousJsPDF.API.save = function stableSave(filename, options) {
      if (!isDnfFilename(filename) || !(location.protocol === 'http:' || location.protocol === 'https:')) {
        return OriginalApiSave.call(this, filename, options);
      }

      emit(96, 'assembling', { stage: 'serialize' });
      const blob = this.output('blob');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = String(filename || 'Detección de Necesidades de Formación.pdf');
      link.style.display = 'none';
      document.body.appendChild(link);

      emit(99, 'downloading', { stage: 'browser-download' });
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      return this;
    };
  }

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

    // Permite pintar el indicador antes del trabajo vectorial mayoritariamente síncrono.
    emit(2, 'preparing', { stage: 'vector-document' });
    await yieldToBrowser();

    const startedAt = performance.now();
    try {
      const result = await previousGeneratePDF(payload);
      if (result?.ok) {
        return {
          ...result,
          downloaded: true,
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
