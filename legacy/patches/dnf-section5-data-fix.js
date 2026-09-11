(() => {
  'use strict';

  const SECTION5_LEVELS = ['Tecnólogo Superior','Tecnólogo Universitario','Licenciatura / Ingeniería','Maestría / Maestría Tecnológica','Doctorado'];
  const FUNCTIONS = ['Docencia','Investigación','Vinculación'];
  const EMPLOYMENT = ['Nombramiento','Contrato temporal'];
  const WORK_MODALITIES = ['Presencial','En línea','Híbrida'];

  function clean(value='') {
    return String(value ?? '').trim();
  }

  function ensureDefaults() {
    if (typeof state === 'undefined' || !state) return;
    state.period = state.period || {};
    if (!Object.prototype.hasOwnProperty.call(state.period, 'surveyPeriod')) state.period.surveyPeriod = '';
    (state.teachers || []).forEach(t => {
      if (!Object.prototype.hasOwnProperty.call(t, 'funcionSustantiva')) t.funcionSustantiva = '';
      if (!Object.prototype.hasOwnProperty.call(t, 'vinculacionLaboral')) t.vinculacionLaboral = '';
      if (!Object.prototype.hasOwnProperty.call(t, 'tiempoPermanencia')) t.tiempoPermanencia = '';
      if (!Object.prototype.hasOwnProperty.call(t, 'modalidadTrabajo')) t.modalidadTrabajo = '';
      if (!Object.prototype.hasOwnProperty.call(t, 'programaActualizacion')) t.programaActualizacion = '';
    });
  }

  function surveyYesNo(value) {
    const raw = clean(value).toLowerCase();
    if (!raw) return '';
    if (/^(sí|si)\b/.test(raw)) return 'Sí';
    if (/^no\b/.test(raw)) return 'No';
    return '';
  }

  function normalizeOption(value, allowed) {
    const raw = clean(value);
    if (!raw) return '';
    const exact = allowed.find(x => x.toLowerCase() === raw.toLowerCase());
    return exact || raw;
  }

  // ----- Período: se añade el período de aplicación de la encuesta -----
  if (typeof renderPeriod === 'function') {
    const previousRenderPeriod = renderPeriod;
    renderPeriod = function renderPeriodSection5() {
      ensureDefaults();
      previousRenderPeriod();
      const grid = document.querySelector('#content .form-grid');
      if (!grid || grid.querySelector('[name="surveyPeriod"]')) return;
      const wrapper = document.createElement('div');
      wrapper.innerHTML = field(
        'Período / fecha de aplicación de la encuesta',
        'surveyPeriod',
        state.period.surveyPeriod || '',
        'text',
        [],
        false,
        'Ejemplo: Cuarto trimestre del año 2026. Se usa en la sección 5 y en la fuente de las tablas.'
      );
      grid.appendChild(wrapper.firstElementChild);
    };
  }

  if (typeof periodMissing === 'function') {
    const previousPeriodMissing = periodMissing;
    periodMissing = function periodMissingSection5(type) {
      ensureDefaults();
      const missing = previousPeriodMissing(type) || [];
      if (type === 'dnf' && !clean(state.period.surveyPeriod)) {
        missing.push('Período / año de aplicación de la encuesta');
      }
      return missing;
    };
  }

  // ----- Docentes: campos de caracterización -----
  if (typeof openTeacher === 'function') {
    const previousOpenTeacher = openTeacher;
    openTeacher = function openTeacherSection5(teacherId=null, returnView=null, focusField='') {
      ensureDefaults();
      previousOpenTeacher(teacherId, returnView, focusField);
      const root = document.getElementById('teacherFields');
      if (!root || root.querySelector('[name="funcionSustantiva"]')) return;
      const teacher = teacherId ? teacherById(teacherId) : {};

      const recent = document.querySelector('#teacherForm [name="actualizacionReciente"]');
      if (recent) {
        const label = recent.closest('.field')?.querySelector('label');
        if (label) label.textContent = '¿Participa o participó recientemente en actualización/formación?';
        if (!teacherId) recent.value = '';
      }

      const extra = [
        field('Función sustantiva principal','funcionSustantiva',teacher.funcionSustantiva || '','select',FUNCTIONS),
        field('Tipo de vinculación laboral','vinculacionLaboral',teacher.vinculacionLaboral || '','select',EMPLOYMENT),
        field('Tiempo de permanencia en la institución','tiempoPermanencia',teacher.tiempoPermanencia || '', 'text', [], false, 'Registra el dato institucional disponible, por ejemplo: 3 años o 2 años 6 meses.'),
        field('Modalidad de trabajo','modalidadTrabajo',teacher.modalidadTrabajo || '','select',WORK_MODALITIES),
        field('Programa, curso o temática de actualización','programaActualizacion',teacher.programaActualizacion || '', 'text', [], true, 'Completar cuando la respuesta de actualización reciente sea Sí.')
      ].join('');
      root.insertAdjacentHTML('beforeend', extra);
    };
  }

  if (typeof renderTeachers === 'function') {
    const previousRenderTeachers = renderTeachers;
    renderTeachers = function renderTeachersSection5() {
      ensureDefaults();
      previousRenderTeachers();
      const p = document.querySelector('#content .section-title p');
      if (p) p.textContent = (state.teachers || []).length + ' registros. La base alimenta la caracterización y los resultados variables de la DNF.';
    };
  }

  if (typeof documentStatus === 'function') {
    const previousDocumentStatus = documentStatus;
    documentStatus = function documentStatusSection5(type) {
      ensureDefaults();
      const result = previousDocumentStatus(type);
      if (type !== 'dnf') return result;
      const issues = [...(result.issues || [])];
      if (!(state.teachers || []).length && !issues.some(x => x.kind === 'teachers-empty')) {
        issues.push({kind:'teachers-empty', text:'Cargar al menos un docente para generar la caracterización del claustro', view:'docentes'});
      }
      return {...result, issues, ready: issues.length === 0};
    };
  }

  // ----- Excel: ampliar PERIODO y DOCENTES sin romper las plantillas existentes -----
  function cloneSheet(sheet) {
    return {
      ...sheet,
      headers: [...(sheet.headers || [])],
      descriptions: [...(sheet.descriptions || [])],
      rows: (sheet.rows || []).map(r => [...r]),
      widths: [...(sheet.widths || [])]
    };
  }

  function extendPeriodSheet(sheet, includeData) {
    if (!sheet || sheet.headers.includes('PERIODO_APLICACION_ENCUESTA')) return sheet;
    sheet.headers.push('PERIODO_APLICACION_ENCUESTA');
    sheet.descriptions.push('Período o fecha de aplicación de la encuesta utilizada en la DNF. Ejemplo: Cuarto trimestre del año 2026.');
    sheet.widths.push(36);
    sheet.rows = (sheet.rows || []).map(row => [...row, includeData ? (state.period.surveyPeriod || '') : '']);
    return sheet;
  }

  function extendTeacherSheet(sheet, includeData) {
    if (!sheet || sheet.headers.includes('FUNCION_SUSTANTIVA_PRINCIPAL')) return sheet;
    const additions = [
      ['FUNCION_SUSTANTIVA_PRINCIPAL','Docencia, Investigación o Vinculación.',28],
      ['TIPO_VINCULACION_LABORAL','Nombramiento o Contrato temporal.',26],
      ['TIEMPO_PERMANENCIA','Tiempo de permanencia institucional disponible.',24],
      ['MODALIDAD_TRABAJO','Presencial, En línea o Híbrida.',22],
      ['PROGRAMA_TEMATICA_ACTUALIZACION','Programa, curso o temática de actualización realizada o en curso.',44]
    ];
    additions.forEach(([header,description,width]) => {
      sheet.headers.push(header);
      sheet.descriptions.push(description);
      sheet.widths.push(width);
    });
    sheet.rows = (sheet.rows || []).map(row => {
      if (!includeData) return [...row, '', '', '', '', ''];
      const teacher = (state.teachers || []).find(t => String(t.cedula || '') === String(row[0] || '')) || {};
      return [...row,
        teacher.funcionSustantiva || '',
        teacher.vinculacionLaboral || '',
        teacher.tiempoPermanencia || '',
        teacher.modalidadTrabajo || '',
        teacher.programaActualizacion || ''
      ];
    });
    return sheet;
  }

  if (typeof excelTemplatePayload === 'function') {
    const previousExcelTemplatePayload = excelTemplatePayload;
    excelTemplatePayload = function excelTemplatePayloadSection5(scope, includeData) {
      ensureDefaults();
      const payload = previousExcelTemplatePayload(scope, includeData);
      payload.sheets = (payload.sheets || []).map(sheet => {
        const copy = cloneSheet(sheet);
        if (copy.name === 'PERIODO') extendPeriodSheet(copy, !!includeData);
        if (copy.name === 'DOCENTES') extendTeacherSheet(copy, !!includeData);
        return copy;
      });

      if (scope === 'dnf') {
        if (!payload.sheets.some(s => s.name === 'PERIODO')) {
          const period = previousExcelTemplatePayload('periodo', includeData)?.sheets?.[0];
          if (period) payload.sheets.unshift(extendPeriodSheet(cloneSheet(period), !!includeData));
        }
        if (!payload.sheets.some(s => s.name === 'DOCENTES')) {
          const teachers = previousExcelTemplatePayload('docentes', includeData)?.sheets?.[0];
          if (teachers) payload.sheets.push(extendTeacherSheet(cloneSheet(teachers), !!includeData));
        }
      }
      return payload;
    };
  }

  if (typeof applyExcel === 'function') {
    const previousApplyExcel = applyExcel;
    applyExcel = function applyExcelSection5(sheets) {
      ensureDefaults();
      previousApplyExcel(sheets);
      ensureDefaults();

      const p = (sheets?.PERIODO || [])[0];
      if (p && Object.prototype.hasOwnProperty.call(p, 'PERIODO_APLICACION_ENCUESTA')) {
        state.period.surveyPeriod = clean(p.PERIODO_APLICACION_ENCUESTA);
      }

      (sheets?.DOCENTES || []).forEach(row => {
        const cedula = clean(row.CEDULA);
        if (!cedula) return;
        const teacher = (state.teachers || []).find(t => String(t.cedula || '') === cedula);
        if (!teacher) return;

        if (Object.prototype.hasOwnProperty.call(row, 'FUNCION_SUSTANTIVA_PRINCIPAL')) {
          teacher.funcionSustantiva = normalizeOption(row.FUNCION_SUSTANTIVA_PRINCIPAL, FUNCTIONS);
        }
        if (Object.prototype.hasOwnProperty.call(row, 'TIPO_VINCULACION_LABORAL')) {
          teacher.vinculacionLaboral = normalizeOption(row.TIPO_VINCULACION_LABORAL, EMPLOYMENT);
        }
        if (Object.prototype.hasOwnProperty.call(row, 'TIEMPO_PERMANENCIA')) {
          teacher.tiempoPermanencia = clean(row.TIEMPO_PERMANENCIA);
        }
        if (Object.prototype.hasOwnProperty.call(row, 'MODALIDAD_TRABAJO')) {
          teacher.modalidadTrabajo = normalizeOption(row.MODALIDAD_TRABAJO, WORK_MODALITIES);
        }
        if (Object.prototype.hasOwnProperty.call(row, 'PROGRAMA_TEMATICA_ACTUALIZACION')) {
          teacher.programaActualizacion = clean(row.PROGRAMA_TEMATICA_ACTUALIZACION);
        }

        // Las preguntas de encuesta deben conservar el vacío como "sin respuesta".
        // No se convierte una celda vacía en "No" ni en "Específica".
        if (Object.prototype.hasOwnProperty.call(row, 'DISPUESTO_A_ESTUDIAR')) {
          teacher.dispuesto = surveyYesNo(row.DISPUESTO_A_ESTUDIAR);
        }
        if (Object.prototype.hasOwnProperty.call(row, 'ACTUALIZACION_RECIENTE')) {
          teacher.actualizacionReciente = surveyYesNo(row.ACTUALIZACION_RECIENTE);
        }
        if (Object.prototype.hasOwnProperty.call(row, 'TIPO_FORMACION')) {
          const raw = clean(row.TIPO_FORMACION);
          teacher.tipoFormacion = raw ? normalizeOption(raw, ['Específica','Genérica']) : '';
        }
      });
    };
  }

  ensureDefaults();
  window.__DOCFORMACION_SECTION5_DATA_READY = true;
})();
