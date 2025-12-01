import electron from 'electron';
const { app, BrowserWindow, ipcMain, dialog } = electron;
import path from 'path';
import fs from 'fs/promises';
import { simpleGit } from 'simple-git';
import AdmZip from 'adm-zip';
import axios from 'axios';
import os from 'os';
import { fileURLToPath } from 'url';

// Helper for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Types
// Types
interface Addon {
  id: string;
  name: string;
  title: string;
  version: string;
  author: string;
  description: string;
  path: string;
  status: 'enabled' | 'disabled' | 'outdated';
  lastUpdated: string;
  source?: 'git' | 'zip';
  branch?: string;
}

// ===== Helper Functions =====

function parseTocFile(addonName: string, tocContent: string, addonPath: string, status: 'enabled' | 'disabled', stats: fs.Stats): Addon {
  const lines = tocContent.split('\n');
  const addon: Addon = {
    id: addonName,
    name: addonName,
    title: addonName,
    version: 'Unknown',
    author: 'Unknown',
    description: '',
    path: addonPath,
    status,
    lastUpdated: stats.mtime.toISOString()
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

  // Check for git
  try {
    const gitPath = path.join(addonPath, '.git');
    // We can't easily check sync here, but we'll assume if .git exists it's git
    // For now, we'll leave source undefined and let the scanner fill it if needed
    // or we can check it in the scanner loop
  } catch { }

  return addon;
}

// Find .toc file recursively
async function findTocFile(dirPath: string): Promise<{ tocPath: string; tocName: string } | null> {
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

// ===== Electron Window Setup =====

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    },
    autoHideMenuBar: true,
    backgroundColor: '#1a1a1a',
    show: false
  });

  // Development or Production
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools();
  } else {
    // In production, the React app is built to dist/index.html
    // We need to point to that file.
    // Assuming main.js is in dist-electron/main.js and index.html is in dist/index.html
    // So we go up one level and into dist
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  win.once('ready-to-show', () => {
    win.show();
  });
}

