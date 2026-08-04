import { Component, input, inject, output } from "@angular/core";

import { ReceiptGallery, ReceiptInfo } from "@src/app/features/document-request/receipts/receipt.model";

import { MessageService, ConfirmationService } from "primeng/api";
import { ButtonModule } from "primeng/button";

import { ReceiptService } from "@features/document-request/receipts/receipt.service";

@Component({
  selector: 'receipt-list',
  standalone: true,
  imports: [ButtonModule],
  templateUrl: './receipt-list.component.html',
  styleUrls: ['./receipt-list.component.css']
})
export class ReceiptListComponent {
  readonly receipts = input<ReceiptInfo[]>([]);
  readonly canDelete = input<boolean>(false);
  onDelete = output<ReceiptInfo>();

  isLoading: boolean = false;

  private receiptService = inject(ReceiptService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  viewReceiptById(receipt: ReceiptInfo): void {
    this.receiptService.viewReceiptById(receipt.id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to open receipt',
          life: 3000
        });
      }
    });
  }

  viewReceiptFile(id: number) {
    console.log(id);
    this.receiptService.openReceiptGalleryDialog({ receiptId: id, receipts: this.receipts() });
  }

  downloadReceiptById(receiptId: number, fileName: string): void {
    this.receiptService.downloadReceiptById(receiptId).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        this.messageService.add({
          severity: 'success',
          summary: 'Download Started',
          detail: 'Receipt download has started',
          life: 2000
        });
      },
      error: (error) => {
        console.error('Error downloading receipt:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to download receipt',
          life: 3000
        });
      }
    });
  }

  confirmRemove(receipt: ReceiptInfo) {
    this.confirmationService.confirm({
      message: `Are you sure you want to remove "${receipt.fileName}"?`,
      header: 'Confirm Removal',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.onDelete.emit(receipt);
      }
    });
  }


  getReceiptIcon(mimeType: string): string {
    if (mimeType === 'application/pdf') {
      return 'pi pi-file-pdf text-red-500';
    } else if (mimeType.startsWith('image/')) {
      return 'pi pi-image text-blue-500';
    }
    return 'pi pi-file text-gray-500';
  }


  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  formatReceiptDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

}