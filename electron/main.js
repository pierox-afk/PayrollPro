const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Cargar la URL de desarrollo
  const startUrl = process.env.ELECTRON_START_URL || (app.isPackaged ? `file://${path.join(__dirname, '..', 'nomina-front', 'dist', 'index.html')}` : 'http://localhost:5173/');
  win.loadURL(startUrl);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// IPC handlers for persistence
ipcMain.handle('save-report', async (event, payload) => {
  try {
    const dataDir = path.join(app.getPath('userData'), 'data');
    await fs.promises.mkdir(dataDir, { recursive: true });
    const file = path.join(dataDir, 'results.json');
    await fs.promises.writeFile(file, JSON.stringify(payload, null, 2), 'utf-8');
    return { ok: true };
  } catch (err) {
    console.error('Error saving report:', err);
    return { ok: false, error: String(err) };
  }
});

ipcMain.handle('load-report', async () => {
  try {
    const file = path.join(app.getPath('userData'), 'data', 'results.json');
    const exists = await fs.promises
      .access(file)
      .then(() => true)
      .catch(() => false);
    if (!exists) return { ok: true, data: null };
    const content = await fs.promises.readFile(file, 'utf-8');
    return { ok: true, data: JSON.parse(content) };
  } catch (err) {
    console.error('Error loading report:', err);
    return { ok: false, error: String(err) };
  }
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
