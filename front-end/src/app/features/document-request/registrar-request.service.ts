import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { environment } from '@src/environments/environment';

import { DocumentRequest } from '@features/document-request/request.model';

export interface PaginatedResponse<T> {
  items: T[];
  meta: {
    totalItems: number;
    itemCount: number;
    itemsPerPage: number;
    totalPages: number;
    currentPage: number;
  };
}

export interface RequestCounts {
  total: number;
  pending: number;
  approved: number;
  processing: number;
  available: number;
  completed: number;
  declined: number;
}

export interface UpdateStatusDto {
  status: DocumentRequest['status'];
}

export interface DeclineRequestDto {
  reason: string;
  approvedBy?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RegistrarRequestService {
  private apiUrl = environment.apiUrl;

  private http = inject(HttpClient);

  editStudentDocuments = signal<boolean>(false);


  /**
   * Handle API errors
   */
  private handleError(error: any): Observable<never> {
    console.error('API Error:', error);

    let errorMessage = 'An error occurred';

    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    throw new Error(errorMessage);
  }

  // ========== REGISTRAR-SPECIFIC REQUEST METHODS ==========

  /**
   * Get all requests paginated (registrar view)
   */
  getRequestsPaginated(
    page: number = 1,
    limit: number = 10,
    status?: string,
    search?: string,
    hasReceipt?: string,
    dateFrom?: string,
    dateTo?: string,
    sortField?: string,
    sortOrder?: number
  ): Observable<PaginatedResponse<DocumentRequest>> {
    let url = `${this.apiUrl}/requests?page=${page}&limit=${limit}`;
    if (status && status !== 'all') {
      url += `&status=${status}`;
    }
    if (search && search.trim()) {
      url += `&search=${encodeURIComponent(search)}`;
    }
    if (hasReceipt && hasReceipt !== 'all') {
      url += `&hasReceipt=${hasReceipt}`;
    }
    if (dateFrom) {
      url += `&dateFrom=${encodeURIComponent(dateFrom)}`;
    }
    if (dateTo) {
      url += `&dateTo=${encodeURIComponent(dateTo)}`;
    }
    if (sortField) {
      url += `&sortBy=${encodeURIComponent(sortField)}`;
    }
    if (sortOrder !== undefined && sortOrder !== 0) {
      url += `&sortOrder=${sortOrder === 1 ? 'asc' : 'desc'}`;
    }

    return this.http.get<PaginatedResponse<DocumentRequest>>(url).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Get request counts by status (registrar view)
   */
  getRequestCounts(): Observable<RequestCounts> {
    return this.http.get<RequestCounts>(
      `${this.apiUrl}/requests/stats/counts`
    );
  }

  /**
   * Update request status (registrar action)
   */
  updateStatus(id: number, status: DocumentRequest['status']): Observable<DocumentRequest> {
    return this.http.put<DocumentRequest>(`${this.apiUrl}/requests/${id}/status`, { status });
  }

  initiateClearance(id: number, category: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/requests/${id}/mark-clearance`, { category });
  }

  /**
   * Decline a request (registrar action)
   */
  declineRequest(id: number, reason: string, approvedBy?: string): Observable<DocumentRequest> {
    return this.http.put<DocumentRequest>(`${this.apiUrl}/requests/${id}/decline`, { reason, approvedBy });
  }

  /**
   * Remove documents from request (registrar action)
   */
  removeDocumentsFromRequest(requestId: number, documentIds: number[], remarks?: string): Observable<DocumentRequest> {
    return this.http.put<DocumentRequest>(
      `${this.apiUrl}/requests/${requestId}/documents/remove`,
      { documentIds, remarks }
    );
  }
}