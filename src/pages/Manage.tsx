import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Search, RefreshCw, Trash2, DownloadCloud, MoreVertical, Settings, Activity, ChevronDown, ChevronRight, Filter, Plus, FileUp, Link as LinkIcon, Globe, ExternalLink, Copy, Share2, Ban, Play, CheckCircle2, X, ArrowUpDown } from 'lucide-react'
import { RightSidebar } from '@/components/RightSidebar'
import { electronService } from '@/services/electron'
import { storageService } from '@/services/storage'
import type { Addon } from '@/types/addon'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import type { WowInstallation } from '@/types/installation'
import { WOW_VERSIONS } from '@/types/installation'
import { isValidGithubUsername } from '@/lib/utils'

// Helper to format last played timestamp
function formatLastPlayed(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return new Date(timestamp).toLocaleDateString()
}

// Helper to get expansion icon style
function getExpansionIcon(version: string = '') {
  switch (version) {
    case '1.12': return { color: 'bg-amber-900', text: '1.12', label: 'Vanilla' }
    case '2.4.3': return { color: 'bg-green-900', text: 'TBC', label: 'TBC' }
    case '3.3.5': return { color: 'bg-blue-900', text: 'WotLK', label: 'Wrath' }
    case '4.3.4': return { color: 'bg-orange-900', text: 'Cata', label: 'Cataclysm' }
    case '5.4.8': return { color: 'bg-emerald-900', text: 'MoP', label: 'Pandaria' }
    case 'retail': return { color: 'bg-slate-900', text: 'Retail', label: 'Retail' }
    case 'classic': return { color: 'bg-yellow-900', text: 'SoD', label: 'Classic' }
    default: return { color: 'bg-secondary', text: 'WoW', label: 'Unknown' }
  }
}



const AddonIcon = ({ addon }: { addon: Addon }) => {
  const [error, setError] = useState(false)

  if (addon.author && addon.author !== 'Unknown' && !error && isValidGithubUsername(addon.author)) {
    return (
      <img
        src={`https://github.com/${addon.author}.png?size=64`}
        alt={addon.author}
        className="w-full h-full object-cover"
        onError={() => setError(true)}
      />
    )
  }

  return (
    <span className="text-lg font-bold text-muted-foreground">
      {addon.name[0].toUpperCase()}
    </span>
  )
}

