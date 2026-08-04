import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '@environments/environment';

import { DocumentRequest } from './request.model';
import { AuthService } from '@core/services/auth.service';
import { ClearanceApproval, ClearanceRequest } from '../clearance/clearance.model';

export interface RequestDocument {
  requestId: number;
  documentId: number;
  documentName: string;
}

export interface DocumentOption {
  id: number;
  name: string;
  fee: number;
  processingPeriod: number;
  category: string;
  description?: string;
  createdAt?: string;
}

export interface Course {
  id: number;
  code: string;
  description: string;
  departmentId: number;
}

export interface CreateDocumentRequest {
  studentId: string;
  requestorLastName: string;
  requestorFirstName: string;
  requestorMiddleName?: string;
  requestorCourseId: number;
  requestorId: string;
  email: string;
  contact: string;
  documents: { id: number; name: string; }[];
  quantity: number;
  purpose: string;
  estimatedClaimDate?: string;
  price: number;
  requestCategory: string;
  needsClearance: boolean;
  year: number | null;
}

export interface UpdateStatusDto {
  status: DocumentRequest['status'];
}

export interface DeclineRequestDto {
  reason: string;
  approvedBy?: string;
}

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

export interface ReceiptInfo {
  id: number;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  mimeType: string;
  fileHash: string;
  metadata?: any;
}

export interface ReceiptUploadResponse {
  receiptId: number;
  requestId: number;
  fileName: string;
  fileSize: number;
  uploadedAt: string;
  mimeType: string;
  fileUrl: string;
}

export interface MultipleReceiptUploadResponse {
  receipts: ReceiptUploadResponse[];
  count: number;
}

@Injectable({ providedIn: 'root' })
export class RequestService {
  private apiUrl = environment.apiUrl;

  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private _requests = signal<DocumentRequest[]>([]);

  readonly requests = this._requests.asReadonly();

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

