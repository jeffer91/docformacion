(() => {
  const TEMPLATE_LABELS = {
    dnf: {
      download: 'Descargar plantilla DNF',
      upload: 'Subir plantilla DNF',
      filename: 'UGPA_Plantilla_Deteccion_Necesidades_Formacion.xlsx'
    },
    plan: {
      download: 'Descargar plantilla Plan',
      upload: 'Subir plantilla Plan',
      filename: 'UGPA_Plantilla_Plan_Formacion_Docente.xlsx'
    },
    informe: {
      download: 'Descargar plantilla Informe',
      upload: 'Subir plantilla Informe',
      filename: 'UGPA_Plantilla_Informe_Cumplimiento_Formacion.xlsx'
    },
    seguimiento: {
      filename: 'UGPA_Plantilla_Informe_Cumplimiento_Formacion.xlsx'
    }
  };

  function templateConfig(type) {
    return TEMPLATE_LABELS[type] || TEMPLATE_LABELS[type === 'seguimiento' ? 'informe' : type] || {};
  }

  const oldExcelTemplatePayload = excelTemplatePayload;
  excelTemplatePayload = function(scope, includeData) {
    const payload = oldExcelTemplatePayload(scope, includeData);
    const key = scope === 'seguimiento' ? 'informe' : scope;
    const cfg = templateConfig(key);
    if (cfg.filename) {
      payload.filename = (includeData ? 'Datos_Actuales_' : '') + cfg.filename;
    }
    return payload;
  };

  const oldIssueExcelTemplatePayload = issueExcelTemplatePayload;
  issueExcelTemplatePayload = function(type, kind) {
    const payload = oldIssueExcelTemplatePayload(type, kind);
    const cfg = templateConfig(type);

    // Para los pendientes generales del Plan e Informe usamos el nombre
    // institucional propio de cada documento. Los pendientes específicos de
    // DNF conservan sus nombres descriptivos por carrera/prioridad.
    if (type === 'plan' && ['need-plan-summary', 'needs-empty-for-plan', 'plan-empty', 'plan-teacher'].includes(kind)) {
      payload.filename = cfg.filename;
    }
    if (type === 'informe' && ['need-plan-summary', 'need-follow-summary', 'follow-teacher'].includes(kind)) {
      payload.filename = cfg.filename;
    }
    if (type === 'dnf' && !payload.filename) {
      payload.filename = cfg.filename;
    }
    return payload;
  };

  issueTemplateButton = function(type, kind, label) {
    const cfg = templateConfig(type);
    const text = label && label !== 'Descargar plantilla' ? label : (cfg.download || 'Descargar plantilla');
    return '<button type="button" class="secondary compact issue-template-btn" data-issue-template="'+esc(kind)+'" data-issue-type="'+esc(type)+'">'+esc(text)+'</button>';
  };

  issueUploadButton = function(type, kind, label) {
    const cfg = templateConfig(type);
    const text = label && label !== 'Subir plantilla' ? label : (cfg.upload || 'Subir plantilla');
    return '<button type="button" class="primary compact issue-upload-btn" data-issue-upload="'+esc(kind)+'" data-issue-type="'+esc(type)+'">'+esc(text)+'</button>';
  };
})();