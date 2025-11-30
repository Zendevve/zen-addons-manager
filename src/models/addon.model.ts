export type AddonStatus = 'enabled' | 'disabled' | 'update-available' | 'broken' | 'installing';
export type AddonCategory = string;

export interface Addon {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  repositoryUrl: string;
  status: AddonStatus;
  category: AddonCategory;
  updateAvailable?: string; // e.g., 'v1.2.1'
  installProgress?: number;
  brokenReason?: string;
}

export interface Installation {
  id: string;
  name: string;
  path: string;
  addons: Addon[];
}
