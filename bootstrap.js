(() => {
  const LOCAL_BUILD = '20260909-1655';
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
    await loadScript('render-careers-fix.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('period-dnf-fix.js?v=' + encodeURIComponent(activeBuild));

    await loadScript('period-manager-fix.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('period-existing-data-migration-fix.js?v=' + encodeURIComponent(activeBuild));

    await loadScript('institutional-plan-fix.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('dnf-quality-fix.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('dnf-introduction-fix.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('dnf-exact-layout-fix.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('template-names-fix.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('plan-excel-institutional-fix.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('plan-template-split-fix.js?v=' + encodeURIComponent(activeBuild));

    await loadScript('institutional-pdf-layout-fix.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('pdf-emergency-fallback.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('pdf-web-geometry-fix.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('pdf-raster-pages-fix.js?v=' + encodeURIComponent(activeBuild));

    await loadScript('dnf-async-pdf-fix.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('dnf-direct-render-fix.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('pdf-progress-ui-fix.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('pdf-final-router-fix.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('pdf-progress-extra-ui-fix.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('dnf-native-print-fix.js?v=' + encodeURIComponent(activeBuild));

    // Datos variables de las secciones 5, 6, 7 y 8. Se cargan antes del motor vectorial
    // para ampliar formularios, validaciones, cobertura, métricas consolidadas y plantillas Excel.
    await loadScript('dnf-section5-data-fix.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('dnf-section6-data-fix.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('dnf-section7-data-fix.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('dnf-section8-data-fix.js?v=' + encodeURIComponent(activeBuild));

    // Motor vectorial base aprobado.
    await loadScript('dnf-vector-pdf.js?v=' + encodeURIComponent(activeBuild));
    // Capa vectorial vigente: portada + Introducción + Base Legal + Alineación Estratégica.
    await loadScript('dnf-vector-pdf-v3.js?v=' + encodeURIComponent(activeBuild));

    // Las capas PDF se cargan en orden inverso de ejecución porque cada una envuelve doc.save().
    // Resultado final al guardar: Sección 4 → Sección 5 → Sección 6 → Sección 7 → Sección 8.
    await loadScript('dnf-section8-pdf.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('dnf-section7-pdf.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('dnf-section6-pdf.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('dnf-characterization-pdf.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('dnf-methodology-pdf.js?v=' + encodeURIComponent(activeBuild));
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