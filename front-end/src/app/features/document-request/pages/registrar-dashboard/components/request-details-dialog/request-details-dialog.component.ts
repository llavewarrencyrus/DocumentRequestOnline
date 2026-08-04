import { Component, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { MessageService } from 'primeng/api';

import { DocumentRequest } from '@features/document-request/request.model';
import { RequestService } from '@features/document-request/request.service';
import { ReceiptService } from '@features/document-request/receipts/receipt.service';

@Component({
  selector: 'app-request-details',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule
  ],
  templateUrl: './request-details-dialog.component.html',
})
export class RequestDetailsComponent {
  request = input.required<DocumentRequest>();
  courses = input<any[]>([]);
  onEditDocuments = input<() => void>();
  viewReceipt = input<() => void>();

  protected requestService = inject(RequestService);
  private receiptService = inject(ReceiptService);
  private messageService = inject(MessageService);

  getStatusDot(status: string | null): string {
    if (!status) {
      return 'bg-slate-400';
    }
    switch (status) {
      case 'Pending': return 'bg-amber-500';
      case 'UNDER_REVIEW': return 'bg-indigo-500';
      case 'Approved': return 'bg-blue-500';
      case 'Processing': return 'bg-sky-500';
      case 'Available for Claiming': return 'bg-violet-500';
      case 'Completed': return 'bg-emerald-500';
      case 'Declined': return 'bg-rose-500';
      default: return 'bg-slate-400';
    }
  }

  getCourseDisplayName(courseId: number | string | null | undefined): string {
    if (!courseId) return 'N/A';
    const courseIdStr = courseId.toString();
    const course = this.courses().find(c => c.id?.toString() === courseIdStr);
    if (course) {
      return course.description || course.code || courseIdStr;
    }
    return courseIdStr;
  }

  getYearOrdinal(year: number): string {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = year % 100;
    return (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
  }

  downloadReceipt(): void {
    if (!this.request()!.hasReceipt) {
      this.messageService.add({
        severity: 'info',
        summary: 'No Receipt',
        detail: 'No receipt has been uploaded for this request',
        life: 3000
      });
      return;
    }
    this.receiptService.downloadReceiptById(Number(this.request()!.id)).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `receipt_${this.request()!.id}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
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

  handleEditDocuments(): void {
    const callback = this.onEditDocuments();
    if (callback) {
      callback();
    }
  }

  onViewReceipt(): void {
    const callback = this.viewReceipt();
    if (callback) {
      callback();
    }
  }
}
