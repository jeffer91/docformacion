(() => {
  const LOCAL_BUILD = '20260914-1615';
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
        headers: { 'Cache-Control':'no-cache' }
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

    // Recurso institucional persistente. Se carga antes que cualquier PDF.
    await loadScript('core/pdf/institution-assets.js?v=' + encodeURIComponent(activeBuild));
    await window.docformacionInstitutionAssets?.ensureLogo?.();

    if (!window.docformacion) {
      await loadScript('web-adapter.js?v=' + encodeURIComponent(activeBuild));
    }

    // Aplicación base y contrato de documentos.
    await loadScript('app.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('documents/manifest.js?v=' + encodeURIComponent(activeBuild));

    // Core de datos y cálculos puros.
    await loadScript('core/calculations/base.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('core/data/model.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('documents/context.js?v=' + encodeURIComponent(activeBuild));

    // El período es el contexto global obligatorio. Las migraciones históricas ya no forman parte del runtime.
    await loadScript('core/periods/manager.js?v=' + encodeURIComponent(activeBuild));

    // DNF: importación validada de Carreras y Necesidades.
    await loadScript('documents/dnf/workflow.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('documents/dnf/template-view.js?v=' + encodeURIComponent(activeBuild));

    // Progreso PDF compartido.
    await loadScript('core/preview/pdf-progress.js?v=' + encodeURIComponent(activeBuild));

    // Cálculos y validaciones documentales sobre una sola fuente de datos.
    await loadScript('documents/calculations.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('documents/validation.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('ui/canonical-status.js?v=' + encodeURIComponent(activeBuild));

    // Plan e Informe: flujo canónico. El Plan define también sus criterios institucionales automáticos.
    await loadScript('documents/workflow-canonical.js?v=' + encodeURIComponent(activeBuild));

    // Core PDF reusable. El encabezado RGI maestro se comparte entre portada y páginas interiores.
    await loadScript('core/pdf/rgi-header.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('core/pdf/components.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('core/pdf/engine.js?v=' + encodeURIComponent(activeBuild));

    // Los textos y reglas pertenecen a los documentos, no al Core.
    await loadScript('documents/section-renderers.js?v=' + encodeURIComponent(activeBuild));

    // La metodología del diagnóstico se carga en una plantilla independiente y sustenta la DNF.
    await loadScript('documents/dnf/methodology.js?v=' + encodeURIComponent(activeBuild));

    // La prioridad usa criterios institucionales fijos y exige justificación por cada necesidad en la misma plantilla DNF.
    await loadScript('documents/dnf/priority-justification.js?v=' + encodeURIComponent(activeBuild));

    // La cobertura DNF se calcula por carreras activas con necesidades y usa No aplica cuando no existe denominador.
    await loadScript('documents/dnf/coverage.js?v=' + encodeURIComponent(activeBuild));

    // El Plan solo solicita una matriz: formación proyectada. Duraciones, indicador, meta, responsable y recursos son automáticos.
    await loadScript('documents/plan/matrices.js?v=' + encodeURIComponent(activeBuild));

    await loadScript('documents/pdf.js?v=' + encodeURIComponent(activeBuild));

    // Vista previa de elementos institucionales y secciones de contenido.
    await loadScript('core/preview/document-elements.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('core/preview/section-engine.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('ui/document-sections.js?v=' + encodeURIComponent(activeBuild));

    // Integra la formación proyectada y los criterios automáticos con las pestañas SVD y el PDF.
    await loadScript('documents/plan/section-integration.js?v=' + encodeURIComponent(activeBuild));

    // Diagnóstico y vistas universales.
    await loadScript('core/diagnostics/index.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('ui/system-views.js?v=' + encodeURIComponent(activeBuild));

    // Navegación SVD 2.0 y acabado visual minimalista.
    await loadScript('ui/svd-shell.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('ui/minimal-ui.js?v=' + encodeURIComponent(activeBuild));

    // Refresco final con todos los módulos disponibles.
    if (typeof render === 'function') render();
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