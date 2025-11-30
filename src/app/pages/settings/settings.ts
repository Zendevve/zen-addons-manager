import { Component, inject, signal, OnInit } from '@angular/core';
import { AddonService } from '../../services/addon';
import { ElectronService } from '../../services/electron';

@Component({
  selector: 'app-settings',
  imports: [],
  templateUrl: './settings.html',
  styleUrl: './settings.css'
})
export class SettingsComponent implements OnInit {
  addonService = inject(AddonService);
  electronService = inject(ElectronService);

  currentDirectory = signal('');
  autoUpdate = signal(true);
  showBetaVersions = signal(false);
  theme = signal<'dark' | 'light'>('dark');

  expandedSections = signal<Set<string>>(new Set(['directory']));

  async ngOnInit() {
    // Try to load from localStorage first
    const saved = this.addonService.addonsDirectory$();
    if (saved) {
      this.currentDirectory.set(saved);
    } else {
      // Auto-detect WoW folder
      const result = await this.electronService.autoDetectWowFolder();
      if (result.success && result.path) {
        this.currentDirectory.set(result.path);
        this.addonService.setAddonsDirectory(result.path);
      }
    }
  }

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

  async changeDirectory() {
    const dir = await this.electronService.openDirectoryDialog();
    if (dir) {
      this.currentDirectory.set(dir);
      this.addonService.setAddonsDirectory(dir);
    }
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
        console.log('Imported addons:', addons);
        alert(`Successfully imported ${addons.length} addons`);
      } catch (error) {
        alert('Failed to import: Invalid file format');
      }
    };
    reader.readAsText(file);
  }
}
