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

  function imageToDataUrl(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = image.naturalWidth || image.width || 240;
          canvas.height = image.naturalHeight || image.height || 95;
          const context = canvas.getContext('2d');
          if (!context) throw new Error('No se pudo preparar el logo institucional.');
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve({
            dataUrl: canvas.toDataURL('image/jpeg', 0.96),
            ratio: canvas.width / Math.max(1, canvas.height)
          });
        } catch (error) {
          reject(error);
        }
      };
      image.onerror = () => reject(new Error('No se pudo cargar el logo institucional como imagen.'));
      image.src = url;
    });
  }

  function applyLogo(dataUrl, format = 'JPEG', ratio = 240 / 95) {
    if (!/^data:image\//i.test(String(dataUrl || ''))) throw new Error('El recurso del logo no es una imagen válida.');
    window.DOCFORMACION_LOGO_DATA_URL = dataUrl;
    window.DOCFORMACION_LOGO_FORMAT = format;
    window.DOCFORMACION_LOGO_ASPECT_RATIO = Number(ratio) > 0 ? Number(ratio) : (240 / 95);
    return true;
  }

  async function ensureLogo() {
    if (window.DOCFORMACION_LOGO_DATA_URL) return true;
    if (inFlight) return inFlight;

    inFlight = (async () => {
      const absolute = new URL(LOGO_URL, document.baseURI).href;
      const versioned = absolute + (absolute.includes('?') ? '&' : '?') + 'v=' + encodeURIComponent(window.DOCFORMACION_BUILD || Date.now());
      try {
        const response = await fetch(versioned, {
          cache: 'no-store',
          headers: { 'Cache-Control':'no-cache' }
        });
        if (!response.ok) throw new Error('HTTP ' + response.status + ' al cargar el logo institucional.');
        const blob = await response.blob();
        if (!blob.size) throw new Error('El logo institucional está vacío.');
        const dataUrl = await blobToDataUrl(blob);
        return applyLogo(dataUrl, /png/i.test(blob.type) ? 'PNG' : 'JPEG', 240 / 95);
      } catch (fetchError) {
        try {
          const image = await imageToDataUrl(versioned);
          return applyLogo(image.dataUrl, 'JPEG', image.ratio);
        } catch (imageError) {
          console.error('[DocFormación] No se pudo cargar el logo institucional:', fetchError, imageError);
          window.DOCFORMACION_LOGO_DATA_URL = '';
          return false;
        }
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