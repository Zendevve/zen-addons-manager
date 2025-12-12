import { useState, useEffect } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { LayoutDashboard, FolderCog, Globe, Settings, Leaf, Plus } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { storageService } from '@/services/storage'
import type { WowInstallation } from '@/types/installation'

const mainNavItems = [
  { path: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { path: '/browse', label: 'Discover', icon: Globe },
  { path: '/library', label: 'Library', icon: FolderCog },
]

export function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [installations, setInstallations] = useState<WowInstallation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)

  const refreshInstallations = () => {
    const all = storageService.getInstallations()
    setInstallations(all)
    const active = storageService.getActiveInstallation()
    setActiveId(active?.id || null)
  }

  // Initial load
  useEffect(() => {
    refreshInstallations()

    // Listen for storage events (if we had a custom event system, we'd use it here)
    // For now, we'll rely on the fact that most changes happen via navigation or explicit actions
    // We can also poll or use a custom event listener if we implement one in storageService
    const handleStorageChange = () => refreshInstallations()
    window.addEventListener('storage-update', handleStorageChange)
    return () => window.removeEventListener('storage-update', handleStorageChange)
  }, [])

  // Also refresh when location changes, in case we added something in Settings
  useEffect(() => {
    refreshInstallations()
  }, [location.pathname])

  const handleInstanceClick = (inst: WowInstallation) => {
    storageService.setActiveInstallation(inst.id)
    setActiveId(inst.id)
    navigate('/manage')
  }

  const getVersionColor = (version: string) => {
    switch (version) {
      case '1.12': return 'bg-amber-900 text-amber-100'
      case '2.4.3': return 'bg-green-900 text-green-100'
      case '3.3.5': return 'bg-blue-900 text-blue-100'
      case '4.3.4': return 'bg-orange-900 text-orange-100'
      case '5.4.8': return 'bg-emerald-900 text-emerald-100'
      case 'retail': return 'bg-slate-900 text-slate-100'
      case 'classic': return 'bg-yellow-900 text-yellow-100'
      default: return 'bg-secondary text-secondary-foreground'
    }
  }

  const getVersionLabel = (version: string) => {
    switch (version) {
      case '1.12': return '60'
      case '2.4.3': return '70'
      case '3.3.5': return '80'
      case 'retail': return 'R'
      case 'classic': return 'C'
      default: return '?'
    }
  }

  const getVersionLogo = (version: string) => {
    switch (version) {
      case '1.12': return '/logos/vanilla.png'
      case '2.4.3': return '/logos/tbc.png'
      case '3.3.5': return '/logos/wrath.png'
      case '4.3.4': return '/logos/cataclysm.png'
      case '5.4.8': return '/logos/pandaria.png'
      default: return null
    }
  }

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-background">
        {/* Sidebar */}
        <aside className="w-16 flex flex-col items-center py-4 border-r border-border bg-card">
          <div className="mb-6">
            <Link to="/dashboard" className="size-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground hover:opacity-90 transition-opacity">
              <Leaf className="size-6" />
            </Link>
          </div>

          <nav className="flex-1 w-full flex flex-col items-center gap-3 overflow-y-auto no-scrollbar px-2">
            {/* Main Nav */}
            {mainNavItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path

              return (
                <Tooltip key={item.path} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Link
                      to={item.path}
                      className={cn(
                        'size-10 flex items-center justify-center rounded-xl transition-all',
                        isActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      )}
                    >
                      <Icon className="size-5" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{item.label}</p>
                  </TooltipContent>
                </Tooltip>
              )
            })}

            {/* Separator */}
            <div className="h-px w-8 bg-border my-2 shrink-0" />

            {/* Instances */}
            {installations.map((inst) => {
              const isActive = activeId === inst.id && location.pathname === '/manage'

              return (
                <Tooltip key={inst.id} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => handleInstanceClick(inst)}
                      className={cn(
                        'size-10 flex items-center justify-center rounded-xl transition-all relative group overflow-hidden',
                        isActive ? 'ring-2 ring-primary ring-offset-2 ring-offset-card' : 'hover:scale-105'
                      )}
                    >
                      {getVersionLogo(inst.version) ? (
                        <img
                          src={getVersionLogo(inst.version)!}
                          alt={inst.name}
                          className="size-full object-cover rounded-xl"
                        />
                      ) : (
                        <div className={cn(
                          "size-full rounded-xl flex items-center justify-center text-xs font-bold",
                          getVersionColor(inst.version)
                        )}>
                          {getVersionLabel(inst.version)}
                        </div>
                      )}
                      {/* Active Indicator Dot */}
                      {isActive && (
                        <div className="absolute -right-1 -top-1 size-3 bg-primary rounded-full border-2 border-card" />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{inst.name}</p>
                    <p className="text-xs text-muted-foreground">{inst.version}</p>
                  </TooltipContent>
                </Tooltip>
              )
            })}

            {/* Add Instance Button */}
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Link
                  to="/settings"
                  className="size-10 flex items-center justify-center rounded-xl border border-dashed border-muted-foreground/30 text-muted-foreground hover:text-foreground hover:border-foreground/50 transition-all"
                >
                  <Plus className="size-5" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Add Instance</p>
              </TooltipContent>
            </Tooltip>

          </nav>

          <div className="mt-4 pt-4 border-t border-border w-full flex justify-center">
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Link
                  to="/settings"
                  className={cn(
                    'size-10 flex items-center justify-center rounded-xl transition-all',
                    location.pathname === '/settings'
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Settings className="size-5" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Settings</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>
    </TooltipProvider>
  )
}
