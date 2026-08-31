const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

let mainWindow;

function dataPath() {
  return path.join(app.getPath('userData'), 'docformacion-data.json');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    backgroundColor: '#f5f7fb',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('data:load', async () => {
  try {
    const file = dataPath();
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    return { __error: error.message };
  }
});

ipcMain.handle('data:save', async (_event, data) => {
  try {
    fs.writeFileSync(dataPath(), JSON.stringify(data, null, 2), 'utf8');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('evidence:pick', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [
      { name: 'Evidencias', extensions: ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'docx'] },
      { name: 'Todos los archivos', extensions: ['*'] }
    ]
  });
  if (result.canceled || !result.filePaths.length) return null;
  const filePath = result.filePaths[0];
  return { path: filePath, name: path.basename(filePath) };
});

ipcMain.handle('excel:import', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }]
  });
  if (result.canceled || !result.filePaths.length) return null;

  const filePath = result.filePaths[0];
  try {
    const workbook = XLSX.readFile(filePath, { cellDates: false });
    const sheets = {};
    workbook.SheetNames.forEach((name) => {
      sheets[name.toUpperCase()] = XLSX.utils.sheet_to_json(workbook.Sheets[name], {
        defval: '',
        raw: false
      });
    });
    return { ok: true, filePath, sheets };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('excel:template', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: 'FORMACION_DOCENTE_GLOBAL.xlsx',
    filters: [{ name: 'Excel', extensions: ['xlsx'] }]
  });
  if (result.canceled || !result.filePath) return null;

  try {
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

    XLSX.writeFile(wb, result.filePath);
    return { ok: true, filePath: result.filePath };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('pdf:generate', async (_event, payload) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: payload.filename || 'documento.pdf',
    filters: [{ name: 'PDF', extensions: ['pdf'] }]
  });
  if (result.canceled || !result.filePath) return null;

  let pdfWindow;
  try {
    pdfWindow = new BrowserWindow({
      show: false,
      webPreferences: { contextIsolation: true, nodeIntegration: false }
    });

    const htmlPath = path.join(app.getPath('temp'), 'docformacion-preview.html');
    fs.writeFileSync(htmlPath, payload.html, 'utf8');
    await pdfWindow.loadFile(htmlPath);

    const pdf = await pdfWindow.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
      margins: { marginType: 'default' },
      preferCSSPageSize: true
    });

    fs.writeFileSync(result.filePath, pdf);
    return { ok: true, filePath: result.filePath };
  } catch (error) {
    return { ok: false, error: error.message };
  } finally {
    if (pdfWindow && !pdfWindow.isDestroyed()) pdfWindow.destroy();
  }
});
