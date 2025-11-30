import { Component, inject } from '@angular/core';
import { AddonService, Addon } from '../../services/addon';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-manage',
  imports: [DatePipe],
  templateUrl: './manage.html',
  styleUrl: './manage.css'
})
export class ManageComponent {
  addonService = inject(AddonService);

  getStatusIcon(status: Addon['status']): string {
    switch (status) {
      case 'enabled': return '✓';
      case 'disabled': return '○';
      case 'outdated': return '▲';
    }
  }

  getStatusClass(status: Addon['status']): string {
    switch (status) {
      case 'enabled': return 'status-enabled';
      case 'disabled': return 'status-disabled';
      case 'outdated': return 'status-outdated';
    }
  }
}
