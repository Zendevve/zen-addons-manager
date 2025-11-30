const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs').promises;
const fsSync = require('fs');
const { simpleGit } = require('simple-git');
const AdmZip = require('adm-zip');
const axios = require('axios');
const os = require('os');

// ===== IPC Handlers =====

// Directory picker
ipcMain.handle('open-directory-dialog', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  return result.filePaths[0];
});

// Scan addon folder
ipcMain.handle('scan-addon-folder', async (event, folderPath) => {
  try {
    const addons = [];
    const entries = await fs.readdir(folderPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const addonPath = path.join(folderPath, entry.name);
        const tocPath = path.join(addonPath, `${entry.name}.toc`);

        try {
          await fs.access(tocPath);
          const tocContent = await fs.readFile(tocPath, 'utf-8');

          // Parse .toc file for addon info
          const addon = parseTocFile(entry.name, tocContent, addonPath);
          addons.push(addon);
        } catch (err) {
          // No .toc file or error reading it, skip
        }
      }
    }

    return { success: true, addons };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Clone Git repository
ipcMain.handle('git-clone', async (event, { repoUrl, targetPath, branchName }) => {
  try {
    const git = simpleGit();
    await git.clone(repoUrl, targetPath, branchName ? ['--branch', branchName] : []);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Pull latest changes
ipcMain.handle('git-pull', async (event, addonPath) => {
  try {
    const git = simpleGit(addonPath);
    await git.pull();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Switch branch
ipcMain.handle('git-checkout', async (event, { addonPath, branchName }) => {
  try {
    const git = simpleGit(addonPath);
    await git.checkout(branchName);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get available branches
ipcMain.handle('git-branches', async (event, addonPath) => {
  try {
    const git = simpleGit(addonPath);
    const branches = await git.branch();
    return {
      success: true,
      branches: branches.all,
      current: branches.current
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Check Git remote for updates
ipcMain.handle('git-check-updates', async (event, addonPath) => {
  try {
    const git = simpleGit(addonPath);
    await git.fetch();
    const status = await git.status();
    const hasUpdates = status.behind > 0;
    return { success: true, hasUpdates, behind: status.behind };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Delete addon folder
ipcMain.handle('delete-addon', async (event, addonPath) => {
  try {
    await fs.rm(addonPath, { recursive: true, force: true });
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// ===== Smart Installer IPC Handlers =====

// Download ZIP from URL
ipcMain.handle('download-zip', async (event, { url: downloadUrl, destination }) => {
  try {
    const response = await axios({
      method: 'GET',
      url: downloadUrl,
      responseType: 'stream'
    });

    const writer = fsSync.createWriteStream(destination);
    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve({ success: true }));
      writer.on('error', (error) => resolve({ success: false, error: error.message }));
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Find .toc file recursively
async function findTocFile(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isFile() && entry.name.endsWith('.toc')) {
      return { tocPath: fullPath, tocName: entry.name.replace('.toc', '') };
    }

    if (entry.isDirectory()) {
      const result = await findTocFile(fullPath);
      if (result) return result;
    }
  }

  return null;
}

// Fix addon structure (rename, move if nested)
ipcMain.handle('fix-addon-structure', async (event, tempPath) => {
  try {
    // Find .toc file
    const tocInfo = await findTocFile(tempPath);
    if (!tocInfo) {
      return { success: false, error: 'No .toc file found' };
    }

    const { tocPath, tocName } = tocInfo;
    const tocDir = path.dirname(tocPath);
    const currentFolderName = path.basename(tocDir);

    // Check if folder name matches .toc name
    if (currentFolderName === tocName) {
      return { success: true, addonPath: tocDir, addonName: tocName };
    }

    // Rename folder to match .toc name
    const parentDir = path.dirname(tocDir);
    const correctPath = path.join(parentDir, tocName);

    // Check if target already exists
    try {
      await fs.access(correctPath);
      // If exists, remove it first
      await fs.rm(correctPath, { recursive: true, force: true });
    } catch {
      // Doesn't exist, that's fine
    }

    await fs.rename(tocDir, correctPath);

    return { success: true, addonPath: correctPath, addonName: tocName };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Validate addon structure
ipcMain.handle('validate-addon', async (event, addonPath) => {
  try {
    const addonName = path.basename(addonPath);
    const tocPath = path.join(addonPath, `${addonName}.toc`);

    await fs.access(tocPath);
    return { success: true, valid: true };
  } catch (error) {
    return { success: true, valid: false, error: 'Invalid structure' };
  }
});

// Install addon from URL (orchestrates everything)
ipcMain.handle('install-addon', async (event, { url: addonUrl, addonsFolder, method }) => {
  const tempDir = path.join(os.tmpdir(), `zen-addon-${Date.now()}`);

  try {
    await fs.mkdir(tempDir, { recursive: true });

    if (method === 'git') {
      // Git clone
      const git = simpleGit();
      await git.clone(addonUrl, tempDir);

      // Fix structure
      const fixResult = await findTocFile(tempDir);
      if (!fixResult) {
        throw new Error('No .toc file found after cloning');
      }

      const finalPath = path.join(addonsFolder, fixResult.tocName);

      // Check if already exists
      try {
        await fs.access(finalPath);
        return { success: false, error: `Addon "${fixResult.tocName}" already installed` };
      } catch {
        // Doesn't exist, proceed
      }

      // Move to AddOns folder
      const tocDir = path.dirname(path.join(tempDir, fixResult.tocPath.replace(tempDir, '')));
      await fs.rename(tocDir, finalPath);

      // Cleanup temp
      await fs.rm(tempDir, { recursive: true, force: true });

      return { success: true, addonName: fixResult.tocName, addonPath: finalPath };

    } else {
      // ZIP download
      const zipPath = path.join(tempDir, 'addon.zip');
      const downloadResult = await axios({
        method: 'GET',
        url: addonUrl,
        responseType: 'arraybuffer'
      });

      await fs.writeFile(zipPath, downloadResult.data);

      // Extract ZIP
      const zip = new AdmZip(zipPath);
      const extractPath = path.join(tempDir, 'extracted');
      zip.extractAllTo(extractPath, true);

      // Find .toc file in extracted content
      const entries = await fs.readdir(extractPath, { withFileTypes: true });
      let addonFolder = extractPath;

      // If only one folder, go into it
      if (entries.length === 1 && entries[0].isDirectory()) {
        addonFolder = path.join(extractPath, entries[0].name);
      }

      // Fix structure
      const tocInfo = await findTocFile(addonFolder);
      if (!tocInfo) {
        throw new Error('No .toc file found in ZIP');
      }

      // Remove -master, -main, -develop suffixes
      let cleanName = tocInfo.tocName;
      const tocDir = path.dirname(tocInfo.tocPath);
      const currentName = path.basename(tocDir);

      // Auto-remove common suffixes
      const suffixes = ['-master', '-main', '-develop', '-trunk'];
      for (const suffix of suffixes) {
        if (currentName.endsWith(suffix)) {
          cleanName = currentName.replace(suffix, '');
          break;
        }
      }

      const finalPath = path.join(addonsFolder, cleanName);

      // Check if already exists
      try {
        await fs.access(finalPath);
        return { success: false, error: `Addon "${cleanName}" already installed` };
      } catch {
        // Doesn't exist, proceed
      }

      // Rename folder to match .toc
      const renamedPath = path.join(path.dirname(tocDir), cleanName);
      if (tocDir !== renamedPath) {
        await fs.rename(tocDir, renamedPath);
      }

      // Move to AddOns folder
      await fs.rename(renamedPath, finalPath);

      // Cleanup temp
      await fs.rm(tempDir, { recursive: true, force: true });

      return { success: true, addonName: cleanName, addonPath: finalPath };
    }
  } catch (error) {
    // Cleanup temp on error
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch { }

    return { success: false, error: error.message };
  }
});

// Auto-detect WoW installation folder
ipcMain.handle('auto-detect-wow-folder', async () => {
  const possiblePaths = [
    'C:/Program Files (x86)/World of Warcraft',
    'C:/Program Files/World of Warcraft',
    'D:/Games/World of Warcraft',
    'D:/Games/WoW',
    'C:/Games/World of Warcraft',
    'E:/Games/World of Warcraft',
  ];

  for (const basePath of possiblePaths) {
    try {
      const addonsPath = path.join(basePath, 'Interface', 'AddOns');
      await fs.access(addonsPath);
      return { success: true, path: addonsPath };
    } catch {
      // Path doesn't exist, continue
    }
  }

  return { success: false, error: 'WoW installation not found' };
});

// ===== Helper Functions =====

function parseTocFile(addonName, tocContent, addonPath) {
  const lines = tocContent.split('\n');
  const addon = {
    name: addonName,
    title: addonName,
    version: 'Unknown',
    author: 'Unknown',
    description: '',
    path: addonPath
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('## Title:')) {
      addon.title = trimmed.replace('## Title:', '').trim();
    } else if (trimmed.startsWith('## Version:')) {
      addon.version = trimmed.replace('## Version:', '').trim();
    } else if (trimmed.startsWith('## Author:')) {
      addon.author = trimmed.replace('## Author:', '').trim();
    } else if (trimmed.startsWith('## Notes:')) {
      addon.description = trimmed.replace('## Notes:', '').trim();
    }
  }

  return addon;
}

// ===== Electron Window Setup =====

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    },
    autoHideMenuBar: true,
    backgroundColor: '#1a1a1a',
    show: false
  });

  const distPath = path.join(__dirname, 'dist', 'index.html');
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
