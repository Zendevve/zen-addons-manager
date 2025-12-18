import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Server, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { storageService } from '@/services/storage'
import type { ServerProfile, ExpansionType } from '@/types/server-profile'
import type { WowInstallation } from '@/types/installation'
import { WOW_VERSIONS } from '@/types/installation'
import { toast } from 'sonner'

interface ServerProfileSectionProps {
  installations: WowInstallation[]
}

export function ServerProfileSection({ installations }: ServerProfileSectionProps) {
  const [profiles, setProfiles] = useState<ServerProfile[]>([])
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProfile, setEditingProfile] = useState<ServerProfile | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    connectionString: '',
    installationId: '',
    expansion: '3.3.5' as ExpansionType,
  })

  useEffect(() => {
    loadProfiles()
  }, [])

  const loadProfiles = () => {
    setProfiles(storageService.getServerProfiles())
    setActiveProfileId(storageService.getActiveServerProfileId())
  }

  const resetForm = () => {
    setFormData({
      name: '',
      connectionString: '',
      installationId: installations[0]?.id || '',
      expansion: '3.3.5',
    })
    setEditingProfile(null)
  }

  const openAddDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const openEditDialog = (profile: ServerProfile) => {
    setEditingProfile(profile)
    setFormData({
      name: profile.name,
      connectionString: profile.connectionString,
      installationId: profile.installationId,
      expansion: profile.expansion,
    })
    setIsDialogOpen(true)
  }

  const handleSave = () => {
    if (!formData.name || !formData.connectionString || !formData.installationId) {
      toast.error('Please fill in all required fields')
      return
    }

    if (editingProfile) {
      storageService.updateServerProfile(editingProfile.id, {
        name: formData.name,
        connectionString: formData.connectionString,
        installationId: formData.installationId,
        expansion: formData.expansion,
      })
      toast.success('Server profile updated!')
    } else {
      storageService.addServerProfile({
        name: formData.name,
        connectionString: formData.connectionString,
        installationId: formData.installationId,
        expansion: formData.expansion,
      })
      toast.success('Server profile added!')
    }

    setIsDialogOpen(false)
    resetForm()
    loadProfiles()
  }

  const handleDelete = (id: string) => {
    if (!confirm('Delete this server profile?')) return
    storageService.deleteServerProfile(id)
    toast.success('Server profile deleted')
    loadProfiles()
  }

  const handleSetActive = (id: string) => {
    storageService.setActiveServerProfile(id)
    setActiveProfileId(id)
    toast.success('Active server profile changed')
  }

  const getInstallationName = (installationId: string) => {
    const installation = installations.find(i => i.id === installationId)
    return installation?.name || 'Unknown'
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Server className="size-5" />
                Server Profiles
              </CardTitle>
              <CardDescription>
                Manage server connection profiles for quick switching between private servers
              </CardDescription>
            </div>
            <Button onClick={openAddDialog} size="sm" disabled={installations.length === 0}>
              <Plus className="mr-2 size-4" />
              Add Profile
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {installations.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Add a WoW installation first to create server profiles
            </p>
          ) : profiles.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No server profiles yet. Click "Add Profile" to create one.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Active</TableHead>
                  <TableHead>Server Name</TableHead>
                  <TableHead>Connection</TableHead>
                  <TableHead>Installation</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell>
                      {profile.id === activeProfileId ? (
                        <Check className="text-green-500 size-5" />
                      ) : (
                        <button
                          onClick={() => handleSetActive(profile.id)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <div className="size-5 border-2 border-muted-foreground rounded" />
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{profile.name}</TableCell>
                    <TableCell className="text-sm font-mono text-muted-foreground">
                      {profile.connectionString}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {getInstallationName(profile.installationId)}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {WOW_VERSIONS.find(v => v.value === profile.expansion)?.label || profile.expansion}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(profile)}
                      >
                        <Edit2 className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(profile.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingProfile ? 'Edit Server Profile' : 'Add Server Profile'}
            </DialogTitle>
            <DialogDescription>
              Configure the server connection details. The connection string will be injected when you launch the game.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Server Name</Label>
              <Input
                id="name"
                placeholder="e.g., Warmane Icecrown"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="connection">Connection String</Label>
              <Input
                id="connection"
                placeholder="e.g., logon.warmane.com"
                value={formData.connectionString}
                onChange={(e) => setFormData(prev => ({ ...prev, connectionString: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                The realmlist address (without "set realmlist" prefix)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="installation">WoW Installation</Label>
              <Select
                value={formData.installationId}
                onValueChange={(value) => {
                  const inst = installations.find(i => i.id === value)
                  setFormData(prev => ({
                    ...prev,
                    installationId: value,
                    expansion: (inst?.version as ExpansionType) || prev.expansion,
                  }))
                }}
              >
                <SelectTrigger id="installation">
                  <SelectValue placeholder="Select installation" />
                </SelectTrigger>
                <SelectContent>
                  {installations.map((inst) => (
                    <SelectItem key={inst.id} value={inst.id}>
                      {inst.name} ({inst.version})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expansion">Expansion (for injection method)</Label>
              <Select
                value={formData.expansion}
                onValueChange={(value) => setFormData(prev => ({ ...prev, expansion: value as ExpansionType }))}
              >
                <SelectTrigger id="expansion">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WOW_VERSIONS.map((v) => (
                    <SelectItem key={v.value} value={v.value}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Determines whether to use realmlist.wtf (Vanilla–Cata) or Config.wtf (MoP)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingProfile ? 'Save Changes' : 'Add Profile'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
