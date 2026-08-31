(() => {
  // En Electron, preload.js ya expone esta API. En GitHub Pages usamos este adaptador.
  if (window.docformacion) return;

  const STORAGE_KEY = 'docformacion-data-v1';
  const XLSX_CDN = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';

  function chooseFile(accept) {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.style.display = 'none';
      input.addEventListener('change', () => {
        const file = input.files && input.files[0] ? input.files[0] : null;
        input.remove();
        resolve(file);
      }, { once: true });
      document.body.appendChild(input);
      input.click();
    });
  }

  function ensureXLSX() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = XLSX_CDN;
      script.onload = () => resolve(window.XLSX);
      script.onerror = () => reject(new Error('No se pudo cargar el lector de Excel.'));
      document.head.appendChild(script);
    });
  }

  function saveBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  async function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return { __error: error.message };
    }
  }

  async function saveData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }

  async function pickEvidence() {
    const file = await chooseFile('.pdf,.png,.jpg,.jpeg,.webp,.docx');
    if (!file) return null;
    // En web no guardamos rutas locales por seguridad del navegador.
    return { path: file.name, name: file.name };
  }

  async function importExcel() {
    const file = await chooseFile('.xlsx,.xls');
    if (!file) return null;

    try {
      const XLSX = await ensureXLSX();
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
      const sheets = {};
      workbook.SheetNames.forEach((name) => {
        sheets[name.toUpperCase()] = XLSX.utils.sheet_to_json(workbook.Sheets[name], {
          defval: '',
          raw: false
        });
      });
      return { ok: true, filePath: file.name, sheets };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }

  async function exportExcelTemplate() {
    try {
      const XLSX = await ensureXLSX();
      const wb = XLSX.utils.book_new();

      const periodHeaders = [[
        'PERIODO_INICIO', 'PERIODO_FIN', 'FECHA_ELABORACION', 'VERSION',
        'ELABORADO_POR', 'CARGO_ELABORADO', 'REVISADO_POR', 'CARGO_REVISADO',
        'APROBADO_POR', 'CARGO_APROBADO', 'META_FORMACION_PORCENTAJE',
        'CODIGO_DNF', 'CODIGO_PLAN', 'CODIGO_INFORME'
      ]];

      const careerRows = [
      ['CARRERA','PROGRAMA'],
      ['Enfermería','Técnico Superior'],
      ['Mecánica Automotriz','Tecnología Superior'],
      ['Diseño Multimedia','Tecnología Superior'],
      ['Marketing Digital y Comercio Electrónico','Tecnología Superior'],
      ['Ventas','Tecnología Superior'],
      ['Desarrollo de Software','Tecnología Superior'],
      ['Desarrollo de Software y Ciberseguridad','Tecnología Universitaria'],
      ['Redes y Telecomunicaciones','Tecnología Superior'],
      ['Estética Integral','Tecnología Superior'],
      ['Educación Básica','Tecnología Superior'],
      ['Educación Inicial','Tecnología Superior'],
      ['Pedagogía','Tecnología Universitaria'],
      ['Procesamiento de Alimentos','Tecnología Superior'],
      ['Administración','Tecnología Superior'],
      ['Administración de Empresas e inteligencia de negocios','Tecnología Universitaria'],
      ['Administración del Talento Humano','Tecnología Universitaria'],
      ['Contabilidad','Tecnología Superior'],
      ['Contabilidad y Tributación','Tecnología Universitaria'],
      ['Gestión del Talento Humano','Tecnología Superior'],
      ['Seguridad y Prevención de Riesgos Laborales','Tecnología Superior'],
      ['Seguridad Ciudadana y Orden Publico','Tecnología Superior']
    ];

    const teacherHeaders = [[
        'CEDULA', 'NOMBRE_COMPLETO', 'CARRERA_PRINCIPAL', 'DEDICACION',
        'NIVEL_ACADEMICO_ACTUAL', 'TITULO_ACADEMICO_ACTUAL', 'AFIN_TITULO_CARRERA',
        'ESTUDIA_ACTUALMENTE', 'NIVEL_FORMACION_EN_CURSO', 'PROGRAMA_EN_CURSO',
        'INSTITUCION_ESTUDIO', 'NIVEL_QUE_DESEA_ALCANZAR', 'AREA_O_PROGRAMA_INTERES',
        'DISPUESTO_A_ESTUDIAR', 'TIPO_FORMACION', 'MODALIDAD_PREFERIDA',
        'INICIO_TENTATIVO_MES_ANIO', 'BARRERA_PRINCIPAL', 'ACTUALIZACION_RECIENTE'
      ]];

      const coordHeaders = [[
        'CARRERA', 'COORDINADOR', 'NECESIDADES', 'PRIORIDAD_MANUAL'
      ]];

      const planHeaders = [[
        'CEDULA', 'INCLUIR_EN_PLAN', 'NIVEL_PLANIFICADO', 'PROGRAMA_PLANIFICADO',
        'INSTITUCION', 'MODALIDAD', 'FECHA_INICIO_PLANIFICADA',
        'FECHA_FIN_PLANIFICADA', 'TIPO_APOYO', 'MONTO_APOYO',
        'CONVENIO', 'EFECTO_MULTIPLICADOR_PREVISTO'
      ]];

      const followHeaders = [[
        'CEDULA', 'ESTADO', 'FECHA_REAL_INICIO', 'FECHA_PREVISTA_FINALIZACION',
        'PORCENTAJE_AVANCE', 'TITULO_EVIDENCIA', 'RUTA_EVIDENCIA', 'ABANDONO'
      ]];

      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(careerRows), 'CARRERAS');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(periodHeaders), 'PERIODO');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(teacherHeaders), 'DOCENTES');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(coordHeaders), 'COORDINACIONES');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(planHeaders), 'PLAN');
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(followHeaders), 'SEGUIMIENTO');

      const output = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      saveBlob(
        new Blob([output], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        'FORMACION_DOCENTE_GLOBAL.xlsx'
      );
      return { ok: true, filePath: 'FORMACION_DOCENTE_GLOBAL.xlsx' };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }

  async function generatePDF(payload) {
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        return { ok: false, error: 'El navegador bloqueó la ventana de impresión. Habilita ventanas emergentes para este sitio.' };
      }

      printWindow.document.open();
      printWindow.document.write(payload.html);
      printWindow.document.close();

      const runPrint = () => {
        printWindow.focus();
        printWindow.print();
      };

      if (printWindow.document.readyState === 'complete') {
        setTimeout(runPrint, 250);
      } else {
        printWindow.addEventListener('load', () => setTimeout(runPrint, 250), { once: true });
      }

      return { ok: true, printMode: true };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }

  window.docformacion = {
    loadData,
    saveData,
    importExcel,
    exportExcelTemplate,
    pickEvidence,
    generatePDF
  };
})();
