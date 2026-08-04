import { Component, OnInit, OnDestroy, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TabsModule } from 'primeng/tabs';
import { BadgeModule } from 'primeng/badge';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { TagModule } from 'primeng/tag';
import { SelectButtonModule } from 'primeng/selectbutton';

import { Subject, finalize } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { DocumentRequest } from '@features/document-request/request.model';
import { DocumentOption, ReceiptInfo } from '@features/document-request/student-request.model';

import { AuthService } from '@core/services/auth.service';
import { RequestService } from '@features/document-request/request.service';
import { StudentRequestService } from '@features/document-request/student-request.service';
import { ReceiptService } from '@features/document-request/receipts/receipt.service';
import { UploadService } from './upload-receipts/upload.service';

import { OverviewTabComponent } from '@features/document-request/pages/student-dashboard/components/overview-tab/overview.component';
import { MyRequestsTabComponent } from '@features/document-request/pages/student-dashboard/components/my-requests-tab/my-requests.component';
import { CatalogTabComponent } from '@features/document-request/pages/student-dashboard/components/catalog-tab/catalog.component';
import { DeclineReasonDialogComponent } from '@features/document-request/pages/student-dashboard/components/decline-reason-dialog/decline-reason-dialog.component';
import { UploadDialogComponent } from '@features/document-request/pages/student-dashboard/upload-receipts/components/upload-dialog/upload-dialog.component';
import { ReceiptDialogComponent } from "@features/document-request/receipts/components/receipt-list-dialog/receipt-dialog.component";
import { ReceiptGalleryComponent } from "@features/document-request/receipts/components/gallery/receipt-gallery.component";
import { RequestDetailsDialogComponent } from '@features/document-request/pages/student-dashboard/components/request-details-dialog/request-details-dialog.component';
import { ClearanceDetailsComponent } from '@features/document-request/components/clearance-details/clearance-details.component';
import { MasterDialogComponent } from '@shared/components/master-dialog/master-dialog.component';
import { MasterDialogConfig } from '@shared/components/master-dialog/master-dialog.config';

export interface DocumentSection {
  title: string;
  items: DocumentOption[];
}

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ButtonModule,
    DialogModule,
    TabsModule,
    BadgeModule,
    TableModule,
    TagModule,
    TooltipModule,
    SelectButtonModule,
    CatalogTabComponent,
    OverviewTabComponent,
    MyRequestsTabComponent,
    DeclineReasonDialogComponent,
    ReceiptDialogComponent,
    ReceiptGalleryComponent,
    MasterDialogComponent,
  ],
  styleUrls: ['./student-dashboard.page.css'],
  templateUrl: './student-dashboard.page.html'
})
export class StudentDashboardPage implements OnInit, OnDestroy {
  @ViewChild('tabs') tabs: any; // Add ViewChild for tabs
  @ViewChild(MasterDialogComponent) masterDialog!: MasterDialogComponent;

  // Data
  requests: DocumentRequest[] = [];
  documentOptions: DocumentOption[] = [];

  // Student information
  studentName: string = '';
  studentFullName: string = '';
  studentId: string = '';
  requestorId: string = '';

  // UI State
  loading: boolean = false;
  cancellingRequest: boolean = false;

  // Active tab index
  activeTabIndex: string = '0'; // Default to Overview tab
  requestFilter: string = 'active';

  //Upload Receipt
  showReceiptUploadModal: boolean = false;
  selectedRequestForReceipt: DocumentRequest | null = null;

  // Cleanup subject
  private destroy$ = new Subject<void>();

  // Receipt Viewer
  showReceiptListDialog: boolean = false;
  selectedRequestReceipts: ReceiptInfo[] = [];
  currentReceiptIndex: number = 0;

  private confirmationService = inject(ConfirmationService);
  protected requestService = inject(RequestService);
  private authService = inject(AuthService);
  private messageService = inject(MessageService);
  private route = inject(ActivatedRoute);
  protected studentRequestService = inject(StudentRequestService);
  protected uploadService = inject(UploadService);
  protected receiptService = inject(ReceiptService);

  navigateDialog: Record<string, () => void> = {
    details: () => { this.masterDialog.dialogInstance.navigateToView('details'); },
    receipt: () => { this.masterDialog.dialogInstance.navigateToView('receipt'); },
    upload: () => { this.masterDialog.dialogInstance.navigateToView('upload'); },
    decline: () => { this.masterDialog.dialogInstance.navigateToView('decline'); },
    clearance: () => { this.masterDialog.dialogInstance.navigateToView('clearance'); },
  };

