import { Component, inject, signal, computed } from '@angular/core';
import { AddonService, CatalogueAddon } from '../../services/addon';
import { ElectronService } from '../../services/electron';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-browse',
  imports: [],
  templateUrl: './browse.html',
  styleUrl: './browse.css'
})
export class BrowseComponent {
  addonService = inject(AddonService);
  electronService = inject(ElectronService);
  toastService = inject(ToastService);

  searchTerm = signal('');
  selectedCategory = signal('All');
  manualUrl = signal('');
  isInstalling = signal(false);

  filteredAddons = computed(() => {
    const search = this.searchTerm().toLowerCase();
    const category = this.selectedCategory();

    return this.addonService.catalogue$().filter(addon => {
      const matchesSearch = addon.name.toLowerCase().includes(search) ||
        addon.description.toLowerCase().includes(search) ||
        addon.author.toLowerCase().includes(search);
      const matchesCategory = category === 'All' || addon.category === category;

      return matchesSearch && matchesCategory;
    });
  });

  isInstalled(catalogueAddon: CatalogueAddon): boolean {
    return this.addonService.addons$().some(
      addon => addon.name === catalogueAddon.name
    );
  }

  async installFromUrl() {
    const url = this.manualUrl().trim();
    if (!url) return;

    // Determine if Git or ZIP
    const isGit = url.includes('github.com') && !url.includes('/archive/') && !url.endsWith('.zip');
    const method = isGit ? 'git' : 'zip';

    // Get addons folder from service
    const addonsFolder = this.addonService.addonsDirectory$();
    if (!addonsFolder) {
      this.toastService.error('Please set WoW directory in Settings first');
      return;
    }

    this.isInstalling.set(true);

    const result = await this.electronService.installAddon(url, addonsFolder, method);

    this.isInstalling.set(false);

    if (result.success && result.addonName) {
      this.toastService.success(`Successfully installed "${result.addonName}"`);
      this.manualUrl.set('');

      // Reload addons in Manage page
      await this.addonService.loadAddonsFromDisk();
    } else {
      this.toastService.error(`Installation failed: ${result.error}`);
    }
  }
}
