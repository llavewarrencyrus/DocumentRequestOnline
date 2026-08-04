// clearance/clearance.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '@environments/environment';

import { ClearanceRequest, ClearanceApproval, ApprovalStats, PaginatedClearanceResponse, ClearanceLog } from './clearance.model';

@Injectable({
  providedIn: 'root'
})
export class ClearanceService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  private OFFICE_DISPLAY_MAP: { [key: string]: string; } = {
    'CASHIER': 'Cashier',
    'LIBRARY': 'Library',
    'SCHOOL': 'School Dean/Principal',
    'ACCOUNTS': 'Student Accounts Office',
    'INVENTORY': 'Inventory Office',
    'CCSD': 'Center For Counseling and Student Development(CCSD)'
  };

  private TYPE_MAP: { [key: string]: string; } = {
    'REGULAR': 'Regular',
    'NEWLY_GRADUATE': 'New Graduate',
    'TRANSFER': 'Transfer',
  };

  private STATUS_MAP: { [key: string]: string; } = {
    'PENDING': 'Pending',
    'IN_REVIEW': 'In Review',
    'APPROVED': 'Cleared',
    'REJECTED': 'Rejected',
    'ON_HOLD': 'On Hold',
  };

  private APPROVAL_STATUS_MAP: { [key: string]: string; } = {
    'PENDING': 'Pending',
    'APPROVED': 'Cleared',
    'ON_HOLD': 'Deficient',
  };

  getClearanceRequests(params?: {
    page?: number;
    limit?: number;
    status?: string;
    type?: string;
    requestId?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: string;
    sortOrder?: string;
    office?: string;
    approvalStatus?: string;
  }): Observable<PaginatedClearanceResponse> {
    const queryParams: any = {
      page: params?.page || 1,
      limit: params?.limit || 10
    };

    if (params?.status) queryParams.status = params.status;
    if (params?.type) queryParams.type = params.type;
    if (params?.requestId) queryParams.requestId = params.requestId;
    if (params?.search) queryParams.search = params.search;
    if (params?.dateFrom) queryParams.dateFrom = params.dateFrom;
    if (params?.dateTo) queryParams.dateTo = params.dateTo;
    if (params?.sortBy) queryParams.sortBy = params.sortBy;
    if (params?.sortOrder) queryParams.sortOrder = params.sortOrder;
    if (params?.office) queryParams.office = params.office;
    if (params?.approvalStatus) queryParams.approvalStatus = params.approvalStatus;

    return this.http.get<PaginatedClearanceResponse>(`${this.apiUrl}/clearance`, { params: queryParams });
  }

  getClearanceById(id: number): Observable<ClearanceRequest> {
    return this.http.get<ClearanceRequest>(`${this.apiUrl}/clearance/${id}`);
  }

  getClearanceApprovals(clearanceId: number): Observable<ClearanceApproval[]> {
    return this.http.get<ClearanceApproval[]>(`${this.apiUrl}/clearance-approvals/clearance/${clearanceId}`);
  }

  getPublicStatus(id: string) {
    return this.http.get<any>(`${this.apiUrl}/clearance/track/${id}`);
  }

  signClearance(clearanceId: number, signData: { signature: string; }): Observable<any> {
    return this.http.post(`${this.apiUrl}/clearance/${clearanceId}/sign`, signData);
  }

  updateClearanceStatus(id: number, status: string): Observable<ClearanceRequest> {
    return this.http.put<ClearanceRequest>(`${this.apiUrl}/clearance/${id}`, { status });
  }

  updateApproval(id: number, data: Partial<ClearanceApproval>): Observable<ClearanceApproval> {
    return this.http.put<ClearanceApproval>(`${this.apiUrl}/clearance-approvals/${id}`, data);
  }

  createApproval(data: Partial<ClearanceApproval>): Observable<ClearanceApproval> {
    return this.http.post<ClearanceApproval>(`${this.apiUrl}/clearance-approvals`, data);
  }

  getApprovalStats(clearanceId: number): Observable<ApprovalStats> {
    return this.http.get<ApprovalStats>(`${this.apiUrl}/clearance-approvals/stats/${clearanceId}`);
  }

  exportClearanceForm(requestId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/clearance/document/${requestId}`, { responseType: 'blob' });
  }

  getOfficeIcon(office: string): string {
    const officeMap: { [key: string]: string; } = {
      'LIBRARY': 'pi pi-book',
      'ACCOUNTS': 'pi pi-calculator',
      'INVENTORY': 'pi pi-box',
      'CCSD': 'pi pi-users',
      'SCHOOL': 'pi pi-user'
    };
    return officeMap[office] || 'pi pi-building';
  }

  getOfficeDisplay(office: string): string {
    return this.OFFICE_DISPLAY_MAP[office] || '';
  }

  getTypeDisplay(type: string): string {
    return this.TYPE_MAP[type] || type;
  }

  getStatusLabel(status: string): string {
    return this.STATUS_MAP[status] || status;
  }

  getApprovalStatus(status: string): string {
    return this.APPROVAL_STATUS_MAP[status] || status;
  }

  getClearanceLogs(clearanceId: number): Observable<ClearanceLog[]> {
    return this.http.get<ClearanceLog[]>(`${this.apiUrl}/clearance-logs/clearance/${clearanceId}`);
  }

  getActionDisplay(action: string): string {
    const actionMap: { [key: string]: string; } = {
      'REQUESTER_SIGNED': 'Student Signed',
      'OFFICE_APPROVED': 'Office Signed',
      'OFFICE_ON_HOLD': 'Office On Hold',
      'CLEARANCE_COMPLETED': 'Clearance Completed',
      'CLEARANCE_CREATED': 'Clearance Created'
    };
    return actionMap[action] || action.replace(/_/g, ' ');
  }

  getActionSeverity(action: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    if (action.includes('APPROVED') || action.includes('COMPLETED')) return 'success';
    if (action.includes('ON_HOLD')) return 'danger';
    if (action.includes('SIGNED')) return 'info';
    if (action.includes('CREATED')) return 'secondary';
    return 'info';
  }
}