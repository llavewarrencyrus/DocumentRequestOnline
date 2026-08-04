import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@src/environments/environment';

import { DocumentRequest, RequestDocument } from '@src/app/features/document-request/request.model';
import { ReceiptInfo } from '@src/app/features/document-request/receipts/receipt.model';

import { AuthService } from '@core/services/auth.service';

// TODO: Migrate this file into request.service.ts

@Injectable({
  providedIn: 'root'
})
export class NewRequestService {
  private apiUrl = environment.apiUrl;
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private _requests = signal<DocumentRequest[]>([]);

  readonly requests = this._requests.asReadonly();

  setRequests(requests: DocumentRequest[]) {
    // Transform the data first
    const transformedRequests = requests.map(request => ({
      ...request,
      documentsDisplayName: this.getDocumentNames(request.documents),
      hasReceipt: request.hasReceipt || false,
      receiptCount: request.receiptCount || 0
    }));

    // Then set the signal with the transformed array
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

  //=================== Receipt In Request Handler ====================

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

}   