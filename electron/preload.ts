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
    ]

    if (validChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args)
    }

    throw new Error(`Invalid IPC channel: ${channel}`)
  },
})
