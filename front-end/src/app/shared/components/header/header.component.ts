import { Component, OnInit, OnDestroy, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { MenubarModule } from 'primeng/menubar';
import { RippleModule } from 'primeng/ripple';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import { TieredMenuModule } from 'primeng/tieredmenu';
import { DividerModule } from 'primeng/divider';
import { StyleClassModule } from 'primeng/styleclass';
import { OverlayPanel, OverlayPanelModule } from 'primeng/overlaypanel';
import { SelectButtonModule } from 'primeng/selectbutton';
import { AuthService, UserInfo } from '../../../core/services/auth.service';
import { Subject, Observable } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NotificationService } from '../../../core/services/notification.service';
import { Notification } from '../../../core/models/notification.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    AvatarModule,
    BadgeModule,
    ButtonModule,
    MenuModule,
    MenubarModule,
    RippleModule,
    TooltipModule,
    TieredMenuModule,
    DividerModule,
    StyleClassModule,
    TagModule,
    OverlayPanelModule,
    SelectButtonModule  // Add SelectButtonModule
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, OnDestroy {
  @ViewChild('notificationPanel') notificationPanel!: OverlayPanel;

  currentUser: UserInfo | null = null;
  notifications: Notification[] = [];
  filteredNotifications: Notification[] = [];
  notificationCount = 0;
  unreadNotifications: Notification[] = [];
  profileMenuItems: any[] = [];

  isUserMenuOpen = false;
  isGuestMenuOpen = false;
  connectionStatus: 'connected' | 'disconnected' | 'connecting' = 'disconnected';

  // Notification filter state with SelectButton options
  filterOptions: any[] = [
    { label: 'All', value: 'all' },
    { label: 'Unread', value: 'unread' }
  ];
  activeFilter: 'all' | 'unread' = 'all';

  loading$: Observable<boolean>;
  hasMore$: Observable<boolean>;
  currentFilter$: Observable<'all' | 'unread'>;

  // Infinite scroll
  private scrollThreshold = 100;
  private notificationPanelElement: HTMLElement | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private router: Router,
    private notificationService: NotificationService,
  ) {
    this.loading$ = this.notificationService.loading$;
    this.hasMore$ = this.notificationService.hasMore$;
    this.currentFilter$ = this.notificationService.currentFilter$;
  }

  ngOnInit(): void {
    this.authService.userInfo$
      .pipe(takeUntil(this.destroy$))
      .subscribe(userInfo => {
        this.currentUser = userInfo;
      });

    // FIXED: Subscribe to filtered notifications using the service method
    this.notificationService.getFilteredNotifications()
      .pipe(takeUntil(this.destroy$))
      .subscribe(notifications => {
        this.filteredNotifications = notifications;
      });

    // Subscribe to all notifications (for internal use)
    this.notificationService.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notifications => {
        this.notifications = notifications;
        this.updateNotificationLists();
      });

    // Subscribe to unread count
    this.notificationService.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        this.notificationCount = count;
        this.updateUnreadOptionLabel();
      });

    // Subscribe to connection status
    this.notificationService.connectionStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.connectionStatus = status;
      });

    // Subscribe to filter changes
    this.notificationService.currentFilter$
      .pipe(takeUntil(this.destroy$))
      .subscribe(filter => {
        this.activeFilter = filter;
      });

    this.currentUser = this.authService.getUserInfo();

    // Request notification permission
    this.notificationService.requestNotificationPermission();

    document.addEventListener('click', (event) => {
      if (event.target instanceof HTMLElement && !event.target.closest('.relative')) {
        this.isUserMenuOpen = false;
        this.isGuestMenuOpen = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private updateNotificationLists(): void {
    this.unreadNotifications = this.notifications.filter(n => !n.read);
  }

  private updateUnreadOptionLabel(): void {
    const unreadOption = this.filterOptions.find(opt => opt.value === 'unread');
    if (unreadOption) {
      if (this.notificationCount > 0) {
        unreadOption.label = `Unread (${this.notificationCount})`;
      } else {
        unreadOption.label = 'Unread';
      }
    }
  }
  // ========== MENU TOGGLE METHODS ==========

  toggleUserMenu(event: Event): void {
    event.stopPropagation();
    this.isUserMenuOpen = !this.isUserMenuOpen;
    this.isGuestMenuOpen = false;
  }

  toggleGuestMenu(event: Event): void {
    event.stopPropagation();
    this.isGuestMenuOpen = !this.isGuestMenuOpen;
    this.isUserMenuOpen = false;
  }

  closeUserMenu(): void {
    this.isUserMenuOpen = false;
  }

  closeGuestMenu(): void {
    this.isGuestMenuOpen = false;
  }

  executeMenuItem(item: any): void {
    if (item.command) {
      item.command();
    }
    this.closeUserMenu();
    this.closeGuestMenu();
  }

  // ========== NOTIFICATION METHODS ==========

  onNotificationPanelShow(): void {
    // Update unread option label when panel opens
    this.updateUnreadOptionLabel();

    // Reset scroll position
    setTimeout(() => {
      this.notificationPanelElement = document.querySelector('.notification-list-container');
      if (this.notificationPanelElement) {
        this.notificationPanelElement.scrollTop = 0;
      }
    });
  }

  setFilter(filter: 'all' | 'unread'): void {
    this.activeFilter = filter;
    this.notificationService.setFilter(filter);

    // Refresh notifications if needed
    if (this.notifications.length === 0) {
      this.notificationService.refreshNotifications();
    }
  }

  onFilterChange(event: any): void {
    this.setFilter(event.value);
  }

  onScroll(event: Event): void {
    const element = event.target as HTMLElement;
    if (!element) return;

    const scrollPosition = element.scrollHeight - element.scrollTop - element.clientHeight;

    if (scrollPosition < this.scrollThreshold) {
      this.notificationService.loadMoreNotifications();
    }
  }

  markNotificationAsRead(notificationId: number, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }

    this.notificationService.markAsRead(notificationId).subscribe({
      next: () => {
        // UI updates handled by service
        this.updateUnreadOptionLabel();
      },
      error: (error) => {
        console.error('Failed to mark notification as read:', error);
      }
    });
  }

  markAllNotificationsAsRead(): void {
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        // UI updates handled by service
        this.updateUnreadOptionLabel();
      },
      error: (error) => {
        console.error('Failed to mark all as read:', error);
      }
    });
  }

  onNotificationClick(notification: Notification, event: Event): void {
    if (!notification.read) {
      this.markNotificationAsRead(notification.id, event);
    }

    // Navigate based on notification type and user role
    this.handleNotificationNavigation(notification);
  }

  handleNotificationNavigation(notification: Notification): void {
    const { type, data } = notification;
    const userRole = this.currentUser?.role;

    if (userRole === 'Student') {
      // Student navigation - navigate to specific tab based on notification type
      switch (type) {
        case 'REQUEST_APPROVED':
          this.router.navigate(['/student/dashboard'], {
            queryParams: {
              tab: 'requests',
              filter: 'active',
              requestId: data.requestId,
              highlight: data.requestId
            }
          });
          break;

        case 'REQUEST_DECLINED':
          this.router.navigate(['/student/dashboard'], {
            queryParams: {
              tab: 'requests',
              filter: 'declined',
              requestId: data.requestId,
              highlight: data.requestId
            }
          });
          break;

        case 'CLAIM_DATE_SET':
        case 'REQUEST_UPDATED':
          this.router.navigate(['/student/dashboard'], {
            queryParams: {
              tab: 'requests',
              filter: 'active',
              requestId: data.requestId,
              highlight: data.requestId
            }
          });
          break;

        case 'RECEIPT_UPLOADED': // Student might see confirmation
          this.router.navigate(['/student/dashboard'], {
            queryParams: {
              tab: 'requests',
              filter: 'active',
              requestId: data.requestId,
              highlight: data.requestId
            }
          });
          break;

        default:
          this.router.navigate(['/student/dashboard']);
      }
    }
    else if (userRole === 'Registrar' || userRole === 'Admin') {
      // Registrar/Admin navigation
      let tab = 'pending';

      // Determine which tab to open based on notification type and request status
      switch (type) {
        case 'REQUEST_CREATED':
          tab = 'pending';
          break;

        case 'RECEIPT_UPLOADED':
          tab = 'pending'; // You might have a payment/receipt tab
          break;

        case 'REQUEST_APPROVED':
        case 'REQUEST_DECLINED':
        case 'CLAIM_DATE_SET':
          // For status changes, go to appropriate tab based on the data
          if (data['status']) {
            tab = this.getTabFromStatus(data['status']);
          } else {
            tab = 'all';
          }
          break;
      }

      this.router.navigate(['/arcstaff/dashboard'], {
        queryParams: {
          requestId: data.requestId,
          tab: tab,
          highlight: data.requestId
        }
      });
    }

    // Close notification panel
    this.notificationPanel?.hide();
  }

  private getTabFromStatus(status: string): string {
    switch (status) {
      case 'Pending': return 'pending';
      case 'Approved': return 'approved';
      case 'Processing': return 'processing';
      case 'Available for Claiming': return 'available';
      case 'Completed': return 'completed';
      case 'Declined': return 'declined';
      default: return 'all';
    }
  }

  getNotificationIcon(notification: Notification): string {
    const typeIcons: Record<string, string> = {
      'REQUEST_CREATED': 'pi pi-plus-circle',
      'REQUEST_APPROVED': 'pi pi-check-circle',
      'REQUEST_DECLINED': 'pi pi-times-circle',
      'CLAIM_DATE_SET': 'pi pi-calendar',
      'RECEIPT_UPLOADED': 'pi pi-upload',
      'REQUEST_UPDATED': 'pi pi-refresh'
    };

    return typeIcons[notification.type] || 'pi pi-bell';
  }

  getNotificationTime(notification: Notification): string {
    const now = new Date();
    const date = new Date(notification.createdAt);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  }

  // ========== NAVIGATION METHODS ==========

  navigateToProfile(): void {
    if (this.currentUser) {
      const role = this.currentUser.role.toLowerCase();
      if (role === 'registrar') {
        this.router.navigate(['/arcstaff/profile']);
      } else if (role === 'admin') {
        this.router.navigate(['/admin/profile']);
      } else {
        this.router.navigate([`/${role}/profile`]);
      }
    }
  }

  navigateToSettings(): void {
    if (this.currentUser) {
      const role = this.currentUser.role.toLowerCase();
      if (role === 'registrar') {
        this.router.navigate(['/arcstaff/settings']);
      } else if (role === 'admin') {
        this.router.navigate(['/admin/settings']);
      } else {
        this.router.navigate([`/${role}/settings`]);
      }
    }
  }

  navigateToStudentLogin(): void {
    this.router.navigate(['/login/student']);
  }

  navigateToStaffLogin(): void {
    this.router.navigate(['/login/staff']);
  }

  // This method is called from the template for guest users
  navigateToLogin(): void {
    this.router.navigate(['/login/student']);
  }

  logout(): void {
    this.closeUserMenu();
    this.authService.logout().subscribe({
      next: () => {
        this.router.navigate(['/login/student']);
      },
      error: () => {
        this.authService.clearSession();
        this.router.navigate(['/login/student']);
      }
    });
  }

  // ========== DISPLAY METHODS ==========

  /**
   * Get welcome message - called from template
   */
  getWelcomeMessage(): string {
    if (!this.isLoggedIn() || !this.currentUser) {
      return 'Document Request System';
    }

    if (this.currentUser.firstName) {
      return `Welcome, ${this.currentUser.firstName}`;
    }

    if (this.currentUser.role === 'Admin') {
      return 'Welcome, Administrator';
    }

    if (this.currentUser.role === 'Registrar') {
      return 'Welcome, ARC Staff';
    }

    return `Welcome, ${this.currentUser.username || 'User'}`;
  }

  /**
   * Get user initials for avatar - called from template
   */
  getUserInitials(): string {
    if (!this.isLoggedIn() || !this.currentUser) {
      return 'G';
    }

    if (this.currentUser.firstName) {
      return this.currentUser.firstName.charAt(0).toUpperCase();
    }

    if (this.currentUser.role === 'Admin') {
      return 'A';
    }

    if (this.currentUser.role === 'Registrar') {
      return 'S';
    }

    return this.currentUser.username?.charAt(0).toUpperCase() || 'U';
  }

  /**
   * Get display name for menu - called from template
   */
  getUserDisplayName(): string {
    if (!this.isLoggedIn() || !this.currentUser) {
      return 'Guest';
    }

    if (this.currentUser.firstName) {
      return this.currentUser.firstName;
    }

    if (this.currentUser.role === 'Admin') {
      return 'Administrator';
    }

    if (this.currentUser.role === 'Registrar') {
      return 'ARC Staff';
    }

    return this.currentUser.username || 'User';
  }

  /**
   * Get student ID for display - called from template
   */
  getStudentId(): string {
    if (this.currentUser?.role === 'Student') {
      return this.currentUser.username || '';
    }
    return '';
  }

  /**
   * Get user role badge text - called from template
   */
  getUserRoleBadge(): string {
    if (!this.isLoggedIn() || !this.currentUser) return 'Guest';

    const role = this.currentUser.role;
    switch (role) {
      case 'Admin': return 'Admin';
      case 'Registrar': return 'Staff';
      case 'Student': return 'Student';
      default: return role;
    }
  }

  /**
   * Get full name for tooltip - called from template
   */
  getFullName(): string {
    if (!this.isLoggedIn() || !this.currentUser) {
      return '';
    }

    if (this.currentUser.firstName || this.currentUser.lastName) {
      return `${this.currentUser.firstName || ''} ${this.currentUser.lastName || ''}`.trim();
    }

    if (this.currentUser.role === 'Admin') {
      return 'Administrator';
    }

    if (this.currentUser.role === 'Registrar') {
      return 'ARC Staff';
    }

    return this.currentUser.username || '';
  }

  /**
   * Check if user is logged in - called from template
   */
  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  /**
   * Get role badge class for styling
   */
  getRoleBadgeClass(): string {
    if (!this.isLoggedIn() || !this.currentUser) return 'surface-200 text-surface-800';

    const role = this.currentUser.role;
    switch (role) {
      case 'Admin': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      case 'Registrar': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
      case 'Student': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      default: return 'surface-200 text-surface-800';
    }
  }
}