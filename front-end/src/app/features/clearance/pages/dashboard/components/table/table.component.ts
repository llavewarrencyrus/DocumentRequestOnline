// clearance/pages/dashboard/components/table/table.component.ts
import { Component, input, output, inject, ViewChild, AfterViewInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Imports
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { SelectModule } from 'primeng/select';
import { AvatarModule } from 'primeng/avatar';
import { AvatarGroupModule } from 'primeng/avatargroup';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { MenuModule } from 'primeng/menu';
import { ContextMenuModule } from 'primeng/contextmenu';
import { MenuItem } from 'primeng/api';
import { ContextMenu } from 'primeng/contextmenu';
import { InputMaskModule } from 'primeng/inputmask';
import { PopoverModule } from 'primeng/popover';
import { DatePickerModule } from 'primeng/datepicker';

import { SortIcon } from '@shared/components/sorticon/sorticon.component';

import { ClearanceService } from '@clearance/clearance.service';
import { ClearanceRequest } from '@clearance/clearance.model';
import { TableFilterComponent } from "@src/app/shared/components/table-filters/table-filter.component";

export interface FilterOption {
  label: string;
  value: string | 'all';
  icon?: string;
}

@Component({
  selector: 'clearance-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    TagModule,
    TooltipModule,
    InputTextModule,
    SkeletonModule,
    SelectModule,
    AvatarModule,
    AvatarGroupModule,
    InputGroupModule,
    InputGroupAddonModule,
    MenuModule,
    ContextMenuModule,
    InputMaskModule,
    PopoverModule,
    DatePickerModule,
    SortIcon,
    TableFilterComponent
  ],
  templateUrl: './table.component.html',
  styles: [`
    :host {
      display: block;
    }
    
    .context-menu-target {
      cursor: context-menu;
    }
  `]
})
export class ClearanceTableComponent implements AfterViewInit {
  protected clearanceService = inject(ClearanceService);

  @ViewChild('rowContextMenu') rowContextMenu!: ContextMenu;
  @ViewChild('actionMenu') actionMenu: any;
  @ViewChild('datePopover') datePopover!: any;
  @ViewChild('requestedOn') requestedOn: any;

  clearanceRequests = input.required<ClearanceRequest[]>();
  loading = input<boolean>(false);
  totalRecords = input.required<number>();
  currentPage = input<number>(1);
  pageSize = input<number>(10);
  currentUserRole = input.required<string>();
  getMappedOffice = input<string>();

  refresh = output<void>();
  pageChange = output<any>();
  viewDetails = output<ClearanceRequest>();
  openApproval = output<ClearanceRequest>();
  markDeficient = output<ClearanceRequest>();
  filterChange = output<{ status?: string; search?: string; type?: string; dateFrom: string | null; dateTo: string | null; approvalStatus: string; }>();
  viewLogs = output<ClearanceRequest>();
  export = output<ClearanceRequest>();

  searchQuery: string = '';
  searchInput = signal<{ query?: string, placeholder: string; }>({
    query: '',
    placeholder: 'Search by ID, name, or course'
  });
  filteredRequests: ClearanceRequest[] = [];

  statusOptions: FilterOption[] = [
    { label: 'All Status', value: 'all' },
    { label: 'Pending', value: 'PENDING' },
    { label: 'Cleared', value: 'APPROVED' },
    { label: 'On Hold', value: 'ON_HOLD' }
  ];

  selectedStatus: string = '';

  typeOptions: FilterOption[] = [
    { label: 'All Types', value: 'all' },
    { label: 'Regular', value: 'REGULAR' },
    { label: 'New Graduate', value: 'NEWLY_GRADUATE' },
    { label: 'Transfer', value: 'TRANSFER' }
  ];

  selectedType: string = '';

  dateFromString: string = '';
  dateToString: string = '';
  dateFrom: string | null = null;
  dateTo: string | null = null;
  dateRange: Date[] | null = null;
  showTo: boolean = false;

  dates = signal<any[]>([
    {
      id: 'dateRequested',
      label: 'Date Requested',
      value: [null, null]
    }
  ]);

  selectedRequest: ClearanceRequest | null = null;
  contextMenuItems: MenuItem[] = [];

  selectItems = signal<any[]>([
    {
      id: "status",
      options: this.statusOptions,
      selected: this.statusOptions[0]
    },
    {
      id: "type",
      options: this.typeOptions,
      selected: this.typeOptions[0]
    }
  ]);

  ngAfterViewInit() {
    this.initializeMenuItems();
  }

  initializeMenuItems() {
    this.contextMenuItems = [
      {
        label: 'View Details',
        icon: 'pi pi-eye',
        command: () => {
          if (this.selectedRequest) {
            if (this.currentUserRole() !== 'Cashier') {
              this.onViewDetails(this.selectedRequest);
            } else {
              this.onApprove(this.selectedRequest);
            }
          }
        }
      },
      {
        label: 'Approve',
        icon: 'pi pi-check-circle',
        visible: this.selectedRequest ? this.canApprove(this.selectedRequest) : false,
        command: () => {
          if (this.selectedRequest) {
            this.onApprove(this.selectedRequest);
          }
        }
      },
      {
        label: 'Mark Deficient',
        icon: 'pi pi-exclamation-triangle',
        visible: this.selectedRequest ? this.canMarkDeficient(this.selectedRequest) : false,
        command: () => {
          if (this.selectedRequest) {
            this.onMarkDeficient(this.selectedRequest);
          }
        }
      },
      {
        label: 'View Logs',
        icon: 'pi pi-address-book',
        visible: this.currentUserRole() === 'Registrar',
        command: () => {
          if (this.selectedRequest) {
            this.viewLogs.emit(this.selectedRequest);
          }
        }
      },
      {
        label: 'Export',
        icon: 'pi pi-file-export',
        visible: this.currentUserRole() === 'Registrar',
        command: () => {
          if (this.selectedRequest) {
            this.export.emit(this.selectedRequest);
          }
        }
      },
    ];
  }

