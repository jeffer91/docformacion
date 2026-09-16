(() => {
  const LOCAL_BUILD = '20260916-0830';
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

    await loadScript('core/pdf/institution-assets.js?v=' + encodeURIComponent(activeBuild));
    await window.docformacionInstitutionAssets?.ensureLogo?.();

    if (!window.docformacion) {
      await loadScript('web-adapter.js?v=' + encodeURIComponent(activeBuild));
    }

    await loadScript('app.js?v=' + encodeURIComponent(activeBuild));

    // Conserva los metadatos de cada necesidad (justificación, código DNF y futuros
    // campos) cuando app.js normaliza needItems durante renders y validaciones.
    await loadScript('documents/dnf/need-item-metadata.js?v=' + encodeURIComponent(activeBuild));
    await window.docformacionDnfNeedItemMetadata?.ready;

    await loadScript('documents/manifest.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('core/calculations/base.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('core/data/model.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('documents/context.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('core/periods/manager.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('documents/dnf/workflow.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('documents/dnf/template-view.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('core/preview/pdf-progress.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('documents/calculations.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('documents/validation.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('ui/canonical-status.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('documents/workflow-canonical.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('core/pdf/rgi-header.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('core/pdf/components.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('core/pdf/engine.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('documents/section-renderers.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('documents/dnf/methodology.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('documents/dnf/priority-justification.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('documents/dnf/priority-state.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('documents/dnf/coverage.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('documents/plan/matrices.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('documents/pdf.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('core/preview/document-elements.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('core/preview/section-engine.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('ui/document-sections.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('documents/plan/section-integration.js?v=' + encodeURIComponent(activeBuild));

    // La trazabilidad DNF → Plan → Informe es interna. Los Excel, la UI y los PDF no exponen ni solicitan CODIGO_DNF.
    await loadScript('documents/internal-traceability.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('documents/internal-traceability-report.js?v=' + encodeURIComponent(activeBuild));

    // Garantiza que, tras aplicar la DNF, la justificación quede guardada y el estado visual se recalcule inmediatamente.
    await loadScript('documents/dnf/apply-refresh.js?v=' + encodeURIComponent(activeBuild));

    // Confirma que la DNF quedó realmente persistida antes de cerrar el diálogo de importación.
    await loadScript('documents/dnf/import-persistence.js?v=' + encodeURIComponent(activeBuild));

    // Repara la lectura de completitud usando la justificación persistida como fuente canónica.
    await loadScript('documents/dnf/readiness-repair.js?v=' + encodeURIComponent(activeBuild));

    await loadScript('core/diagnostics/index.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('ui/system-views.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('ui/svd-shell.js?v=' + encodeURIComponent(activeBuild));
    await loadScript('ui/minimal-ui.js?v=' + encodeURIComponent(activeBuild));

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