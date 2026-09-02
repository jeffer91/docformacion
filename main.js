const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const https = require('https');
const XLSX = require('xlsx');

const FIREBASE_READ_URL = 'https://repaso-fire-d8ceb-default-rtdb.firebaseio.com/.json';

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

function readFirebaseJson() {
  return new Promise((resolve) => {
    const request = https.get(FIREBASE_READ_URL, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'DocFormacion-ReadOnly' }
    }, (response) => {
      let body = '';
      let size = 0;
      const maxBytes = 25 * 1024 * 1024;

      response.setEncoding('utf8');
      response.on('data', (chunk) => {
        size += Buffer.byteLength(chunk, 'utf8');
        if (size > maxBytes) {
          request.destroy(new Error('La respuesta de Firebase supera 25 MB.'));
          return;
        }
        body += chunk;
      });

      response.on('end', () => {
        if (response.statusCode !== 200) {
          resolve({ ok: false, error: 'Firebase respondió HTTP ' + response.statusCode });
          return;
        }
        try {
          const data = JSON.parse(body || 'null');
          if (data && data.error) {
            resolve({ ok: false, error: String(data.error) });
            return;
          }
          resolve({ ok: true, data, readOnly: true, source: FIREBASE_READ_URL });
        } catch (error) {
          resolve({ ok: false, error: 'Respuesta JSON inválida: ' + error.message });
        }
      });
    });

    request.on('error', (error) => resolve({ ok: false, error: error.message }));
    request.setTimeout(20000, () => request.destroy(new Error('Tiempo de espera agotado al leer Firebase.')));
  });
}

ipcMain.handle('firebase:read', async () => {
  // Integración deliberadamente de solo lectura: este proceso únicamente ejecuta GET.
  return readFirebaseJson();
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

function excelSheetToObjects(sheet){
  const rows=XLSX.utils.sheet_to_json(sheet,{header:1,defval:'',raw:false});
  if(!rows.length) return [];
  const headers=(rows[0]||[]).map(x=>String(x||'').trim());
  let start=1;
  if(rows[1]?.some((value,index)=>index===0 && String(value||'').trim().startsWith('[INSTRUCCIONES]'))){
    start=2;
  }
  return rows.slice(start)
    .filter(row=>row.some(value=>String(value??'').trim()!==''))
    .map(row=>{
      const out={};
      headers.forEach((header,index)=>{if(header) out[header]=row[index]??'';});
      return out;
    });
}

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
      sheets[name.toUpperCase()] = excelSheetToObjects(workbook.Sheets[name]);
    });
    return { ok: true, filePath, sheets };
  } catch (error) {
    return { ok: false, error: error.message };
  }
});

function buildExcelSheet(spec){
  const headers=Array.isArray(spec.headers)?spec.headers:[];
  const descriptions=Array.isArray(spec.descriptions)?spec.descriptions:[];
  const rows=Array.isArray(spec.rows)?spec.rows:[];
  const instructionRow=headers.map((_,i)=>i===0
    ? '[INSTRUCCIONES] '+String(descriptions[i]||'Completa este campo.')
    : String(descriptions[i]||'Completa este campo.'));
  const data=[headers,instructionRow,...rows];
  const ws=XLSX.utils.aoa_to_sheet(data);
  const widths=(spec.widths||headers.map(()=>22)).map(w=>({wch:Number(w)||22}));
  ws['!cols']=widths;
  if(headers.length) ws['!autofilter']={ref:XLSX.utils.encode_range({s:{r:0,c:0},e:{r:0,c:headers.length-1}})};
  ws['!rows']=[{hpt:22},{hpt:42}];
  return ws;
}

ipcMain.handle('excel:template', async (_event, payload={}) => {
  const filename=payload.filename||'FORMACION_DOCENTE_GLOBAL.xlsx';
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: filename,
    filters: [{ name: 'Excel', extensions: ['xlsx'] }]
  });
  if (result.canceled || !result.filePath) return null;

  try {
    const wb = XLSX.utils.book_new();
    const sheets=Array.isArray(payload.sheets)?payload.sheets:[];
    if(!sheets.length) throw new Error('No se definieron hojas para la plantilla.');
    sheets.forEach(spec=>{
      const ws=buildExcelSheet(spec);
      XLSX.utils.book_append_sheet(wb,ws,String(spec.name||'HOJA').slice(0,31));
    });
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
      margins: { marginType: payload.exactPages ? 'none' : 'default' },
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
