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
      "auto-detect-wow-folder"
    ];
    if (validChannels.includes(channel)) {
      return electron.ipcRenderer.invoke(channel, ...args);
    }
    throw new Error(`Invalid IPC channel: ${channel}`);
  }
});
