(() => {
  'use strict';

  const originalSetView = setView;
  const originalRender = render;
  const SYSTEM_VIEWS = new Set(['diagnostico', 'configuracion']);

  function html(value) {
    return typeof esc === 'function' ? esc(value) : String(value ?? '');
  }

  function issueTotal(status) {
    if (!status || status.ready) return 0;
    return Array.isArray(status.issues) ? status.issues.length : 0;
  }

  function issueList(status) {
    if (status?.ready) return '<div class="system-ok">Sin pendientes críticos.</div>';
    const issues = Array.isArray(status?.issues) ? status.issues : [];
    if (!issues.length) return '<div class="system-warn">Estado no disponible.</div>';
    return '<ul class="system-list">' + issues.slice(0, 8).map(item => '<li>' + html(item.text || item.description || 'Pendiente') + '</li>').join('') + '</ul>';
  }

  function renderDiagnosticsView() {
    const report = window.docformacionDiagnostics?.collect?.();
    if (!report) {
      $('#content').innerHTML = '<div class="card"><h2>Diagnóstico no disponible</h2><p>No fue posible leer el estado interno de la aplicación.</p></div>';
      return;
    }

    const docs = [
      ['dnf', 'Detección de Necesidades'],
      ['plan', 'Plan de Formación'],
      ['informe', 'Informe de Cumplimiento']
    ];

    $('#content').innerHTML = `
      <div class="section-title">
        <div>
          <h2>Diagnóstico del período</h2>
          <p>${html(report.period.label)} · ${report.period.active ? 'Período activo' : 'Período incompleto'}</p>
        </div>
        <div class="period-count">${html(report.period.id || 'Sin periodId')}</div>
      </div>

      <div class="grid cards system-diagnostic-cards">
        ${metric('Carreras', report.data.careers)}
        ${metric('Docentes', report.data.teachers)}
        ${metric('Coordinaciones', report.data.coordinations)}
        ${metric('Necesidades DNF', report.data.needs)}
      </div>

      <div class="system-panel">
        <h3>Documentos</h3>
        <div class="system-doc-grid">
          ${docs.map(([type, title]) => {
            const status = report.documents[type];
            const pending = issueTotal(status);
            return `<div class="system-doc-card">
              <div class="system-doc-head">
                <strong>${html(title)}</strong>
                <span class="status-badge ${status?.ready ? 'ready' : 'blocked'}">${status?.ready ? 'Listo' : pending + ' pendiente(s)'}</span>
              </div>
              ${issueList(status)}
              <button class="secondary system-go" data-view="doc-${type}">Abrir documento</button>
            </div>`;
          }).join('')}
        </div>
      </div>

      <div class="system-panel">
        <h3>Origen de los datos</h3>
        <div class="table-wrap">
          <table class="table"><thead><tr><th>Dato / proceso</th><th>Origen registrado</th></tr></thead><tbody>
            ${report.origins.map(row => `<tr><td><strong>${html(row.label)}</strong></td><td>${html(row.value)}</td></tr>`).join('')}
          </tbody></table>
        </div>
      </div>

      <div class="system-panel">
        <h3>Secciones declaradas</h3>
        ${docs.map(([type, title]) => {
          const sections = report.documents[type]?.sections || [];
          return `<details class="system-section-group"><summary>${html(title)} · ${sections.length} secciones</summary>
            <div class="system-section-list">${sections.map(s => `<div><strong>${html(s.id)}</strong><span>${html(s.title)}</span><small>${html(s.note)}</small></div>`).join('')}</div>
          </details>`;
        }).join('')}
      </div>

      <div class="system-panel system-note">
        <strong>Motor documental</strong>
        <p>La aplicación ya trabaja con manifiestos de documentos, modelo único por período y diagnóstico. La previsualización/PDF individual por sección queda identificada como la siguiente migración del generador PDF.</p>
      </div>`;

    $$('.system-go').forEach(button => button.onclick = () => setView(button.dataset.view));
  }

  function renderConfigurationView() {
    const model = window.docformacionModel?.snapshot?.() || {};
    const manifest = window.DOCFORMACION_MANIFEST || {};
    const firebase = state?.integrations?.firebase || {};

    $('#content').innerHTML = `
      <div class="section-title">
        <div><h2>Configuración del sistema</h2><p>Parámetros compartidos del período y del motor documental.</p></div>
      </div>
      <div class="system-panel">
        <div class="table-wrap">
          <table class="table"><tbody>
            <tr><th>appId</th><td>${html(manifest.appId || 'formacion')}</td></tr>
            <tr><th>Build</th><td>${html(window.DOCFORMACION_BUILD || 'local')}</td></tr>
            <tr><th>periodId</th><td>${html(model.periodId || 'Sin período activo')}</td></tr>
            <tr><th>Documentos declarados</th><td>${Object.keys(manifest.documents || {}).length}</td></tr>
            <tr><th>Firebase</th><td>${html(firebase.mode || 'read-only')} · ${html(firebase.source || 'Repaso-Fire')}</td></tr>
            <tr><th>Líneas genéricas</th><td>${(state?.settings?.genericLines || []).length}</td></tr>
            <tr><th>Meta institucional</th><td>${html(state?.period?.targetPercent ?? '')}%</td></tr>
          </tbody></table>
        </div>
      </div>
      <div class="system-panel system-note">
        <strong>Regla de configuración</strong>
        <p>Los datos académicos se mantienen en el modelo del período. Esta pantalla no duplica carreras, docentes, coordinaciones ni necesidades; solo muestra configuración y contexto global.</p>
      </div>`;
  }

  function injectStyles() {
    if (document.getElementById('systemViewsStyles')) return;
    const style = document.createElement('style');
    style.id = 'systemViewsStyles';
    style.textContent = `
      .system-panel{margin-top:18px;padding:18px;border:1px solid #dfe5ef;border-radius:14px;background:#fff}
      .system-panel h3{margin:0 0 14px}
      .system-doc-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
      .system-doc-card{border:1px solid #dfe5ef;border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:12px;min-width:0}
      .system-doc-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
      .system-list{margin:0;padding-left:18px;color:#59677a;font-size:12px;line-height:1.5}
      .system-ok{font-size:12px;color:#356b4f}
      .system-warn{font-size:12px;color:#8a5b1e}
      .system-section-group{border-top:1px solid #e8edf4;padding:10px 0}
      .system-section-group:first-of-type{border-top:0}
      .system-section-group summary{cursor:pointer;font-weight:800}
      .system-section-list{display:grid;gap:8px;margin-top:10px}
      .system-section-list>div{display:grid;grid-template-columns:170px minmax(0,1fr);gap:4px 12px;padding:9px 10px;border-radius:9px;background:#f8fafc}
      .system-section-list span{font-weight:700}
      .system-section-list small{grid-column:2;color:#738197}
      .system-note p{margin:6px 0 0;color:#66758a;line-height:1.5}
      @media(max-width:960px){.system-doc-grid{grid-template-columns:1fr}.system-section-list>div{grid-template-columns:1fr}.system-section-list small{grid-column:1}}
    `;
    document.head.appendChild(style);
  }

  setView = function universalSetView(view) {
    if (!SYSTEM_VIEWS.has(view)) return originalSetView(view);
    currentView = view;
    $$('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.view === view));
    const meta = view === 'diagnostico'
      ? ['Diagnóstico', 'Estado, pendientes y origen de los datos del período.']
      : ['Configuración', 'Contexto y parámetros compartidos del sistema.'];
    $('#viewTitle').textContent = meta[0];
    $('#viewSubtitle').textContent = meta[1];
    render();
  };

  render = function universalRender() {
    injectStyles();
    if (currentView === 'diagnostico') return renderDiagnosticsView();
    if (currentView === 'configuracion') return renderConfigurationView();
    return originalRender();
  };

  injectStyles();
})();
