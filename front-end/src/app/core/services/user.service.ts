// [file name]: user.service.ts
// [file content begin]
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService, UserInfo } from './auth.service';

export interface NavigationItem {
  label: string;
  icon: string;
  route: string;
  roles: string[];
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private userInfoSubject = new BehaviorSubject<UserInfo | null>(null);
  public userInfo$ = this.userInfoSubject.asObservable();

  // Define navigation items based on roles
  private navigationItems: NavigationItem[] = [
    // Student Navigation
    {
      label: 'Dashboard',
      icon: 'home',
      route: '/student/dashboard',
      roles: ['Student']
    },
    {
      label: 'Request Document',
      icon: 'file-plus',
      route: '/student/requests/new',
      roles: ['Student']
    },
    {
      label: 'My Requests',
      icon: 'file-text',
      route: '/student/dashboard', // Tab for requests is in dashboard
      roles: ['Student']
    },
    {
      label: 'Document Catalog',
      icon: 'book',
      route: '/student/dashboard', // Tab for catalog is in dashboard
      roles: ['Student']
    },
    {
      label: 'Profile',
      icon: 'user',
      route: '/student/profile',
      roles: ['Student']
    },
    
    // ARC Staff Navigation
    {
      label: 'Staff Dashboard',
      icon: 'dashboard',
      route: '/arcstaff/dashboard',
      roles: ['Registrar']
    },
    {
      label: 'All Requests',
      icon: 'list',
      route: '/arcstaff/dashboard',
      roles: ['Registrar']
    },
    {
      label: 'Pending Review',
      icon: 'clock',
      route: '/arcstaff/dashboard',
      roles: ['Registrar']
    },
    
    // Admin Navigation
    {
      label: 'Admin Dashboard',
      icon: 'cog',
      route: '/admin/dashboard',
      roles: ['Admin']
    },
    {
      label: 'User Management',
      icon: 'users',
      route: '/admin/users',
      roles: ['Admin']
    },
    {
      label: 'System Settings',
      icon: 'adjustments',
      route: '/admin/settings',
      roles: ['Admin']
    },
  ];

  constructor(private authService: AuthService) {
    // Subscribe to auth service user info changes
    this.authService.userInfo$.subscribe(userInfo => {
      this.userInfoSubject.next(userInfo);
    });

    // Initialize with current user info
    const currentUser = this.authService.getUserInfo();
    if (currentUser) {
      this.userInfoSubject.next(currentUser);
    }
  }

  getUserInfo(): UserInfo | null {
    return this.userInfoSubject.value;
  }

  getCurrentUserRole(): string | null {
    return this.userInfoSubject.value?.role || null;
  }

  getNavigationItems(): NavigationItem[] {
    const userRole = this.getCurrentUserRole();
    if (!userRole) return [];

    return this.navigationItems.filter(item => 
      item.roles.includes(userRole)
    );
  }

  getUserRoleDisplay(): string {
    const role = this.getCurrentUserRole();
    switch (role) {
      case 'Student':
        return 'Student';
      case 'Registrar':
        return 'ARC Staff';
      case 'Admin':
        return 'Administrator';
      default:
        return 'User';
    }
  }

  canAccessRoute(route: string): boolean {
    const userRole = this.getCurrentUserRole();
    if (!userRole) return false;

    // Special handling for student dashboard tabs since they share the same route
    if (route === '/student/dashboard' && userRole === 'Student') {
      return true;
    }
    
    // Special handling for arcstaff dashboard since all actions are in one view
    if (route === '/arcstaff/dashboard' && userRole === 'Registrar') {
      return true;
    }

    const navItem = this.navigationItems.find(item => item.route === route);
    return navItem ? navItem.roles.includes(userRole) : false;
  }

  getDashboardRoute(): string {
    const role = this.getCurrentUserRole();
    switch (role) {
      case 'Student':
        return '/student/dashboard';
      case 'Registrar':
        return '/arcstaff/dashboard';
      case 'Admin':
        return '/admin/dashboard';
      case 'Faculty':
        return '/faculty/dashboard';
      default:
        return '/login/student';
    }
  }

  // Helper method to get user's full name based on role
  getUserFullName(userInfo: UserInfo): string {
    if (!userInfo) return '';
    
    // For staff/admin, use username as display name
    if (userInfo.role === 'Registrar' || userInfo.role === 'Admin') {
      if (userInfo.username === 'arc.staff') return 'ARC Staff';
      if (userInfo.username === 'arc.admin') return 'ARC Admin';
      return userInfo.username || 'ARC Staff';
    }
    
    // For students, format full name
    const lastName = userInfo.lastName || '';
    const firstName = userInfo.firstName || '';
    const middleName = userInfo.middleName ? ` ${userInfo.middleName}` : '';
    
    const fullName = `${lastName}, ${firstName}${middleName}`.trim();
    return fullName || userInfo.username || 'Student';
  }

  // Helper method to get student's full name (for backward compatibility)
  getStudentFullName(userInfo: UserInfo): string {
    return this.getUserFullName(userInfo);
  }

  // Helper method to get role-specific greeting
  getRoleBasedGreeting(): string {
    const role = this.getCurrentUserRole();
    const userInfo = this.getUserInfo();
    const name = userInfo ? this.getUserFullName(userInfo) : '';
    
    switch (role) {
      case 'Student':
        return `Welcome back, ${name}`;
      case 'Registrar':
        return `Welcome, ${name || 'ARC Staff'}`;
      case 'Admin':
        return `Welcome, ${name || 'Administrator'}`;
      case 'Faculty':
        return `Welcome, ${name || 'Faculty Member'}`;
      default:
        return 'Welcome';
    }
  }

  // Check if user has any of the specified roles
  hasAnyRole(roles: string[]): boolean {
    const userRole = this.getCurrentUserRole();
    if (!userRole) return false;
    return roles.includes(userRole);
  }

  isStudent(): boolean {
    return this.getCurrentUserRole() === 'Student';
  }

  // Check if user is ARC staff
  isRegistrar(): boolean {
    return this.getCurrentUserRole() === 'Registrar';
  }

  // Check if user is admin
  isAdmin(): boolean {
    return this.getCurrentUserRole() === 'Admin';
  }

  // Get login path based on role (for redirects)
  getLoginPath(): string {
    const role = this.getCurrentUserRole();
    switch (role) {
      case 'Student':
        return '/login/student';
      case 'Registrar':
      case 'Admin':
        return '/login/staff';
      default:
        return '/login/student';
    }
  }

  // Clear user data on logout
  clearUserData(): void {
    this.userInfoSubject.next(null);
  }
}
// [file content end]