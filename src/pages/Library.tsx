import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Box, MoreVertical, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { storageService } from '@/services/storage'
import type { WowInstallation } from '@/types/installation'
import { WOW_VERSIONS } from '@/types/installation'

export function Library() {
  const navigate = useNavigate()
  const [installations, setInstallations] = useState<WowInstallation[]>([])
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    const loaded = storageService.getInstallations()
    setInstallations(loaded)
  }, [])

  const filteredInstallations = installations.filter(inst =>
    inst.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = (installation: WowInstallation) => {
    storageService.setActiveInstallation(installation.id)
    navigate('/manage')
  }

  const getVersionLabel = (version: string) => {
    return WOW_VERSIONS.find(v => v.value === version)?.label || version
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Library</h1>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <div className="size-2 rounded-full bg-muted-foreground/30" />
              No instances running
            </span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === 'all' ? 'secondary' : 'ghost'}
            className="rounded-full px-6"
            onClick={() => setActiveTab('all')}
          >
            All instances
          </Button>
          <Button
            variant={activeTab === 'downloaded' ? 'secondary' : 'ghost'}
            className="rounded-full px-6 text-muted-foreground"
            onClick={() => setActiveTab('downloaded')}
          >
            Downloaded
          </Button>
          <Button
            variant={activeTab === 'custom' ? 'secondary' : 'ghost'}
            className="rounded-full px-6 text-muted-foreground"
            onClick={() => setActiveTab('custom')}
          >
            Custom
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-6 pb-2 flex items-center gap-4">
        <div className="relative flex-1 max-w-xl">
          <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
          <Input
            className="pl-9 bg-secondary/50 border-0"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <Button variant="outline" className="gap-2">
            Sort by: Name
          </Button>
          <Button variant="outline" className="gap-2">
            Group by: Group
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-auto">
        {/* Create New Card */}
        {/*
        <div className="border border-dashed border-border rounded-xl p-6 flex flex-col items-center justify-center gap-4 text-muted-foreground hover:bg-secondary/20 hover:text-foreground cursor-pointer transition-colors min-h-[120px]" onClick={() => navigate('/settings')}>
          <div className="size-12 rounded-full bg-secondary flex items-center justify-center">
            <Plus className="size-6" />
          </div>
          <span className="font-medium">Add Instance</span>
        </div>
        */}

        {filteredInstallations.map(inst => (
          <div
            key={inst.id}
            className="group relative bg-card hover:bg-secondary/20 border border-border rounded-xl p-4 cursor-pointer transition-all hover:shadow-md"
            onClick={() => handleSelect(inst)}
          >
            <div className="flex items-start gap-4">
              <div className={`size-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm
                ${inst.version === 'retail' ? 'bg-slate-900' :
                  inst.version === 'classic' ? 'bg-yellow-900' :
                    inst.version === '1.12' ? 'bg-amber-900' :
                      inst.version === '2.4.3' ? 'bg-green-900' :
                        inst.version === '3.3.5' ? 'bg-blue-900' :
                          'bg-secondary'
                }`}
              >
                {inst.version === 'retail' ? 'R' :
                  inst.version === 'classic' ? 'C' :
                    inst.version === '1.12' ? '60' :
                      inst.version === '2.4.3' ? '70' :
                        inst.version === '3.3.5' ? '80' : '?'}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold truncate pr-6">{inst.name}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <Box className="size-3" />
                  <span>{getVersionLabel(inst.version)}</span>
                </div>
              </div>
            </div>

            {/* Hover Actions */}
            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-8">
                    <MoreVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate('/settings') }}>
                    <Settings className="mr-2 size-4" /> Settings
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}

        {filteredInstallations.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Box className="size-12 mb-4 opacity-20" />
            <p>No instances found.</p>
            <Button variant="link" onClick={() => navigate('/settings')}>Create one in Settings</Button>
          </div>
        )}
      </div>
    </div>
  )
}
