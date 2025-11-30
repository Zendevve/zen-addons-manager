import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DatePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent {
  stats = {
    directory: 'D:/Games/WoW/3.3.5a/Interface/AddOns',
    installedCount: 12,
    updatesAvailable: 3,
    lastCheck: new Date()
  };
}
