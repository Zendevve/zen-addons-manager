import type { WowInstallation } from '@/types/installation'

const STORAGE_KEYS = {
  INSTALLATIONS: 'wow-installations',
  ACTIVE_INSTALLATION: 'active-installation-id',
  CLEAN_WDB: 'clean-wdb-on-launch',
} as const

export const storageService = {
  /**
   * Get all WoW installations
   */
  getInstallations(): WowInstallation[] {
    const stored = localStorage.getItem(STORAGE_KEYS.INSTALLATIONS)
    if (!stored) return []

    try {
      return JSON.parse(stored)
    } catch {
      return []
    }
  },

  /**
   * Save WoW installations
   */
  saveInstallations(installations: WowInstallation[]): void {
    localStorage.setItem(STORAGE_KEYS.INSTALLATIONS, JSON.stringify(installations))
  },

  /**
   * Add a new installation
   */
  addInstallation(installation: Omit<WowInstallation, 'id' | 'isActive'>): WowInstallation {
    const installations = this.getInstallations()
    const newInstallation: WowInstallation = {
      ...installation,
      id: crypto.randomUUID(),
      isActive: installations.length === 0, // First one is active by default
    }

    this.saveInstallations([...installations, newInstallation])
    return newInstallation
  },

  /**
   * Update an existing installation
   */
  updateInstallation(id: string, updates: Partial<WowInstallation>): void {
    const installations = this.getInstallations()
    const updated = installations.map(inst =>
      inst.id === id ? { ...inst, ...updates } : inst
    )
    this.saveInstallations(updated)
  },

  /**
   * Delete an installation
   */
  deleteInstallation(id: string): void {
    const installations = this.getInstallations()
    const filtered = installations.filter(inst => inst.id !== id)
    this.saveInstallations(filtered)
  },

  /**
   * Get active installation
   */
  getActiveInstallation(): WowInstallation | null {
    const installations = this.getInstallations()
    return installations.find(inst => inst.isActive) || installations[0] || null
  },

  /**
   * Set active installation
   */
  setActiveInstallation(id: string): void {
    const installations = this.getInstallations()
    const updated = installations.map(inst => ({
      ...inst,
      isActive: inst.id === id,
    }))
    this.saveInstallations(updated)
  },

  /**
   * Get WDB cleaning setting
   */
  getCleanWdb(): boolean {
    return localStorage.getItem(STORAGE_KEYS.CLEAN_WDB) === 'true'
  },

  /**
   * Set WDB cleaning setting
   */
  setCleanWdb(enabled: boolean): void {
    localStorage.setItem(STORAGE_KEYS.CLEAN_WDB, String(enabled))
  },
}
