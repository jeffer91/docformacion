const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('docformacion', {
  loadData: () => ipcRenderer.invoke('data:load'),
  saveData: (data) => ipcRenderer.invoke('data:save', data),
  importExcel: () => ipcRenderer.invoke('excel:import'),
  exportExcelTemplate: (payload) => ipcRenderer.invoke('excel:template', payload),
  pickEvidence: () => ipcRenderer.invoke('evidence:pick'),
  generatePDF: (payload) => ipcRenderer.invoke('pdf:generate', payload),
  readFirebase: () => ipcRenderer.invoke('firebase:read')
});
