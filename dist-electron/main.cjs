"use strict";
const electron = require("electron");
const child_process = require("child_process");
const path = require("path");
const fs = require("fs/promises");
const simpleGit = require("simple-git");
const AdmZip = require("adm-zip");
const axios = require("axios");
const os = require("os");
const url = require("url");
var _documentCurrentScript = typeof document !== "undefined" ? document.currentScript : null;
const { app, BrowserWindow, ipcMain, dialog, shell } = electron;
const __filename$1 = url.fileURLToPath(typeof document === "undefined" ? require("url").pathToFileURL(__filename).href : _documentCurrentScript && _documentCurrentScript.tagName.toUpperCase() === "SCRIPT" && _documentCurrentScript.src || new URL("main.cjs", document.baseURI).href);
const __dirname$1 = path.dirname(__filename$1);
function parseTocFile(addonName, tocContent, addonPath, status, stats) {
  const lines = tocContent.split("\n");
  const addon = {
    id: addonName,
    name: addonName,
    title: addonName,
    version: "Unknown",
    author: "Unknown",
    description: "",
    path: addonPath,
    status,
    lastUpdated: stats.mtime.toISOString()
  };
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("## Title:")) {
      addon.title = trimmed.replace("## Title:", "").trim();
    } else if (trimmed.startsWith("## Version:")) {
      addon.version = trimmed.replace("## Version:", "").trim();
    } else if (trimmed.startsWith("## Author:") || trimmed.startsWith("## Authors:")) {
      addon.author = trimmed.replace(/^## Authors?:/, "").trim();
    } else if (trimmed.startsWith("## X-Author:") || trimmed.startsWith("## X-Authors:")) {
      if (addon.author === "Unknown") {
        addon.author = trimmed.replace(/^## X-Authors?:/, "").trim();
      }
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
function mapInterfaceToVersion(interfaceVersion) {
  const versions = [];
  if (interfaceVersion >= 11200 && interfaceVersion < 2e4) versions.push("1.12");
  if (interfaceVersion >= 20400 && interfaceVersion < 3e4) versions.push("2.4.3");
  if (interfaceVersion >= 30300 && interfaceVersion < 4e4) versions.push("3.3.5");
  if (interfaceVersion >= 40300 && interfaceVersion < 5e4) versions.push("4.3.4");
  if (interfaceVersion >= 50400 && interfaceVersion < 1e5) versions.push("5.4.8");
  if (interfaceVersion >= 11e4) {
    versions.push("retail");
    versions.push("classic");
  }
  return versions;
}
async function fetchTocFromGithub(owner, repo) {
  try {
    const tocPatterns = [
      `${repo}.toc`,
      `${repo}_Vanilla.toc`,
      `${repo}_TBC.toc`,
      `${repo}_Wrath.toc`,
      `${repo}_Mainline.toc`
    ];
    for (const tocFile of tocPatterns) {
      try {
        const response = await axios.get(
          `https://api.github.com/repos/${owner}/${repo}/contents/${tocFile}`,
          {
            headers: {
              "Accept": "application/vnd.github.v3.raw",
              "User-Agent": "ZenAddonsManager"
            }
          }
        );
        if (response.data) {
          const content = response.data;
          const lines = content.split("\n");
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith("## Interface:")) {
              const interfaceStr = trimmed.replace("## Interface:", "").trim();
              const interfaceNum = parseInt(interfaceStr, 10);
              if (!isNaN(interfaceNum)) {
                return {
                  interface: interfaceNum,
                  versions: mapInterfaceToVersion(interfaceNum)
                };
              }
            }
          }
        }
      } catch {
        continue;
      }
    }
    return null;
  } catch {
    console.warn(`Failed to fetch TOC for ${owner}/${repo}`);
    return null;
  }
}
function parseGithubUrl(url2) {
  try {
    const treeMatch = url2.match(/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)/);
    if (treeMatch) {
      const [, user, repo, branch] = treeMatch;
      return {
        repoUrl: `https://github.com/${user}/${repo}.git`,
        branch
      };
    }
    const repoMatch = url2.match(/github\.com\/([^/]+)\/([^/]+?)(\.git)?$/);
    if (repoMatch) {
      const [, user, repo] = repoMatch;
      return {
        repoUrl: `https://github.com/${user}/${repo}.git`
      };
    }
    return { repoUrl: url2 };
  } catch {
    return { repoUrl: url2 };
  }
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
    const appPath = app.getAppPath();
    const indexPath = path.join(appPath, "dist", "index.html");
    console.log("Loading:", indexPath);
    win.loadFile(indexPath).catch((err) => {
      console.error("Failed to load:", err);
      const altPath = path.join(__dirname$1, "..", "dist", "index.html");
      console.log("Trying fallback:", altPath);
      win.loadFile(altPath).catch((err2) => {
        console.error("Fallback also failed:", err2);
      });
    });
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
  ipcMain.handle("open-file-dialog", async (event, filters) => {
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: filters || []
    });
    return result.filePaths[0];
  });
  ipcMain.handle("open-in-explorer", async (event, filePath) => {
    if (filePath) {
      shell.showItemInFolder(filePath);
      return true;
    }
    return false;
  });
  ipcMain.handle("install-addon-from-file", async (event, { filePath, addonsFolder }) => {
    const tempDir = path.join(os.tmpdir(), `zen-addon-local-${Date.now()}`);
    try {
      await fs.mkdir(tempDir, { recursive: true });
      const zip = new AdmZip(filePath);
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
      return { success: true, addonName: cleanName };
    } catch (error) {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {
      }
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("scan-addon-folder", async (event, folderPath) => {
    try {
      const addons = [];
      const entries = await fs.readdir(folderPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const addonPath = path.join(folderPath, entry.name);
          const tocPath = path.join(addonPath, `${entry.name}.toc`);
          const disabledTocPath = path.join(addonPath, `${entry.name}.toc.disabled`);
          let finalTocPath = tocPath;
          let status = "enabled";
          try {
            await fs.access(tocPath);
          } catch {
            try {
              await fs.access(disabledTocPath);
              finalTocPath = disabledTocPath;
              status = "disabled";
            } catch {
              continue;
            }
          }
          try {
            const stats = await fs.stat(finalTocPath);
            const tocContent = await fs.readFile(finalTocPath, "utf-8");
            const addon = parseTocFile(entry.name, tocContent, addonPath, status, stats);
            try {
              await fs.access(path.join(addonPath, ".git"));
              addon.source = "git";
              try {
                const git = simpleGit.simpleGit(addonPath);
                const branches = await git.branch();
                addon.branch = branches.current;
                try {
                  const remotes = await git.getRemotes(true);
                  if (remotes.length > 0) {
                    const remoteUrl = remotes[0].refs.fetch || remotes[0].refs.push;
                    if (remoteUrl) {
                      addon.sourceUrl = remoteUrl;
                      if (addon.author === "Unknown") {
                        const githubMatch = remoteUrl.match(/github\.com[:/]([^/]+)\//);
                        if (githubMatch) {
                          addon.author = githubMatch[1];
                        }
                      }
                    }
                  }
                } catch {
                }
              } catch {
              }
            } catch {
              addon.source = "zip";
            }
            addons.push(addon);
          } catch {
          }
        }
      }
      return { success: true, addons };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("toggle-addon", async (event, { path: addonPath, enable }) => {
    try {
      const dirName = path.basename(addonPath);
      const tocPath = path.join(addonPath, `${dirName}.toc`);
      const disabledTocPath = path.join(addonPath, `${dirName}.toc.disabled`);
      if (enable) {
        await fs.rename(disabledTocPath, tocPath);
      } else {
        await fs.rename(tocPath, disabledTocPath);
      }
      return { success: true };
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
  ipcMain.handle("update-all-addons", async (event, addonsFolder) => {
    try {
      const entries = await fs.readdir(addonsFolder, { withFileTypes: true });
      let successCount = 0;
      let failCount = 0;
      const errors = [];
      const gitAddons = [];
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const addonPath = path.join(addonsFolder, entry.name);
          try {
            await fs.access(path.join(addonPath, ".git"));
            gitAddons.push(addonPath);
          } catch {
          }
        }
      }
      if (gitAddons.length === 0) {
        return { success: true, updated: 0, failed: 0, errors: [] };
      }
      event.sender.send("addon-update-status", {
        type: "batch-start",
        total: gitAddons.length
      });
      const results = await Promise.all(gitAddons.map(async (addonPath, index) => {
        const addonId = path.basename(addonPath);
        try {
          event.sender.send("addon-update-status", {
            type: "update-start",
            addonId
          });
          const git = simpleGit.simpleGit(addonPath);
          await git.pull();
          event.sender.send("addon-update-status", {
            type: "update-success",
            addonId
          });
          return { success: true };
        } catch (error) {
          event.sender.send("addon-update-status", {
            type: "update-error",
            addonId,
            error: error.message
          });
          return { success: false, error: `${path.basename(addonPath)}: ${error.message}` };
        } finally {
          event.sender.send("addon-update-status", {
            type: "batch-progress",
            processed: index + 1,
            total: gitAddons.length
          });
        }
      }));
      results.forEach((res) => {
        if (res.success) successCount++;
        else {
          failCount++;
          if (res.error) errors.push(res.error);
        }
      });
      event.sender.send("addon-update-status", {
        type: "batch-complete",
        updated: successCount,
        failed: failCount
      });
      return { success: true, updated: successCount, failed: failCount, errors };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("search-github", async (event, query, category = "all") => {
    try {
      let searchTopics = [];
      switch (category) {
        case "weakauras":
          searchTopics = [
            `${query} topic:weakauras`,
            `${query} topic:weak-auras`,
            `${query} "WeakAuras"`
          ];
          break;
        case "plater":
          searchTopics = [
            `${query} topic:plater`,
            `${query} topic:plater-profile`,
            `${query} "Plater Nameplates"`
          ];
          break;
        case "elvui":
          searchTopics = [
            `${query} topic:elvui`,
            `${query} topic:elvui-plugin`,
            `${query} "ElvUI"`
          ];
          break;
        case "addon":
        default:
          searchTopics = [
            `${query} topic:wow-addon language:lua`,
            `${query} topic:world-of-warcraft language:lua`,
            `${query} topic:warcraft language:lua`,
            `${query} language:lua wow`
          ];
          break;
      }
      const searchPromises = searchTopics.map(
        (searchQuery) => axios.get("https://api.github.com/search/repositories", {
          params: {
            q: searchQuery,
            sort: "stars",
            order: "desc",
            per_page: 15
          },
          headers: {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "ZenAddonsManager"
          }
        }).catch((err) => {
          console.warn(`Search failed for: ${searchQuery}`, err.message);
          return { data: { items: [] } };
        })
      );
      const responses = await Promise.all(searchPromises);
      const seenRepos = /* @__PURE__ */ new Set();
      const allResults = [];
      for (const response of responses) {
        for (const item of response.data.items) {
          if (!seenRepos.has(item.full_name)) {
            seenRepos.add(item.full_name);
            allResults.push({
              name: item.name,
              full_name: item.full_name,
              description: item.description,
              url: item.clone_url,
              stars: item.stargazers_count,
              author: item.owner.login,
              updated_at: item.updated_at
            });
          }
        }
      }
      const results = allResults.sort((a, b) => b.stars - a.stars).slice(0, 30);
      const resultsWithVersions = await Promise.all(
        results.map(async (result) => {
          const tocInfo = await fetchTocFromGithub(result.author, result.name);
          return {
            ...result,
            interface: tocInfo?.interface,
            compatibleVersions: tocInfo?.versions || []
          };
        })
      );
      return { success: true, results: resultsWithVersions };
    } catch (error) {
      console.error("GitHub Search Error:", error.response?.data || error.message);
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
        const { repoUrl, branch } = parseGithubUrl(addonUrl);
        const git = simpleGit.simpleGit();
        const cloneOptions = branch ? ["--branch", branch] : [];
        await git.clone(repoUrl, tempDir, cloneOptions);
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
        const rootPath = basePath;
        const executables = ["Wow.exe", "WowClassic.exe", "WowT.exe", "WowB.exe"];
        let executablePath;
        for (const exe of executables) {
          try {
            await fs.access(path.join(rootPath, exe));
            executablePath = path.join(rootPath, exe);
            break;
          } catch {
          }
        }
        return { success: true, path: addonsPath, executablePath };
      } catch {
      }
    }
    return { success: false, error: "WoW installation not found" };
  });
  ipcMain.handle("launch-game", async (event, executablePath, cleanWdb) => {
    try {
      if (cleanWdb) {
        const gameDir = path.dirname(executablePath);
        const wdbPaths = [
          path.join(gameDir, "WDB"),
          path.join(gameDir, "Cache", "WDB"),
          path.join(gameDir, "Cache")
          // Retail/Classic often just use Cache
        ];
        for (const wdbPath of wdbPaths) {
          try {
            await fs.rm(wdbPath, { recursive: true, force: true });
            console.log(`Cleaned WDB/Cache: ${wdbPath}`);
          } catch (err) {
            console.error(`Failed to clean WDB: ${wdbPath}`, err);
          }
        }
      }
      const subprocess = child_process.spawn(executablePath, [], {
        detached: true,
        stdio: "ignore"
      });
      subprocess.unref();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("validate-wow-path", async (event, folderPath) => {
    const executables = ["Wow.exe", "WowClassic.exe", "WowT.exe", "WowB.exe"];
    let foundExecutable = null;
    for (const exe of executables) {
      try {
        await fs.access(path.join(folderPath, exe));
        foundExecutable = exe;
        break;
      } catch {
      }
    }
    if (foundExecutable) {
      const addonsPath = path.join(folderPath, "Interface", "AddOns");
      return { success: true, executablePath: path.join(folderPath, foundExecutable), addonsPath, version: foundExecutable };
    }
    return { success: false, error: "No WoW executable found in this folder" };
  });
  ipcMain.handle("get-locale-folders", async (event, wowPath) => {
    try {
      const dataPath = path.join(wowPath, "Data");
      const entries = await fs.readdir(dataPath, { withFileTypes: true });
      const locales = [];
      for (const entry of entries) {
        if (entry.isDirectory() && /^[a-z]{2}[A-Z]{2}$/.test(entry.name)) {
          locales.push(entry.name);
        }
      }
      return { success: true, locales };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("detect-connection-files", async (event, { wowPath, expansion }) => {
    try {
      const files = [];
      if (expansion === "5.4.8") {
        const configPath = path.join(wowPath, "WTF", "Config.wtf");
        try {
          const content = await fs.readFile(configPath, "utf-8");
          const match = content.match(/SET\s+portal\s+["']?([^"'\r\n]*)["']?/i);
          files.push({
            type: "config",
            path: configPath,
            currentValue: match ? match[1].trim() : void 0
          });
        } catch {
          files.push({
            type: "config",
            path: configPath,
            currentValue: void 0
          });
        }
      } else {
        const dataPath = path.join(wowPath, "Data");
        if (expansion === "1.12") {
          const rootRealmlist = path.join(wowPath, "realmlist.wtf");
          try {
            const content = await fs.readFile(rootRealmlist, "utf-8");
            const match = content.match(/set\s+realmlist\s+["']?([^"'\r\n]+)["']?/i);
            files.push({
              type: "realmlist",
              path: rootRealmlist,
              currentValue: match ? match[1].trim() : void 0
            });
          } catch {
          }
        }
        try {
          const entries = await fs.readdir(dataPath, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isDirectory() && /^[a-z]{2}[A-Z]{2}$/.test(entry.name)) {
              const realmlistPath = path.join(dataPath, entry.name, "realmlist.wtf");
              try {
                const content = await fs.readFile(realmlistPath, "utf-8");
                const match = content.match(/set\s+realmlist\s+["']?([^"'\r\n]+)["']?/i);
                files.push({
                  type: "realmlist",
                  path: realmlistPath,
                  locale: entry.name,
                  currentValue: match ? match[1].trim() : void 0
                });
              } catch {
              }
            }
          }
        } catch {
        }
      }
      return { success: true, files };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("detect-custom-patcher", async (event, wowPath) => {
    const knownPatchers = [
      "connection_patcher.exe",
      "WoW_Patched.exe",
      "Wow-64.exe",
      "arctium_launcher.exe"
    ];
    try {
      for (const patcher of knownPatchers) {
        const patcherPath = path.join(wowPath, patcher);
        try {
          await fs.access(patcherPath);
          return {
            success: true,
            found: true,
            path: patcherPath,
            type: patcher.replace(".exe", "").replace("_", "-")
          };
        } catch {
        }
      }
      return { success: true, found: false };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
  ipcMain.handle("inject-server-profile", async (event, {
    wowPath,
    expansion,
    connectionString
  }) => {
    try {
      const modifiedFiles = [];
      const warnings = [];
      if (expansion === "5.4.8") {
        const wtfPath = path.join(wowPath, "WTF");
        const configPath = path.join(wtfPath, "Config.wtf");
        await fs.mkdir(wtfPath, { recursive: true });
        let content = "";
        try {
          content = await fs.readFile(configPath, "utf-8");
        } catch {
          warnings.push("Created new Config.wtf");
        }
        const lines = content.split("\n");
        let found = false;
        const newLines = lines.map((line) => {
          if (line.trim().toLowerCase().startsWith("set portal")) {
            found = true;
            return `SET portal "${connectionString}"`;
          }
          return line;
        });
        if (!found) {
          newLines.push(`SET portal "${connectionString}"`);
        }
        await fs.writeFile(configPath, newLines.join("\n"), "utf-8");
        modifiedFiles.push(configPath);
      } else {
        const dataPath = path.join(wowPath, "Data");
        if (expansion === "1.12") {
          const rootRealmlist = path.join(wowPath, "realmlist.wtf");
          let content = "";
          try {
            content = await fs.readFile(rootRealmlist, "utf-8");
          } catch {
            warnings.push("Created new realmlist.wtf in root");
          }
          const lines = content.split("\n");
          let found = false;
          const newLines = lines.map((line) => {
            if (line.trim().toLowerCase().startsWith("set realmlist")) {
              found = true;
              return `set realmlist ${connectionString}`;
            }
            return line;
          });
          if (!found) {
            newLines.push(`set realmlist ${connectionString}`);
          }
          await fs.writeFile(rootRealmlist, newLines.join("\n"), "utf-8");
          modifiedFiles.push(rootRealmlist);
        }
        try {
          const entries = await fs.readdir(dataPath, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isDirectory() && /^[a-z]{2}[A-Z]{2}$/.test(entry.name)) {
              const realmlistPath = path.join(dataPath, entry.name, "realmlist.wtf");
              let content = "";
              try {
                content = await fs.readFile(realmlistPath, "utf-8");
              } catch {
                warnings.push(`Created new realmlist.wtf in ${entry.name}`);
              }
              const lines = content.split("\n");
              let found = false;
              const newLines = lines.map((line) => {
                if (line.trim().toLowerCase().startsWith("set realmlist")) {
                  found = true;
                  return `set realmlist ${connectionString}`;
                }
                return line;
              });
              if (!found) {
                newLines.push(`set realmlist ${connectionString}`);
              }
              await fs.writeFile(realmlistPath, newLines.join("\n"), "utf-8");
              modifiedFiles.push(realmlistPath);
            }
          }
        } catch (error) {
          warnings.push(`Could not access Data folder: ${error.message}`);
        }
      }
      return { success: true, modifiedFiles, warnings };
    } catch (error) {
      return { success: false, error: error.message };
    }
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