  get dialogConfig(): MasterDialogConfig {
    return {
      views: [
        {
          id: 'details',
          component: RequestDetailsDialogComponent,
          width: 800,
          header: 'Request Details',
          showBackButton: false,
          data: {
            request: this.studentRequestService.selectedRequest(),
          },
          footerActions: [
            {
              label: 'Cancel Request',
              position: 'left',
              outlined: true,
              visible: this.studentRequestService.selectedRequest()?.status === 'Pending' && !this.studentRequestService.selectedRequest()?.hasReceipt,
              action: () => {
                this.confirmationService.confirm({
                  message: 'Canceling this request will result in the permanent loss of all entered data. This action cannot be reversed. Do you wish to proceed?',
                  header: 'Cancel Request',
                  rejectLabel: 'No, Dismiss',
                  acceptLabel: 'Yes, Proceed',
                  accept: () => {
                    this.removeRequest(this.studentRequestService.selectedRequest()!);
                    this.studentRequestService.showMasterDialog.set(false);
                  }
                });
              }
            },
            {
              label: 'View Clearance',
              outlined: true,
              visible:
                this.studentRequestService.selectedRequest()?.status !== 'Pending' &&
                this.studentRequestService.selectedRequest()?.needsClearance,
              action: () => {
                this.viewClearance(this.studentRequestService.selectedRequest()!);
              }
            },
            {
              label: 'Upload Receipt',
              visible:
                this.studentRequestService.selectedRequest()?.status !== 'Completed' ||
                this.studentRequestService.selectedRequest()?.status !== 'Declined',
              action: () => {
                this.uploadService.handleReceiptUpload(this.studentRequestService.selectedRequest()!);
                this.masterDialog.dialogInstance.navigateToView('upload');
              }
            },
          ]
        },
        {
          id: 'upload',
          component: UploadDialogComponent,
          width: 600,
          header: 'Upload Receipt',
          showBackButton: true,
          data: {
            selectedRequestForReceipt: this.studentRequestService.selectedRequest(),
          }
        },
        {
          id: 'clearance',
          component: ClearanceDetailsComponent,
          width: 650,
          header: 'Clearance Details',
          showBackButton: true,
          data: {
            request: this.studentRequestService.selectedClearanceRequest(),
          }
        }
      ],
      initialView: 'details'
    };
  }

  ngOnInit(): void {
    this.loadUserInfo();
    this.loadDocumentOptions();
    this.loadRequests();

    // Check for query params from notification click
    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const tab = params['tab'];
        const filter = params['filter'];
        const requestId = params['requestId'];
        const highlight = params['highlight'];

        // Set the active tab
        if (tab === 'requests') {
          // Switch to requests tab (value '1')
          this.activeTabIndex = '1';

          // Also try to update the tabs component directly
          setTimeout(() => {
            if (this.tabs) {
              this.tabs.activeValue = '1';
            }
          }, 100);
        }

        if (filter) {
          this.requestFilter = filter;
        }

        // Highlight and scroll to the specific request
        if (requestId && highlight) {
          // Wait for data to load and filter to apply
          setTimeout(() => {
            this.highlightRequest(requestId);
          }, 1000);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Method to handle tab change
  onTabChange(event: any): void {
    this.activeTabIndex = event.value;
  }

  highlightRequest(requestId: number): void {
    // Find and scroll to the request row/card
    const element = document.getElementById(`request-${requestId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('highlight-request');

      // Remove highlight after animation
      setTimeout(() => {
        element.classList.remove('highlight-request');
      }, 3000);
    }
  }

  // ========== DATA LOADING METHODS ==========

  loadUserInfo(): void {
    const user = this.authService.getUserInfo();

    if (user) {
      this.studentId = user.userId;
      this.studentName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username;
      this.studentFullName = `${user.lastName || ''}, ${user.firstName || ''} ${user.middleName || ''}`.trim();
      this.requestorId = user.username;
    }
  }

  loadDocumentOptions(): void {
    this.requestService.getDocumentOptions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (documents) => {
          this.documentOptions = documents;
        },
        error: (error) => {
          console.error('Error loading document options:', error);
        }
      });
  }

  loadRequests(): void {
    this.loading = true;
    this.studentRequestService.getRequestsByStudent()
      .pipe(
        finalize(() => this.loading = false),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (requests) => {
          this.requestService.setRequests(requests);
          this.loading = false;

          // After requests are loaded, check if we need to highlight a request
          this.route.queryParams
            .pipe(takeUntil(this.destroy$))
            .subscribe(params => {
              const requestId = params['requestId'];
              const highlight = params['highlight'];

              if (requestId && highlight) {
                setTimeout(() => {
                  this.highlightRequest(requestId);
                }, 500);
              }
            });
        },
        error: (error) => {
          console.error('Error loading requests:', error);
          this.loading = false;
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to load your requests. Please try again.',
            life: 3000
          });
        }
      });
  }

  // ========== MODAL METHODS ==========

  removeRequest(selectedCancelRequest: DocumentRequest | null): void {
    if (!selectedCancelRequest) return;

    this.cancellingRequest = true;

    this.studentRequestService.deleteRequest(selectedCancelRequest.id, this.studentId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.cancellingRequest = false;
        })
      )
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Request Cancelled',
            detail: `Request #${selectedCancelRequest?.id} has been cancelled successfully.`,
            life: 3000
          });

          this.requestService.removeRequest(selectedCancelRequest!.id);
        },
        error: (error) => {
          console.error('Error cancelling request:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.message || 'Failed to cancel request. Please try again.',
            life: 3000
          });
        }
      });
  }

  // ======== CLEARANCE METHOD ============
  viewClearance(request: DocumentRequest | null): void {
    console.log('Viewing clearance for request:', request);
    if (!request?.needsClearance) {
      return;
    }

    this.loading = true;

    this.requestService.getClearanceByRequestId(request.requestNumber).subscribe({
      next: (clearanceRequest) => {
        if (clearanceRequest) {
          this.studentRequestService.selectedClearanceRequest.set(clearanceRequest);
          this.masterDialog.dialogInstance.navigateToView('clearance');
        } else {
          this.messageService.add({
            severity: 'warn',
            summary: 'Clearance Not Found',
            detail: `No clearance request found for document request #${request.requestNumber}`,
            life: 3000
          });
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error fetching clearance details:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load clearance details. Please try again.',
          life: 3000
        });
        this.loading = false;
      }
    });
  }

}