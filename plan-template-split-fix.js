(() => {
  const previousStatus = documentStatus;
  const previousIssuePayload = issueExcelTemplatePayload;
  const previousIssueTemplateButton = issueTemplateButton;
  const previousIssueUploadButton = issueUploadButton;

  const GROUPS = {
    'plan-actions': {
      title: 'Acciones y modalidad',
      filename: 'UGPA_Plan_01_Acciones_y_Modalidad.xlsx',
      download: 'Descargar acciones',
      upload: 'Subir acciones',
      fields: ['action','modality'],
      headers: ['CARRERA','NECESIDAD_DE_FORMACION','PRIORIDAD','ACCION_DE_FORMACION','MODALIDAD'],
      descriptions: [
        'Carrera de origen de la necesidad. Viene precargada desde la DNF.',
        'Necesidad de formación detectada en la DNF. Viene precargada.',
        'Prioridad heredada de la DNF.',
        'Acción institucional de formación que atenderá la necesidad.',
        'Presencial, Virtual o Híbrida.'
      ],
      widths: [32,58,14,58,18]
    },
    'plan-control': {
      title: 'Cronograma, indicador y meta',
      filename: 'UGPA_Plan_02_Cronograma_Indicadores_y_Metas.xlsx',
      download: 'Descargar cronograma',
      upload: 'Subir cronograma',
      fields: ['plannedStart','plannedEnd','indicator','targetPercent','evidence'],
      headers: ['CARRERA','NECESIDAD_DE_FORMACION','INICIO_PLANIFICADO','FIN_PLANIFICADO','INDICADOR','META_PORCENTAJE','MEDIO_DE_VERIFICACION'],
      descriptions: [
        'Carrera de origen de la necesidad. Viene precargada.',
        'Necesidad de formación detectada en la DNF. Viene precargada.',
        'Mes/año de inicio en formato AAAA-MM.',
        'Mes/año de fin en formato AAAA-MM.',
        'Indicador para medir el cumplimiento de la acción.',
        'Meta porcentual entre 1 y 100.',
        'Documento, registro o evidencia que permitirá verificar la ejecución.'
      ],
      widths: [32,58,19,19,46,18,52]
    },
    'plan-resources': {
      title: 'Responsable, apoyo y recursos',
      filename: 'UGPA_Plan_03_Responsables_y_Recursos.xlsx',
      download: 'Descargar recursos',
      upload: 'Subir recursos',
      fields: ['responsibleRole','supportType','supportAmount'],
      headers: ['CARRERA','NECESIDAD_DE_FORMACION','RESPONSABLE_INSTITUCIONAL','TIPO_DE_APOYO','MONTO_DE_APOYO','OBSERVACIONES'],
      descriptions: [
        'Carrera de origen de la necesidad. Viene precargada.',
        'Necesidad de formación detectada en la DNF. Viene precargada.',
        'Unidad, área o cargo institucional responsable. No registrar nombres de docentes.',
        'Sin apoyo económico, Económico, Convenio / beca o Gestión interna.',
        'Monto únicamente cuando el tipo de apoyo sea Económico.',
        'Información complementaria opcional.'
      ],
      widths: [32,58,40,24,20,48]
    }
  };

  function rows() {
    // El estado institucional del Plan se sincroniza dentro de la validación previa.
    previousStatus('plan');
    return Array.isArray(state.needPlan) ? state.needPlan : [];
  }

  function missingForGroup(row, kind) {
    if(kind === 'plan-actions') {
      return !norm(row.action) || !norm(row.modality);
    }
    if(kind === 'plan-control') {
      return !norm(row.plannedStart) || !norm(row.plannedEnd) || !norm(row.indicator) || n(row.targetPercent) <= 0 || !norm(row.evidence);
    }
    if(kind === 'plan-resources') {
      return !norm(row.responsibleRole) || !norm(row.supportType) || (row.supportType === 'Económico' && n(row.supportAmount) <= 0);
    }
    return false;
  }

  documentStatus = function(type) {
    const base = previousStatus(type);
    if(type !== 'plan' && type !== 'informe') return base;

    // El Informe conserva la dependencia general de que el Plan esté completo.
    if(type === 'informe') return base;

    const clean = (base.issues || []).filter(issue => issue.kind !== 'need-plan-summary');
    const planRows = rows();

    Object.entries(GROUPS).forEach(([kind,cfg]) => {
      const pending = planRows.filter(row => missingForGroup(row,kind));
      if(!pending.length) return;
      clean.push({
        kind,
        count: 1,
        affected: pending.length,
        text: pending.length + ' necesidad(es) pendiente(s) en ' + cfg.title.toLowerCase(),
        view: 'planificacion'
      });
    });

    return {
      ...base,
      ready: clean.length === 0,
      issues: clean,
      missing: clean.map(issue => issue.text),
      warnings: []
    };
  };

  function groupSheet(kind) {
    const cfg = GROUPS[kind];
    const planRows = rows();
    const subset = planRows.filter(row => missingForGroup(row,kind));
    const selected = subset.length ? subset : planRows;

    const data = selected.map(row => {
      if(kind === 'plan-actions') {
        return [row.career,row.needText,row.priority,row.action,row.modality];
      }
      if(kind === 'plan-control') {
        return [row.career,row.needText,row.plannedStart,row.plannedEnd,row.indicator,row.targetPercent || '',row.evidence];
      }
      return [row.career,row.needText,row.responsibleRole,row.supportType,row.supportAmount || '',row.observations];
    });

    return {
      name: 'PLAN',
      headers: cfg.headers,
      descriptions: cfg.descriptions,
      rows: data,
      widths: cfg.widths
    };
  }

  issueExcelTemplatePayload = function(type, kind) {
    if(type === 'plan' && GROUPS[kind]) {
      return {
        filename: GROUPS[kind].filename,
        sheets: [groupSheet(kind)]
      };
    }
    return previousIssuePayload(type,kind);
  };

  issueTemplateButton = function(type,kind,label) {
    if(type === 'plan' && GROUPS[kind]) {
      const cfg = GROUPS[kind];
      return '<button type="button" class="secondary compact issue-template-btn" data-issue-template="'+esc(kind)+'" data-issue-type="plan">'+esc(cfg.download)+'</button>';
    }
    return previousIssueTemplateButton(type,kind,label);
  };

  issueUploadButton = function(type,kind,label) {
    if(type === 'plan' && GROUPS[kind]) {
      const cfg = GROUPS[kind];
      return '<button type="button" class="primary compact issue-upload-btn" data-issue-upload="'+esc(kind)+'" data-issue-type="plan">'+esc(cfg.upload)+'</button>';
    }
    return previousIssueUploadButton(type,kind,label);
  };

  // La importación institucional ya acepta hojas PLAN parciales y actualiza solo
  // las columnas presentes, usando CARRERA + NECESIDAD_DE_FORMACION como clave.
  if(typeof render === 'function') render();
})();
