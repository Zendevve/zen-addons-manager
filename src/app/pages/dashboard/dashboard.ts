import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { AddonService } from '../../services/addon';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DatePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent {
  addonService = inject(AddonService);

  stats = {
    directory: 'D:/Games/WoW/3.3.5a/Interface/AddOns',
    lastCheck: new Date()
  };
}
