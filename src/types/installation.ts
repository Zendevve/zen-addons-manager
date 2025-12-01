export interface WowInstallation {
  id: string
  name: string
  version: string
  addonsPath: string
  executablePath?: string
  isActive: boolean
}

export const WOW_VERSIONS = [
  { value: '1.12', label: 'Vanilla (1.12)' },
  { value: '2.4.3', label: 'The Burning Crusade (2.4.3)' },
  { value: '3.3.5', label: 'Wrath of the Lich King (3.3.5)' },
  { value: '4.3.4', label: 'Cataclysm (4.3.4)' },
  { value: '5.4.8', label: 'Mists of Pandaria (5.4.8)' },
  { value: 'retail', label: 'Retail (Latest)' },
  { value: 'classic', label: 'Classic (Season of Discovery)' },
] as const
