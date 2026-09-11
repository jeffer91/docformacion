(() => {
  'use strict';

  const BUILD = '20260910-1645';
  const HIDDEN_TEXTS = new Set([
    'Documento institucional de diagnóstico, priorización y trazabilidad',
    'ÁREA DE FIRMA / QR DIGITAL'
  ]);

  const previousGenerateDocument = generateDocument;

  function createPatchedJsPdf(OriginalJsPDF) {
    function CleanJsPDF(...args) {
      const doc = new OriginalJsPDF(...args);
      const originalText = doc.text;

      doc.text = function cleanedCoverText(text, ...rest) {
        const normalized = Array.isArray(text)
          ? text.map(value => String(value ?? '').trim()).join(' ')
          : String(text ?? '').trim();

        if (HIDDEN_TEXTS.has(normalized)) return doc;
        return originalText.call(doc, text, ...rest);
      };

      return doc;
    }

    try { Object.setPrototypeOf(CleanJsPDF, OriginalJsPDF); } catch (_error) {}
    CleanJsPDF.prototype = OriginalJsPDF.prototype;
    return CleanJsPDF;
  }

  generateDocument = async function generateDocumentCoverCleanup(type) {
    if (type !== 'dnf' || !window.jspdf?.jsPDF) {
      return previousGenerateDocument(type);
    }

    const root = window.jspdf;
    const OriginalJsPDF = root.jsPDF;
    const CleanJsPDF = createPatchedJsPdf(OriginalJsPDF);
    root.jsPDF = CleanJsPDF;

    try {
      return await previousGenerateDocument(type);
    } finally {
      if (root.jsPDF === CleanJsPDF) root.jsPDF = OriginalJsPDF;
    }
  };

  window.__DOCFORMACION_DNF_COVER_CLEANUP = BUILD;
})();
