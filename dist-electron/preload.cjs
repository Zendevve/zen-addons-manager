"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electron", {
  invoke: (channel, ...args) => {
    const validChannels = [
      "open-directory-dialog",
      "scan-addon-folder",
      "install-addon",
      "delete-addon",
      "toggle-addon",
      "git-pull",
      "git-branches",
      "git-checkout",
      "git-check-updates",
      "auto-detect-wow-folder",
      "search-github",
      "update-all-addons",
      "open-file-dialog",
      "install-addon-from-file",
      "open-in-explorer",
      "launch-game",
      "validate-wow-path"
    ];
    if (validChannels.includes(channel)) {
      return electron.ipcRenderer.invoke(channel, ...args);
    }
    throw new Error(`Invalid IPC channel: ${channel}`);
  },
  on: (channel, func) => {
    const validChannels = ["addon-update-status"];
    if (validChannels.includes(channel)) {
      electron.ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
  off: (channel, func) => {
    const validChannels = ["addon-update-status"];
    if (validChannels.includes(channel)) {
      electron.ipcRenderer.removeListener(channel, (event, ...args) => func(...args));
    }
  }
});
