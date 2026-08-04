// app.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { PrimeNG } from 'primeng/config';
import { definePreset } from '@primeng/themes';
import { ButtonModule } from 'primeng/button';
import Aura from '@primeng/themes/aura';
import { HeaderComponent } from './shared/components/header/header.component';
import { AuthService } from './core/services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    ToastModule,
    ConfirmDialogModule,
    ButtonModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'DocumentRequest';
  isAuthenticated = false;

  private destroy$ = new Subject<void>();
  isAuthInitialized: boolean = false;

  constructor(
    private primeng: PrimeNG,
    private authService: AuthService,
    private router: Router,
    public confirmationService: ConfirmationService
  ) {
    // Theme configuration
    this.primeng.theme.set({
      preset: definePreset(Aura, {
        semantic: {
          primary: {
            50: '{rose.50}',
            100: '{rose.100}',
            200: '{rose.200}',
            300: '{rose.300}',
            400: '{rose.400}',
            500: '{rose.500}',
            600: '{rose.600}',
            700: '{rose.700}',
            800: '{rose.800}',
            900: '{rose.900}',
            950: '{rose.950}'
          }
        }
      }),
      options: {
        darkModeSelector: false || 'none',
        cssLayer: {
          name: 'primeng',
          order: 'tailwind-base, primeng, tailwind-utilities'
        }
      }
    });
  }

  ngOnInit(): void {
    // Wait for auth initialization
    this.authService.waitForInitialization()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.isAuthInitialized = true;

        this.isAuthenticated = this.authService.isLoggedIn();

        if (this.isAuthenticated) {
          const userInfo = this.authService.getUserInfo();
        }
      });

    // Subscribe to authentication changes
    this.authService.userInfo$
      .pipe(takeUntil(this.destroy$))
      .subscribe(userInfo => {
        this.isAuthenticated = !!userInfo;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Check if user is logged in
   */
  isLoggedIn(): boolean {
    return this.isAuthenticated;
  }
}