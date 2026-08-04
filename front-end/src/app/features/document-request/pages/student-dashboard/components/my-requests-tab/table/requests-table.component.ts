import { Component, EventEmitter, Input, Output, inject, input, output, viewChild } from "@angular/core";
import { CommonModule } from "@angular/common";

import { MessageService } from "primeng/api";
import { ButtonModule } from "primeng/button";
import { Tooltip } from "primeng/tooltip";
import { MenuModule, Menu } from "primeng/menu";
import { ContextMenuModule } from "primeng/contextmenu";
import { MenuItem } from "primeng/api";

import { Subject } from "rxjs";
import { takeUntil } from "rxjs/operators";

import { DocumentRequest } from "@features/document-request/request.model";
import { RequestedReceipt, Decline } from "@features/document-request/student-request.model";
import { ClearanceRequest } from "@clearance/clearance.model";

import { RequestService } from "@features/document-request/request.service";
import { ReceiptService } from "@features/document-request/receipts/receipt.service";
import { StudentRequestService } from "@features/document-request/student-request.service";
import { UploadService } from "@src/app/features/document-request/pages/student-dashboard/upload-receipts/upload.service";
import { TagModule } from "primeng/tag";

@Component({
  selector: 'requests-table',
  standalone: true,
  imports: [
    ButtonModule,
    Tooltip,
    MenuModule,
    ContextMenuModule,
    TagModule,
  ],
  templateUrl: './requests-table.component.html',
  styleUrls: ['./requests-table.component.css']
})

export class RequestsTableComponent {
  readonly filteredRequests = input<DocumentRequest[]>([]);
  readonly selectedStatusFilter = input<string>('active');

  callback = output<string>();

  showCancelConfirmModal: boolean = false;
  selectedCancelRequest: DocumentRequest | null = null;

  // Menu configuration
  menuItems: MenuItem[] = [];
  contextMenuItems: MenuItem[] = [];
  selectedRequestForMenu: DocumentRequest | null = null;

  // ViewChild for action menu
  actionMenu = viewChild.required<Menu>('actionMenu');

  private destroy$ = new Subject<void>();

  protected requestService = inject(RequestService);
  private receiptService = inject(ReceiptService);
  private uploadService = inject(UploadService);
  private studentRequestService = inject(StudentRequestService);
  private messageService = inject(MessageService);

  //TODO: Implement after modifying db and backend status to raw data
  readonly statusMap: Record<string, string> = {
    'PENDING': "Pending",
    'PROCESSING': "Processing",
    'AVAILABLE': "Available for Claiming",
    'COMPLETED': "Completed",
    'UNDER_REVIEW': "Under Review",
    'APPROVED': "Approved",
    'REJECTED': "Rejected"
  };

  getRequestNote(request: DocumentRequest): string {
    if (request.status === 'Declined') {
      return request.declineReason || 'No specific reason provided';
    } else if (request.status === 'Completed') {
      return `Completed on ${this.requestService.formatDate(request.dateApproved)}`;
    } else if (request.status === 'Available for Claiming') {
      return `Ready for claiming${request.claimDate ? ' by ' + this.requestService.formatDate(request.claimDate) : ''}`;
    }
    return "";
  }

  getRequestNoteIcon(request: DocumentRequest): string {
    const icons: Record<DocumentRequest['status'], string> = {
      'Pending': 'pi pi-clock',
      'UNDER_REVIEW': 'pi pi-clock',
      'Approved': 'pi pi-check-square',
      'Processing': 'pi pi-cog',
      'Available for Claiming': 'pi pi-calendar',
      'Completed': 'pi pi-check-circle',
      'Declined': 'pi pi-exclamation-circle',
      'ACTION_REQUIRED': 'pi pi-exclamation-triangle'
    };
    return icons[request.status] || 'pi pi-info-circle';
  }

