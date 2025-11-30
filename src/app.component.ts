import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AddonService } from './services/addon.service';
import { Addon, AddonCategory, AddonStatus, Installation } from './models/addon.model';

type SortKey = 'name' | 'version' | 'author';
type ActionType = 'update' | 'repair' | 'delete';

const DEFAULT_CATEGORIES = ['UI', 'Combat', 'Utility', 'Economy', 'Questing', 'Professions'];

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule],
})
export class AppComponent {
  addonService = inject(AddonService);
  
  // State from service
  installations = this.addonService.installations.asReadonly();
  activeInstallation = this.addonService.activeInstallation;
  addons = this.addonService.addons;
  
  // Local UI state
  newRepoUrl = signal('');
  selectedCategory = signal<AddonCategory | 'All'>('All');
  selectedAddonIds = signal<Set<string>>(new Set());
  searchTerm = signal('');
  sortBy = signal<SortKey>('name');
  sortDirection = signal<'asc' | 'desc'>('asc');
  actionInProgress = signal<Record<string, ActionType | null>>({});
  
  categories = computed(() => {
    const allAddons = this.addons();
    const uniqueCategories = [...new Set(allAddons.map(a => a.category))].sort();
    return ['All', ...uniqueCategories];
  });

  filteredAddons = computed(() => {
    const category = this.selectedCategory();
    const allAddons = this.addons();
    const term = this.searchTerm().toLowerCase();
    const sortKey = this.sortBy();
    const direction = this.sortDirection();

    // 1. Filter by category
    let addons = category === 'All'
      ? allAddons
      : allAddons.filter(addon => addon.category === category);

    // 2. Filter by search term
    if (term) {
      addons = addons.filter(addon =>
        addon.name.toLowerCase().includes(term) ||
        addon.description.toLowerCase().includes(term)
      );
    }

    // 3. Sort
    return addons.sort((a, b) => {
      const valA = a[sortKey].toLowerCase();
      const valB = b[sortKey].toLowerCase();
      
      let comparison = 0;
      if (valA > valB) {
        comparison = 1;
      } else if (valA < valB) {
        comparison = -1;
      }
      
      return direction === 'asc' ? comparison : -comparison;
    });
  });

  areAnyAddonsSelected = computed(() => this.selectedAddonIds().size > 0);

  areAllFilteredAddonsSelected = computed(() => {
    const filtered = this.filteredAddons();
    const selected = this.selectedAddonIds();
    return filtered.length > 0 && filtered.every(a => selected.has(a.id));
  });

  isUrlValid(): boolean {
    const url = this.newRepoUrl();
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.hostname === 'github.com' || parsedUrl.hostname === 'gitlab.com';
    } catch (_) {
      return false;
    }
  }

  installAddon() {
    if (this.isUrlValid()) {
      this.addonService.addAddon(this.newRepoUrl());
      this.newRepoUrl.set('');
    }
  }

  toggleAddonSelection(id: string): void {
    this.selectedAddonIds.update(ids => {
      const newIds = new Set(ids);
      if (newIds.has(id)) {
        newIds.delete(id);
      } else {
        newIds.add(id);
      }
      return newIds;
    });
  }

  toggleSelectAllVisible(): void {
    const allVisibleSelected = this.areAllFilteredAddonsSelected();
    const visibleIds = this.filteredAddons().map(a => a.id);
    
    this.selectedAddonIds.update(ids => {
        const newIds = new Set(ids);
        if (allVisibleSelected) {
            visibleIds.forEach(id => newIds.delete(id));
        } else {
            visibleIds.forEach(id => newIds.add(id));
        }
        return newIds;
    });
  }

  bulkEnableSelected(): void {
    this.addonService.bulkEnable(this.selectedAddonIds());
    this.selectedAddonIds.set(new Set());
  }
  
  bulkDisableSelected(): void {
    this.addonService.bulkDisable(this.selectedAddonIds());
    this.selectedAddonIds.set(new Set());
  }

  bulkDeleteSelected(): void {
    if (confirm(`Are you sure you want to delete ${this.selectedAddonIds().size} addon(s)? This cannot be undone.`)) {
        this.addonService.bulkDelete(this.selectedAddonIds());
        this.selectedAddonIds.set(new Set());
    }
  }
  
  changeInstallation(event: Event) {
    const selectElement = event.target as HTMLSelectElement;
    this.addonService.switchInstallation(selectElement.value);
    this.selectedAddonIds.set(new Set());
    this.selectedCategory.set('All');
    this.searchTerm.set('');
  }

  setSortBy(key: SortKey) {
    if (this.sortBy() === key) {
      this.sortDirection.update(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortBy.set(key);
      this.sortDirection.set('asc');
    }
  }

  editCategory(addon: Addon) {
    const suggestion = `Suggestions: ${DEFAULT_CATEGORIES.join(', ')}`;
    const newCategory = prompt(`Enter a new category for "${addon.name}":\n\n${suggestion}`, addon.category);
    if (newCategory && newCategory.trim() !== '') {
      this.addonService.updateAddonCategory(addon.id, newCategory.trim());
    }
  }

  private async handleAction(id: string, actionType: ActionType, actionFn: () => Promise<void>) {
    this.actionInProgress.update(s => ({ ...s, [id]: actionType }));
    try {
      await actionFn();
    } finally {
      this.actionInProgress.update(s => ({ ...s, [id]: null }));
    }
  }

  onToggle(id: string) {
    this.addonService.toggleStatus(id);
  }

  async onUpdate(id: string) {
    await this.handleAction(id, 'update', () => this.addonService.updateAddon(id));
  }

  async onRepair(id: string) {
    await this.handleAction(id, 'repair', () => this.addonService.repairAddon(id));
  }

  async onDelete(id: string) {
    await this.handleAction(id, 'delete', () => this.addonService.deleteAddon(id));
  }
  
  getStatusColor(status: AddonStatus): string {
    switch (status) {
      case 'enabled':
        return 'border-green-500';
      case 'disabled':
        return 'border-neutral-500';
      case 'update-available':
        return 'border-yellow-400';
      case 'broken':
        return 'border-red-500';
      case 'installing':
        return 'border-blue-500';
      default:
        return 'border-neutral-700';
    }
  }
}