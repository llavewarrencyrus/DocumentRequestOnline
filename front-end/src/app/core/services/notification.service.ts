// frontend/src/app/core/services/notification.service.ts
import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, Subject, throwError, combineLatest } from 'rxjs';
import { map, catchError, takeUntil } from 'rxjs/operators';
import { environment } from '@environments/environment';
import { AuthService } from './auth.service';
import {
  type Notification as AppNotification,
  SseEvent,
  NotificationsResponse,
  UnreadCountResponse
} from '../models/notification.model';

@Injectable({
  providedIn: 'root'
})
export class NotificationService implements OnDestroy {
  private apiUrl = environment.apiUrl;

  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 3000; // Start with 3 seconds
  private destroy$ = new Subject<void>();

  // Pagination state
  private currentPage = 0;
  private pageSize = 20;
  private hasMorePages = true;
  private isLoadingMore = false;

  // Observable streams
  private notificationsSubject = new BehaviorSubject<AppNotification[]>([]);
  private unreadCountSubject = new BehaviorSubject<number>(0);
  private connectionStatusSubject = new BehaviorSubject<'connected' | 'disconnected' | 'connecting'>('disconnected');
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private hasMoreSubject = new BehaviorSubject<boolean>(true);
  private currentFilterSubject = new BehaviorSubject<'all' | 'unread'>('all');