    return throwError(() => new Error(errorMessage));
  }

  // ========= REQUEST DATA HANDLER METHODS =======
  setRequests(data: DocumentRequest[] | PaginatedResponse<DocumentRequest>) {
    const rawArray = Array.isArray(data) ? data : data.items;

    const transformedRequests = (rawArray || []).map(request => ({
      ...request,
      documentsDisplayName: this.getDocumentNames(request.documents),
      hasReceipt: request.hasReceipt || false,
      receiptCount: request.receiptCount || 0
    }));

    this._requests.set(transformedRequests);
  }

  updateRequest(updatedReq: DocumentRequest) {
    this._requests.update(items =>
      items.map(item => item.id === updatedReq.id ? updatedReq : item)
    );
  }

  removeRequest(requestId: number) {
    this._requests.update(items => items.filter(item => item.id !== requestId));
  }

  private getDocumentNames(documents: RequestDocument[] | undefined): string {
    if (!documents || documents.length === 0) return '';
    return documents.map(doc => doc.documentName).join(', ');
  }

  // ========== DOCUMENT REQUESTS ==========

  /**
   * Get all document requests
   */
  getAllRequests(): Observable<DocumentRequest[]> {
    return this.http.get<DocumentRequest[]>(`${this.apiUrl}/requests`);
  }

  /**
   * Get request by request number
   */
  getRequestByNumber(requestNumber: string): Observable<DocumentRequest> {
    return this.http.get<DocumentRequest>(`${this.apiUrl}/requests/number/${requestNumber}`);
  }

  /**
   * Update request status
   */
  updateStatus(id: number, status: DocumentRequest['status']): Observable<DocumentRequest> {
    return this.http.put<DocumentRequest>(`${this.apiUrl}/requests/${id}/status`, { status });
  }

  /**
   * Decline a request
   */
  declineRequest(id: number, reason: string, approvedBy?: string): Observable<DocumentRequest> {
    return this.http.put<DocumentRequest>(`${this.apiUrl}/requests/${id}/decline`, { reason, approvedBy });
  }

  /**
   * Get requests by status
   */
  getRequestsByStatus(status: DocumentRequest['status']): Observable<DocumentRequest[]> {
    return this.http.get<DocumentRequest[]>(`${this.apiUrl}/requests/status/${status}`);
  }

  /**
   * Get all requests paginated
   */
  getRequestsPaginated(
    page: number = 1,
    limit: number = 10,
    status?: string,
    search?: string
  ): Observable<PaginatedResponse<DocumentRequest>> {
    let url = `${this.apiUrl}/requests?page=${page}&limit=${limit}`;
    if (status && status !== 'all') {
      url += `&status=${status}`;
    }
    if (search && search.trim()) {
      url += `&search=${encodeURIComponent(search)}`;
    }

    return this.http.get<PaginatedResponse<DocumentRequest>>(url).pipe(
      catchError(this.handleError)
    );
  }

  getRequestCounts(): Observable<RequestCounts> {
    return this.http.get<RequestCounts>(
      `${this.apiUrl}/requests/stats/counts`
    );
  }

  getClearanceByRequestId(requestId: string): Observable<ClearanceRequest | null> {
    return this.http.get<ClearanceRequest>(`${this.apiUrl}/clearance/request/${requestId}`);
  }

  /**
* Delete a specific request by ID
*/
  deleteRequest(id: number, studentId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/requests/${id}`, {
      params: new HttpParams().set('studentId', studentId)
    });
  }

  // ========== REFERENCE METHODS =========

  getDocumentOptions(): Observable<DocumentOption[]> {
    return this.http.get<DocumentOption[]>(`${this.apiUrl}/reference/documents`);
  }

  getDocumentOptionById(id: string): Observable<DocumentOption> {
    return this.http.get<DocumentOption>(`${this.apiUrl}/reference/documents/${id}`);
  }

  searchDocumentOptions(searchTerm: string): Observable<DocumentOption[]> {
    const params = new HttpParams().set('q', searchTerm);
    return this.http.get<DocumentOption[]>(`${this.apiUrl}/reference/documents/search`, { params });
  }

  getCourses(): Observable<Course[]> {
    return this.http.get<Course[]>(`${this.apiUrl}/reference/courses`);
  }

  getCourseById(id: number): Observable<Course> {
    return this.http.get<Course>(`${this.apiUrl}/reference/courses/${id}`);
  }

  searchCourses(searchTerm: string): Observable<Course[]> {
    const params = new HttpParams().set('q', searchTerm);
    return this.http.get<Course[]>(`${this.apiUrl}/reference/courses/search`, { params });
  }


  // ========== UTILITY METHODS  ==========
  updateRequestWithReceipts(requestId: number, receipts: ReceiptInfo[]) {
    this._requests.update(requests =>
      requests.map(req =>
        req.id === requestId
          ? {
            ...req,
            receipts,
            hasReceipt: receipts.length > 0,
            receiptCount: receipts.length
          }
          : req
      )
    );
  }

  /**
   * Get student full name from request
   */
  getStudentFullName(request: DocumentRequest): string {
    const middle = request.requestorMiddleName ? ` ${request.requestorMiddleName}` : '';
    return `${request.requestorLastName}, ${request.requestorFirstName}${middle}`;
  }

  /**
   * Format date for display
   */
  formatDate(date: string | Date | null | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Get course description by ID
   */
  getCourseDescription(courses: Course[], courseId: number | null | undefined): string {
    if (!courseId || !courses.length) return '';
    const course = courses.find(c => c.id === courseId);
    return course?.description || courseId.toString();
  }

  /**
   * Get course code by ID
   */
  getCourseCode(courses: Course[], courseId: number | null | undefined): string {
    if (!courseId || !courses.length) return '';
    const course = courses.find(c => c.id === courseId);
    return course?.code || '';
  }

  /**
   * Check if request is in pending status
   */
  isPending(request: DocumentRequest): boolean {
    return request.status === 'Pending';
  }

  /**
   * Check if request can be approved
   */
  canApprove(request: DocumentRequest): boolean {
    return request.status === 'Pending';
  }

  /**
   * Check if request can be declined
   */
  canDecline(request: DocumentRequest): boolean {
    return request.status === 'Pending';
  }

  /**
   * Check if request can be processed
   */
  canProcess(request: DocumentRequest): boolean {
    return request.status === 'Approved';
  }

  /**
   * Check if request can be marked as available
   */
  canMarkAvailable(request: DocumentRequest): boolean {
    return request.status === 'Processing';
  }

  /**
   * Check if request can be completed
   */
  canComplete(request: DocumentRequest): boolean {
    return request.status === 'Available for Claiming';
  }

  /**
   * Get status badge color class
   */
  getStatusColor(status: DocumentRequest['status'] | null): string {
    if (!status) {
      return 'bg-slate-100 text-slate-800';
    }
    const colors: Record<DocumentRequest['status'], string> = {
      'Pending': 'bg-yellow-50 text-yellow-700',
      'UNDER_REVIEW': 'bg-indigo-50 text-indigo-700',
      'Approved': 'bg-blue-50 text-blue-700',
      'Processing': 'bg-sky-50 text-sky-700',
      'Available for Claiming': 'bg-violet-50 text-violet-700',
      'Completed': 'bg-emerald-50 text-emerald-700',
      'Declined': 'bg-rose-50 text-rose-700',
      'ACTION_REQUIRED': 'bg-orange-50 text-orange-700'
    };
    return colors[status] || 'bg-slate-100 text-slate-800';
  }

  getStatusLabel(status: DocumentRequest['status']): string {
    const label: Record<DocumentRequest['status'], string> = {
      'Pending': 'Pending',
      'UNDER_REVIEW': 'Under Review',
      'Approved': 'Approved',
      'Processing': 'Processing',
      'Available for Claiming': 'Available for Claiming',
      'Completed': 'Completed',
      'Declined': 'Declined',
      'ACTION_REQUIRED': 'Action Required',
    };
    return label[status] || 'Unknown';
  }

  getClearanceStatusLabel(status: ClearanceApproval['status']): string {
    const label: Record<ClearanceApproval['status'], string> = {
      'PENDING': 'Pending',
      'APPROVED': 'Approved',
      'REJECTED': 'Rejected',
      'ON_HOLD': 'On Hold',
    };
    return label[status] || 'Unknown';
  }


}