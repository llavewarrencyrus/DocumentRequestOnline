import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@src/environments/environment';

import { AuthService } from '@core/services/auth.service';
import { DocumentRequest } from '../../../request.model';
import { ReceiptInfo } from '@src/app/features/document-request/receipts/receipt.model';

import { ReceiptService } from '@features/document-request/receipts/receipt.service';

@Injectable({
  providedIn: 'root'
})
export class UploadService {
  private apiUrl = environment.apiUrl;
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  displayUploadDialog = signal<boolean>(false);
  selectedRequestForReceipt = signal<{ request: DocumentRequest | null, receipts: ReceiptInfo[]; }>({ request: null, receipts: [] });

  private receiptService = inject(ReceiptService);

  handleReceiptUpload(request: DocumentRequest): void {
    this.receiptService.getReceiptsForRequest(request.id).subscribe({
      next: (receipts) => {
        this.openUploadDialog(request, receipts);
      },
      error: (err) => console.error('Dialog fetch failed', err)
    });
  }

  uploadMultipleReceipts(requestId: number, files: File[]): Observable<any> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('receipts', file);
    });

    return this.http.post(`${this.apiUrl}/upload/${requestId}/upload-multiple-receipts`, formData);
  }

  openUploadDialog(request: DocumentRequest, receipts: ReceiptInfo[]): void {
    this.selectedRequestForReceipt.set({ request, receipts });
  }

}