function setupIpcHandlers() {
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
      const addons: Addon[] = [];
      const entries = await fs.readdir(folderPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const addonPath = path.join(folderPath, entry.name);
          const tocPath = path.join(addonPath, `${entry.name}.toc`);
          const disabledTocPath = path.join(addonPath, `${entry.name}.toc.disabled`);

          let finalTocPath = tocPath;
          let status: 'enabled' | 'disabled' = 'enabled';

          try {
            await fs.access(tocPath);
          } catch {
            // Try disabled
            try {
              await fs.access(disabledTocPath);
              finalTocPath = disabledTocPath;
              status = 'disabled';
            } catch {
              // Neither exists
              continue;
            }
          }

          try {
            const stats = await fs.stat(finalTocPath);
            const tocContent = await fs.readFile(finalTocPath, 'utf-8');
            const addon = parseTocFile(entry.name, tocContent, addonPath, status, stats);

            // Check if it's a git repo
            try {
              await fs.access(path.join(addonPath, '.git'));
              addon.source = 'git';

              // Get current branch
              try {
                const git = simpleGit(addonPath);
                const branches = await git.branch();
                addon.branch = branches.current;
              } catch { }
            } catch {
              addon.source = 'zip';
            }

            addons.push(addon);
          } catch (err) {
            // Error reading
          }
        }
      }

      return { success: true, addons };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Toggle Addon (Enable/Disable)
  ipcMain.handle('toggle-addon', async (event, { path: addonPath, enable }) => {
    try {
      const dirName = path.basename(addonPath);
      const tocPath = path.join(addonPath, `${dirName}.toc`);
      const disabledTocPath = path.join(addonPath, `${dirName}.toc.disabled`);

      if (enable) {
        // Rename .toc.disabled -> .toc
        await fs.rename(disabledTocPath, tocPath);
      } else {
        // Rename .toc -> .toc.disabled
        await fs.rename(tocPath, disabledTocPath);
      }
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Clone Git repository
  ipcMain.handle('git-clone', async (event, { repoUrl, targetPath, branchName }) => {
    try {
      const git = simpleGit();
      await git.clone(repoUrl, targetPath, branchName ? ['--branch', branchName] : []);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Pull latest changes
  ipcMain.handle('git-pull', async (event, addonPath) => {
    try {
      const git = simpleGit(addonPath);
      await git.pull();
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Switch branch
  ipcMain.handle('git-checkout', async (event, { addonPath, branchName }) => {
    try {
      const git = simpleGit(addonPath);
      await git.checkout(branchName);
      return { success: true };
    } catch (error: any) {
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
    } catch (error: any) {
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
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Delete addon folder
  ipcMain.handle('delete-addon', async (event, addonPath) => {
    try {
      await fs.rm(addonPath, { recursive: true, force: true });
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  });

  // Install addon from URL (with cross-drive fix)
  ipcMain.handle('install-addon', async (event, { url: addonUrl, addonsFolder, method }) => {
    const tempDir = path.join(os.tmpdir(), `zen-addon-${Date.now()}`);

    try {
      await fs.mkdir(tempDir, { recursive: true });

      if (method === 'git') {
        const git = simpleGit();
        await git.clone(addonUrl, tempDir);

        const fixResult = await findTocFile(tempDir);
        if (!fixResult) {
          throw new Error('No .toc file found after cloning');
        }

        const finalPath = path.join(addonsFolder, fixResult.tocName);

        try {
          await fs.access(finalPath);
          return { success: false, error: `Addon "${fixResult.tocName}" already installed` };
        } catch {
          // Doesn't exist, proceed
        }

        const tocDir = path.dirname(path.join(tempDir, fixResult.tocPath.replace(tempDir, '')));
        try {
          await fs.rename(tocDir, finalPath);
        } catch (error: any) {
          if (error.code === 'EXDEV') {
            await fs.cp(tocDir, finalPath, { recursive: true });
            await fs.rm(tocDir, { recursive: true, force: true });
          } else {
            throw error;
          }
        }

        await fs.rm(tempDir, { recursive: true, force: true });
        return { success: true, addonName: fixResult.tocName, addonPath: finalPath };

      } else {
        const zipPath = path.join(tempDir, 'addon.zip');
        const downloadResult = await axios({
          method: 'GET',
          url: addonUrl,
          responseType: 'arraybuffer'
        });

        await fs.writeFile(zipPath, downloadResult.data);

        const zip = new AdmZip(zipPath);
        const extractPath = path.join(tempDir, 'extracted');
        zip.extractAllTo(extractPath, true);

        const entries = await fs.readdir(extractPath, { withFileTypes: true });
        let addonFolder = extractPath;

        if (entries.length === 1 && entries[0].isDirectory()) {
          addonFolder = path.join(extractPath, entries[0].name);
        }

        const tocInfo = await findTocFile(addonFolder);
        if (!tocInfo) {
          throw new Error('No .toc file found in ZIP');
        }

        let cleanName = tocInfo.tocName;
        const tocDir = path.dirname(tocInfo.tocPath);
        const currentName = path.basename(tocDir);

        const suffixes = ['-master', '-main', '-develop', '-trunk'];
        for (const suffix of suffixes) {
          if (currentName.endsWith(suffix)) {
            cleanName = currentName.replace(suffix, '');
            break;
          }
        }

        const finalPath = path.join(addonsFolder, cleanName);

        try {
          await fs.access(finalPath);
          return { success: false, error: `Addon "${cleanName}" already installed` };
        } catch {
          // Doesn't exist, proceed
        }

        const renamedPath = path.join(path.dirname(tocDir), cleanName);
        if (tocDir !== renamedPath) {
          await fs.rename(tocDir, renamedPath);
        }

        try {
          await fs.rename(renamedPath, finalPath);
        } catch (error: any) {
          if (error.code === 'EXDEV') {
            await fs.cp(renamedPath, finalPath, { recursive: true });
            await fs.rm(renamedPath, { recursive: true, force: true });
          } else {
            throw error;
          }
        }

        await fs.rm(tempDir, { recursive: true, force: true });
        return { success: true, addonName: cleanName, addonPath: finalPath };
      }
    } catch (error: any) {
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
}

app.on('ready', () => {
  setupIpcHandlers();
  createWindow();
});

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
