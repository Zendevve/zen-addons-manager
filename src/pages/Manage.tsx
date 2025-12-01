import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Check, X, AlertTriangle, RefreshCw, Trash2, FolderOpen } from 'lucide-react'
import { electronService } from '@/services/electron'
import { storageService } from '@/services/storage'
import type { Addon } from '@/types/addon'

export function Manage() {
  const [addons, setAddons] = useState<Addon[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [addonFolder, setAddonFolder] = useState<string | null>(null)
  const [operatingAddonId, setOperatingAddonId] = useState<string | null>(null)

  // Load active installation on mount
  useEffect(() => {
    const activeInstallation = storageService.getActiveInstallation()
    if (activeInstallation) {
      setAddonFolder(activeInstallation.addonsPath)
    } else {
      // Fallback to auto-detect if no installation saved
      detectWowFolder()
    }
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
    }
  }

  const selectFolder = async () => {
    const folder = await electronService.openDirectoryDialog()
    if (folder) {
      setAddonFolder(folder)
    }
  }

  const loadAddons = async () => {
    if (!addonFolder) return

    setLoading(true)
    const result = await electronService.scanAddonFolder(addonFolder)

    if (result.success && result.addons) {
      // Transform the addon data to include unique ID if needed
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
    const result = await electronService.updateAddon(addon.path)

    if (result.success) {
      await loadAddons() // Reload to get updated version
    }
    setOperatingAddonId(null)
  }

  const deleteAddon = async (addon: Addon) => {
    if (!confirm(`Delete ${addon.name}?`)) return

    setOperatingAddonId(addon.id)
    const result = await electronService.deleteAddon(addon.path)

    if (result.success) {
      setAddons(prev => prev.filter(a => a.id !== addon.id))
    }
    setOperatingAddonId(null)
  }

  const toggleStatus = async (addon: Addon) => {
    setOperatingAddonId(addon.id)
    const newStatus = addon.status === 'enabled' ? false : true
    const result = await electronService.toggleAddon(addon.path, newStatus)

    if (result.success) {
      await loadAddons()
    }
    setOperatingAddonId(null)
  }

  const fetchBranches = async (addon: Addon) => {
    if (addon.availableBranches && addon.availableBranches.length > 0) return

    setOperatingAddonId(addon.id)
    const result = await electronService.getBranches(addon.path)

    if (result.success && result.branches) {
      setAddons(prev => prev.map(a =>
        a.id === addon.id
          ? { ...a, availableBranches: result.branches }
          : a
      ))
    }
    setOperatingAddonId(null)
  }

  const switchBranch = async (addon: Addon, branch: string) => {
    setOperatingAddonId(addon.id)
    const result = await electronService.switchBranch(addon.path, branch)

    if (result.success) {
      await loadAddons()
    }
    setOperatingAddonId(null)
  }

  const stats = {
    total: addons.length,
    enabled: addons.filter(a => a.status === 'enabled').length,
    disabled: addons.filter(a => a.status === 'disabled').length,
    outdated: addons.filter(a => a.status === 'outdated').length,
  }

  const filteredAddons = addons.filter(addon =>
    addon.name.toLowerCase().includes(search.toLowerCase())
  )

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'enabled':
        return <Check className="text-green-500 size-5" />
      case 'disabled':
        return <X className="text-muted-foreground size-5" />
      case 'outdated':
        return <AlertTriangle className="text-yellow-500 size-5" />
      default:
        return null
    }
  }

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <header className="flex justify-between items-start">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Manage Addons</h1>
          <div className="flex items-center gap-2">
            <p className="text-muted-foreground">{stats.total} addons installed</p>
            {addonFolder && (
              <>
                <span className="text-muted-foreground">•</span>
                <p className="text-xs text-muted-foreground font-mono">{addonFolder}</p>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={selectFolder}>
            <FolderOpen className="mr-2 size-4" />
            Select Folder
          </Button>
          <Button variant="outline" size="sm" onClick={loadAddons} disabled={!addonFolder || loading}>
            <RefreshCw className={`mr-2 size-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Scanning...' : 'Refresh'}
          </Button>
          <Input
            placeholder="Search addons..."
            className="w-64"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </header>

      {/* Stats */}
      {addons.length > 0 && (
        <div className="flex gap-6 pb-4 border-b border-border">
          <div className="flex items-center gap-2 text-sm">
            <Check className="text-green-500" />
            <span>{stats.enabled} Enabled</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <X className="text-muted-foreground" />
            <span>{stats.disabled} Disabled</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangle className="text-yellow-500" />
            <span>{stats.outdated} Updates</span>
          </div>
        </div>
      )}

      {/* Addon Table */}
      {!addonFolder ? (
        <div className="text-center py-12 text-muted-foreground">
          <FolderOpen className="size-12 mx-auto mb-4 opacity-50" />
          <p>Select your WoW AddOns folder to get started</p>
        </div>
      ) : addons.length === 0 && !loading ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No addons found. Click Refresh to scan the folder.</p>
        </div>
      ) : (
        <div className="border rounded-md bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Status</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAddons.map((addon) => (
                <TableRow key={addon.id}>
                  <TableCell>{getStatusIcon(addon.status)}</TableCell>
                  <TableCell>
                    <div className="font-medium">{addon.title || addon.name}</div>
                    {addon.description && (
                      <p className="text-xs text-muted-foreground">{addon.description}</p>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{addon.version}</TableCell>
                  <TableCell className="text-sm">{addon.author}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {new Date(addon.lastUpdated).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2 items-center">
                      {addon.source === 'git' && (
                        <div className="w-32">
                          <Select
                            value={addon.branch || ''}
                            onValueChange={(val) => switchBranch(addon, val)}
                            onOpenChange={(open) => {
                              if (open) fetchBranches(addon)
                            }}
                            disabled={operatingAddonId === addon.id}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Branch" />
                            </SelectTrigger>
                            <SelectContent>
                              {addon.availableBranches ? (
                                addon.availableBranches.map(branch => (
                                  <SelectItem key={branch} value={branch} className="text-xs">
                                    {branch}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value={addon.branch || 'master'} disabled>Loading...</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                      {addon.source === 'git' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateAddon(addon)}
                          disabled={operatingAddonId === addon.id}
                        >
                          {operatingAddonId === addon.id ? '...' : 'Pull'}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleStatus(addon)}
                        disabled={operatingAddonId !== null}
                      >
                        {addon.status === 'enabled' ? 'Disable' : 'Enable'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteAddon(addon)}
                        disabled={operatingAddonId === addon.id}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
