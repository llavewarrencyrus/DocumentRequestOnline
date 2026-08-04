// clearance/pages/dashboard/dashboard.page.ts
import { Component, OnInit, inject, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// PrimeNG Imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { BadgeModule } from 'primeng/badge';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService } from 'primeng/api';
import { ConfirmationService } from 'primeng/api';

import { ClearanceService } from '@clearance/clearance.service';
import { ClearanceRequest, ClearanceApproval } from '@clearance/clearance.model';
import { AuthService } from '@core/services/auth.service';
import { MasterDialogComponent } from '@shared/components/master-dialog/master-dialog.component';
import { MasterDialogConfig } from '@shared/components/master-dialog/master-dialog.config';
import { ApprovalDialogComponent } from './components/approval-dialog/approval-dialog.component';
import { ClearanceDetailsComponent } from './components/clearance-details/clearance-details.component';
import { RemarksDialogComponent } from "./components/remarks-dialog/remarks-dialog.component";
import { ClearanceTableComponent } from './components/table/table.component';
import { StatsComponent, StatItem } from '@shared/components/stats/stats.component';

@Component({
  selector: 'clearance-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    CardModule,
    ButtonModule,
    TagModule,
    BadgeModule,
    ProgressSpinnerModule,
    ClearanceTableComponent,
    StatsComponent,
    MasterDialogComponent,
  ],
  templateUrl: './dashboard.page.html'
})
export class ClearanceDashboard implements OnInit {
  @ViewChild(MasterDialogComponent) masterDialog!: MasterDialogComponent;
  protected clearanceService = inject(ClearanceService);
  private authService = inject(AuthService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  currentUserRole: string = '';
  clearanceRequests: ClearanceRequest[] = [];
  totalRecords: number = 0;
  loading: boolean = true;

  remarks = signal<string>('');

  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;

  // Filters
  currentStatus: string = '';
  currentType: string = '';
  searchQuery: string = '';
  currentDateFrom: string = '';
  currentDateTo: string = '';
  currentSortField: string = '';
  currentSortOrder: number = 0;
  currentOffice: string = '';
  currentApprovalStatus: string = '';

  // Stats
  stats = {
    total: 0,
    pending: 0,
    inReview: 0,
    approved: 0,
    rejected: 0
  };

  get statsItems(): StatItem[] {
    return [
      {
        title: 'Total',
        value: this.stats.total,
        icon: 'pi-list',
        bgColor: 'bg-blue-50',
        iconColor: 'text-blue-600',
      },
      {
        title: 'Pending',
        value: this.stats.pending,
        icon: 'pi-clock',
        bgColor: 'bg-amber-50',
        iconColor: 'text-amber-600',
      },
      {
        title: 'In Review',
        value: this.stats.inReview,
        icon: 'pi-sync',
        bgColor: 'bg-blue-50',
        iconColor: 'text-blue-600',
      },
      {
        title: 'Approved',
        value: this.stats.approved,
        icon: 'pi-check-circle',
        bgColor: 'bg-emerald-50',
        iconColor: 'text-emerald-600',
      },
      {
        title: 'Rejected',
        value: this.stats.rejected,
        icon: 'pi-times-circle',
        bgColor: 'bg-rose-50',
        iconColor: 'text-rose-600',
      },
    ];
  }

  private ROLE_TO_OFFICE_MAP: { [key: string]: string; } = {
    'Cashier': 'CASHIER',
    'Librarian': 'LIBRARY',
    'Director': 'SCHOOL',
    'Accountant': 'ACCOUNTS',
    'Inventory': 'INVENTORY',
    'Counselor': 'CCSD'
  };

  ngOnInit() {
    this.currentUserRole = this.authService.getUserRole();
    this.currentOffice = this.getMappedOffice();
  }

  loadClearanceRequests() {
    this.loading = true;

    const params: any = {
      page: this.currentPage,
      limit: this.pageSize
    };

    if (this.currentStatus) params.status = this.currentStatus;
    if (this.currentType) params.type = this.currentType;
    if (this.searchQuery) params.search = this.searchQuery;
    if (this.currentDateFrom) params.dateFrom = this.currentDateFrom;
    if (this.currentDateTo) params.dateTo = this.currentDateTo;
    if (this.currentSortField) params.sortBy = this.currentSortField;
    if (this.currentSortOrder !== 0) params.sortOrder = this.currentSortOrder === 1 ? 'asc' : 'desc';
    if (this.currentOffice) params.office = this.currentOffice;
    if (this.currentApprovalStatus) params.approvalStatus = this.currentApprovalStatus;

    this.clearanceService.getClearanceRequests(params).subscribe({
      next: (response) => {
        if (response) {
          this.clearanceRequests = response.items;
          this.totalRecords = response.meta.totalItems;
          this.currentPage = response.meta.currentPage;
          this.calculateStats(response.meta.stats);
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading clearance requests:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load clearance requests'
        });
        this.loading = false;
      }
    });
  }

