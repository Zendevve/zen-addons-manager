import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './components/sidebar/sidebar';
import { ToastComponent } from './components/toast/toast.component';
import { AddonService } from './services/addon';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SidebarComponent, ToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class AppComponent implements OnInit {
  addonService = inject(AddonService);

  ngOnInit() {
    // Initialize addons from localStorage
    this.addonService.initializeFromStorage();
  }
}
