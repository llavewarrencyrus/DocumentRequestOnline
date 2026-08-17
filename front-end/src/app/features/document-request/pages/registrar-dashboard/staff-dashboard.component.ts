import { Component, OnInit, inject, ViewChild, signal, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { DialogModule } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { TabsModule } from 'primeng/tabs';
import { trigger, transition, style, animate } from '@angular/animations';

import { AuthService } from '@core/services/auth.service';
import { ReceiptService } from '@features/document-request/receipts/receipt.service';
import { ReceiptInfo } from '@features/document-request/receipts/receipt.model';
import { RequestService } from '@features/document-request/request.service';
import { RegistrarRequestService, RequestCounts } from '@features/document-request/registrar-request.service';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { ActivatedRoute } from '@angular/router';

import { DocumentRequest } from '@features/document-request/request.model';
import { EditDocumentsComponent } from '@features/document-request/pages/registrar-dashboard/components/edit-request-documents/edit-documents.component';
import { RequestsTableComponent } from './components/table/requests-table.component';
import { RequestDetailsComponent } from './components/request-details-dialog/request-details-dialog.component';
import { DeclineDialogComponent } from './components/decline-dialog/decline-dialog.component';
import { StatsComponent, StatItem } from '@shared/components/stats/stats.component';
import { ReceiptGalleryComponent } from '@features/document-request/receipts/components/gallery/receipt-gallery.component';
import { ReceiptDialogComponent } from '@features/document-request/receipts/components/receipt-list-dialog/receipt-dialog.component';
import { MasterDialogComponent } from '@shared/components/master-dialog/master-dialog.component';
import { MasterDialogConfig } from '@shared/components/master-dialog/master-dialog.config';
import { ReceiptListComponent } from '../../receipts/components/receipt-list-dialog/list/receipt-list.component';
import { ClearanceService } from '@clearance/clearance.service';
import { ClearanceDetailsComponent } from '@features/document-request/components/clearance-details/clearance-details.component';
import { ClearanceLogsViewerComponent } from '@src/app/features/document-request/pages/registrar-dashboard/components/clearance-logs/clearance-logs-viewer.component';
import { ClearanceRequest } from '@clearance/clearance.model';
import { ClearanceTableComponent } from '@clearance/pages/dashboard/components/table/table.component';
import { InitiateClearanceComponent } from './components/initiate-clearance/initiate-clearance.component';

@Component({
  selector: 'app-staff-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    ButtonModule,
    ProgressSpinnerModule,
    DialogModule,
    TableModule,
    TooltipModule,
    TabsModule,
    StatsComponent,
    RequestsTableComponent,
    ReceiptGalleryComponent,
    ReceiptDialogComponent,
    MasterDialogComponent,
    ClearanceTableComponent,
  ],
  styleUrls: ['./staff-dashboard.component.css'],
  templateUrl: './staff-dashboard.component.html',
  animations: [
    trigger('slideContent', [
      transition(':enter', [
        style({ opacity: 0, width: '95vw', transform: 'translateX(10vw)' }),
        animate('300ms 300ms ease-out', style({ opacity: 1, width: '100%', transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        style({ position: 'absolute', top: 0, left: 0, width: '95vw' }),
        animate('300ms ease-in', style({ opacity: 0, zIndex: -99, transform: 'translateX(-30vw)' }))
      ])
    ])
  ]
})
export class StaffDashboardComponent implements OnInit {
  @ViewChild('dt') dt: any;
  @ViewChild(MasterDialogComponent) masterDialog!: MasterDialogComponent;

  allRequests: DocumentRequest[] = [];
  filteredRequests: DocumentRequest[] = [];
  courses: any[] = [];
  currentPage: number = 1;
  pageSize: number = 10;
  totalItems: number = 0;
  isLoadingTable: boolean = false;
  requestCounts: RequestCounts = {
    total: 0,
    pending: 0,
    approved: 0,
    processing: 0,
    available: 0,
    completed: 0,
    declined: 0,
  };

  get statsItems(): StatItem[] {
    return [
      {
        title: 'Total',
        value: this.requestCounts.total,
        icon: 'pi-file',
        bgColor: 'bg-blue-50',
        iconColor: 'text-blue-600',
      },
      {
        title: 'Pending',
        value: this.requestCounts.pending,
        icon: 'pi-clock',
        bgColor: 'bg-amber-50',
        iconColor: 'text-amber-600',
      },
      {
        title: 'Approved',
        value: this.requestCounts.approved,
        icon: 'pi-check',
        bgColor: 'bg-emerald-50',
        iconColor: 'text-emerald-600',
      },
      {
        title: 'Declined',
        value: this.requestCounts.declined,
        icon: 'pi-times',
        bgColor: 'bg-rose-50',
        iconColor: 'text-rose-600',
      },
    ];
  }

  currentStatusFilter: string | undefined = undefined;
  currentSearchFilter: string | undefined = undefined;
  currentHasReceiptFilter: string | undefined = undefined;
  currentDateFromFilter: string | undefined = undefined;
  currentDateToFilter: string | undefined = undefined;
  currentSortField: string | undefined = undefined;
  currentSortOrder: number = 0;

  receiptDialogData: { requestId: number | null, receipts: ReceiptInfo[]; } = { requestId: null, receipts: [] };
  showReceiptListDialog: boolean = false;

  selectedRequest = signal<DocumentRequest | null>(null);
  showMasterDialog = signal<boolean>(false);
  declineReason = signal<string>('');
  loading: boolean = false;
  staffName: string = '';

  selectedRequestReceipts = signal<ReceiptInfo[]>([]);
  isEditingDocuments = signal<boolean>(false);
  showRemarksDialog = signal<boolean>(false);
  hasSelectedDocuments = signal<boolean>(false);
  selectedClearanceRequest = signal<ClearanceRequest | null>(null);

  // Initiate Clearance
  initiateID: number | null = null;
  requestCategory: string = 'REGULAR';

  // Tab management
  activeTab = signal<string>('0');

  // Clearance data
  clearanceRequests: ClearanceRequest[] = [];
  clearanceLoading: boolean = false;
  clearanceTotalRecords: number = 0;
  clearanceCurrentPage: number = 1;
  clearancePageSize: number = 10;
  clearanceDataLoaded: boolean = false;

  selectedDocuments = signal<{ documentIds: number[]; remarks: string; }>({ documentIds: [], remarks: '' });

  // Clearance filters
  clearanceCurrentStatus: string = '';
  clearanceCurrentType: string = '';
  clearanceSearchQuery: string = '';
  clearanceCurrentDateFrom: string = '';
  clearanceCurrentDateTo: string = '';
  clearanceCurrentApprovalStatus: string = '';

  get dialogConfig(): MasterDialogConfig {
    return {
      views: [
        {
          id: 'details',
          component: RequestDetailsComponent,
          width: 670,
          header: 'Request Details',
          showBackButton: false,
          data: {
            request: this.selectedRequest(),
            courses: this.courses
          },
          callbacks: {
            onEditDocuments: () => {
              this.masterDialog.dialogInstance.navigateToView('edit-documents');
            },
            viewReceipt: () => {
              this.viewReceipt(this.selectedRequest()!);
            }
          },
          footerActions: [
            {
              label: 'Initiate Clearance',
              severity: 'secondary',
              position: 'left',
              outlined: true,
              visible:
                this.selectedRequest()?.status !== 'Declined' &&
                this.selectedRequest()?.status !== 'Completed' &&
                !this.selectedRequest()?.needsClearance,
              action: () => {
                this.masterDialog.navigateToView('initiate-clearance');
              }
            },
            {
              label: 'Decline',
              icon: 'pi pi-trash',
              severity: 'danger',
              outlined: true,
              visible: this.selectedRequest()?.status === 'Pending',
              action: () => {
                this.openDeclineDialog(this.selectedRequest() ?? undefined);
              }
            },
            {
              label: 'Approve',
              icon: 'pi pi-check',
              visible: this.selectedRequest()?.status === 'Pending',
              action: () => {
                this.approveRequest(this.selectedRequest() ?? undefined);
              }
            },
            {
              label: 'View Clearance Logs',
              icon: 'pi pi-address-book',
              severity: 'danger',
              outlined: true,
              visible: this.selectedRequest()?.status !== 'Pending' && this.selectedRequest()?.status !== 'Declined' && this.selectedRequest()?.needsClearance === true,
              action: () => {
                this.viewClearanceLogsFromRequest();
              }
            },
            {
              label: 'View Clearance Details',
              icon: 'pi pi-file-check',
              severity: 'danger',
              visible: this.selectedRequest()?.status !== 'Pending' && this.selectedRequest()?.status !== 'Declined' && this.selectedRequest()?.needsClearance === true,
              action: () => {
                this.viewClearance(this.selectedRequest() ?? null);
              }
            },
          ]
        },
        {
          id: 'edit-documents',
          component: EditDocumentsComponent,
          width: 500,
          header: 'Edit Document',
          showBackButton: true,
          data: {
            request: this.selectedRequest(),
            onStateChange: (state: { hasSelectedDocuments: boolean; document: { documentIds: number[]; remarks: string; }; }) => {
              this.hasSelectedDocuments.set(state.hasSelectedDocuments);
              this.selectedDocuments.set(state.document);
            }
          },
          footerActions: [
            {
              label: 'Cancel',
              icon: 'pi pi-times',
              text: true,
              visible: !this.registrarRequestService.editStudentDocuments(),
              action: () => {
                this.registrarRequestService.editStudentDocuments.set(false);
                this.selectedDocuments.set({ documentIds: [], remarks: '' });
                this.hasSelectedDocuments.set(false);
                this.masterDialog.dialogInstance.goBack();
              }
            },
            {
              label: 'Remove Selected',
              icon: 'pi pi-trash',
              severity: 'danger',
              visible: !this.registrarRequestService.editStudentDocuments(),
              disabled: !this.hasSelectedDocuments() || this.isEditingDocuments(),
              action: () => {
                this.registrarRequestService.editStudentDocuments.set(true);
              }
            },
            {
              label: 'Back',
              icon: 'pi pi-arrow-left',
              text: true,
              visible: this.registrarRequestService.editStudentDocuments(),
              disabled: () => this.isEditingDocuments(),
              action: () => {
                this.registrarRequestService.editStudentDocuments.set(false);
              }
            },
            {
              label: 'Confirm Removal',
              icon: 'pi pi-check',
              severity: 'danger',
              styleClass: '!bg-red-700 !border-red-700 hover:!bg-red-800 rounded px-8 py-3 font-black text-[11px] uppercase tracking-widest shadow-lg',
              visible: this.registrarRequestService.editStudentDocuments(),
              disabled: () => this.isEditingDocuments(),
              action: () => {
                this.handleDocumentRemoval(this.selectedDocuments());
              }
            }
          ]
        },
        {
          id: 'decline',
          component: DeclineDialogComponent,
          width: 400,
          header: 'Specify Reason for Decline',
          showBackButton: true,
          data: {
            selectedRequest: this.selectedRequest(),
            onDeclineReasonChange: (reason: string) => {
              this.declineReason.set(reason);
            }
          },
          callbacks: {
            cancel: () => {
              this.masterDialog.dialogInstance.goBack();
            },
            submit: (remarks: string) => {
              this.submitDecline(remarks);
            }
          },
          footerActions: [
            {
              label: 'Cancel',
              icon: 'pi pi-times',
              text: true,
              styleClass: 'text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-red-700',
              action: () => {
                this.masterDialog.dialogInstance.goBack();
              }
            },
            {
              label: 'Decline Request',
              icon: 'pi pi-trash',
              severity: 'danger',
              styleClass: '!bg-red-700 !border-red-700 hover:!bg-red-800 rounded px-8 py-3 font-black text-[11px] uppercase tracking-widest shadow-lg',
              disabled: () => !this.declineReason().trim(),
              action: () => {
                const remarks = this.declineReason();
                if (remarks.trim()) {
                  this.submitDecline(remarks);
                }
              }
            }
          ]
        },
        {
          id: 'receipt',
          component: ReceiptListComponent,
          width: 600,
          header: 'Receipt',
          showBackButton: true,
          data: {
            receipts: this.selectedRequestReceipts()
          },
        },
        {
          id: 'clearance',
          component: ClearanceDetailsComponent,
          width: 650,
          header: 'Clearance Details',
          showBackButton: true,
          data: {
            request: this.selectedClearanceRequest()
          },
          footerActions: [
            {
              label: 'View Logs',
              icon: 'pi pi-address-book',
              severity: 'secondary',
              text: true,
              action: () => {
                this.openClearanceLogs();
              }
            },
            {
              label: 'Export',
              icon: 'pi pi-file-export',
              severity: 'danger',
              styleClass: 'p-button-outlined text-[11px] font-black uppercase tracking-widest',
              action: () => {
                this.exportClearance(this.selectedClearanceRequest()!);
              }
            },
          ]
        },
        {
          id: 'clearance-logs',
          component: ClearanceLogsViewerComponent,
          width: 700,
          header: 'Clearance Logs',
          showBackButton: true,
          data: {
            clearanceId: this.selectedClearanceRequest()?.id
          }
        },
        {
          id: 'initiate-clearance',
          component: InitiateClearanceComponent,
          width: 650,
          header: 'Initiate Clearance',
          showBackButton: true,
          data: {
            selectedType: this.selectedRequest()?.requestCategory || 'REGULAR'
          },
          callbacks: {
            onSelectCategory: (type: string) => {
              this.requestCategory = type;
            }
          },
          footerActions: [
            {
              label: 'Cancel',
              severity: 'secondary',
              text: true,
              action: () => {
                this.showMasterDialog.set(false);
              }
            },
            {
              label: 'Initiate',
              icon: 'pi pi-check',
              action: () => {
                this.initiateClearance({
                  requestId: this.selectedRequest()!.id,
                  category: this.requestCategory
                });
              }
            }
          ]
        }

      ],
      initialView: 'details',
      defaultWidth: 650,
      onClose: () => this.closeRequestDetailsDialog(),
      onViewChange: (viewId, previousViewId) => {
        if (previousViewId === 'edit-documents') {
          this.registrarRequestService.editStudentDocuments.set(false);
          this.selectedDocuments.set({ documentIds: [], remarks: '' });
          this.hasSelectedDocuments.set(false);
        }
      },
    };
  };

  private destroy$ = new Subject<void>();

  private receiptService = inject(ReceiptService);
  protected requestService = inject(RequestService);
  private clearanceService = inject(ClearanceService);
  private registrarRequestService = inject(RegistrarRequestService);
  private authService = inject(AuthService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  ngOnInit(): void {
    const user: any = this.authService.getUserInfo() || {};
    this.staffName = user.name || user.fullName || user.username || 'ARC Staff';

    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login/staff']);
      return;
    }

    if (user?.role !== 'Registrar' && user?.role !== 'Admin') {
      this.messageService.add({
        severity: 'error',
        summary: 'Access Denied',
        detail: 'You do not have permission to access this page',
        life: 3000
      });
      this.router.navigate(['/login/staff']);
      return;
    }

    this.loadCourses();
    this.loadRequestCounts();

    this.route.queryParams
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const requestId = params['requestId'];
        const highlight = params['highlight'];

        if (requestId && highlight) {
          setTimeout(() => {
            const request = this.allRequests.find(r => r.id.toString() === requestId);
            if (request) {
              this.viewRequestDetails(request);

              setTimeout(() => {
                this.highlightRequestRow(requestId);
              }, 300);
            }
          }, 1000);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  highlightRequestRow(requestId: string): void {
    const element = document.getElementById(`request-row-${requestId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('highlight-request');

      setTimeout(() => {
        element.classList.remove('highlight-request');
      }, 3000);
    }
  }

  loadCourses(): void {
    this.requestService.getCourses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (courses) => {
          this.courses = courses;
        },
        error: (error) => {
          console.error('Error loading courses:', error);
        }
      });
  }

  loadRequestCounts(): void {
    this.registrarRequestService.getRequestCounts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (counts) => {
          this.requestCounts = counts;
        },
        error: (error) => {
          console.error('Error loading counts:', error);
        }
      });
  }

  loadRequests(resetPage: boolean = false): void {
    if (resetPage) {
      this.currentPage = 1;
      if (this.dt) this.dt.first = 0;
    }

    this.isLoadingTable = true;

    this.registrarRequestService.getRequestsPaginated(
      this.currentPage,
      this.pageSize,
      this.currentStatusFilter,
      this.currentSearchFilter,
      this.currentHasReceiptFilter,
      this.currentDateFromFilter,
      this.currentDateToFilter,
      this.currentSortField,
      this.currentSortOrder
    )
      .pipe(
        finalize(() => {
          this.isLoadingTable = false;
          this.cdr.detectChanges();
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (response) => {
          this.requestService.setRequests(response);

          this.filteredRequests = this.requestService.requests();
          this.allRequests = this.requestService.requests();
          this.totalItems = response.meta.totalItems;
          this.currentPage = response.meta.currentPage;
        },
        error: (error) => {
          console.error('Error loading requests:', error);
          if (error.status === 401) {
            this.messageService.add({
              severity: 'warn',
              summary: 'Session Expired',
              detail: 'Please login again',
              life: 3000
            });

            setTimeout(() => {
              this.router.navigate(['/login/staff'], {
                queryParams: { expired: 'true' }
              });
            }, 2000);
          }
        }
      });
  }

  onPageChange(event: any): void {
    const newPage = Math.floor(event.first / event.rows) + 1;

    // Extract sort parameters from lazy load event
    if (event.sortField !== undefined) {
      this.currentSortField = event.sortField;
    }
    if (event.sortOrder !== undefined) {
      this.currentSortOrder = event.sortOrder;
    }

    if (this.currentPage !== newPage || this.pageSize !== event.rows) {
      this.currentPage = newPage;
      this.pageSize = event.rows;
      this.loadRequests(false);
    } else if (event.sortField !== undefined || event.sortOrder !== undefined) {
      // Reload if sort changed but page didn't
      this.loadRequests(false);
    }
  }

  onFilterChange(filters: { status?: string; search?: string; hasReceipt?: string; dateFrom?: string; dateTo?: string; }): void {
    this.currentStatusFilter = filters.status;
    this.currentSearchFilter = filters.search;
    this.currentHasReceiptFilter = filters.hasReceipt;
    this.currentDateFromFilter = filters.dateFrom;
    this.currentDateToFilter = filters.dateTo;
    this.loadRequests(true);
  }

  refreshData(): void {
    this.loadRequestCounts();
    this.loadRequests(false);
  }

  viewReceipt(request: DocumentRequest): void {
    console.log('Viewing receipt for request:', request);
    if (!request.hasReceipt) {
      this.messageService.add({
        severity: 'info',
        summary: 'No Receipt',
        detail: 'No receipt has been uploaded for this request',
        life: 3000
      });
      return;
    }

    this.receiptService.getAllReceipts(Number(request.id)).subscribe({
      next: (receipts) => {
        if (receipts && receipts.length > 0) {
          this.receiptDialogData = { requestId: Number(request.id), receipts };
          if (receipts.length === 1) {
            this.receiptService.openReceiptGalleryDialog({
              receiptId: receipts[0].id,
              receipts: receipts
            });
          } else {
            this.selectedRequestReceipts.set(receipts as ReceiptInfo[]);
            this.masterDialog.navigateToView('receipt');
            if (!this.showMasterDialog()) {
              this.showMasterDialog.set(true);
            }
          }
        }
      },
      error: (error) => {
        console.error('Error loading receipts:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load receipts',
          life: 3000
        });
      }
    });
  }

  viewRequestDetails(request: DocumentRequest): void {
    this.selectedRequest.set({ ...request });
    this.showMasterDialog.set(true);
  }

  viewClearance(request: DocumentRequest | null): void {
    console.log('Viewing clearance for request:', request);
    if (!request?.needsClearance) {
      return;
    }

    this.loading = true;

    this.requestService.getClearanceByRequestId(request.requestNumber).subscribe({
      next: (clearanceRequest) => {
        if (clearanceRequest) {
          this.selectedClearanceRequest.set(clearanceRequest);
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

  onInitiateClearance(event: any): void {
    this.selectedRequest.set(event);
    this.masterDialog.dialogInstance.navigateToView('initiate-clearance');
  }

  initiateClearance(event: any): void {
    this.registrarRequestService.initiateClearance(event.requestId, event.category).subscribe({
      next: (response) => {
        this.showMasterDialog.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Clearance Initiated',
          detail: 'Clearance request has been initiated successfully',
          life: 3000
        });
      },
      error: (error) => {
        console.error('Error initiating clearance:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to initiate clearance. Please try again.',
          life: 3000
        });
      }
    });
  }

  exportClearance(request: any): void {
    const id = request.requestNumber ?? request.requestId;
    this.clearanceService.exportClearanceForm(id).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "Clearance Form.docx";
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

  approveRequest(request?: DocumentRequest): void {
    if (request) {
      this.selectedRequest.set(request);
    }

    if (!this.selectedRequest) return;

    this.confirmationService.confirm({
      message: `Are you sure you want to approve request #${this.selectedRequest()!.id}?`,
      header: 'Approve Request',
      icon: 'pi pi-check-circle',
      accept: () => {
        this.requestService.updateStatus(this.selectedRequest()!.id, 'Approved')
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Approved',
                detail: 'Request approved successfully',
                life: 3000
              });
              this.loadRequestCounts();
              this.loadRequests(false);
              this.showMasterDialog.set(false);
            },
            error: (error) => {
              console.error('Error approving request:', error);
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to approve request',
                life: 3000
              });
            }
          });
      }
    });
  }

  openDeclineDialog(request?: DocumentRequest): void {
    if (request) {
      this.selectedRequest.set(request);
    }
    this.declineReason.set('');
    this.masterDialog.navigateToView('decline');
    this.showMasterDialog.set(true);
  }

  submitDecline(remarks: string): void {
    if (!this.selectedRequest || !remarks.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please provide a reason for declining',
        life: 3000
      });
      return;
    }

    const user = this.authService.getUserInfo();
    const approvedBy = user?.username || this.staffName;

    this.requestService.declineRequest(this.selectedRequest()!.id, this.declineReason(), approvedBy)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Declined',
            detail: 'Request has been declined',
            life: 3000
          });
          this.showMasterDialog.set(false);
          this.loadRequestCounts();
          this.loadRequests(false);
        },
        error: (error) => {
          console.error('Error declining request:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to decline request',
            life: 3000
          });
        }
      });
  }

  onUpdateStatus(event: { request: DocumentRequest; status: DocumentRequest['status'] }): void {
    const { request, status } = event;
    this.confirmationService.confirm({
      message: `Are you sure you want to change request #${request.id} status to "${status}"?`,
      header: 'Update Status',
      icon: 'pi pi-info-circle',
      accept: () => {
        this.requestService.updateStatus(request.id, status)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Status Updated',
                detail: `Request status updated to "${status}" successfully`,
                life: 3000
              });
              this.loadRequestCounts();
              this.loadRequests(false);
            },
            error: (error) => {
              console.error('Error updating request status:', error);
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to update request status',
                life: 3000
              });
            }
          });
      }
    });
  }

  closeDeclineDialog(): void {
    this.masterDialog.goBack();
  }

  closeRequestDetailsDialog(): void {
    this.showMasterDialog.set(false);
    this.selectedRequest.set(null);
    this.declineReason.set('');
    this.registrarRequestService.editStudentDocuments.set(false);
    this.selectedDocuments.set({ documentIds: [], remarks: '' });
    this.hasSelectedDocuments.set(false);
    this.masterDialog.reset();
  }

  openEditDocumentsDialog(request: DocumentRequest): void {
    if (request) {
      this.selectedRequest.set(request);
    }
    this.showRemarksDialog.set(false);
    this.hasSelectedDocuments.set(false);
    this.masterDialog.navigateToView('edit-documents');
    this.showMasterDialog.set(true);
  }

  handleDocumentRemoval(payload: { documentIds: number[]; remarks: string; }): void {
    const currentRequest = this.selectedRequest();
    if (!currentRequest || payload.documentIds.length === 0) return;

    this.isEditingDocuments.set(true);

    this.registrarRequestService.removeDocumentsFromRequest(
      currentRequest.id,
      payload.documentIds,
      payload.remarks || undefined
    ).pipe(
      finalize(() => {
        this.isEditingDocuments.set(false);
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (updatedRequest) => {
        if (payload.remarks) {
          const updatedNotes = updatedRequest.notes
            ? `${updatedRequest.notes}\n[Document Removal] ${payload.remarks}`
            : `[Document Removal] ${payload.remarks}`;

          updatedRequest.notes = updatedNotes;
        }

        this.messageService.add({
          severity: 'success',
          summary: 'Documents Removed',
          detail: `Successfully removed ${payload.documentIds.length} document(s)`,
          life: 3000
        });

        this.showMasterDialog.set(false);
        this.refreshData();
      },
      error: (error) => {
        console.error('Error removing documents:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to remove documents',
          life: 3000
        });
      }
    });
  }

  openClearanceLogs(): void {
    const clearance = this.selectedClearanceRequest();
    if (!clearance?.id) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No Clearance Selected',
        detail: 'Please select a clearance request to view logs',
        life: 3000
      });
      return;
    }
    this.masterDialog.dialogInstance.navigateToView('clearance-logs');
    if (!this.showMasterDialog()) {
      this.showMasterDialog.set(true);
    }
  }

  onClearanceViewLogs(clearance: ClearanceRequest): void {
    this.selectedClearanceRequest.set(clearance);
    this.openClearanceLogs();
  }

  viewClearanceLogsFromRequest(): void {
    const request = this.selectedRequest();
    if (!request?.needsClearance) {
      this.messageService.add({
        severity: 'warn',
        summary: 'No Clearance',
        detail: 'This request does not require clearance',
        life: 3000
      });
      return;
    }

    this.loading = true;

    this.requestService.getClearanceByRequestId(request.requestNumber).subscribe({
      next: (clearanceRequest) => {
        if (clearanceRequest) {
          this.selectedClearanceRequest.set(clearanceRequest);
          this.masterDialog.dialogInstance.navigateToView('clearance-logs');
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

  // Clearance data methods
  loadClearanceRequests(): void {
    console.log('loadClearanceRequests called');
    this.clearanceLoading = true;

    const params: any = {
      page: this.clearanceCurrentPage,
      limit: this.clearancePageSize,
      office: 'ARC',
    };

    if (this.clearanceCurrentStatus) params.status = this.clearanceCurrentStatus;
    if (this.clearanceCurrentType) params.type = this.clearanceCurrentType;
    if (this.clearanceSearchQuery) params.search = this.clearanceSearchQuery;
    if (this.clearanceCurrentDateFrom) params.dateFrom = this.clearanceCurrentDateFrom;
    if (this.clearanceCurrentDateTo) params.dateTo = this.clearanceCurrentDateTo;
    if (this.clearanceCurrentApprovalStatus) params.approvalStatus = this.clearanceCurrentApprovalStatus;

    this.clearanceService.getClearanceRequests(params).pipe(
      finalize(() => {
        this.clearanceLoading = false;
        this.cdr.detectChanges();
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response: any) => {
        console.log('Clearance response:', response);
        this.clearanceRequests = response.items || [];
        this.clearanceTotalRecords = response.meta?.totalItems || 0;
        this.clearanceDataLoaded = true;
        console.log('Clearance requests loaded:', this.clearanceRequests.length);
      },
      error: (error: any) => {
        console.error('Error loading clearance requests:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load clearance requests',
          life: 3000
        });
      }
    });
  }

  onClearancePageChange(event: any): void {
    console.log('called');
    const newPage = Math.floor(event.first / event.rows) + 1;
    if (this.clearanceCurrentPage !== newPage || this.clearancePageSize !== event.rows) {
      this.clearanceCurrentPage = newPage;
      this.clearancePageSize = event.rows;
    }
    this.loadClearanceRequests();
  }

  onClearanceRefresh(): void {
    this.clearanceCurrentPage = 1;
    this.loadClearanceRequests();
  }

  onClearanceFilterChange(filters: any): void {
    this.clearanceCurrentStatus = filters.status || '';
    this.clearanceCurrentType = filters.type || '';
    this.clearanceSearchQuery = filters.search || '';
    this.clearanceCurrentDateFrom = filters.dateFrom || '';
    this.clearanceCurrentDateTo = filters.dateTo || '';
    this.clearanceCurrentApprovalStatus = filters.approvalStatus || '';
    this.clearanceCurrentPage = 1;
    this.loadClearanceRequests();
  }

  onClearanceViewDetails(request: ClearanceRequest): void {
    this.selectedClearanceRequest.set(request);
    this.masterDialog.dialogInstance.navigateToView('clearance');
    this.showMasterDialog.set(true);
  }

  getCurrentUserRole(): string {
    const user: any = this.authService.getUserInfo() || {};
    return user?.role || 'Registrar';
  }

  getMappedOffice(): string {
    // Registrar can access all offices, return empty string to show all approvals
    return '';
  }
};