export function Manage() {
  const navigate = useNavigate()
  const [addons, setAddons] = useState<Addon[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [addonFolder, setAddonFolder] = useState<string | null>(null)
  const [executablePath, setExecutablePath] = useState<string | null>(null)
  const [activeInstallation, setActiveInstallation] = useState<WowInstallation | null>(null)
  const [operatingAddonId, setOperatingAddonId] = useState<string | null>(null)
  const [selectedAddons, setSelectedAddons] = useState<string[]>([])
  const [expandedAddons, setExpandedAddons] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [updatingAddons, setUpdatingAddons] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<'name' | 'updated' | 'author' | 'status'>('name')
  const [filterStatus, setFilterStatus] = useState<'all' | 'outdated' | 'enabled' | 'disabled' | 'git'>('all')
  const searchInputRef = useRef<HTMLInputElement>(null)

  // URL Install Dialog
  const [isUrlDialogOpen, setIsUrlDialogOpen] = useState(false)
  const [installUrl, setInstallUrl] = useState('')

  // Load active installation on mount
  useEffect(() => {
    const init = async () => {
      const installation = storageService.getActiveInstallation()
      if (installation) {
        setActiveInstallation(installation)
        setAddonFolder(installation.addonsPath)

        if (installation.executablePath) {
          setExecutablePath(installation.executablePath)
        }
      } else {
        detectWowFolder()
      }
    }
    init()
  }, [])

  // Load addons when folder is set
  useEffect(() => {
    if (addonFolder) {
      loadAddons()
    }
  }, [addonFolder])

  // Listen for update progress events
  useEffect(() => {
    const handleUpdateStatus = (data: any) => {
      console.log('Update status:', data)

      if (data.type === 'update-start') {
        setUpdatingAddons(prev => new Set(prev).add(data.addonId))
      } else if (data.type === 'update-success' || data.type === 'update-error') {
        setUpdatingAddons(prev => {
          const next = new Set(prev)
          next.delete(data.addonId)
          return next
        })
      } else if (data.type === 'batch-complete') {
        // Clear all updating addons when batch completes
        setUpdatingAddons(new Set())
      }
    }

    electronService.onUpdateStatus(handleUpdateStatus)

    return () => {
      electronService.offUpdateStatus(handleUpdateStatus)
    }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+F to focus search
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
      // Esc to clear search
      if (e.key === 'Escape' && search) {
        setSearch('')
        searchInputRef.current?.blur()
      }
      // Ctrl+A to select all
      if (e.ctrlKey && e.key === 'a' && !e.shiftKey) {
        // Only if not in an input
        if (document.activeElement?.tagName !== 'INPUT') {
          e.preventDefault()
          const filtered = addons.filter(addon =>
            addon.name.toLowerCase().includes(search.toLowerCase())
          )
          setSelectedAddons(filtered.map(a => a.id))
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [search, addons])

  const detectWowFolder = async () => {
    const result = await electronService.autoDetectWowFolder()
    if (result.success && result.path) {
      setAddonFolder(result.path)
      if (result.executablePath) {
        setExecutablePath(result.executablePath)
      }
    }
  }

  const loadAddons = async () => {
    if (!addonFolder) return

    setLoading(true)
    const result = await electronService.scanAddonFolder(addonFolder)

    if (result.success && result.addons) {
      const transformedAddons = result.addons.map((addon, index) => ({
        ...addon,
        id: addon.id || `${addon.name}-${index}`,
      }))
      setAddons(transformedAddons)
    }
    setLoading(false)
  }

  const updateAddon = async (addon: Addon) => {
    setOperatingAddonId(addon.id)
    const toastId = toast.loading(`Updating ${addon.name}...`)
    const result = await electronService.updateAddon(addon.path)

    if (result.success) {
      toast.success(`${addon.name} updated`, { id: toastId })
      await loadAddons()
    } else {
      toast.error(`Failed to update ${addon.name}: ${result.error}`, { id: toastId })
    }
    setOperatingAddonId(null)
  }

  const deleteAddon = async (addon: Addon) => {
    if (!confirm(`Delete ${addon.name}?`)) return

    setOperatingAddonId(addon.id)
    const toastId = toast.loading(`Deleting ${addon.name}...`)
    const result = await electronService.deleteAddon(addon.path)

    if (result.success) {
      toast.success(`${addon.name} deleted`, { id: toastId })
      setAddons(prev => prev.filter(a => a.id !== addon.id))
      setSelectedAddons(prev => prev.filter(id => id !== addon.id))
    } else {
      toast.error(`Failed to delete ${addon.name}`, { id: toastId })
    }
    setOperatingAddonId(null)
  }

  const toggleStatus = async (addon: Addon, checked: boolean) => {
    setOperatingAddonId(addon.id)
    const newStatus = checked
    const action = newStatus ? 'Enabled' : 'Disabled'

    const result = await electronService.toggleAddon(addon.path, newStatus)

    if (result.success) {
      toast.success(`${addon.name} ${action}`)
      await loadAddons()
    } else {
      toast.error(`Failed to toggle ${addon.name}`)
    }
    setOperatingAddonId(null)
  }

  const updateAllGitAddons = async () => {
    if (!addonFolder) return

    const gitAddons = addons.filter(a => a.source === 'git')
    if (gitAddons.length === 0) {
      toast.info('No git addons to update')
      return
    }

    setLoading(true)
    const toastId = toast.loading(`Updating ${gitAddons.length} addons...`)

    const result = await electronService.updateAllAddons(addonFolder)

    if (result.success) {
      if (result.failed === 0) {
        toast.success(`Updated ${result.updated} addons successfully`, { id: toastId })
      } else {
        toast.warning(`Updated ${result.updated} addons, ${result.failed} failed`, { id: toastId })
      }
    } else {
      toast.error(`Failed to update addons: ${result.error}`, { id: toastId })
    }

    await loadAddons()
    setLoading(false)
  }

  const handleLaunchGame = async () => {
    if (!executablePath) {
      toast.error('Game executable not found. Please re-configure your installation.')
      return
    }

    const toastId = toast.loading('Launching WoW...')
    const cleanWdb = storageService.getCleanWdb()
    if (cleanWdb) {
      toast.loading('Cleaning WDB folder...', { id: toastId })
    }
    const result = await electronService.launchGame(executablePath, cleanWdb)

    if (result.success) {
      // Update last played time
      if (activeInstallation) {
        const now = Date.now()
        storageService.updateInstallation(activeInstallation.id, {
          lastPlayed: now
        })
        setActiveInstallation({ ...activeInstallation, lastPlayed: now })
      }
      toast.success('Game launched!', { id: toastId })
    } else {
      toast.error(`Failed to launch game: ${result.error}`, { id: toastId })
    }
  }

  // --- Bulk Actions ---

  const handleBulkDisable = async () => {
    if (!confirm(`Disable ${selectedAddons.length} addons?`)) return

    const toastId = toast.loading(`Disabling ${selectedAddons.length} addons...`)
    let successCount = 0

    for (const id of selectedAddons) {
      const addon = addons.find(a => a.id === id)
      if (addon) {
        const result = await electronService.toggleAddon(addon.path, false)
        if (result.success) successCount++
      }
    }

    toast.success(`Disabled ${successCount} addons`, { id: toastId })
    await loadAddons()
    setSelectedAddons([])
  }

  const handleBulkEnable = async () => {
    if (!confirm(`Enable ${selectedAddons.length} addons?`)) return

    const toastId = toast.loading(`Enabling ${selectedAddons.length} addons...`)
    let successCount = 0

    for (const id of selectedAddons) {
      const addon = addons.find(a => a.id === id)
      if (addon) {
        const result = await electronService.toggleAddon(addon.path, true)
        if (result.success) successCount++
      }
    }

    toast.success(`Enabled ${successCount} addons`, { id: toastId })
    await loadAddons()
    setSelectedAddons([])
  }

  const handleBulkRemove = async () => {
    if (!confirm(`Delete ${selectedAddons.length} addons? This cannot be undone.`)) return

    const toastId = toast.loading(`Deleting ${selectedAddons.length} addons...`)
    let successCount = 0

    for (const id of selectedAddons) {
      const addon = addons.find(a => a.id === id)
      if (addon) {
        const result = await electronService.deleteAddon(addon.path)
        if (result.success) successCount++
      }
    }

    toast.success(`Deleted ${successCount} addons`, { id: toastId })
    await loadAddons()
    setSelectedAddons([])
  }

  // --- Install Handlers ---

  const handleInstallFromFile = async (file?: File) => {
    if (!addonFolder) {
      toast.error('Please select a WoW addons folder first')
      return
    }

    let filePath: string | undefined

    if (file) {
      // File from drag-and-drop
      filePath = (file as any).path
    } else {
      // File from dialog
      filePath = await electronService.openFileDialog()
      if (!filePath) return
    }

    const toastId = toast.loading('Installing addon from file...')
    const result = await electronService.installAddonFromFile(filePath!, addonFolder)

    if (result.success) {
      toast.success(`Installed ${result.addonName}`, { id: toastId })
      await loadAddons()
    } else {
      toast.error(`Failed to install: ${result.error}`, { id: toastId })
    }
  }

  const handleInstallFromUrl = async () => {
    if (!addonFolder) {
      toast.error('Please select a WoW addons folder first')
      return
    }
    if (!installUrl.trim()) return

    setIsUrlDialogOpen(false)
    const toastId = toast.loading('Installing addon from URL...')

    // Auto-detect method (git if github, else zip)
    const method = installUrl.includes('github.com') ? 'git' : 'zip'

    const result = await electronService.installAddon({
      url: installUrl,
      addonsFolder: addonFolder,
      method
    })

    if (result.success) {
      toast.success(`Installed ${result.addonName}`, { id: toastId })
      setInstallUrl('')
      await loadAddons()
    } else {
      toast.error(`Failed to install: ${result.error}`, { id: toastId })
    }
  }

  // --- Drag and Drop Handlers ---

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Only hide when leaving the container itself, not child elements
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY
    if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
      setIsDragging(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    const zipFile = files.find(f => f.name.endsWith('.zip'))

    if (zipFile) {
      await handleInstallFromFile(zipFile)
    } else if (files.length > 0) {
      toast.error('Please drop a .zip file')
    }
  }

  // Apply filters and sorting
  const filteredAddons = addons
    .filter(addon => {
      // Search filter
      if (!addon.name.toLowerCase().includes(search.toLowerCase())) {
        return false
      }
      // Status filter
      if (filterStatus === 'outdated' && addon.status !== 'outdated') return false
      if (filterStatus === 'enabled' && addon.status !== 'enabled') return false
      if (filterStatus === 'disabled' && addon.status !== 'disabled') return false
      if (filterStatus === 'git' && addon.source !== 'git') return false
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'updated':
          return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
        case 'author':
          return a.author.localeCompare(b.author)
        case 'status': {
          const statusOrder = { outdated: 0, enabled: 1, disabled: 2 }
          return statusOrder[a.status as keyof typeof statusOrder] - statusOrder[b.status as keyof typeof statusOrder]
        }
        default:
          return 0
      }
    })

  const toggleSelection = (id: string) => {
    setSelectedAddons(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const toggleAll = () => {
    if (selectedAddons.length === filteredAddons.length) {
      setSelectedAddons([])
    } else {
      setSelectedAddons(filteredAddons.map(a => a.id))
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedAddons(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    )
  }

  const openInExplorer = async (path: string) => {
    await electronService.openInExplorer(path)
  }

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url)
    toast.success('Link copied to clipboard')
  }

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Profile Header */}
        <div className="p-6 pb-0">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="size-16 rounded-xl overflow-hidden shadow-sm border border-border">
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
                    <img src={logoPath} alt={activeInstallation?.name} className="size-full object-cover" />
                  ) : (
                    <div className={`size-full flex items-center justify-center text-xl font-bold text-white ${getExpansionIcon(activeInstallation?.version).color}`}>
                      {getExpansionIcon(activeInstallation?.version).text}
                    </div>
                  )
                })()}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{activeInstallation?.name || 'My Addons'}</h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <Activity className="size-4" />
                    {WOW_VERSIONS.find(v => v.value === activeInstallation?.version)?.label || activeInstallation?.version || 'Unknown'}
                  </span>
                  <span className="flex items-center gap-1">
                    <RefreshCw className="size-3" />
                    Last played: {activeInstallation?.lastPlayed ? formatLastPlayed(activeInstallation.lastPlayed) : 'Never'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {executablePath && (
                <Button variant="default" className="bg-green-600 hover:bg-green-700 text-white gap-2" onClick={handleLaunchGame}>
                  <Play className="size-4 fill-current" />
                  Play
                </Button>
              )}
              <Button variant="secondary" size="icon" onClick={() => navigate('/settings')}>
                <Settings className="size-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <MoreVertical className="size-4" />
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-border">
            <Button variant="ghost" className="rounded-none border-b-2 border-primary text-primary hover:text-primary hover:bg-transparent px-4">
              Content
            </Button>
            <Button variant="ghost" className="rounded-none border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:bg-transparent px-4">
              Worlds
            </Button>
            <Button variant="ghost" className="rounded-none border-b-2 border-transparent text-muted-foreground hover:text-foreground hover:bg-transparent px-4">
              Logs
            </Button>
          </div>
        </div>

        {/* Toolbar / Bulk Actions */}
        <div className="p-6 space-y-4">
          {selectedAddons.length > 0 ? (
            <div className="flex items-center justify-between bg-secondary/30 p-2 rounded-lg border border-border animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-2">
                  <Checkbox
                    checked={selectedAddons.length === filteredAddons.length && filteredAddons.length > 0}
                    onCheckedChange={toggleAll}
                  />
                  <span className="text-sm font-medium">{selectedAddons.length} selected</span>
                </div>
                <div className="h-6 w-px bg-border" />
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Share2 className="size-4" />
                    Share
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2" onClick={handleBulkEnable}>
                    <CheckCircle2 className="size-4" />
                    Enable
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2" onClick={handleBulkDisable}>
                    <Ban className="size-4" />
                    Disable
                  </Button>
                  <Button variant="destructive" size="sm" className="gap-2" onClick={handleBulkRemove}>
                    <Trash2 className="size-4" />
                    Remove
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
                <Input
                  ref={searchInputRef}
                  className="pl-9 pr-9 bg-secondary/50 border-0"
                  placeholder={`Search ${addons.length} addons...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>

              {/* Sort Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <ArrowUpDown className="size-4" />
                    Sort
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setSortBy('name')}>
                    {sortBy === 'name' && '✓ '}Name (A-Z)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('updated')}>
                    {sortBy === 'updated' && '✓ '}Last Updated
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('author')}>
                    {sortBy === 'author' && '✓ '}Author
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortBy('status')}>
                    {sortBy === 'status' && '✓ '}Status
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Install Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="size-4" />
                    Install content
                    <ChevronDown className="size-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => navigate('/browse', { state: { activeProfile: addonFolder } })}>
                    <Globe className="mr-2 size-4" />
                    <span>Browse</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleInstallFromFile()}>
                    <FileUp className="mr-2 size-4" />
                    <span>Add from file</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsUrlDialogOpen(true)}>
                    <LinkIcon className="mr-2 size-4" />
                    <span>Add from URL</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {selectedAddons.length === 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="size-4 text-muted-foreground mr-2" />
                <Badge
                  variant={filterStatus === 'all' ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setFilterStatus('all')}
                >
                  All
                </Badge>
                <Badge
                  variant={filterStatus === 'outdated' ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setFilterStatus('outdated')}
                >
                  Outdated
                </Badge>
                <Badge
                  variant={filterStatus === 'enabled' ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setFilterStatus('enabled')}
                >
                  Enabled
                </Badge>
                <Badge
                  variant={filterStatus === 'disabled' ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setFilterStatus('disabled')}
                >
                  Disabled
                </Badge>
                <Badge
                  variant={filterStatus === 'git' ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setFilterStatus('git')}
                >
                  Git Only
                </Badge>
              </div>
              <span className="text-sm text-muted-foreground">
                Showing {filteredAddons.length} of {addons.length} addons
              </span>
            </div>
          )}
        </div>

        {/* Addon List with Drag-and-Drop */}
        <div
          className="flex-1 overflow-auto px-6 pb-6 relative"
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {isDragging && (
            <div className="absolute inset-0 bg-primary/10 border-2 border-dashed border-primary z-50 flex items-center justify-center pointer-events-none">
              <div className="bg-card p-6 rounded-lg shadow-lg">
                <FileUp className="size-12 mx-auto mb-2 text-primary" />
                <p className="text-lg font-semibold">Drop zip file to install</p>
              </div>
            </div>
          )}
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-[40px_1fr_150px_200px] gap-4 p-4 border-b border-border bg-muted/30 text-sm font-medium text-muted-foreground">
              <div className="flex items-center justify-center">
                <Checkbox
                  checked={selectedAddons.length === filteredAddons.length && filteredAddons.length > 0}
                  onCheckedChange={toggleAll}
                />
              </div>
              <div className="flex items-center gap-1 cursor-pointer hover:text-foreground">
                Name <ChevronDown className="size-3" />
              </div>
              <div>Updated</div>
              <div className="flex items-center justify-end gap-2">
                <Button variant="ghost" size="sm" className="gap-1 h-7" onClick={updateAllGitAddons}>
                  <DownloadCloud className="size-3" /> Update all
                </Button>
                <span className="flex items-center gap-1 cursor-pointer hover:text-foreground" onClick={loadAddons}>
                  <RefreshCw className={`size-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </span>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-border">
              {filteredAddons.map((addon) => (
                <div
                  key={addon.id}
                  className="group transition-colors hover:bg-muted/30"
                  onDoubleClick={() => toggleStatus(addon, addon.status !== 'enabled')}
                >
                  <div className="grid grid-cols-[40px_1fr_150px_200px] gap-4 p-4 items-center">
                    <div className="flex items-center justify-center">
                      <Checkbox
                        checked={selectedAddons.includes(addon.id)}
                        onCheckedChange={() => toggleSelection(addon.id)}
                      />
                    </div>

                    <div className="flex items-center gap-4 min-w-0">
                      <div
                        className="cursor-pointer hover:bg-muted rounded p-1 -ml-2"
                        onClick={() => toggleExpand(addon.id)}
                      >
                        {expandedAddons.includes(addon.id) ? (
                          <ChevronDown className="size-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="size-4 text-muted-foreground" />
                        )}
                      </div>
                      <div className="size-10 rounded-lg bg-secondary/50 border border-border flex items-center justify-center shrink-0 overflow-hidden">
                        <AddonIcon addon={addon} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold truncate">{addon.title || addon.name}</div>
                        <div className="text-xs text-muted-foreground truncate">by {addon.author || 'Unknown'}</div>
                      </div>
                    </div>

                    <div className="text-sm text-muted-foreground">
                      <div className="truncate">{addon.version}</div>
                      <div className="text-xs opacity-50 truncate">{addon.source === 'git' ? addon.branch : 'Local'}</div>
                    </div>

                    <div className="flex items-center justify-end gap-3">
                      {/* Show spinner when updating */}
                      {updatingAddons.has(addon.name) && (
                        <div className="flex items-center gap-2 text-primary">
                          <RefreshCw className="size-4 animate-spin" />
                          <span className="text-xs">Updating...</span>
                        </div>
                      )}

                      {/* Only show update icon when addon is outdated and not currently updating */}
                      {addon.source === 'git' && addon.status === 'outdated' && !updatingAddons.has(addon.name) && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-muted-foreground hover:text-primary"
                          onClick={() => updateAddon(addon)}
                          disabled={operatingAddonId === addon.id}
                        >
                          <DownloadCloud className="size-4" />
                        </Button>
                      )}

                      <Switch
                        checked={addon.status === 'enabled'}
                        onCheckedChange={(checked) => toggleStatus(addon, checked)}
                        disabled={operatingAddonId !== null}
                      />

                      {/* Always visible 3-dots menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-foreground">
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openInExplorer(addon.path)}>
                            <ExternalLink className="mr-2 size-4" />
                            <span>Show file</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => copyLink(addon.name)}>
                            <Copy className="mr-2 size-4" />
                            <span>Copy name</span>
                          </DropdownMenuItem>
                          {addon.sourceUrl && (
                            <DropdownMenuItem onClick={() => copyLink(addon.sourceUrl!)}>
                              <Copy className="mr-2 size-4" />
                              <span>Copy link</span>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => deleteAddon(addon)} className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 size-4" />
                            <span>Delete</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedAddons.includes(addon.id) && (
                    <div className="px-14 pb-4 text-sm text-muted-foreground bg-muted/10 border-t border-border/50">
                      <div className="grid grid-cols-2 gap-4 pt-4">
                        <div>
                          <span className="font-medium text-foreground">Path:</span> {addon.path}
                        </div>
                        <div>
                          <span className="font-medium text-foreground">Source:</span> {addon.sourceUrl || 'Local'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {filteredAddons.length === 0 && (
                <div className="p-12 text-center text-muted-foreground">
                  <div className="flex justify-center mb-4">
                    <Search className="size-12 opacity-20" />
                  </div>
                  <h3 className="text-lg font-medium mb-1">No addons found</h3>
                  <p className="text-sm opacity-70">
                    Try adjusting your filters or search terms.
                  </p>
                  {(search || filterStatus !== 'all') && (
                    <Button
                      variant="link"
                      onClick={() => {
                        setSearch('')
                        setFilterStatus('all')
                      }}
                      className="mt-2"
                    >
                      Clear all filters
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <RightSidebar installation={activeInstallation} />

      {/* URL Install Dialog */}
      <Dialog open={isUrlDialogOpen} onOpenChange={setIsUrlDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Install from URL</DialogTitle>
            <DialogDescription>
              Enter a GitHub repository URL or a direct link to a zip file.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="https://github.com/username/repo"
              value={installUrl}
              onChange={(e) => setInstallUrl(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUrlDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleInstallFromUrl} disabled={!installUrl.trim()}>Install</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
