import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { User, CreateUserDto, UpdateUserDto, PaginatedResponse } from './account.model';

@Injectable({
  providedIn: 'root',
})
export class AccountService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/users`;

  getUsers(params: {
    role?: string;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
    lastLoginFrom?: string;
    lastLoginTo?: string;
    createdFrom?: string;
    createdTo?: string;
  }): Observable<PaginatedResponse<User>> {
    let httpParams = new HttpParams();

    if (params.role) httpParams = httpParams.set('role', params.role);
    if (params.isActive !== undefined) httpParams = httpParams.set('isActive', params.isActive.toString());
    if (params.search) httpParams = httpParams.set('search', params.search);
    if (params.page) httpParams = httpParams.set('page', params.page.toString());
    if (params.limit) httpParams = httpParams.set('limit', params.limit.toString());
    if (params.lastLoginFrom) httpParams = httpParams.set('lastLoginFrom', params.lastLoginFrom);
    if (params.lastLoginTo) httpParams = httpParams.set('lastLoginTo', params.lastLoginTo);
    if (params.createdFrom) httpParams = httpParams.set('createdFrom', params.createdFrom);
    if (params.createdTo) httpParams = httpParams.set('createdTo', params.createdTo);

    return this.http.get<PaginatedResponse<User>>(this.apiUrl, { params: httpParams });
  }

  getUserById(id: number): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`);
  }

  createUser(data: CreateUserDto): Observable<{ token: string; }> {
    return this.http.post<{ token: string; }>(this.apiUrl, data);
  }

  copyLink(id: number): Observable<{ token: string; }> {
    return this.http.get<{ token: string; }>(`${this.apiUrl}/${id}/copy-link`);
  }

  updateUser(id: number, data: UpdateUserDto): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${id}`, data);
  }

  deleteUser(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  activateUser(id: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/activate`, {});
  }

  deactivateUser(id: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/${id}/deactivate`, {});
  }


  getOffices(): Observable<{ offices: Array<{ value: string; label: string; }>; }> {
    return this.http.get<{ offices: Array<{ value: string; label: string; }>; }>(`${this.apiUrl}/offices/list`);
  }

  completeSetup(token: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/complete-setup`, { token, password });
  }

  generateResetToken(userId: number): Observable<{ token: string; }> {
    return this.http.post<{ token: string; }>(`${this.apiUrl}/${userId}/password-token`, {});
  }

  getDepartments(): Observable<Array<{ id: number; name: string; description: string; }>> {
    return this.http.get<Array<{ id: number; name: string; description: string; }>>(`${environment.apiUrl}/reference/departments`);
  }
}