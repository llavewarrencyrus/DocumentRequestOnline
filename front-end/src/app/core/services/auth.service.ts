// auth.service.ts (Angular frontend)
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { tap, catchError, map, filter, take } from 'rxjs/operators';
import { environment } from '@environments/environment';

export interface LoginCredentials {
  username: string;
  birthdate?: string;
  password: string;
}

export interface UserInfo {
  username: string;
  lastName: string;
  firstName: string;
  middleName: string;
  userId: string;
  role: string;
  issuedBy: string;
  audience: string;
  courseId?: number;
  gender?: string;
  birthDate?: string;
  code?: string;
  years?: number;
}

export interface LoginResponse {
  access_token: string;
  user: UserInfo;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = environment.apiUrl;

  private userInfoSubject = new BehaviorSubject<UserInfo | null>(null);
  public userInfo$ = this.userInfoSubject.asObservable();

  private initialized = false;
  private initializationComplete = new BehaviorSubject<boolean>(false);
  public initializationComplete$ = this.initializationComplete.asObservable();

  // Storage keys
  private readonly TOKEN_KEY = 'access_token';
  private readonly USER_INFO_KEY = 'user_info';

  constructor(
    private http: HttpClient,
    private router: Router,
  ) {
    // Initialize on service creation
    setTimeout(() => this.initializeAuth());
  }

  /**
   * Initialize auth state from stored token and user info
   */
  private initializeAuth(): void {
    const token = this.getToken();
    const storedUserInfo = this.getStoredUserInfo();

    if (!token || !storedUserInfo) {
      this.clearSession();
      this.initialized = true;
      this.initializationComplete.next(true);
      return;
    }
    this.userInfoSubject.next(storedUserInfo);

    this.validateTokenInBackground(token);

    this.initialized = true;
    this.initializationComplete.next(true);
  }

  /**
   * Silently validate token in the background without affecting current user state
   */
  private validateTokenInBackground(token: string): void {
    this.http
      .get<{ user: any }>(`${this.apiUrl}/auth/profile`)
      .pipe(
        catchError((error) => {
          console.warn('Background token validation failed:', error.message);
          return of(null);
        }),
      )
      .subscribe((response) => {
        if (response?.user) {
          console.log('Background token validation successful');
          // Optionally update user info if something changed
          // But don't replace the full user info with minimal profile data
          const currentUser = this.userInfoSubject.value;
          if (currentUser) {
            // Only update specific fields if needed
            // currentUser.role = response.user.role; // etc.
          }
        }
      });
  }

  /**
   * Login with credentials
   */
  login(credentials: LoginCredentials): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${this.apiUrl}/auth/login`, credentials)
      .pipe(
        tap((response) => {
          this.saveToken(response.access_token);
          this.saveUserInfo(response.user);
          this.userInfoSubject.next(response.user);
        }),
        catchError((error) => {
          console.error('Login error:', error);
          return throwError(() => error);
        }),
      );
  }

  /**
   * Logout - clear session storage and navigate to login
   */
  logout(): Observable<any> {
    this.clearSession();
    this.router.navigate(['/login/student']);
    return of({ success: true });
  }

  /**
   * Get current user profile - Use this only when you need fresh data
   * This will NOT overwrite existing user info unless you explicitly update it
   */
  getProfile(refresh: boolean = false): Observable<UserInfo | null> {
    return this.http.get<{ user: any }>(`${this.apiUrl}/auth/profile`).pipe(
      map((response) => {
        console.log('Profile response:', response);

        // The backend only returns minimal user data
        // So we need to merge it with our stored full user info
        const currentUser = this.getUserInfo();

        if (refresh && currentUser) {
          // If refresh is true, update the current user with any new data from profile
          // But preserve all the additional fields
          const updatedUser = {
            ...currentUser,
            // Only update fields that might have changed
            role: response.user.role || currentUser.role,
            username: response.user.username || currentUser.username,
            userId: response.user.sub || currentUser.userId,
          };

          // Save updated user info
          this.saveUserInfo(updatedUser);
          this.userInfoSubject.next(updatedUser);
          return updatedUser;
        }

        // Otherwise just return the current user info
        return currentUser;
      }),
      catchError((error) => {
        console.error('Get profile failed:', error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Wait for auth initialization to complete
   */
  waitForInitialization(): Observable<boolean> {
    if (this.initialized) {
      return of(true);
    }
    return this.initializationComplete$.pipe(
      filter((completed) => completed === true),
      take(1),
    );
  }

  /**
   * Check if auth is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Save token to sessionStorage
   */
  private saveToken(token: string): void {
    sessionStorage.setItem(this.TOKEN_KEY, token);
  }

  /**
   * Get token from sessionStorage
   */
  getToken(): string | null {
    return sessionStorage.getItem(this.TOKEN_KEY);
  }

  getExternalToken(): string | null {
    const user = sessionStorage.getItem(this.USER_INFO_KEY);

    if (user) {
      try {
        const parsedData = JSON.parse(user);
        return parsedData.externalToken || null;
      } catch (error) {
        console.error('Error parsing session storage data:', error);
        return null;
      }
    }

    return null;
  }

  /**
   * Save complete user info to sessionStorage
   */
  private saveUserInfo(userInfo: UserInfo): void {
    sessionStorage.setItem(this.USER_INFO_KEY, JSON.stringify(userInfo));
  }

  /**
   * Get stored user info from sessionStorage
   */
  private getStoredUserInfo(): UserInfo | null {
    const stored = sessionStorage.getItem(this.USER_INFO_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse stored user info', e);
        return null;
      }
    }
    return null;
  }

  /**
   * Get current user info (from memory or sessionStorage)
   */
  getUserInfo(): UserInfo | null {
    // Try memory first
    const fromMemory = this.userInfoSubject.value;
    if (fromMemory) {
      return fromMemory;
    }

    // Fall back to session storage
    return this.getStoredUserInfo();
  }

  getUserRole(): string {
    const userInfo = this.getUserInfo();
    return userInfo ? userInfo.role : '';
  }

  getUserFullName(): string {
    const userInfo = this.getUserInfo();
    return userInfo ? `${userInfo.firstName} ${userInfo.lastName}` : '';
  }

  /**
   * Check if user is logged in
   */
  isLoggedIn(): boolean {
    const token = this.getToken();
    const userInfo = this.getUserInfo();
    return !!(token && userInfo);
  }

  /**
   * Check if user has required role
   */
  hasRole(requiredRole: string | string[]): boolean {
    const userInfo = this.getUserInfo();
    if (!userInfo) return false;

    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(userInfo.role);
    }
    return userInfo.role === requiredRole;
  }

  /**
   * Clear session data from memory and sessionStorage
   */
  clearSession(): void {
    console.log('Clearing session');
    sessionStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem(this.USER_INFO_KEY);
    this.userInfoSubject.next(null);
  }
}