  getDocumentCount(documents: any[] | undefined): string {
    const count = documents?.length || 0;
    if (count === 0) return '0 documents';
    if (count === 1) return '1 document';
    return `${count} documents`;
  }

  viewRequestDetails(request: DocumentRequest): void {
    this.studentRequestService.selectedRequest.set(request);
    this.callback.emit('details');
  }

  openReceiptUpload(request: DocumentRequest): void {
    this.uploadService.handleReceiptUpload(request);
    this.callback.emit('upload');
  }

  viewDeclineReason(declined: Decline): void {
    this.studentRequestService.openDeclineDialog(declined);
  }

  viewReceipts(id: number): void {
    this.receiptService.handleReceiptsList(id);
  }

  viewClearanceDetails(request: DocumentRequest): void {
    // Call the backend API to get actual clearance data using the document request number
    this.requestService.getClearanceByRequestId(request.requestNumber).subscribe({
      next: (clearanceRequest) => {
        if (clearanceRequest) {
          this.studentRequestService.selectedClearanceRequest.set(clearanceRequest);
          this.callback.emit('clearance');
        } else {
          this.messageService.add({
            severity: 'warn',
            summary: 'Clearance Not Found',
            detail: `No clearance request found for document request #${request.requestNumber}`,
            life: 3000
          });
        }
      },
      error: (error) => {
        console.error('Error fetching clearance details:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load clearance details. Please try again.',
          life: 3000
        });
      }
    });
  }

  //=================== Menu Actions ==================

  buildMenuItems(request: DocumentRequest): MenuItem[] {
    const items: MenuItem[] = [
      {
        label: 'View Details',
        icon: 'pi pi-eye',
        command: () => this.viewRequestDetails(request)
      },
      {
        label: 'View Clearance',
        icon: 'pi pi-file-check',
        visible: request.status !== 'Pending' && request.needsClearance,
        command: () => this.viewClearanceDetails(request)
      },
      {
        label: 'Upload Receipt',
        icon: 'pi pi-upload',
        visible: request.status === 'Pending',
        command: () => this.openReceiptUpload(request)
      },
      {
        label: 'View Receipts',
        icon: 'pi pi-file-pdf',
        visible: request.hasReceipt,
        command: () => this.viewReceipts(request.id)
      },
      {
        label: 'Cancel Request',
        icon: 'pi pi-times',
        visible: request.status === 'Pending' && !request.hasReceipt,
        command: () => this.confirmCancelRequest(request)
      }
    ];
    return items;
  }

  openMenu(event: Event, request: DocumentRequest): void {
    this.selectedRequestForMenu = request;
    this.menuItems = this.buildMenuItems(request);
    this.actionMenu().toggle(event);
  }

  onContextMenu(event: any, request: DocumentRequest): void {
    this.selectedRequestForMenu = request;
    this.contextMenuItems = this.buildMenuItems(request);
  }

  //=================== Cancel/Delete ==================

  confirmCancelRequest(request: DocumentRequest): void {
    // Double-check if cancellation is allowed
    if (!this.canCancelRequest(request)) {
      let reason = 'This request cannot be cancelled.';
      if (request.hasReceipt) {
        reason = 'Cannot cancel request because a receipt has already been uploaded.';
      } else if (request.status !== 'Pending') {
        reason = `Cannot cancel request because it is already ${request.status.toLowerCase()}.`;
      }

      this.messageService.add({
        severity: 'warn',
        summary: 'Cannot Cancel',
        detail: reason,
        life: 3000
      });
      return;
    }
  }

  canCancelRequest(request: DocumentRequest): boolean {
    return request.status === 'Pending' && !request.hasReceipt;
  }

  getCancelTooltip(request: DocumentRequest): string {
    if (request.status !== 'Pending') {
      return 'Cannot cancel request - request is already ' + request.status.toLowerCase();
    }
    if (request.hasReceipt) {
      return 'Cannot cancel request - receipt already uploaded';
    }
    return 'Cancel this request';
  }
}
