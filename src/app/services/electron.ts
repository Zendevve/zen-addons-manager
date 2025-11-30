import { Injectable } from '@angular/core';

declare global {
  interface Window {
    require: any;
  }
}

@Injectable({
  providedIn: 'root',
})
export class ElectronService {
  private ipcRenderer: any;

  constructor() {
    // Check if running in Electron
    if (this.isElectron()) {
      this.ipcRenderer = window.require('electron').ipcRenderer;
    }
  }

  isElectron(): boolean {
    return !!(window && window.require);
  }

  // ===== Directory Operations =====

  async openDirectoryDialog(): Promise<string | undefined> {
    if (!this.isElectron()) {
      console.warn('Not running in Electron');
      return undefined;
    }
    return await this.ipcRenderer.invoke('open-directory-dialog');
  }

  async scanAddonFolder(folderPath: string): Promise<{ success: boolean; addons?: any[]; error?: string }> {
    if (!this.isElectron()) {
      return { success: false, error: 'Not running in Electron' };
    }
    return await this.ipcRenderer.invoke('scan-addon-folder', folderPath);
  }

  async deleteAddon(addonPath: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isElectron()) {
      return { success: false, error: 'Not running in Electron' };
    }
    return await this.ipcRenderer.invoke('delete-addon', addonPath);
  }

  // ===== Git Operations =====

  async gitClone(repoUrl: string, targetPath: string, branchName?: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isElectron()) {
      return { success: false, error: 'Not running in Electron' };
    }
    return await this.ipcRenderer.invoke('git-clone', { repoUrl, targetPath, branchName });
  }

  async gitPull(addonPath: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isElectron()) {
      return { success: false, error: 'Not running in Electron' };
    }
    return await this.ipcRenderer.invoke('git-pull', addonPath);
  }

  async gitCheckout(addonPath: string, branchName: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isElectron()) {
      return { success: false, error: 'Not running in Electron' };
    }
    return await this.ipcRenderer.invoke('git-checkout', { addonPath, branchName });
  }

  async gitBranches(addonPath: string): Promise<{ success: boolean; branches?: string[]; current?: string; error?: string }> {
    if (!this.isElectron()) {
      return { success: false, error: 'Not running in Electron' };
    }
    return await this.ipcRenderer.invoke('git-branches', addonPath);
  }

  async gitCheckUpdates(addonPath: string): Promise<{ success: boolean; hasUpdates?: boolean; behind?: number; error?: string }> {
    if (!this.isElectron()) {
      return { success: false, error: 'Not running in Electron' };
    }
    return await this.ipcRenderer.invoke('git-check-updates', addonPath);
  }

  // ===== Smart Installer =====

  async installAddon(url: string, addonsFolder: string, method: 'git' | 'zip'): Promise<{ success: boolean; addonName?: string; addonPath?: string; error?: string }> {
    if (!this.isElectron()) {
      return { success: false, error: 'Not running in Electron' };
    }
    return await this.ipcRenderer.invoke('install-addon', { url, addonsFolder, method });
  }

  async validateAddon(addonPath: string): Promise<{ success: boolean; valid?: boolean; error?: string }> {
    if (!this.isElectron()) {
      return { success: false, error: 'Not running in Electron' };
    }
    return await this.ipcRenderer.invoke('validate-addon', addonPath);
  }

  async autoDetectWowFolder(): Promise<{ success: boolean; path?: string; error?: string }> {
    if (!this.isElectron()) {
      return { success: false, error: 'Not running in Electron' };
    }
    return await this.ipcRenderer.invoke('auto-detect-wow-folder');
  }
}
