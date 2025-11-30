import { Component, inject, signal, computed } from '@angular/core';
import { AddonService, CatalogueAddon } from '../../services/addon';
import { ElectronService } from '../../services/electron';

@Component({
  selector: 'app-browse',
  imports: [],
  templateUrl: './browse.html',
  styleUrl: './browse.css'
})
export class BrowseComponent {
  addonService = inject(AddonService);
  electronService = inject(ElectronService);

  searchTerm = signal('');
  selectedCategory = signal('All');
  manualUrl = signal('');
  isInstalling = signal(false);
  installMessage = signal<{ text: string; type: 'success' | 'error' } | null>(null);

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

    // Get addons folder (should be set in settings)
    const addonsFolder = 'D:/Games/WoW/3.3.5a/Interface/AddOns'; // TODO: Get from settings

    this.isInstalling.set(true);
    this.installMessage.set(null);

    const result = await this.electronService.installAddon(url, addonsFolder, method);

    this.isInstalling.set(false);

    if (result.success && result.addonName) {
      this.installMessage.set({
        text: `✅ Successfully installed "${result.addonName}"`,
        type: 'success'
      });
      this.manualUrl.set('');

      // Clear message after 5 seconds
      setTimeout(() => this.installMessage.set(null), 5000);

      // TODO: Refresh addon list in Manage page
    } else {
      this.installMessage.set({
        text: `❌ Installation failed: ${result.error}`,
        type: 'error'
      });
    }
  }
}
