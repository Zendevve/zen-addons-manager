import { Component, inject, signal, computed } from '@angular/core';
import { AddonService, CatalogueAddon } from '../../services/addon';

@Component({
  selector: 'app-browse',
  imports: [],
  templateUrl: './browse.html',
  styleUrl: './browse.css'
})
export class BrowseComponent {
  addonService = inject(AddonService);

  searchTerm = signal('');
  selectedCategory = signal('All');

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
}
