import { Link, Outlet, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { LayoutDashboard, FolderCog, Globe, Settings, Leaf } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const navItems = [
  { path: '/dashboard', label: 'Home', icon: LayoutDashboard },
  { path: '/library', label: 'Library', icon: FolderCog },
  { path: '/browse', label: 'Discover', icon: Globe },
  { path: '/manage', label: 'My Addons', icon: Leaf }, // Using Leaf as a placeholder for "My Addons" to distinguish from Library/Settings
]

export function Layout() {
  const location = useLocation()

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-background">
        {/* Sidebar */}
        <aside className="w-16 flex flex-col items-center py-4 border-r border-border bg-card">
          <div className="mb-8">
            <div className="size-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground">
              <Leaf className="size-6" />
            </div>
          </div>

          <nav className="flex-1 w-full flex flex-col items-center gap-4">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path || (item.path === '/dashboard' && location.pathname === '/')

              return (
                <Tooltip key={item.path} delayDuration={0}>
                  <TooltipTrigger asChild>
                    <Link
                      to={item.path}
                      className={cn(
                        'size-10 flex items-center justify-center rounded-lg transition-all',
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
          </nav>

          <div className="mt-auto">
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Link
                  to="/settings"
                  className={cn(
                    'size-10 flex items-center justify-center rounded-lg transition-all',
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
