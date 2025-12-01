import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Search, Download, Loader2, Star, Github, Filter, ChevronDown, ArrowLeft, Box } from 'lucide-react'
import { electronService } from '@/services/electron'
import { toast } from 'sonner'

interface SearchResult {
  name: string
  full_name: string
  description: string
  url: string
  stars: number
  author: string
  updated_at: string
}

export function Browse() {
  const location = useLocation()
  const navigate = useNavigate()
  const activeProfile = location.state?.activeProfile

  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    setHasSearched(true)
    setSearchResults([])

    const result = await electronService.searchGithub(searchQuery)

    if (result.success && result.results) {
      setSearchResults(result.results)
      if (result.results.length === 0) {
        toast.info('No addons found')
      }
    } else {
      toast.error(`Search failed: ${result.error}`)
    }

    setIsSearching(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch()
    }
  }

  const handleInstall = async (url: string) => {
    const activeInstallation = localStorage.getItem('activeInstallation')
    let addonsPath = ''

    if (activeInstallation) {
      try {
        const parsed = JSON.parse(activeInstallation)
        addonsPath = parsed.addonsPath
      } catch (e) {
        console.error('Failed to parse active installation', e)
      }
    }

    if (!addonsPath) {
      const result = await electronService.autoDetectWowFolder()
      if (result.success && result.path) {
        addonsPath = result.path
      } else {
        toast.error('No WoW installation found. Please go to Manage tab and select folder.')
        return
      }
    }

    setLoading(true)
    const toastId = toast.loading('Installing addon...')
    const method = 'git'

    const result = await electronService.installAddon({
      url,
      addonsFolder: addonsPath,
      method
    })

    if (result.success) {
      toast.success(`Successfully installed ${result.addonName}`, { id: toastId })
    } else {
      toast.error(`Failed to install: ${result.error}`, { id: toastId })
    }
    setLoading(false)
  }

  return (
    <div className="flex h-full">
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header / Search Area */}
        <div className="p-6 border-b border-border space-y-4">

          {/* Context Header or Default Header */}
          {activeProfile ? (
            <div className="mb-6">
              <Button
                variant="ghost"
                className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
                onClick={() => navigate(-1)}
              >
                <ArrowLeft className="mr-2 size-4" />
                Back to instance
              </Button>
              <div className="flex items-center gap-4">
                <div className="size-12 rounded-xl bg-secondary flex items-center justify-center border border-border">
                  <Box className="size-6 text-muted-foreground" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Install content to instance</h1>
                  <p className="text-sm text-muted-foreground">WoW Retail • {activeProfile.split('\\').pop()}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-4">
              <h1 className="text-2xl font-bold">Discover content</h1>
            </div>
          )}

          {/* Filter Badges */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer">Addons</Badge>
            <Badge variant="ghost" className="text-muted-foreground hover:text-foreground cursor-pointer">WeakAuras</Badge>
            <Badge variant="ghost" className="text-muted-foreground hover:text-foreground cursor-pointer">Plater Profiles</Badge>
            <Badge variant="ghost" className="text-muted-foreground hover:text-foreground cursor-pointer">ElvUI</Badge>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <Input
              className="pl-9 h-12 text-lg bg-secondary/50 border-0 focus-visible:ring-1"
              placeholder="Search addons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <div className="absolute right-2 top-2">
              <Button size="sm" onClick={handleSearch} disabled={isSearching || !searchQuery.trim()}>
                {isSearching ? <Loader2 className="size-4 animate-spin" /> : 'Search'}
              </Button>
            </div>
          </div>

          {/* Sort/View Controls */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1 cursor-pointer hover:text-foreground">
                Sort by: Relevance <ChevronDown className="size-3" />
              </span>
              <span className="flex items-center gap-1 cursor-pointer hover:text-foreground">
                View: 20 <ChevronDown className="size-3" />
              </span>
            </div>
            <div>
              {hasSearched ? `${searchResults.length} results` : 'Start searching to find addons'}
            </div>
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-auto p-6 space-y-4">
          {!hasSearched && (
            <div className="text-center py-20 text-muted-foreground">
              <div className="size-16 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-4">
                <Search className="size-8 opacity-50" />
              </div>
              <h3 className="text-lg font-medium mb-1">Search for Addons</h3>
              <p>Type in the search bar above to find addons from GitHub.</p>
            </div>
          )}

          {searchResults.map((result) => (
            <div key={result.url} className="group flex gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-all">
              {/* Icon Placeholder */}
              <div className="size-16 rounded-lg bg-secondary flex items-center justify-center shrink-0 text-2xl font-bold text-muted-foreground">
                {result.name[0]}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-lg leading-none mb-1 group-hover:text-primary transition-colors">{result.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-1">{result.description || 'No description provided.'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground mb-1">
                      <Star className="size-3 fill-current" />
                      {result.stars}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Updated {new Date(result.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="secondary" className="text-xs font-normal">
                    <Github className="size-3 mr-1" />
                    {result.author}
                  </Badge>
                  {/* Mock Tags */}
                  <Badge variant="outline" className="text-xs font-normal text-muted-foreground">Addon</Badge>
                  <Badge variant="outline" className="text-xs font-normal text-muted-foreground">Lua</Badge>
                </div>
              </div>

              <div className="flex flex-col justify-center pl-4 border-l border-border">
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={() => handleInstall(result.url)}
                  disabled={loading}
                >
                  <Download className="size-4" />
                  Install
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Sidebar - Filters */}
      <div className="w-64 border-l border-border bg-card/30 p-6 hidden xl:block overflow-auto">
        <div className="space-y-6">
          <div>
            <h3 className="font-semibold mb-3 flex items-center justify-between">
              Categories
              <ChevronDown className="size-4 text-muted-foreground" />
            </h3>
            <div className="space-y-1">
              {[
                'Achievements', 'Action Bars', 'Artwork', 'Auction & Economy', 'Audio & Video',
                'Bags & Inventory', 'Boss Encounters', 'Buffs & Debuffs', 'Chat & Communication',
                'Class', 'Combat', 'Companions', 'Data Export', 'Development Tools', 'Garrison',
                'Guild', 'Libraries', 'Mail', 'Map & Minimap', 'Minigames', 'Miscellaneous',
                'Plugins', 'Professions', 'PvP', 'Quests & Leveling', 'Roleplay', 'Tooltip',
                'Twitch Integration', 'Unit Frames'
              ].map(cat => (
                <div key={cat} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-secondary/50 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <div className="size-4 rounded border border-muted-foreground/30" />
                  {cat}
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold mb-3 flex items-center justify-between">
              Environment
              <ChevronDown className="size-4 text-muted-foreground" />
            </h3>
            <div className="space-y-1">
              {['Client', 'Server'].map(env => (
                <div key={env} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-secondary/50 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <div className="size-4 rounded border border-muted-foreground/30" />
                  {env}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
