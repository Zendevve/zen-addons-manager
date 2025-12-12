import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  invoke: (channel: string, ...args: any[]) => {
    // Whitelist of allowed channels
    const validChannels = [
      'open-directory-dialog',
      'scan-addon-folder',
      'install-addon',
      'delete-addon',
      'toggle-addon',
      'git-pull',
      'git-branches',
      'git-checkout',
      'git-check-updates',
      'auto-detect-wow-folder',
      'search-github',
      'update-all-addons',
      'open-file-dialog',
      'install-addon-from-file',
      'open-in-explorer',
      'launch-game',
      'validate-wow-path'
    ]

    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args)
    }

    throw new Error(`Invalid IPC channel: ${channel}`)
  },
  on: (channel: string, func: (...args: any[]) => void) => {
    const validChannels = ['addon-update-status'];
    if (validChannels.includes(channel)) {
      // Deliberately strip event as it includes `sender`
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    }
  },
  off: (channel: string, func: (...args: any[]) => void) => {
    const validChannels = ['addon-update-status'];
    if (validChannels.includes(channel)) {
      ipcRenderer.removeListener(channel, (event, ...args) => func(...args));
    }
  }
})
