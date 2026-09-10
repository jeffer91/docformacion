(() => {
  const LOCAL_BUILD = '20260910-1645';
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

    // Núcleo de la aplicación y persistencia por período.
    await loadScript('app.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('period-manager-fix.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('period-existing-data-migration-fix.js?v=' + encodeURIComponent(activeBuild));

    // Flujo DNF vigente: Carreras primero y DNF después, ambas mediante plantillas separadas.
    await loadScript('dnf-template-workflow-v2.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('dnf-template-view-fix.js?v=' + encodeURIComponent(activeBuild));

    // Indicador de progreso reutilizado por los tres documentos.
    await loadScript('pdf-progress-ui-fix.js?v=' + encodeURIComponent(activeBuild));

    // Núcleo canónico: unifica DNF → Plan → Informe, plantillas y trazabilidad.
    await loadScript('workflow-canonical-v3.js?v=' + encodeURIComponent(activeBuild));

    // Generador institucional completo de la DNF: conserva el núcleo canónico,
    // pero recupera la profundidad académica, análisis y anexos visuales.
    await loadScript('dnf-rich-document-v4.js?v=' + encodeURIComponent(activeBuild));

    // Ajustes finales de portada DNF.
    await loadScript('dnf-cover-cleanup-v5.js?v=' + encodeURIComponent(activeBuild));
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
