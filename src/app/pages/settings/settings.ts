import { Component, inject, signal } from '@angular/core';
import { AddonService } from '../../services/addon';

@Component({
  selector: 'app-settings',
  imports: [],
  templateUrl: './settings.html',
  styleUrl: './settings.css'
})
export class SettingsComponent {
  addonService = inject(AddonService);

  currentDirectory = signal('D:/Games/WoW/3.3.5a/Interface/AddOns');
  autoUpdate = signal(true);
  showBetaVersions = signal(false);
  theme = signal<'dark' | 'light'>('dark');

  expandedSections = signal<Set<string>>(new Set(['directory']));

  toggleSection(section: string) {
    this.expandedSections.update(sections => {
      const newSections = new Set(sections);
      if (newSections.has(section)) {
        newSections.delete(section);
      } else {
        newSections.add(section);
      }
      return newSections;
    });
  }

  isSectionExpanded(section: string): boolean {
    return this.expandedSections().has(section);
  }

  changeDirectory() {
    // This would use Electron's IPC to open a directory picker
    // For now, just show a placeholder
    alert('Directory picker would open here via Electron IPC');
  }

  exportAddons() {
    const addons = this.addonService.addons$();
    const json = JSON.stringify(addons, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zen-addons-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importAddons(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const addons = JSON.parse(json);
        // In a real app, you'd validate and merge this data
        console.log('Imported addons:', addons);
        alert(`Successfully imported ${addons.length} addons`);
      } catch (error) {
        alert('Failed to import: Invalid file format');
      }
    };
    reader.readAsText(file);
  }
}
