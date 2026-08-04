import { inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { environment } from '@src/environments/environment';

import { ReceiptInfo, DisplayReceiptGallery, ReceiptGallery } from '@src/app/features/document-request/receipts/receipt.model';

import { RequestService } from '@features/document-request/request.service';

@Injectable({
  providedIn: 'root'
})
export class ReceiptService {
  private apiUrl = environment.apiUrl;
  private http = inject(HttpClient);
  private requestService = inject(RequestService);

  private receiptCache = new Map<number, ReceiptInfo[]>();

  displayReceiptGallery = signal<DisplayReceiptGallery>({ gallery: null, show: false });
  displayReceiptListDialog = signal<boolean>(false);
  selectedRequestReceipts = signal<{ requestId: number | null, receipts: ReceiptInfo[]; }>({ requestId: null, receipts: [] });


  getAllReceipts(requestId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/upload/${requestId}/receipts`);
  }

  getReceiptsForRequest(requestId: number): Observable<ReceiptInfo[]> {
    if (this.receiptCache.has(requestId)) {
      return of(this.receiptCache.get(requestId)!);
    }

    return this.getAllReceipts(requestId).pipe(
      tap(receipts => {
        this.receiptCache.set(requestId, receipts);
        this.requestService.updateRequestWithReceipts(requestId, receipts);
      })
    );
  }

  handleReceiptsList(requestId: number): void {
    this.getReceiptsForRequest(requestId).subscribe({
      next: (receipts) => {
        this.openReceiptListDialog(requestId, receipts);
      },
      error: (err) => console.error('Dialog fetch failed', err)
    });
  }

  //flagged
  viewReceiptById(receiptId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/upload/receipt/${receiptId}/view`, {
      responseType: 'blob'
    });
  }

  viewReceiptGallery(receiptId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/upload/receipt/${receiptId}/view`, {
      responseType: 'blob'
    });
  }

  downloadReceiptById(receiptId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/upload/receipt/${receiptId}/download`, {
      responseType: 'blob'
    });
  }

  deleteReceiptById(receiptId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/upload/receipt/${receiptId}`);
  }

  addReceiptsToCache(requestId: number, newReceipts: ReceiptInfo[]) {
    const existing = this.receiptCache.get(requestId) || [];
    const updated = [...newReceipts, ...existing];
    this.receiptCache.set(requestId, updated);
    this.requestService.updateRequestWithReceipts(requestId, updated);
  }

  removeReceiptFromCache(requestId: number, receiptId: number) {
    const existing = this.receiptCache.get(requestId) || [];
    const updated = existing.filter(r => r.id !== receiptId);
    this.receiptCache.set(requestId, updated);
    this.requestService.updateRequestWithReceipts(requestId, updated);
  }

  openReceiptGalleryDialog(gallery: ReceiptGallery): void {
    this.displayReceiptGallery.set({ gallery, show: true });
  }

  openReceiptListDialog(requestId: number | null, receipts: ReceiptInfo[]): void {
    this.displayReceiptListDialog.set(true);
    this.selectedRequestReceipts.set({ requestId, receipts });
  }

  closeReceiptGalleryDialog(): void {
    this.displayReceiptGallery.update(state => ({ ...state, show: false }));
    setTimeout(() => {
      this.displayReceiptGallery.set({ gallery: null, show: false });
    }, 300);
  }
}