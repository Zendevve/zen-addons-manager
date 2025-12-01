import type { Addon, ScanAddonsResult, InstallAddonParams, InstallAddonResult } from '@/types/addon'

// Electron IPC bridge (accessing window.electron or window.require)
declare global {
  interface Window {
    electron?: {
      invoke: (channel: string, ...args: any[]) => Promise<any>
    }
  }
}

// Helper to access IPC
const invoke = async (channel: string, ...args: any[]): Promise<any> => {
  if (window.electron?.invoke) {
    return window.electron.invoke(channel, ...args)
  }

  // Fallback for development/testing
  console.warn(`IPC call to ${channel} not available`)
  return { success: false, error: 'Electron IPC not available' }
}

export const electronService = {
  /**
   * Open a directory picker dialog
   */
  async openDirectoryDialog(): Promise<string | undefined> {
    return invoke('open-directory-dialog')
  },

  /**
   * Scan an addon folder for installed addons
   */
  async scanAddonFolder(folderPath: string): Promise<ScanAddonsResult> {
    return invoke('scan-addon-folder', folderPath)
  },

  /**
   * Install an addon from a URL (git or zip)
   */
  async installAddon(params: InstallAddonParams): Promise<InstallAddonResult> {
    return invoke('install-addon', params)
  },

  /**
   * Delete an addon folder
   */
  async deleteAddon(addonPath: string): Promise<{ success: boolean; error?: string }> {
    return invoke('delete-addon', addonPath)
  },

  /**
   * Toggle addon status (enable/disable)
   */
  async toggleAddon(addonPath: string, enable: boolean): Promise<{ success: boolean; error?: string }> {
    return invoke('toggle-addon', { path: addonPath, enable })
  },

  /**
   * Update addon (git pull)
   */
  async updateAddon(addonPath: string): Promise<{ success: boolean; error?: string }> {
    return invoke('git-pull', addonPath)
  },

  /**
   * Get available git branches for an addon
   */
  async getBranches(addonPath: string): Promise<{
    success: boolean
    branches?: string[]
    current?: string
    error?: string
  }> {
    return invoke('git-branches', addonPath)
  },

  /**
   * Switch git branch
   */
  async switchBranch(addonPath: string, branchName: string): Promise<{ success: boolean; error?: string }> {
    return invoke('git-checkout', { addonPath, branchName })
  },

  /**
   * Check for updates (git fetch)
   */
  async checkUpdates(addonPath: string): Promise<{
    success: boolean
    hasUpdates?: boolean
    behind?: number
    error?: string
  }> {
    return invoke('git-check-updates', addonPath)
  },

  /**
   * Auto-detect WoW installation folder
   */
  async autoDetectWowFolder(): Promise<{ success: boolean; path?: string; error?: string }> {
    return invoke('auto-detect-wow-folder')
  },
}