  onPageChange(event: any) {
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
      this.loadClearanceRequests();
    } else if (event.sortField !== undefined || event.sortOrder !== undefined) {
      // Reload if sort changed but page didn't
      this.loadClearanceRequests();
    }
  }

  onFilterChange(filters: { status?: string; search?: string; type?: string; dateFrom: string | null; dateTo: string | null; approvalStatus?: string; }) {
    this.currentStatus = filters.status || '';
    this.currentType = filters.type || '';
    this.searchQuery = filters.search || '';
    this.currentDateFrom = filters.dateFrom || '';
    this.currentDateTo = filters.dateTo || '';
    this.currentApprovalStatus = filters.approvalStatus || '';
    this.currentPage = 1;
    this.loadClearanceRequests();
  }

  calculateStats(apiStats?: { total: number; pending: number; inReview: number; approved: number; rejected: number; }) {
    if (apiStats) {
      this.stats = {
        total: apiStats.total,
        pending: apiStats.pending,
        inReview: apiStats.inReview,
        approved: apiStats.approved,
        rejected: apiStats.rejected
      };
    } else {
      this.stats = {
        total: this.totalRecords,
        pending: 0,
        inReview: 0,
        approved: 0,
        rejected: 0
      };
    }
  }

  get dialogConfig(): MasterDialogConfig {
    return {
      views: [
        {
          id: 'details',
          component: ClearanceDetailsComponent,
          width: 750,
          header: 'Clearance Details',
          showBackButton: false,
          data: {
            request: this.selectedRequest,
            currentUserRole: this.currentUserRole,
            getMappedOffice: this.getMappedOffice()
          },
          callbacks: {
            onApprove: (request: ClearanceRequest) => {
              this.openApprovalDialog(request);
            },
            onHold: () => {
              this.openMarkDeficient(this.selectedRequest!);
            }
          }
        },
        {
          id: 'approval',
          component: ApprovalDialogComponent,
          width: 500,
          header: this.currentUserRole === 'Cashier' ? 'Verify Payment' : 'Process Approval',
          showBackButton: true,
          data: {
            request: this.selectedRequest,
            approval: this.currentApproval,
            userRole: this.currentUserRole
          },
          callbacks: {
            onComplete: (data: { approved: boolean; remarks?: string; }) => {
              this.onApprovalComplete(data.approved, data.remarks);
            }
          }
        },
        {
          id: 'remarks',
          component: RemarksDialogComponent,
          width: 400,
          header: 'Specify Reason for Hold',
          showBackButton: true,
          data: {
            officeName: this.getMappedOffice(),
            remarks: this.remarks()
          },
          callbacks: {
            onRemarksChange: (remarks: string) => {
              this.remarks.set(remarks);
            }
          },
          footerActions: [
            {
              label: 'Dismiss',
              text: true,
              severity: 'secondary',
              action: () => {
                this.masterDialog.dialogInstance.goBack();
              }
            },
            {
              label: this.remarks() ? 'Update Diffiency' : 'Issue Difficiency',
              icon: 'pi pi-send',
              action: () => {
                this.onApprovalComplete(false, this.remarks());
              }
            }
          ]
        }
      ],
      initialView: 'details',
      defaultWidth: 650,
      onClose: () => this.closeDialog()
    };
  }

  selectedRequest: ClearanceRequest | null = null;
  showMasterDialog: boolean = false;
  currentApproval: ClearanceApproval | null = null;

  getMappedOffice(): string {
    return this.ROLE_TO_OFFICE_MAP[this.currentUserRole] || '';
  }

  viewDetails(request: ClearanceRequest) {
    this.selectedRequest = request;
    if (!this.showMasterDialog) {
      this.showMasterDialog = true;
    }
  }

  openApprovalDialog(request: ClearanceRequest) {
    this.selectedRequest = request;
    const userOffice = this.getMappedOffice();
    this.currentApproval = request.approvals?.find(a => a.office === userOffice) || null;
    this.masterDialog.dialogInstance.navigateToView('approval');
  }

  openMarkDeficient(request: ClearanceRequest) {
    this.selectedRequest = request;
    const userOffice = this.getMappedOffice();
    this.currentApproval = request.approvals?.find(a => a.office === userOffice) || null;
    this.remarks.set(this.currentApproval?.remarks || '');
    this.masterDialog.navigateToView('remarks');
  }

  onApprovalComplete(approved: boolean, remarks?: string) {
    if (!approved && !remarks) {
      this.masterDialog.dialogInstance.navigateToView('remarks');
      return;
    }

    this.processStatusUpdate(approved, remarks);
  }

  processStatusUpdate(approved: boolean, remarks?: string) {
    if (this.selectedRequest && this.currentApproval) {
      const status = approved ? 'APPROVED' : 'ON_HOLD';

      this.clearanceService.updateApproval(this.currentApproval.id, {
        status,
        signedBy: this.authService.getUserFullName(),
        signedOn: new Date(),
        remarks
      }).subscribe({
        next: () => {
          if (this.currentUserRole === 'Cashier' && this.selectedRequest && approved) {
            this.clearanceService.updateClearanceStatus(this.selectedRequest.id, 'IN_REVIEW').subscribe({
              next: () => {
                this.messageService.add({
                  severity: 'success',
                  summary: 'Success',
                  detail: `Request ${approved ? 'approved' : 'put on hold'}`
                });
                this.showMasterDialog = false;
                this.loadClearanceRequests();
              }
            });
          } else {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: `Request ${approved ? 'approved' : 'put on hold'}`
            });
            this.showMasterDialog = false;
            this.loadClearanceRequests();
          }
        },
        error: (error) => {
          console.error('Error updating approval:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to process approval'
          });
        }
      });
    }
  }

  closeDialog() {
    this.selectedRequest = null;
    this.currentApproval = null;
    this.showMasterDialog = false;
  }

  refreshData() {
    this.loadClearanceRequests();
  }
}