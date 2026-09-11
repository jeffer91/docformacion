(() => {
  const LOCAL_BUILD = '20260911-0853';
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

    // Núcleo base de la aplicación.
    await loadScript('app.js?v=' + encodeURIComponent(activeBuild));

    // Contratos documentales y modelo único de datos por período.
    await loadScript('documents/manifest.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('core/data/model.js?v=' + encodeURIComponent(activeBuild));

    // Período como contexto global obligatorio de la información.
    await loadScript('core/periods/manager.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('core/periods/migrate-existing-data.js?v=' + encodeURIComponent(activeBuild));

    // Flujo DNF vigente: Carreras -> DNF -> Plan -> Informe.
    await loadScript('documents/dnf/workflow.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('documents/dnf/template-view.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('documents/workflow.js?v=' + encodeURIComponent(activeBuild));

    // Infraestructura compartida de progreso PDF.
    await loadScript('core/preview/pdf-progress.js?v=' + encodeURIComponent(activeBuild));

    // Generador institucional DNF y configuración de portada.
    await loadScript('documents/dnf/pdf.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('documents/dnf/cover.js?v=' + encodeURIComponent(activeBuild));

    // Diagnóstico y vistas universales del sistema.
    await loadScript('core/diagnostics/index.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('ui/system-views.js?v=' + encodeURIComponent(activeBuild));
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
