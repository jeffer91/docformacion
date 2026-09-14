(() => {
  'use strict';

  const LOGO_URL = 'assets/itsqmet-logo.jpg';
  let inFlight = null;

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('No se pudo leer el logo institucional.'));
      reader.readAsDataURL(blob);
    });
  }

  async function ensureLogo() {
    if (window.DOCFORMACION_LOGO_DATA_URL) return true;
    if (inFlight) return inFlight;

    inFlight = (async () => {
      try {
        const absolute = new URL(LOGO_URL, document.baseURI).href;
        const response = await fetch(absolute + '?v=' + encodeURIComponent(window.DOCFORMACION_BUILD || Date.now()), {
          cache: 'no-store',
          headers: { 'Cache-Control':'no-cache' }
        });
        if (!response.ok) throw new Error('HTTP ' + response.status + ' al cargar el logo institucional.');
        const blob = await response.blob();
        if (!blob.size) throw new Error('El logo institucional está vacío.');
        const dataUrl = await blobToDataUrl(blob);
        if (!/^data:image\//i.test(dataUrl)) throw new Error('El recurso del logo no es una imagen válida.');

        window.DOCFORMACION_LOGO_DATA_URL = dataUrl;
        window.DOCFORMACION_LOGO_FORMAT = /png/i.test(blob.type) ? 'PNG' : 'JPEG';
        window.DOCFORMACION_LOGO_ASPECT_RATIO = 240 / 95;
        return true;
      } catch (error) {
        console.error('[DocFormación] No se pudo cargar el logo institucional:', error);
        window.DOCFORMACION_LOGO_DATA_URL = '';
        return false;
      } finally {
        inFlight = null;
      }
    })();

    return inFlight;
  }

  window.docformacionInstitutionAssets = Object.freeze({
    logoUrl: LOGO_URL,
    ensureLogo
  });
})();
