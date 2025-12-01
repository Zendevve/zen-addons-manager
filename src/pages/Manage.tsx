import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Search, RefreshCw, Trash2, DownloadCloud, MoreVertical, Settings, Box, Activity, Wallet, ChevronDown, ChevronRight, Filter, Plus, FileUp, Link as LinkIcon, Globe, ExternalLink, Copy, Share2, Ban, Play, CheckCircle2 } from 'lucide-react'
import { electronService } from '@/services/electron'
import { storageService } from '@/services/storage'
import type { Addon } from '@/types/addon'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'

export function Manage() {
  const navigate = useNavigate()
  const [addons, setAddons] = useState<Addon[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [addonFolder, setAddonFolder] = useState<string | null>(null)
  const [executablePath, setExecutablePath] = useState<string | null>(null)
  const [operatingAddonId, setOperatingAddonId] = useState<string | null>(null)
  const [selectedAddons, setSelectedAddons] = useState<string[]>([])
  const [expandedAddons, setExpandedAddons] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)

  // URL Install Dialog
  const [isUrlDialogOpen, setIsUrlDialogOpen] = useState(false)
  const [installUrl, setInstallUrl] = useState('')

  // Load active installation on mount
  useEffect(() => {
    const init = async () => {
      const activeInstallation = storageService.getActiveInstallation()
      if (activeInstallation) {
        setAddonFolder(activeInstallation.addonsPath)

        if (activeInstallation.executablePath) {
          setExecutablePath(activeInstallation.executablePath)
        } else {
          // Try to discover executable from addons path (assuming .../Interface/AddOns)
          // We need to go up 2 levels
          // Since we can't use path module here easily without polyfill, we'll rely on string manipulation or just wait for user to re-select
          // Actually, we can try to validate the parent folders via IPC
          // But for now, let's just leave it. If the user re-selects folder, we'll get it.
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
    const result = await electronService.launchGame(executablePath)

    if (result.success) {
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
    const result = await electronService.installAddonFromFile(filePath, addonFolder)

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

  const filteredAddons = addons.filter(addon =>
    addon.name.toLowerCase().includes(search.toLowerCase())
  )

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
              <div className="size-16 rounded-xl bg-secondary flex items-center justify-center border border-border">
                <Box className="size-8 text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">My Addons</h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <Activity className="size-4" />
                    Retail 10.2.7
                  </span>
                  <span className="flex items-center gap-1">
                    <RefreshCw className="size-3" />
                    Last played: Never
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
              <Button variant="secondary" className="gap-2" onClick={updateAllGitAddons}>
                <DownloadCloud className="size-4" />
                Update All
              </Button>
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
                  className="pl-9 bg-secondary/50 border-0"
                  placeholder={`Search ${addons.length} addons...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

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
            <div className="flex items-center gap-2">
              <Filter className="size-4 text-muted-foreground mr-2" />
              <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer">Mods</Badge>
              <Badge variant="outline" className="text-muted-foreground hover:text-foreground cursor-pointer">Resource Packs</Badge>
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
                <span className="flex items-center gap-1 cursor-pointer hover:text-foreground" onClick={loadAddons}>
                  <RefreshCw className={`size-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
                </span>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y divide-border">
              {filteredAddons.map((addon) => (
                <div key={addon.id} className="group transition-colors hover:bg-muted/30">
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
                      <div className="size-10 rounded bg-secondary flex items-center justify-center text-muted-foreground font-bold shrink-0">
                        {addon.name[0]}
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
                      {addon.source === 'git' && (
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

                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => deleteAddon(addon)}
                      >
                        <Trash2 className="size-4" />
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreVertical className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openInExplorer(addon.path)}>
                            <ExternalLink className="mr-2 size-4" />
                            <span>Show file</span>
                          </DropdownMenuItem>
                          {addon.url && (
                            <DropdownMenuItem onClick={() => copyLink(addon.url)}>
                              <Copy className="mr-2 size-4" />
                              <span>Copy link</span>
                            </DropdownMenuItem>
                          )}
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
                          <span className="font-medium text-foreground">Source:</span> {addon.url || 'Local'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {filteredAddons.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  No addons found matching your search.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-80 border-l border-border bg-card/30 p-6 hidden xl:block">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Playing as</h3>
          </div>
          <div className="p-4 rounded-lg bg-card border border-border flex items-center gap-3">
            <div className="size-10 rounded bg-primary/20 flex items-center justify-center">
              <Activity className="size-5 text-primary" />
            </div>
            <div>
              <div className="font-medium">Default Profile</div>
              <div className="text-xs text-muted-foreground">WoW Retail</div>
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
