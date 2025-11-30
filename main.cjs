const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const url = require('url');

ipcMain.handle('open-directory-dialog', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  return result.filePaths[0];
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // For simplicity in this setup, allows window.require
      webSecurity: false // Optional, sometimes needed for local file access
    },
    autoHideMenuBar: true,
    backgroundColor: '#1a1a1a', // Dark theme bg
    show: false // Don't show until ready
  });

  // In dev, you might want to load 'http://localhost:4200'
  // For this setup, we'll assume we build the angular app first.
  // Or we can check for dev mode.

  const distPath = path.join(__dirname, 'dist', 'addon-manager', 'browser', 'index.html');
  // Note: Angular 17+ might output to dist/addon-manager/browser or just dist/addon-manager
  // We'll check this later. For now, assuming standard structure.

  // Check if we are in dev mode (you can set an env var or just check args)
  const isDev = process.argv.includes('--dev');

  if (isDev) {
    win.loadURL('http://localhost:4200');
    win.webContents.openDevTools();
  } else {
    win.loadURL(url.format({
      pathname: distPath,
      protocol: 'file:',
      slashes: true
    }));
  }

  win.once('ready-to-show', () => {
    win.show();
  });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
