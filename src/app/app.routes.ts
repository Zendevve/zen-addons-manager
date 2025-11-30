import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { ManageComponent } from './pages/manage/manage';
import { BrowseComponent } from './pages/browse/browse';
import { SettingsComponent } from './pages/settings/settings';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'manage', component: ManageComponent },
  { path: 'browse', component: BrowseComponent },
  { path: 'settings', component: SettingsComponent },
];
