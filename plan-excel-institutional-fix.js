(() => {
  const PLAN_HEADERS = [
    'CODIGO_NECESIDAD',
    'CARRERA',
    'NECESIDAD_DE_FORMACION',
    'PRIORIDAD',
    'ACCION_DE_FORMACION',
    'MODALIDAD',
    'INICIO_PLANIFICADO',
    'FIN_PLANIFICADO',
    'INDICADOR',
    'META_PORCENTAJE',
    'MEDIO_DE_VERIFICACION',
    'RESPONSABLE_INSTITUCIONAL',
    'TIPO_DE_APOYO',
    'MONTO_DE_APOYO',
    'OBSERVACIONES'
  ];

  const PLAN_DESCRIPTIONS = [
    'Código de trazabilidad de la necesidad. No corresponde a una persona ni a una cédula.',
    'Carrera de origen de la necesidad detectada en la DNF. Viene precargada.',
    'Necesidad de formación detectada en la DNF. Viene precargada.',
    'Prioridad Alta, Media o Baja heredada de la DNF. Viene precargada.',
    'Acción institucional de formación que atenderá esta necesidad.',
    'Presencial, Virtual o Híbrida.',
    'Mes/año de inicio en formato AAAA-MM.',
    'Mes/año de fin en formato AAAA-MM.',
    'Indicador con el que se medirá el cumplimiento de la acción.',
    'Meta porcentual de cumplimiento, entre 1 y 100.',
    'Documento, registro o evidencia que permitirá verificar la ejecución.',
    'Unidad, área o cargo institucional responsable. No registrar nombres de docentes.',
    'Sin apoyo económico, Económico, Convenio / beca o Gestión interna.',
    'Monto numérico únicamente cuando el tipo de apoyo sea Económico.',
    'Información complementaria de la planificación.'
  ];

  const PLAN_WIDTHS = [18,32,56,14,56,16,18,18,42,18,46,36,22,18,42];

  function normalizeText(value='') {
    return norm(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ');
  }

  function planNeedCode(careerIndex, needIndex) {
    return 'DNF-' + String(careerIndex + 1).padStart(2,'0') + '-' + String(needIndex + 1).padStart(2,'0');
  }

  function needKeyFor(career, item, index) {
    return careerKey(career) + '::' + (norm(item?.id) || ('need_' + careerKey(career).replace(/[^a-z0-9]+/g,'_') + '_' + index));
  }

  function institutionalNeedPlanRows() {
    const existing = new Map((Array.isArray(state.needPlan) ? state.needPlan : []).map(row => [row.needKey,row]));
    const rows = [];
    const careers = typeof dnfCareerNames === 'function' ? dnfCareerNames() : [];

    careers.forEach((career, careerIndex) => {
      const items = typeof ensureNeedItems === 'function' ? ensureNeedItems(career) : [];
      items.filter(item => norm(item?.text)).forEach((item, needIndex) => {
        const needKey = needKeyFor(career,item,needIndex);
        const old = existing.get(needKey) || {};
        const priority = norm(item.priorityOverride) ||
          (typeof autoPriorityForNeed === 'function' ? norm(autoPriorityForNeed(career,item.text)) : '') ||
          norm(old.priority) || 'Sin definir';

        rows.push({
          needKey,
          code: planNeedCode(careerIndex,needIndex),
          career,
          needText: norm(item.text),
          priority,
          action: norm(old.action),
          modality: norm(old.modality),
          plannedStart: norm(old.plannedStart) || norm(state.period?.start),
          plannedEnd: norm(old.plannedEnd) || norm(state.period?.end),
          indicator: norm(old.indicator),
          targetPercent: n(old.targetPercent) || 100,
          evidence: norm(old.evidence),
          responsibleRole: norm(old.responsibleRole) || 'Unidad de Gestión de Procesos Académicos',
          supportType: norm(old.supportType),
          supportAmount: n(old.supportAmount),
          observations: norm(old.observations)
        });
      });
    });

    state.needPlan = rows.map(({code,...row}) => row);
    return rows;
  }

  function planSheetSpec() {
    const rows = institutionalNeedPlanRows();
    return {
      name: 'PLAN',
      headers: PLAN_HEADERS,
      descriptions: PLAN_DESCRIPTIONS,
      rows: rows.map(row => [
        row.code,
        row.career,
        row.needText,
        row.priority,
        row.action,
        row.modality,
        row.plannedStart,
        row.plannedEnd,
        row.indicator,
        row.targetPercent || '',
        row.evidence,
        row.responsibleRole,
        row.supportType,
        row.supportAmount || '',
        row.observations
      ]),
      widths: PLAN_WIDTHS
    };
  }

  const previousExcelTemplatePayload = excelTemplatePayload;
  excelTemplatePayload = function(scope, includeData) {
    const payload = previousExcelTemplatePayload(scope, includeData);
    const sheet = planSheetSpec();

    if(scope === 'plan') {
      payload.sheets = [sheet];
      return payload;
    }

    if(scope === 'global') {
      const sheets = Array.isArray(payload.sheets) ? [...payload.sheets] : [];
      const index = sheets.findIndex(item => item?.name === 'PLAN');
      if(index >= 0) sheets[index] = sheet;
      else sheets.push(sheet);
      payload.sheets = sheets;
    }

    return payload;
  };

  const previousApplyExcel = applyExcel;
  applyExcel = function(sheets) {
    previousApplyExcel(sheets);

    const imported = Array.isArray(sheets?.PLAN) ? sheets.PLAN : [];
    if(!imported.length) return;

    const newFormat = imported.some(row =>
      row && (
        Object.prototype.hasOwnProperty.call(row,'NECESIDAD_DE_FORMACION') ||
        Object.prototype.hasOwnProperty.call(row,'CODIGO_NECESIDAD')
      )
    );
    if(!newFormat) return;

    const plans = institutionalNeedPlanRows();
    const byCode = new Map(plans.map(row => [row.code,row]));
    const byNeed = new Map(plans.map(row => [normalizeText(row.career) + '::' + normalizeText(row.needText),row]));

    imported.forEach(row => {
      const code = norm(row.CODIGO_NECESIDAD);
      const key = normalizeText(row.CARRERA) + '::' + normalizeText(row.NECESIDAD_DE_FORMACION);
      const target = (code && byCode.get(code)) || byNeed.get(key);
      if(!target) return;

      const assignText = (field, column) => {
        const value = norm(row[column]);
        if(value) target[field] = value;
      };

      assignText('action','ACCION_DE_FORMACION');
      assignText('modality','MODALIDAD');
      assignText('plannedStart','INICIO_PLANIFICADO');
      assignText('plannedEnd','FIN_PLANIFICADO');
      assignText('indicator','INDICADOR');
      assignText('evidence','MEDIO_DE_VERIFICACION');
      assignText('responsibleRole','RESPONSABLE_INSTITUCIONAL');
      assignText('supportType','TIPO_DE_APOYO');
      assignText('observations','OBSERVACIONES');

      const targetPercent = n(row.META_PORCENTAJE);
      if(targetPercent > 0) target.targetPercent = Math.max(1,Math.min(100,targetPercent));

      const supportAmount = n(row.MONTO_DE_APOYO);
      if(supportAmount >= 0 && norm(row.MONTO_DE_APOYO) !== '') target.supportAmount = supportAmount;
    });

    state.needPlan = plans.map(({code,...row}) => row);
  };

  // Las pantallas iniciales se renderizan antes de que carguen los parches finales.
  // Volvemos a renderizar para que también se vean los nombres específicos de plantilla.
  if(typeof render === 'function') render();
})();