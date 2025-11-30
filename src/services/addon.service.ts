import { Injectable, signal, WritableSignal, computed } from '@angular/core';
import { Addon, AddonStatus, Installation } from '../models/addon.model';

@Injectable({
  providedIn: 'root',
})
export class AddonService {
  installations: WritableSignal<Installation[]> = signal<Installation[]>([]);
  activeInstallationId = signal<string | null>(null);

  activeInstallation = computed(() => {
    const installations = this.installations();
    const activeId = this.activeInstallationId();
    return installations.find(inst => inst.id === activeId) ?? null;
  });

  addons = computed(() => this.activeInstallation()?.addons ?? []);

  constructor() {
    this.loadInitialData();
  }

  private loadInitialData() {
    const initialInstallations: Installation[] = [
      {
        id: 'wow_retail',
        name: 'World of Warcraft: Retail',
        path: 'C:/Program Files/World of Warcraft/_retail_',
        addons: [
          { id: '1', name: 'BrutalUI', author: 'DevCore', version: '1.2.0', description: 'A complete UI overhaul with a minimalist and brutalist aesthetic.', repositoryUrl: 'https://github.com/user/BrutalUI', status: 'enabled', category: 'UI', updateAvailable: '1.2.1' },
          { id: '2', name: 'DamageMeterX', author: 'Metrics Inc.', version: '3.4.5', description: 'Advanced combat analytics and damage tracking.', repositoryUrl: 'https://github.com/user/DamageMeterX', status: 'disabled', category: 'Combat' },
        ]
      },
      {
        id: 'wow_classic',
        name: 'World of Warcraft: Classic',
        path: 'C:/Program Files/World of Warcraft/_classic_',
        addons: [
          { id: '3', name: 'AutoSellJunk', author: 'QoL-Master', version: '0.9.1', description: 'Automatically sells gray quality items to vendors.', repositoryUrl: 'https://gitlab.com/user/AutoSellJunk', status: 'enabled', category: 'Utility' },
          { id: '4', name: 'AuctioneerPro', author: 'GoldMakers', version: '2.1.0', description: 'Economy helper for scanning and posting on the auction house.', repositoryUrl: 'https://github.com/user/AuctioneerPro', status: 'broken', category: 'Economy', brokenReason: `Dependency 'CoreLib' is missing.` }
        ]
      }
    ];
    this.installations.set(initialInstallations);
    this.activeInstallationId.set(initialInstallations[0]?.id ?? null);
  }

  switchInstallation(id: string) {
    this.activeInstallationId.set(id);
  }

  private updateActiveInstallationAddons(updateFn: (addons: Addon[]) => Addon[]) {
    const activeId = this.activeInstallationId();
    if (!activeId) return;

    this.installations.update(installations =>
      installations.map(inst =>
        inst.id === activeId
          ? { ...inst, addons: updateFn(inst.addons) }
          : inst
      )
    );
  }
  
  addAddon(repoUrl: string) {
    const urlParts = repoUrl.replace(/\/$/, '').split('/');
    const repoName = urlParts.pop()?.replace('.git', '') || 'new-addon';
    const author = urlParts.pop() || 'Git User';

    const tempId = self.crypto.randomUUID();
    const tempAddon: Addon = {
      id: tempId,
      name: `Installing: ${repoName}`,
      author: author,
      version: '0.0.0',
      description: `Automating installation from ${repoUrl}`,
      repositoryUrl: repoUrl,
      status: 'installing',
      category: 'Utility',
      installProgress: 0,
    };

    this.updateActiveInstallationAddons(addons => [...addons, tempAddon]);

    const installInterval = setInterval(() => {
      let isComplete = false;
      this.updateActiveInstallationAddons(addons =>
        addons.map(a => {
          if (a.id === tempId && a.installProgress !== undefined && a.installProgress < 100) {
            return { ...a, installProgress: a.installProgress + 10 };
          }
          if (a.id === tempId && a.installProgress !== undefined && a.installProgress >= 100) {
            isComplete = true;
          }
          return a;
        })
      );

      if (isComplete) {
        clearInterval(installInterval);
        const finalName = repoName.replace(/-main$/, '').replace(/-master$/, '');
        const newAddon: Addon = {
          id: tempId,
          name: finalName,
          author: author,
          version: '1.0.0',
          description: `A newly installed addon: ${finalName}`,
          repositoryUrl: repoUrl,
          status: 'disabled',
          category: 'Utility'
        };
        this.updateActiveInstallationAddons(addons => addons.map(a => a.id === tempId ? newAddon : a));
      }
    }, 300);
  }

  toggleStatus(id: string) {
    this.updateActiveInstallationAddons(addons =>
      addons.map(addon =>
        addon.id === id
          ? { ...addon, status: addon.status === 'enabled' ? 'disabled' : 'enabled' }
          : addon
      )
    );
  }
  
  updateAddonCategory(id: string, category: string) {
    this.updateActiveInstallationAddons(addons =>
      addons.map(addon =>
        addon.id === id ? { ...addon, category } : addon
      )
    );
  }

  updateAddon(id: string): Promise<void> {
    return new Promise(resolve => {
      setTimeout(() => {
        this.updateActiveInstallationAddons(addons =>
          addons.map(addon =>
            addon.id === id && addon.updateAvailable
              ? { ...addon, version: addon.updateAvailable, updateAvailable: undefined, status: 'enabled' }
              : addon
          )
        );
        resolve();
      }, 1000);
    });
  }

  repairAddon(id: string): Promise<void> {
    return new Promise(resolve => {
      setTimeout(() => {
        this.updateActiveInstallationAddons(addons =>
          addons.map(addon =>
            addon.id === id ? { ...addon, status: 'enabled', brokenReason: undefined } : addon
          )
        );
        resolve();
      }, 1500);
    });
  }

  deleteAddon(id: string): Promise<void> {
    return new Promise(resolve => {
      setTimeout(() => {
        this.updateActiveInstallationAddons(addons => addons.filter(addon => addon.id !== id));
        resolve();
      }, 700);
    });
  }

  bulkEnable(ids: Set<string>) {
    this.updateActiveInstallationAddons(addons =>
      addons.map(addon =>
        ids.has(addon.id) && addon.status !== 'installing' && addon.status !== 'broken'
          ? { ...addon, status: 'enabled' }
          : addon
      )
    );
  }

  bulkDisable(ids: Set<string>) {
    this.updateActiveInstallationAddons(addons =>
      addons.map(addon =>
        ids.has(addon.id) && addon.status !== 'installing' && addon.status !== 'broken'
          ? { ...addon, status: 'disabled' }
          : addon
      )
    );
  }

  bulkDelete(ids: Set<string>) {
    this.updateActiveInstallationAddons(addons => addons.filter(addon => !ids.has(addon.id)));
  }
}