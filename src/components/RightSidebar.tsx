import { useState, useEffect } from 'react'
import { Activity, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { storageService } from '@/services/storage'
import type { WowInstallation } from '@/types/installation'
import { WOW_VERSIONS } from '@/types/installation'
import { cn } from '@/lib/utils'

interface RightSidebarProps {
  className?: string
  installation?: WowInstallation | null
}

export function RightSidebar({ className, installation }: RightSidebarProps) {
  const [internalInstallation, setInternalInstallation] = useState<WowInstallation | null>(null)

  const activeInstallation = installation !== undefined ? installation : internalInstallation

  useEffect(() => {
    if (installation !== undefined) return

    const loadProfile = () => {
      const inst = storageService.getActiveInstallation()
      if (inst) {
        setInternalInstallation(inst)
      }
    }

    loadProfile()

    window.addEventListener('storage', loadProfile)
    return () => window.removeEventListener('storage', loadProfile)
  }, [installation])

  return (
    <div className={cn("w-80 border-l border-border bg-card/30 p-6 hidden xl:block", className)}>
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Playing as</h3>
        </div>
        <div className="p-4 rounded-lg bg-card border border-border flex items-center gap-3">
          <div className="size-10 rounded-xl overflow-hidden shadow-sm">
            {(() => {
              const logoPath = (() => {
                switch (activeInstallation?.version) {
                  case '1.12': return '/logos/vanilla.png'
                  case '2.4.3': return '/logos/tbc.png'
                  case '3.3.5': return '/logos/wrath.png'
                  case '4.3.4': return '/logos/cataclysm.png'
                  case '5.4.8': return '/logos/pandaria.png'
                  default: return null
                }
              })()

              return logoPath ? (
                <img src={logoPath} alt={activeInstallation?.name || 'Instance'} className="size-full object-cover" />
              ) : (
                <div className="size-full rounded bg-primary/20 flex items-center justify-center">
                  <Activity className="size-5 text-primary" />
                </div>
              )
            })()}
          </div>
          <div>
            <div className="font-medium">{activeInstallation?.name || 'No Profile'}</div>
            <div className="text-xs text-muted-foreground">
              {WOW_VERSIONS.find(v => v.value === activeInstallation?.version)?.label || activeInstallation?.version || 'Unknown'}
            </div>
          </div>
        </div>
      </div>

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
