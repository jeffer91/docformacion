(() => {
  // En Electron, preload.js ya expone esta API. En GitHub Pages usamos este adaptador.
  if (window.docformacion) return;

  const STORAGE_KEY = 'docformacion-data-v1';
  const XLSX_CDN = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
  const FIREBASE_READ_URL = 'https://repaso-fire-d8ceb-default-rtdb.firebaseio.com/.json';

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
    setTimeout(() => URL.revokeObjectURL(url), 60000);
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

  async function readFirebase() {
    try {
      const response = await fetch(FIREBASE_READ_URL, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      });
      if (!response.ok) return { ok: false, error: 'Firebase respondió HTTP ' + response.status };
      const data = await response.json();
      if (data && data.error) return { ok: false, error: String(data.error) };
      return { ok: true, data, readOnly: true, source: FIREBASE_READ_URL };
    } catch (error) {
      return { ok: false, error: error.message };
    }
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
        'APROBADO_POR', 'CARGO_APROBADO', 'META_FORMACION_PORCENTAJE'
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
        'CARRERA', 'COORDINADOR'
      ]];

      const needHeaders = [[
        'CARRERA', 'NECESIDAD', 'PRIORIDAD_MANUAL'
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
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(needHeaders), 'NECESIDADES');
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

  function emitPdfProgress(current, total, phase='render') {
    window.dispatchEvent(new CustomEvent('docformacion-pdf-progress', {
      detail: { current, total, phase }
    }));
  }

  function canvasToJpegBlob(canvas, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('No se pudo convertir una página del PDF.')),
        'image/jpeg',
        quality
      );
    });
  }

  async function generateExactPages(payload, frame) {
    if (typeof window.html2canvas !== 'function' || !window.jspdf?.jsPDF) {
      return { ok: false, error: 'No se cargaron las librerías necesarias para crear el PDF.' };
    }

    const pages = [...frame.contentDocument.querySelectorAll('.pdf-page')];
    if (!pages.length) return { ok: false, error: 'No se encontraron páginas para generar el PDF.' };

    const { jsPDF } = window.jspdf;
    const filename = payload.filename || 'documento.pdf';

    // En documentos largos reducimos ligeramente la resolución para evitar
    // agotar la memoria del navegador sin perder legibilidad en A4.
    const scale = pages.length >= 55 ? 1.0 : pages.length >= 40 ? 1.12 : 1.28;
    const quality = pages.length >= 55 ? 0.76 : pages.length >= 40 ? 0.8 : 0.84;

    const pdf = new jsPDF({
      unit: 'mm',
      format: 'a4',
      orientation: 'portrait',
      compress: true,
      putOnlyUsedFonts: true,
      precision: 2
    });

    emitPdfProgress(0, pages.length, 'render');

    for (let i = 0; i < pages.length; i++) {
      let canvas = null;
      try {
        canvas = await window.html2canvas(pages[i], {
          scale,
          useCORS: true,
          allowTaint: false,
          logging: false,
          imageTimeout: 8000,
          removeContainer: true,
          backgroundColor: '#ffffff',
          width: pages[i].scrollWidth,
          height: pages[i].scrollHeight,
          windowWidth: pages[i].scrollWidth,
          windowHeight: pages[i].scrollHeight
        });

        const jpegBlob = await canvasToJpegBlob(canvas, quality);
        const imageBytes = new Uint8Array(await jpegBlob.arrayBuffer());

        if (i > 0) pdf.addPage('a4', 'portrait');
        pdf.addImage(
          imageBytes,
          'JPEG',
          0,
          0,
          210,
          297,
          'dnf-page-' + i,
          'FAST'
        );

        emitPdfProgress(i + 1, pages.length, 'render');
      } catch (error) {
        throw new Error('Error al generar la página ' + (i + 1) + ' de ' + pages.length + ': ' + (error?.message || error));
      } finally {
        if (canvas) {
          canvas.width = 1;
          canvas.height = 1;
          canvas = null;
        }
      }

      // Cede tiempo al navegador para liberar memoria y mantener la interfaz activa.
      if ((i + 1) % 3 === 0) {
        await new Promise(resolve => setTimeout(resolve, 20));
      }
    }

    emitPdfProgress(pages.length, pages.length, 'assembling');
    await new Promise(resolve => setTimeout(resolve, 30));

    let pdfBlob;
    try {
      pdfBlob = pdf.output('blob');
    } catch (error) {
      throw new Error('No se pudo ensamblar el archivo PDF: ' + (error?.message || error));
    }

    if (!pdfBlob || !pdfBlob.size) {
      throw new Error('El PDF se generó vacío.');
    }

    saveBlob(pdfBlob, filename);
    emitPdfProgress(pages.length, pages.length, 'done');

    return {
      ok: true,
      filePath: filename,
      downloaded: true,
      pages: pages.length,
      size: pdfBlob.size
    };
  }

  async function generatePDF(payload) {
    let frame = null;
    let timeoutId = null;
    try {
      if (!payload?.html) {
        return { ok: false, error: 'No se recibió contenido para generar el PDF.' };
      }

      frame = document.createElement('iframe');
      frame.setAttribute('aria-hidden', 'true');
      frame.style.position = 'fixed';
      frame.style.left = '-12000px';
      frame.style.top = '0';
      frame.style.width = '794px';
      frame.style.height = '1123px';
      frame.style.border = '0';
      frame.style.background = '#fff';
      frame.style.visibility = 'hidden';

      const loaded = new Promise((resolve, reject) => {
        timeoutId = setTimeout(() => reject(new Error('No se pudo preparar el documento para PDF.')), 10000);
        frame.onload = () => {
          clearTimeout(timeoutId);
          timeoutId = null;
          resolve();
        };
        frame.onerror = () => {
          clearTimeout(timeoutId);
          timeoutId = null;
          reject(new Error('No se pudo preparar el documento para PDF.'));
        };
      });

      frame.srcdoc = payload.html;
      document.body.appendChild(frame);
      await loaded;

      const doc = frame.contentDocument;
      if (!doc?.body) throw new Error('El documento PDF no pudo renderizarse.');

      if (doc.fonts?.ready) {
        await Promise.race([
          doc.fonts.ready,
          new Promise(resolve => setTimeout(resolve, 1500))
        ]);
      }

      if (payload.exactPages || doc.querySelector('.pdf-page')) {
        return await generateExactPages(payload, frame);
      }

      if (typeof window.html2pdf !== 'function') {
        return { ok: false, error: 'El generador PDF no se cargó. Recarga la página e inténtalo nuevamente.' };
      }

      const filename = payload.filename || 'documento.pdf';
      const options = {
        margin: 0,
        filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          windowWidth: 794
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait',
          compress: true
        },
        pagebreak: {
          mode: ['css', 'legacy'],
          before: '.page-break',
          avoid: ['.avoid', 'tr']
        }
      };

      const work = window.html2pdf().set(options).from(doc.body).save();
      await Promise.race([
        work,
        new Promise((_, reject) => {
          timeoutId = setTimeout(
            () => reject(new Error('La generación del PDF tardó demasiado.')),
            45000
          );
        })
      ]);

      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      return { ok: true, filePath: filename, downloaded: true };
    } catch (error) {
      return { ok: false, error: error?.message || String(error) };
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      if (frame?.parentNode) frame.remove();
    }
  }

  window.docformacion = {
    loadData,
    saveData,
    importExcel,
    exportExcelTemplate,
    pickEvidence,
    generatePDF,
    readFirebase
  };
})();