  ngOnChanges() {
    this.filteredRequests = this.clearanceRequests();
  }

  onFilterChange(event: any) {
    this.selectItems().forEach((items) => {
      if (items.selected.value === 'all') {
        items.selected.value = undefined;
      }
    });

    this.filterChange.emit({
      search: this.searchInput().query,
      type: this.selectItems()[1].selected.value,
      dateFrom: this.dates()[0].value[0],
      dateTo: this.dates()[0].value[1],
      approvalStatus: this.selectItems()[0].selected.value,
    });
  }

  formatDate(date: Date | null): string {
    if (!date) return '';
    return date.toLocaleDateString('en-CA');
  }

  // emitFilterChange() {
  //   const search = this.searchQuery?.trim() || undefined;
  //   const dateFrom = this.dateFrom ? this.formatDate(this.dateFrom) : undefined;
  //   const dateTo = this.dateTo ? this.formatDate(this.dateTo) : undefined;
  //   this.filterChange.emit({ search, type: this.selectedType, dateFrom, dateTo, approvalStatus: this.selectedStatus });
  // }

  getOfficeStatus(request: ClearanceRequest): string {
    const userOffice = this.getMappedOffice();
    const officeApproval = request.approvals?.find((a: any) => a.office === userOffice);
    return officeApproval?.status || 'PENDING';
  }

  onRefresh() {
    this.refresh.emit();
  }

  onPageChange(event: any) {
    this.pageChange.emit(event);
  }

  onViewDetails(request: ClearanceRequest) {
    this.viewDetails.emit(request);
  }

  onApprove(request: ClearanceRequest) {
    this.openApproval.emit(request);
  }

  onMarkDeficient(request: ClearanceRequest) {
    this.markDeficient.emit(request);
  }

  canApprove(request: ClearanceRequest): boolean {
    if (!request || request.status === 'APPROVED' || request.status === 'REJECTED') {
      return false;
    }

    const userOffice = this.getMappedOffice();

    if (this.currentUserRole() === 'Cashier' && request.status === 'PENDING') {
      return true;
    }

    if (this.currentUserRole() !== 'Cashier' && (request.status === 'IN_REVIEW' || request.status === 'ON_HOLD')) {
      const officeApproval = request.approvals?.find((a: any) => a.office === userOffice);
      return officeApproval?.status === 'PENDING' || officeApproval?.status === 'ON_HOLD';
    }

    return false;
  }

  canMarkDeficient(request: ClearanceRequest): boolean {
    if (this.currentUserRole() !== 'Cashier' && request.status === 'ON_HOLD' || request.status === 'IN_REVIEW') {
      const userOffice = this.getMappedOffice();
      const officeApproval = request.approvals?.find((a: any) => a.office === userOffice);
      console.log(officeApproval?.status === 'ON_HOLD' || officeApproval?.status === 'PENDING');
      return officeApproval?.status === 'PENDING';
    }
    return false;
  }

  onRowContextMenu(event: MouseEvent, request: ClearanceRequest) {
    event.preventDefault();
    this.selectedRequest = request;

    // Update context menu visibility based on current request
    this.updateMenuItemsVisibility(request);

    if (this.rowContextMenu) {
      this.rowContextMenu.show(event);
    }
  }

  onRowClick(request: ClearanceRequest) {
    if (this.currentUserRole() !== 'Cashier') {
      this.onViewDetails(request);
    } else {
      this.onApprove(request);
    }
  }

  onActionMenuClick(event: MouseEvent, request: ClearanceRequest) {
    event.stopPropagation();
    this.selectedRequest = request;

    this.updateMenuItemsVisibility(request);

    if (this.actionMenu) {
      this.actionMenu.toggle(event);
    }
  }

  updateMenuItemsVisibility(request: ClearanceRequest) {
    this.contextMenuItems = this.contextMenuItems.map(item => ({
      ...item,
      visible: item.label === 'Approve'
        ? this.canApprove(request)
        : item.label === 'Mark Deficient'
          ? this.canMarkDeficient(request)
          : item.label === 'View Logs' || item.label === 'Export'
            ? this.currentUserRole() === 'Registrar'
            : true
    }));
  }

  updateActionMenuItems(request: ClearanceRequest): MenuItem[] {
    return [
      {
        label: 'View Details',
        icon: 'pi pi-eye',
        data: { request },
        command: (event) => {
          this.onViewDetails(event.item?.['data'].request);
        }
      },
      {
        label: 'Approve',
        icon: 'pi pi-check-circle',
        data: { request },
        visible: this.canApprove(request),
        command: (event) => {
          this.onApprove(event.item?.['data'].request);
        }
      },
      {
        label: 'Mark Deficient',
        icon: 'pi pi-exclamation-triangle',
        data: { request },
        visible: this.canMarkDeficient(request),
        command: (event) => {
          this.onMarkDeficient(event.item?.['data'].request);
        }
      }
    ];
  }

  getActionMenuItems(request: ClearanceRequest): MenuItem[] {
    return [
      {
        label: 'View Details',
        icon: 'pi pi-eye',
        data: { request },
        command: () => this.onViewDetails(request)
      },
      {
        label: 'Approve',
        icon: 'pi pi-check-circle',
        data: { request },
        visible: this.canApprove(request),
        command: () => this.onApprove(request)
      },
      {
        label: 'Mark Deficient',
        icon: 'pi pi-exclamation-triangle',
        data: { request },
        visible: this.canMarkDeficient(request),
        command: () => this.onMarkDeficient(request)
      }
    ];
  }
}