import { useState, useEffect } from 'react'
import { Activity, Wallet, Server, ChevronDown, Play } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { storageService } from '@/services/storage'
import { electronService } from '@/services/electron'
import type { WowInstallation } from '@/types/installation'
import type { ServerProfile } from '@/types/server-profile'
import { WOW_VERSIONS } from '@/types/installation'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface RightSidebarProps {
  className?: string
  installation?: WowInstallation | null
}

export function RightSidebar({ className, installation }: RightSidebarProps) {
  const [internalInstallation, setInternalInstallation] = useState<WowInstallation | null>(null)
  const [profiles, setProfiles] = useState<ServerProfile[]>([])
  const [activeProfile, setActiveProfile] = useState<ServerProfile | null>(null)
  const [isLaunching, setIsLaunching] = useState(false)

  const activeInstallation = installation !== undefined ? installation : internalInstallation

  useEffect(() => {
    const loadData = () => {
      if (installation === undefined) {
        const inst = storageService.getActiveInstallation()
        if (inst) setInternalInstallation(inst)
      }
      setProfiles(storageService.getServerProfiles())
      setActiveProfile(storageService.getActiveServerProfile())
    }

    loadData()

    window.addEventListener('storage', loadData)
    return () => window.removeEventListener('storage', loadData)
  }, [installation])

  const handleProfileSwitch = (profile: ServerProfile) => {
    storageService.setActiveServerProfile(profile.id)
    setActiveProfile(profile)
    toast.success(`Switched to ${profile.name}`)
  }

  const handleLaunch = async () => {
    if (!activeInstallation?.executablePath) {
      toast.error('No WoW executable configured')
      return
    }

    setIsLaunching(true)
    try {
      // If we have an active profile, inject the connection string first
      if (activeProfile) {
        const installPath = activeInstallation.addonsPath.replace(/[/\\]Interface[/\\]AddOns\/?$/, '')
        const injectResult = await electronService.injectServerProfile(
          installPath,
          activeProfile.expansion,
          activeProfile.connectionString
        )

        if (!injectResult.success) {
          toast.error(`Failed to inject profile: ${injectResult.error}`)
          setIsLaunching(false)
          return
        }

        if (injectResult.warnings && injectResult.warnings.length > 0) {
          injectResult.warnings.forEach(w => toast.warning(w))
        }
      }

      // Launch the game
      const cleanWdb = storageService.getCleanWdb()
      const result = await electronService.launchGame(activeInstallation.executablePath, cleanWdb)

      if (result.success) {
        toast.success(`Launching ${activeProfile?.name || activeInstallation.name}...`)
      } else {
        toast.error(result.error || 'Failed to launch game')
      }
    } finally {
      setIsLaunching(false)
    }
  }

  const getVersionLogo = (version?: string) => {
    switch (version) {
      case '1.12': return '/logos/vanilla.png'
      case '2.4.3': return '/logos/tbc.png'
      case '3.3.5': return '/logos/wrath.png'
      case '4.3.4': return '/logos/cataclysm.png'
      case '5.4.8': return '/logos/pandaria.png'
      default: return null
    }
  }

  const currentProfiles = profiles.filter(p => p.installationId === activeInstallation?.id)

  return (
    <div className={cn("w-80 border-l border-border bg-card/30 p-6 hidden xl:block", className)}>
      {/* Current Profile / Installation */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Playing as</h3>
        </div>
        <div className="p-4 rounded-lg bg-card border border-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="size-10 rounded-xl overflow-hidden shadow-sm">
              {(() => {
                const version = activeProfile?.expansion || activeInstallation?.version
                const logoPath = getVersionLogo(version)
                return logoPath ? (
                  <img src={logoPath} alt={activeProfile?.name || activeInstallation?.name || 'Instance'} className="size-full object-cover" />
                ) : (
                  <div className="size-full rounded bg-primary/20 flex items-center justify-center">
                    <Activity className="size-5 text-primary" />
                  </div>
                )
              })()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">
                {activeProfile?.name || activeInstallation?.name || 'No Profile'}
              </div>
              <div className="text-xs text-muted-foreground">
                {activeProfile
                  ? activeProfile.connectionString
                  : WOW_VERSIONS.find(v => v.value === activeInstallation?.version)?.label || 'Unknown'}
              </div>
            </div>
          </div>

          {/* Quick Switch Dropdown */}
          {currentProfiles.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-between mb-2">
                  <span className="flex items-center gap-2">
                    <Server className="size-4" />
                    Switch Server
                  </span>
                  <ChevronDown className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuLabel>Server Profiles</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {currentProfiles.map((profile) => (
                  <DropdownMenuItem
                    key={profile.id}
                    onClick={() => handleProfileSwitch(profile)}
                    className={cn(
                      "flex items-center gap-2",
                      profile.id === activeProfile?.id && "bg-primary/10"
                    )}
                  >
                    {(() => {
                      const logo = getVersionLogo(profile.expansion)
                      return logo ? (
                        <img src={logo} alt="" className="size-5 rounded" />
                      ) : (
                        <Server className="size-5 text-muted-foreground" />
                      )
                    })()}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{profile.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {profile.connectionString}
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Launch Button */}
          <Button
            className="w-full"
            onClick={handleLaunch}
            disabled={isLaunching || !activeInstallation?.executablePath}
          >
            <Play className="mr-2 size-4" />
            {isLaunching ? 'Launching...' : 'Play'}
          </Button>
        </div>
      </div>

      {/* News Section */}
      <div>
        <h3 className="font-semibold mb-4">News</h3>
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/10">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="size-4 text-primary" />
              <span className="text-xs font-medium text-primary">Update</span>
            </div>
            <h4 className="font-bold mb-1">ZenAddons v1.0</h4>
            <p className="text-xs text-muted-foreground mb-3">
              Manage your addons with ease.
            </p>
            <Button size="sm" className="w-full">Read more</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

