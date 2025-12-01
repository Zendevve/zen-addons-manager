"use strict";
const electron = require("electron");
const path = require("path");
const fs = require("fs/promises");
const simpleGit = require("simple-git");
const AdmZip = require("adm-zip");
const axios = require("axios");
const os = require("os");
const url = require("url");
var _documentCurrentScript = typeof document !== "undefined" ? document.currentScript : null;
const { app, BrowserWindow, ipcMain, dialog } = electron;
const __filename$1 = url.fileURLToPath(typeof document === "undefined" ? require("url").pathToFileURL(__filename).href : _documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === "SCRIPT" && _documentCurrentScript.src || new URL("main.cjs", document.baseURI).href);
const __dirname$1 = path.dirname(__filename$1);
function parseTocFile(addonName, tocContent, addonPath) {
  const lines = tocContent.split("\n");
  const addon = {
    name: addonName,
    title: addonName,
    version: "Unknown",
    author: "Unknown",
    description: "",
    path: addonPath
  };
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("## Title:")) {
      addon.title = trimmed.replace("## Title:", "").trim();
    } else if (trimmed.startsWith("## Version:")) {
      addon.version = trimmed.replace("## Version:", "").trim();
    } else if (trimmed.startsWith("## Author:")) {
      addon.author = trimmed.replace("## Author:", "").trim();
    } else if (trimmed.startsWith("## Notes:")) {
      addon.description = trimmed.replace("## Notes:", "").trim();
    }
  }
  return addon;
}
async function findTocFile(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isFile() && entry.name.endsWith(".toc")) {
      return { tocPath: fullPath, tocName: entry.name.replace(".toc", "") };
    }
    if (entry.isDirectory()) {
      const result = await findTocFile(fullPath);
      if (result) return result;
    }
  }
  return null;
}
function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname$1, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    },
    autoHideMenuBar: true,
    backgroundColor: "#1a1a1a",
    show: false
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL);
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname$1, "../dist/index.html"));
  }
  win.once("ready-to-show", () => {
    win.show();
  });
}
function setupIpcHandlers() {
  ipcMain.handle("open-directory-dialog", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"]
    });
    return result.filePaths[0];
  });
  ipcMain.handle("scan-addon-folder", async (event, folderPath) => {
    try {
      const addons = [];
      const entries = await fs.readdir(folderPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const addonPath = path.join(folderPath, entry.name);
          const tocPath = path.join(addonPath, `${entry.name}.toc`);
          try {
            await fs.access(tocPath);
            const tocContent = await fs.readFile(tocPath, "utf-8");
            const addon = parseTocFile(entry.name, tocContent, addonPath);
            addons.push(addon);
          } catch (err) {
          }
        }
      }
      return { success: true, addons };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("git-clone", async (event, { repoUrl, targetPath, branchName }) => {
    try {
      const git = simpleGit.simpleGit();
      await git.clone(repoUrl, targetPath, branchName ? ["--branch", branchName] : []);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("git-pull", async (event, addonPath) => {
    try {
      const git = simpleGit.simpleGit(addonPath);
      await git.pull();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("git-checkout", async (event, { addonPath, branchName }) => {
    try {
      const git = simpleGit.simpleGit(addonPath);
      await git.checkout(branchName);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("git-branches", async (event, addonPath) => {
    try {
      const git = simpleGit.simpleGit(addonPath);
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
  ipcMain.handle("git-check-updates", async (event, addonPath) => {
    try {
      const git = simpleGit.simpleGit(addonPath);
      await git.fetch();
      const status = await git.status();
      const hasUpdates = status.behind > 0;
      return { success: true, hasUpdates, behind: status.behind };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("delete-addon", async (event, addonPath) => {
    try {
      await fs.rm(addonPath, { recursive: true, force: true });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("install-addon", async (event, { url: addonUrl, addonsFolder, method }) => {
    const tempDir = path.join(os.tmpdir(), `zen-addon-${Date.now()}`);
    try {
      await fs.mkdir(tempDir, { recursive: true });
      if (method === "git") {
        const git = simpleGit.simpleGit();
        await git.clone(addonUrl, tempDir);
        const fixResult = await findTocFile(tempDir);
        if (!fixResult) {
          throw new Error("No .toc file found after cloning");
        }
        const finalPath = path.join(addonsFolder, fixResult.tocName);
        try {
          await fs.access(finalPath);
          return { success: false, error: `Addon "${fixResult.tocName}" already installed` };
        } catch {
        }
        const tocDir = path.dirname(path.join(tempDir, fixResult.tocPath.replace(tempDir, "")));
        try {
          await fs.rename(tocDir, finalPath);
        } catch (error) {
          if (error.code === "EXDEV") {
            await fs.cp(tocDir, finalPath, { recursive: true });
            await fs.rm(tocDir, { recursive: true, force: true });
          } else {
            throw error;
          }
        }
        await fs.rm(tempDir, { recursive: true, force: true });
        return { success: true, addonName: fixResult.tocName, addonPath: finalPath };
      } else {
        const zipPath = path.join(tempDir, "addon.zip");
        const downloadResult = await axios({
          method: "GET",
          url: addonUrl,
          responseType: "arraybuffer"
        });
        await fs.writeFile(zipPath, downloadResult.data);
        const zip = new AdmZip(zipPath);
        const extractPath = path.join(tempDir, "extracted");
        zip.extractAllTo(extractPath, true);
        const entries = await fs.readdir(extractPath, { withFileTypes: true });
        let addonFolder = extractPath;
        if (entries.length === 1 && entries[0].isDirectory()) {
          addonFolder = path.join(extractPath, entries[0].name);
        }
        const tocInfo = await findTocFile(addonFolder);
        if (!tocInfo) {
          throw new Error("No .toc file found in ZIP");
        }
        let cleanName = tocInfo.tocName;
        const tocDir = path.dirname(tocInfo.tocPath);
        const currentName = path.basename(tocDir);
        const suffixes = ["-master", "-main", "-develop", "-trunk"];
        for (const suffix of suffixes) {
          if (currentName.endsWith(suffix)) {
            cleanName = currentName.replace(suffix, "");
            break;
          }
        }
        const finalPath = path.join(addonsFolder, cleanName);
        try {
          await fs.access(finalPath);
          return { success: false, error: `Addon "${cleanName}" already installed` };
        } catch {
        }
        const renamedPath = path.join(path.dirname(tocDir), cleanName);
        if (tocDir !== renamedPath) {
          await fs.rename(tocDir, renamedPath);
        }
        try {
          await fs.rename(renamedPath, finalPath);
        } catch (error) {
          if (error.code === "EXDEV") {
            await fs.cp(renamedPath, finalPath, { recursive: true });
            await fs.rm(renamedPath, { recursive: true, force: true });
          } else {
            throw error;
          }
        }
        await fs.rm(tempDir, { recursive: true, force: true });
        return { success: true, addonName: cleanName, addonPath: finalPath };
      }
    } catch (error) {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {
      }
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("auto-detect-wow-folder", async () => {
    const possiblePaths = [
      "C:/Program Files (x86)/World of Warcraft",
      "C:/Program Files/World of Warcraft",
      "D:/Games/World of Warcraft",
      "D:/Games/WoW",
      "C:/Games/World of Warcraft",
      "E:/Games/World of Warcraft"
    ];
    for (const basePath of possiblePaths) {
      try {
        const addonsPath = path.join(basePath, "Interface", "AddOns");
        await fs.access(addonsPath);
        return { success: true, path: addonsPath };
      } catch {
      }
    }
    return { success: false, error: "WoW installation not found" };
  });
}
app.on("ready", () => {
  setupIpcHandlers();
  createWindow();
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
