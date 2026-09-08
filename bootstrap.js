(() => {
  const LOCAL_BUILD = '20260908-1125';
  const isHttp = location.protocol === 'http:' || location.protocol === 'https:';

  function setBuildLabel(build) {
    const el = document.getElementById('buildVersion');
    if (el) el.textContent = 'Build ' + build;
  }

  function setStylesheetBuild(build) {
    const link = document.querySelector('link[rel="stylesheet"][href*="styles.css"]');
    if (link) link.href = 'styles.css?v=' + encodeURIComponent(build);
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.defer = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error('No se pudo cargar ' + src));
      document.body.appendChild(script);
    });
  }

  async function resolveBuild() {
    if (!isHttp) return LOCAL_BUILD;
    try {
      const response = await fetch('version.json?t=' + Date.now(), {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!response.ok) return LOCAL_BUILD;
      const data = await response.json();
      return String(data?.build || LOCAL_BUILD);
    } catch (_error) {
      return LOCAL_BUILD;
    }
  }

  async function start() {
    const activeBuild = await resolveBuild();
    window.DOCFORMACION_BUILD = activeBuild;
    setBuildLabel(activeBuild);
    setStylesheetBuild(activeBuild);

    if (!window.docformacion) {
      await loadScript('web-adapter.js?v=' + encodeURIComponent(activeBuild));
    }
    await loadScript('pdf-reliability-fix.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('app.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('period-dnf-fix.js?v=' + encodeURIComponent(activeBuild));

    // Filtro maestro de la aplicación: cada período conserva su propio estado
    // y gobierna DNF, Plan e Informe, además de sus meses documentales.
    await loadScript('period-manager-fix.js?v=' + encodeURIComponent(activeBuild));

    // Migración puntual solicitada: la información que ya estaba construida en
    // Abril 2026-Sep 2026 pertenece al período real Oct 2025-Sep 2026.
    await loadScript('period-existing-data-migration-fix.js?v=' + encodeURIComponent(activeBuild));

    await loadScript('institutional-plan-fix.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('dnf-quality-fix.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('dnf-exact-layout-fix.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('template-names-fix.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('plan-excel-institutional-fix.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('plan-template-split-fix.js?v=' + encodeURIComponent(activeBuild));

    await loadScript('institutional-pdf-layout-fix.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('pdf-emergency-fallback.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('pdf-web-geometry-fix.js?v=' + encodeURIComponent(activeBuild));

    // Sustituye html2pdf para Plan/Informe: pagina el contenido y rasteriza
    // cada hoja A4 directamente, evitando cualquier desplazamiento horizontal.
    await loadScript('pdf-raster-pages-fix.js?v=' + encodeURIComponent(activeBuild));

    // Última capa: muestra una barra independiente en la tarjeta del documento
    // y escucha el avance real/por etapas de DNF, Plan e Informe.
    await loadScript('pdf-progress-ui-fix.js?v=' + encodeURIComponent(activeBuild));
  }

  start().catch(error => {
    const content = document.getElementById('content');
    if (content) {
      content.innerHTML = '<div class="card"><h2>No se pudo actualizar DocFormación</h2><p>' +
        String(error?.message || error) +
        '</p><p>Recarga la página para intentar nuevamente.</p></div>';
    }
  });
})();