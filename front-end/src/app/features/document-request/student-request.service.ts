import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '@src/environments/environment';

import { DocumentRequest } from '@features/document-request/request.model';
import { Decline, Course, RequestedReceipt } from './student-request.model';
import { CreateDocumentRequest, DocumentOption } from './student-request.model';
import { ClearanceRequest } from '@clearance/clearance.model';

@Injectable({
  providedIn: 'root'
})
export class StudentRequestService {
  private apiUrl = environment.apiUrl;

  selectedRequest = signal<DocumentRequest | null>(null);

  displayDeclineDialog = signal<boolean>(false);
  selectedDeclineReason = signal<Decline | null>(null);

  selectedClearanceRequest = signal<ClearanceRequest | null>(null);

  showMasterDialog = signal<boolean>(false);

  private http = inject(HttpClient);

  create(request: CreateDocumentRequest): Observable<DocumentRequest> {
    return this.http.post<DocumentRequest>(`${this.apiUrl}/requests`, request);
  }

  deleteRequest(id: number, studentId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/requests/${id}`, {
      params: new HttpParams().set('studentId', studentId)
    });
  }

  getRequestsByStudent(): Observable<DocumentRequest[]> {
    return this.http.get<DocumentRequest[]>(`${this.apiUrl}/requests/student/my-requests`);
  }

  //==================== DIALOG HANDLERS =======================

  openDeclineDialog(reason: Decline | null): void {
    this.displayDeclineDialog.set(true);
    this.selectedDeclineReason.set(reason);
  }

  //=================== UTILITY METHODS ========================

  calculateTotalPrice(documents: DocumentOption[], quantity: number): number {
    return documents.reduce((total, doc) => total + (doc.fee * quantity), 0);
  }

  calculateEstimatedClaimDate(documents: DocumentOption[]): Date {
    if (documents.length === 0) {
      const defaultDate = new Date();
      defaultDate.setDate(defaultDate.getDate() + 21); // Default to 3 weeks
      return defaultDate;
    }

    const today = new Date();
    let maxDays = 21; // Default to 21 days (3 weeks)

    documents.forEach(doc => {
      let days = 21; // Default fallback

      // processingPeriod is now a number (days)
      // 0 = same day
      // 1 = 1 working day
      // 15 = 15 working days
      if (doc.processingPeriod === 0) {
        days = 0; // Same day
      } else {
        days = doc.processingPeriod; // Direct number of working days
      }

      if (days > maxDays) maxDays = days;
    });

    const futureDate = new Date(today);

    if (maxDays === 0) {
      // Same day - no change
      futureDate.setDate(today.getDate());
    } else {
      // Add working days (simplified - doesn't account for weekends)
      // For production, you might want to use the addWorkingDays method
      futureDate.setDate(today.getDate() + maxDays);
    }

    return futureDate;
  }
}
