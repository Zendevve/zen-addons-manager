import { useState, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Download, Loader2, Star, Github, Filter, ChevronDown, ArrowLeft, Box, ChevronLeft, ChevronRight } from 'lucide-react'
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

// Featured/Popular WoW Addons to show by default
const FEATURED_ADDONS: SearchResult[] = [
  {
    name: 'WeakAuras2',
    full_name: 'WeakAuras/WeakAuras2',
    description: 'World of Warcraft addon that provides a powerful framework to display customizable graphics',
    url: 'https://github.com/WeakAuras/WeakAuras2',
    stars: 1200,
    author: 'WeakAuras',
    updated_at: new Date().toISOString()
  },
  {
    name: 'ElvUI',
    full_name: 'tukui-org/ElvUI',
    description: 'Complete UI replacement for World of Warcraft',
    url: 'https://github.com/tukui-org/ElvUI',
    stars: 800,
    author: 'tukui-org',
    updated_at: new Date().toISOString()
  },
  {
    name: 'DBM-Core',
    full_name: 'DeadlyBossMods/DeadlyBossMods',
    description: 'Deadly Boss Mods - The premier boss encounter addon',
    url: 'https://github.com/DeadlyBossMods/DeadlyBossMods',
    stars: 950,
    author: 'DeadlyBossMods',
    updated_at: new Date().toISOString()
  },
  {
    name: 'Plater-Nameplates',
    full_name: 'Tercioo/Plater-Nameplates',
    description: 'Plater is a nameplate addon for World of Warcraft',
    url: 'https://github.com/Tercioo/Plater-Nameplates',
    stars: 600,
    author: 'Tercioo',
    updated_at: new Date().toISOString()
  },
  {
    name: 'Details',
    full_name: 'Tercioo/Details-Damage-Meter',
    description: 'Details! Damage Meter for World of Warcraft',
    url: 'https://github.com/Tercioo/Details-Damage-Meter',
    stars: 750,
    author: 'Tercioo',
    updated_at: new Date().toISOString()
  },
  {
    name: 'BigWigs',
    full_name: 'BigWigsMods/BigWigs',
    description: 'Modular, lightweight, non-intrusive approach to boss encounter warnings',
    url: 'https://github.com/BigWigsMods/BigWigs',
    stars: 500,
    author: 'BigWigsMods',
    updated_at: new Date().toISOString()
  }
]

export function Browse() {
  const location = useLocation()
  const navigate = useNavigate()
  const activeProfile = location.state?.activeProfile

  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>(FEATURED_ADDONS)
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  // Sorting and Pagination State
  const [sortBy, setSortBy] = useState('relevance')
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [currentPage, setCurrentPage] = useState(1)

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    setIsSearching(true)
    setHasSearched(true)
    setSearchResults([])
    setCurrentPage(1) // Reset to first page on new search

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

  // Derived state for sorting and pagination
  const sortedResults = useMemo(() => {
    const results = [...searchResults]
    if (sortBy === 'stars') {
      return results.sort((a, b) => b.stars - a.stars)
    } else if (sortBy === 'updated') {
      return results.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    }
    // 'relevance' is default API order, so no sort needed
    return results
  }, [searchResults, sortBy])

  const totalPages = Math.ceil(sortedResults.length / itemsPerPage)
  const paginatedResults = sortedResults.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

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
              <div className="flex items-center gap-2">
                <span>Sort by:</span>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[140px] h-8">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">Relevance</SelectItem>
                    <SelectItem value="stars">Stars</SelectItem>
                    <SelectItem value="updated">Last Updated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span>View:</span>
                <Select value={itemsPerPage.toString()} onValueChange={(v) => {
                  setItemsPerPage(Number(v))
                  setCurrentPage(1) // Reset to page 1 when changing view count
                }}>
                  <SelectTrigger className="w-[80px] h-8">
                    <SelectValue placeholder="20" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              {hasSearched ? `${searchResults.length} results` : 'Start searching to find addons'}
            </div>
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-auto p-6 space-y-4">
          {!hasSearched && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-2">Featured Addons</h2>
              <p className="text-sm text-muted-foreground">Popular and trusted World of Warcraft addons from GitHub</p>
            </div>
          )}

          {paginatedResults.map((result) => (
            <div key={result.url} className="group flex gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-all">
              {/* GitHub Profile Picture */}
              <div className="size-16 rounded-lg overflow-hidden shrink-0 bg-secondary">
                <img
                  src={`https://github.com/${result.author}.png?size=64`}
                  alt={`${result.author} avatar`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to initial if image fails to load
                    const target = e.currentTarget
                    target.style.display = 'none'
                    const fallback = document.createElement('div')
                    fallback.className = 'w-full h-full flex items-center justify-center text-2xl font-bold text-muted-foreground'
                    fallback.textContent = result.name[0]
                    target.parentElement?.appendChild(fallback)
                  }}
                />
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

          {/* Pagination Controls */}
          {sortedResults.length > itemsPerPage && (
            <div className="flex items-center justify-center gap-4 pt-4 pb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="size-4 mr-2" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="size-4 ml-2" />
              </Button>
            </div>
          )}
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

