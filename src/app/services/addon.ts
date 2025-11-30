import { Injectable, signal, computed } from '@angular/core';

export interface Addon {
  id: string;
  name: string;
  version: string;
  branch?: string;
  availableBranches?: string[];
  source: 'git' | 'manual';
  sourceUrl?: string;
  status: 'enabled' | 'disabled' | 'outdated';
  lastUpdated: Date;
}

export interface CatalogueAddon {
  id: string;
  name: string;
  description: string;
  category: string;
  sourceUrl: string;
  latestVersion: string;
  author: string;
  downloads?: number;
}


@Injectable({
  providedIn: 'root',
})
export class AddonService {
  // State
  private addons = signal<Addon[]>([
    {
      id: '1',
      name: 'Deadly Boss Mods',
      version: '10.0.52',
      source: 'git',
      sourceUrl: 'https://github.com/DeadlyBossMods/DBM-Warmane',
      status: 'enabled',
      branch: 'main',
      availableBranches: ['main', 'develop'],
      lastUpdated: new Date('2024-01-15')
    },
    {
      id: '2',
      name: 'QuestHelper',
      version: '1.4.0',
      source: 'git',
      sourceUrl: 'https://github.com/AmanKJ/QuestHelper',
      status: 'outdated',
      branch: 'master',
      availableBranches: ['master', 'dev'],
      lastUpdated: new Date('2023-12-01')
    },
    {
      id: '3',
      name: 'Recount',
      version: '3.5',
      source: 'manual',
      status: 'enabled',
      lastUpdated: new Date('2024-02-01')
    },
    {
      id: '4',
      name: 'Bartender4',
      version: '4.10.3',
      source: 'git',
      sourceUrl: 'https://github.com/Nevcairiel/Bartender4',
      status: 'disabled',
      branch: 'master',
      availableBranches: ['master'],
      lastUpdated: new Date('2024-01-20')
    }
  ]);

  // Computed
  readonly addons$ = this.addons.asReadonly();
  readonly stats = computed(() => {
    const addons = this.addons();
    return {
      total: addons.length,
      enabled: addons.filter(a => a.status === 'enabled').length,
      disabled: addons.filter(a => a.status === 'disabled').length,
      outdated: addons.filter(a => a.status === 'outdated').length
    };
  });

  // Actions
  toggleStatus(id: string) {
    this.addons.update(addons =>
      addons.map(addon =>
        addon.id === id
          ? { ...addon, status: addon.status === 'enabled' ? 'disabled' : 'enabled' }
          : addon
      )
    );
  }

  removeAddon(id: string) {
    this.addons.update(addons => addons.filter(a => a.id !== id));
  }

  updateAddon(id: string) {
    this.addons.update(addons =>
      addons.map(addon =>
        addon.id === id
          ? { ...addon, status: 'enabled', lastUpdated: new Date() }
          : addon
      )
    );
  }

  switchBranch(id: string, branch: string) {
    this.addons.update(addons =>
      addons.map(addon =>
        addon.id === id
          ? { ...addon, branch, lastUpdated: new Date() }
          : addon
      )
    );
  }

  // Catalogue
  private catalogue = signal<CatalogueAddon[]>([
    {
      id: 'cat-1',
      name: 'AtlasLoot Enhanced',
      description: 'Comprehensive loot browser for dungeons and raids',
      category: 'Database',
      sourceUrl: 'https://github.com/Hoizame/AtlasLootClassic',
      latestVersion: '3.0.5',
      author: 'Hoizame',
      downloads: 15000
    },
    {
      id: 'cat-2',
      name: 'TomTom',
      description: 'Coordinate waypoint tracking and navigation',
      category: 'Map & Minimap',
      sourceUrl: 'https://github.com/Ludovicus-Maior/TomTom-for-WoW-Classic',
      latestVersion: '1.6.2',
      author: 'Ludovicus',
      downloads: 12000
    },
    {
      id: 'cat-3',
      name: 'Skada Damage Meter',
      description: 'Lightweight damage and threat meter',
      category: 'Combat',
      sourceUrl: 'https://github.com/Skada-Damage-Meter/Skada',
      latestVersion: '1.8.71',
      author: 'Zarnivoop',
      downloads: 20000
    },
    {
      id: 'cat-4',
      name: 'Auctioneer',
      description: 'Advanced auction house tools and pricing data',
      category: 'Auction & Economy',
      sourceUrl: 'https://github.com/Norganna/Auctioneer',
      latestVersion: '5.21.7568',
      author: 'Norganna',
      downloads: 18000
    },
    {
      id: 'cat-5',
      name: 'Healbot',
      description: 'Click-to-heal raid frames for healers',
      category: 'Unit Frames',
      sourceUrl: 'https://github.com/Healbot/HealBot',
      latestVersion: '3.3.5.0',
      author: 'Strife',
      downloads: 14000
    },
    {
      id: 'cat-6',
      name: 'Gatherer',
      description: 'Track herb and ore locations on your map',
      category: 'Professions',
      sourceUrl: 'https://github.com/Norganna/Gatherer',
      latestVersion: '3.1.16',
      author: 'Norganna',
      downloads: 11000
    }
  ]);

  readonly catalogue$ = this.catalogue.asReadonly();
  readonly categories = computed(() => {
    const cats = new Set(this.catalogue().map(a => a.category));
    return ['All', ...Array.from(cats)];
  });

  installFromCatalogue(catalogueAddon: CatalogueAddon) {
    const newAddon: Addon = {
      id: `addon-${Date.now()}`,
      name: catalogueAddon.name,
      version: catalogueAddon.latestVersion,
      source: 'git',
      sourceUrl: catalogueAddon.sourceUrl,
      status: 'enabled',
      branch: 'main',
      availableBranches: ['main'],
      lastUpdated: new Date()
    };
    this.addons.update(addons => [...addons, newAddon]);
  }
}
