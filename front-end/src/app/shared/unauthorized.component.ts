import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [RouterModule],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div class="text-center">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6">
          <svg class="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h1 class="text-4xl font-bold text-gray-900 mb-4">Access Denied</h1>
        <p class="text-lg text-gray-600 mb-8">
          You don't have permission to access this page with your current role.
        </p>
        <div class="space-x-4">
          <button 
            (click)="goBack()"
            class="px-6 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition duration-200"
          >
            Go Back
          </button>
          <button 
            (click)="goToDashboard()"
            class="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition duration-200"
          >
            Go to Dashboard
          </button>
          <button 
            (click)="logout()"
            class="px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition duration-200"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  `
})
export class UnauthorizedComponent {
  constructor(private authService: AuthService) {}

  goBack(): void {
    window.history.back();
  }

  goToDashboard(): void {
    const userInfo = this.authService.getUserInfo();
    if (userInfo?.role === 'Student') {
      window.location.href = '/student/dashboard';
    } else if (userInfo?.role === 'Admin') {
      window.location.href = '/admin/dashboard';
    } else if (userInfo?.role === 'Faculty') {
      window.location.href = '/faculty/dashboard';
    } else {
      window.location.href = '/login';
    }
  }

  logout(): void {
    this.authService.logout();
  }
}