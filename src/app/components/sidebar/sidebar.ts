import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css'
})
export class SidebarComponent {
  navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/manage', label: 'Manage', icon: '📦' },
    { path: '/browse', label: 'Browse', icon: '🔍' },
    { path: '/settings', label: 'Settings', icon: '⚙️' }
  ];
}
