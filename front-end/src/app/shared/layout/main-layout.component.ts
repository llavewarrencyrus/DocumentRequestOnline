import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from '../components/header/header.component';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent],
  template: `
    @if (authService.isLoggedIn()) {
      <app-header></app-header>
    }

    <router-outlet></router-outlet>
  `
})
export class MainLayoutComponent {
  authService = inject(AuthService);
}