  public notifications$ = this.notificationsSubject.asObservable();
  public unreadCount$ = this.unreadCountSubject.asObservable();
  public connectionStatus$ = this.connectionStatusSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();
  public hasMore$ = this.hasMoreSubject.asObservable();
  public currentFilter$ = this.currentFilterSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private ngZone: NgZone
  ) {

    this.authService.userInfo$
      .pipe(takeUntil(this.destroy$))
      .subscribe(userInfo => {
        if (userInfo) {
          this.connect();
        } else {
          this.disconnect();
        }
      });
  }

  ngOnDestroy() {
    this.disconnect();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Connect to SSE stream
   */
  private async connect(): Promise<void> {
    if (this.eventSource || !this.authService.isLoggedIn()) {
      return;
    }

    this.connectionStatusSubject.next('connecting');

    try {
      const response = await this.http.get<{ connectionToken: string, sseUrl: string; }>(
        `${this.apiUrl}/notifications/connect`,
        { withCredentials: true }
      ).toPromise();

      if (!response) {
        throw new Error('Failed to get connection token');
      }

      this.eventSource = new EventSource(
        `${this.apiUrl}/notifications/stream?token=${response.connectionToken}`,
        { withCredentials: true }
      );

      this.eventSource.onopen = () => {
        this.ngZone.run(() => {
          this.connectionStatusSubject.next('connected');
          this.reconnectAttempts = 0;
          this.reconnectDelay = 3000;

          // Load initial notifications
          this.resetAndLoadNotifications();
        });
      };

      this.eventSource.onmessage = (event) => {
        this.ngZone.run(() => {
          try {
            const sseEvent: SseEvent = JSON.parse(event.data);
            this.handleSseEvent(sseEvent);
          } catch (error) {
            console.error('Error parsing SSE message:', error);
          }
        });
      };

      this.eventSource.onerror = (error) => {
        this.ngZone.run(() => {
          console.error('SSE connection error:', error);
          this.handleConnectionError();
        });
      };

    } catch (error) {
      console.error('Error creating SSE connection:', error);
      this.handleConnectionError();
    }
  }

  /**
   * Disconnect from SSE stream
   */
  private disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.connectionStatusSubject.next('disconnected');
    this.notificationsSubject.next([]);
    this.unreadCountSubject.next(0);
    this.resetPagination();
  }

  /**
   * Reset pagination state
   */
  private resetPagination(): void {
    this.currentPage = 0;
    this.hasMorePages = true;
    this.isLoadingMore = false;
    this.hasMoreSubject.next(true);
  }

  /**
   * Reset and load notifications
   */
  resetAndLoadNotifications(): void {
    this.resetPagination();
    this.notificationsSubject.next([]);
    this.loadNotifications();
  }

  /**
   * Handle connection errors with exponential backoff
   */
  private handleConnectionError(): void {
    this.connectionStatusSubject.next('disconnected');

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;

      // Exponential backoff with jitter
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
        + Math.random() * 1000;
      setTimeout(() => {
        if (this.authService.isLoggedIn()) {
          this.connect();
        }
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
      this.disconnect();
    }
  }

  /**
   * Handle incoming SSE events
   */
  private handleSseEvent(event: SseEvent): void {
    switch (event.type) {
      case 'notification':
        this.handleNewNotification(event.data);
        break;

      case 'ping':
        console.debug('SSE ping received');
        break;

      case 'connection-established':
        console.log('SSE connection established:', event.data);
        break;

      default:
        console.log('Unknown SSE event type:', event.type);
    }
  }

  /**
   * Handle new notification
   */
  private handleNewNotification(notification: AppNotification): void {
    // Process the notification to add read status for current user
    const processedNotification = this.processNotification(notification);

    // Update notifications list (add to top)
    const current = this.notificationsSubject.value;
    this.notificationsSubject.next([processedNotification, ...current]);

    // Update unread count
    const currentCount = this.unreadCountSubject.value;
    this.unreadCountSubject.next(currentCount + 1);

    // Show browser notification if supported and permitted
    this.showBrowserNotification(processedNotification);
  }

  /**
   * Process notification to add computed read property
   */
  private processNotification(notification: any): AppNotification {
    const userInfo = this.authService.getUserInfo();

    if (!userInfo) {
      return notification;
    }

    // Create a new object to avoid mutating the original
    const processed = { ...notification };

    // Compute read status - match backend's isReadByUser logic
    if (userInfo.role === 'Student') {
      // For student, check the read field (backward compatibility)
      processed.read = processed.read || false;
    } else if (processed.isGlobal) {
      // For global role-based notifications, check shared read status
      processed.read = processed.read || false;
    } else {
      // For non-global role-based notifications, check readBy object
      if (processed.readBy && processed.readBy[userInfo.username]) {
        processed.read = processed.readBy[userInfo.username].read === true;
      } else {
        processed.read = false;
      }
    }

    return processed;
  }

  /**
   * Process array of notifications
   */
  private processNotifications(notifications: any[]): AppNotification[] {
    const userInfo = this.authService.getUserInfo();

    if (!userInfo) {
      return notifications;
    }

    return notifications.map(notification => this.processNotification(notification));
  }

  /**
   * Show browser notification
   */
  private showBrowserNotification(notification: AppNotification): void {
    if (!('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/assets/icons/notification-icon.png'
      });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }

  /**
   * Load notifications from API with pagination
   */
  loadNotifications(): void {
    if (this.isLoadingMore || !this.hasMorePages) {
      return;
    }

    this.isLoadingMore = true;
    this.loadingSubject.next(true);

    const offset = this.currentPage * this.pageSize;

    this.http.get<NotificationsResponse>(
      `${this.apiUrl}/notifications?limit=${this.pageSize}&offset=${offset}`
    ).subscribe(data => {
      const processedNotifications = this.processNotifications(data.notifications);

      this.hasMorePages = data.notifications.length === this.pageSize;
      this.hasMoreSubject.next(this.hasMorePages);

      const currentNotifications = this.notificationsSubject.value;

      if (this.currentPage === 0) {
        this.notificationsSubject.next(processedNotifications);
      } else {
        this.notificationsSubject.next([...currentNotifications, ...processedNotifications]);
      }

      // Update unread count
      this.unreadCountSubject.next(data.unreadCount);

      this.currentPage++;
      this.isLoadingMore = false;
      this.loadingSubject.next(false);
    });
  }

  /**
   * Load more notifications (for infinite scroll)
   */
  loadMoreNotifications(): void {
    this.loadNotifications();
  }

  /**
   * Refresh notifications
   */
  refreshNotifications(): void {
    this.resetAndLoadNotifications();
  }

  /**
   * Set notification filter
   */
  setFilter(filter: 'all' | 'unread'): void {
    this.currentFilterSubject.next(filter);
  }

  /**
   * Get filtered notifications based on current filter
   */
  getFilteredNotifications(): Observable<AppNotification[]> {
    return combineLatest([
      this.notifications$,
      this.currentFilter$
    ]).pipe(
      map(([notifications, filter]) => {
        if (filter === 'unread') {
          return notifications.filter(n => !n.read);
        }
        return notifications;
      })
    );
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: number): Observable<AppNotification> {
    return this.http.patch<{ success: boolean; data: AppNotification; }>(
      `${this.apiUrl}/notifications/${notificationId}/read`,
      {},
      { withCredentials: true }
    ).pipe(
      map(response => {
        const notification = response;

        // Process the notification to add read status
        const processedNotification = this.processNotification(notification);

        // Update local state
        const current = this.notificationsSubject.value;
        const index = current.findIndex(n => n.id === notificationId);

        if (index !== -1) {
          // Update the notification
          current[index] = processedNotification;
          this.notificationsSubject.next([...current]);

          // Update unread count
          const userInfo = this.authService.getUserInfo();
          if (userInfo) {
            // Recalculate unread count from current notifications
            const unreadCount = current.filter(n => {
              if (n.readBy && n.readBy[userInfo.username]) {
                return !n.readBy[userInfo.username].read;
              }
              return !n.read;
            }).length;

            this.unreadCountSubject.next(unreadCount);
          }
        }

        return processedNotification;
      }),
      catchError(error => {
        console.error('Error marking notification as read:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): Observable<void> {
    return this.http.post<{ success: boolean; }>(
      `${this.apiUrl}/notifications/mark-all-read`,
      {},
      { withCredentials: true }
    ).pipe(
      map(() => {
        const userInfo = this.authService.getUserInfo();

        if (!userInfo) return;

        // Update local state
        const current = this.notificationsSubject.value;

        // Mark all notifications as read for current user
        const updated = current.map(notification => {
          const updated = { ...notification };

          // Update readBy object
          if (!updated.readBy) {
            updated.readBy = {};
          }

          updated.readBy[userInfo.username] = {
            read: true,
            readAt: new Date()
          };

          // Update computed read property
          updated.read = true;

          return updated;
        });

        this.notificationsSubject.next(updated);
        this.unreadCountSubject.next(0);
      }),
      catchError(error => {
        console.error('Error marking all as read:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get unread count
   */
  getUnreadCount(): Observable<number> {
    return this.http.get<UnreadCountResponse>(
      `${this.apiUrl}/notifications/unread-count`,
      { withCredentials: true }
    ).pipe(
      map(response => response.count),
      catchError(error => {
        console.error('Error getting unread count:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Request browser notification permission
   */
  requestNotificationPermission(): void {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  /**
   * Clear all notifications (local only)
   */
  clearLocalNotifications(): void {
    this.notificationsSubject.next([]);
    this.unreadCountSubject.next(0);
    this.resetPagination();
  }

  /**
   * Check if loading more notifications
   */
  isLoading(): boolean {
    return this.isLoadingMore;
  }

  /**
   * Check if there are more pages to load
   */
  hasMore(): boolean {
    return this.hasMorePages;
  }
}