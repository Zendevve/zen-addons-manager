import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Plus, Trash2, Check, FolderOpen } from 'lucide-react'
import { storageService } from '@/services/storage'
import { electronService } from '@/services/electron'
import { ServerProfileSection } from '@/components/ServerProfileSection'
import type { WowInstallation } from '@/types/installation'
import { WOW_VERSIONS } from '@/types/installation'
import { toast } from 'sonner'

export function Settings() {
  const [installations, setInstallations] = useState<WowInstallation[]>([])
  const [newInstallation, setNewInstallation] = useState({
    name: '',
    version: '3.3.5',
    addonsPath: '',
    executablePath: '',
  })
  const [cleanWdb, setCleanWdb] = useState(false)

  useEffect(() => {
    loadInstallations()
  }, [])

  const loadInstallations = () => {
    setInstallations(storageService.getInstallations())
    setCleanWdb(storageService.getCleanWdb())
  }

  const selectFolder = async () => {
    const folder = await electronService.openDirectoryDialog()
    if (folder) {
      // Validate that this is a WoW installation folder
      const result = await electronService.validateWowPath(folder)
      if (result.success && result.addonsPath) {
        setNewInstallation(prev => ({
          ...prev,
          addonsPath: result.addonsPath!,
          executablePath: result.executablePath || '',
        }))
        toast.success('WoW installation detected!')
      } else {
        toast.error(result.error || 'No WoW executable found in this folder')
      }
    }
  }

  const autoDetect = async () => {
    const result = await electronService.autoDetectWowFolder()
    if (result.success && result.path) {
      setNewInstallation(prev => ({
        ...prev,
        addonsPath: result.path!,
        executablePath: result.executablePath || '',
      }))
      toast.success('WoW installation auto-detected!')
    } else {
      toast.error('Could not auto-detect WoW installation')
    }
  }

  const addInstallation = () => {
    if (!newInstallation.name || !newInstallation.addonsPath) {
      toast.error('Please provide a name and select a WoW folder')
      return
    }

    storageService.addInstallation({
      name: newInstallation.name,
      version: newInstallation.version,
      addonsPath: newInstallation.addonsPath,
      executablePath: newInstallation.executablePath,
    })

    setNewInstallation({ name: '', version: '3.3.5', addonsPath: '', executablePath: '' })
    loadInstallations()
    toast.success('Installation added!')
  }

  const deleteInstallation = (id: string) => {
    if (!confirm('Delete this installation?')) return
    storageService.deleteInstallation(id)
    loadInstallations()
    toast.success('Installation removed')
  }

  const setActive = (id: string) => {
    storageService.setActiveInstallation(id)
    loadInstallations()
    toast.success('Active installation changed')
  }

  const toggleCleanWdb = (enabled: boolean) => {
    setCleanWdb(enabled)
    storageService.setCleanWdb(enabled)
    toast.success(`WDB cleaning ${enabled ? 'enabled' : 'disabled'}`)
  }

  return (
    <div className="p-8 max-w-[1200px] mx-auto space-y-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">Manage your WoW installations</p>
      </header>

      {/* Global Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Global Settings</CardTitle>
          <CardDescription>Configure application-wide behavior</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">Clean WDB folder on launch</label>
              <p className="text-xs text-muted-foreground">
                Automatically deletes the WDB (cache) folder when launching the game to prevent bugs.
              </p>
            </div>
            <Switch
              checked={cleanWdb}
              onCheckedChange={toggleCleanWdb}
            />
          </div>
        </CardContent>
      </Card>

      {/* Server Profiles */}
      <ServerProfileSection installations={installations} />

      {/* Add New Installation */}
      <Card>
        <CardHeader>
          <CardTitle>Add WoW Installation</CardTitle>
          <CardDescription>Add a new World of Warcraft installation to manage addons for different versions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Installation Name</label>
              <Input
                placeholder="e.g., ChromieCraft WotLK"
                value={newInstallation.name}
                onChange={(e) => setNewInstallation(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">WoW Version</label>
              <Select
                value={newInstallation.version}
                onValueChange={(value) => setNewInstallation(prev => ({ ...prev, version: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WOW_VERSIONS.map(version => (
                    <SelectItem key={version.value} value={version.value}>
                      {version.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">WoW Installation Folder</label>
            <p className="text-xs text-muted-foreground">Select the folder where Wow.exe is located (not the AddOns folder)</p>
            <div className="flex gap-2">
              <Input
                placeholder="Path will be detected automatically"
                value={newInstallation.addonsPath}
                readOnly
                className="flex-1 cursor-not-allowed"
              />
              <Button variant="outline" onClick={selectFolder}>
                <FolderOpen className="size-4" />
              </Button>
              <Button variant="outline" onClick={autoDetect}>
                Auto-Detect
              </Button>
            </div>
            {newInstallation.executablePath && (
              <p className="text-xs text-green-600">✓ Executable found: {newInstallation.executablePath}</p>
            )}
          </div>

          <Button onClick={addInstallation} className="w-full">
            <Plus className="mr-2 size-4" />
            Add Installation
          </Button>
        </CardContent>
      </Card>

      {/* Installations List */}
      <Card>
        <CardHeader>
          <CardTitle>Saved Installations</CardTitle>
          <CardDescription>
            {installations.length === 0
              ? 'No installations saved yet'
              : `${installations.length} installation(s) configured`}
          </CardDescription>
        </CardHeader>
        {installations.length > 0 && (
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Active</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Path</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {installations.map((installation) => (
                  <TableRow key={installation.id}>
                    <TableCell>
                      {installation.isActive ? (
                        <Check className="text-green-500 size-5" />
                      ) : (
                        <button
                          onClick={() => setActive(installation.id)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <div className="size-5 border-2 border-muted-foreground rounded" />
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{installation.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {WOW_VERSIONS.find(v => v.value === installation.version)?.label || installation.version}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground max-w-md truncate">
                      {installation.addonsPath}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteInstallation(installation.id)}
                        disabled={installation.isActive}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
