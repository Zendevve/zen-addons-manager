export interface Addon {
  id: string
  name: string
  title: string
  version: string
  author: string
  description: string
  path: string
  status: 'enabled' | 'disabled' | 'outdated'
  lastUpdated: string
  source?: 'git' | 'zip'
  sourceUrl?: string
  branch?: string
  availableBranches?: string[]
}

export interface AddonStats {
  total: number
  enabled: number
  disabled: number
  outdated: number
}

export interface ScanAddonsResult {
  success: boolean
  addons?: Addon[]
  error?: string
}

export interface InstallAddonParams {
  url: string
  addonsFolder: string
  method: 'git' | 'zip'
}

export interface InstallAddonResult {
  success: boolean
  addonName?: string
  addonPath?: string
  error?: string
}
