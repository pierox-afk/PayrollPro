const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  saveReport: (data) => ipcRenderer.invoke('save-report', data),
  loadReport: () => ipcRenderer.invoke('load-report'),
});
