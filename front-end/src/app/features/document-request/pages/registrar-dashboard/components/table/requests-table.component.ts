import { Component, ViewChild, inject, Input, Output, EventEmitter, OnInit, OnChanges, viewChild, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { DatePickerModule } from 'primeng/datepicker';
import { InplaceModule } from 'primeng/inplace';
import { FluidModule } from 'primeng/fluid';
import { PopoverModule } from 'primeng/popover';
import { Popover } from 'primeng/popover';
import { MenuModule } from 'primeng/menu';
import { ContextMenuModule } from 'primeng/contextmenu';
import { MenuItem } from 'primeng/api';
import { Menu } from 'primeng/menu';
import { ContextMenu } from 'primeng/contextmenu';

import { DocumentRequest } from '@features/document-request/request.model';
import { RequestService } from '@features/document-request/request.service';
import { ReceiptService } from '@features/document-request/receipts/receipt.service';
import { InputMask } from "primeng/inputmask";
import { SortIcon } from "@shared/components/sorticon/sorticon.component";
import { TableFilterComponent } from "@shared/components/table-filters/table-filter.component";

export interface FilterOption {
  label: string;
  value: string | 'all';
  icon?: string;
}

@Component({
  selector: 'app-requests-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    ButtonModule,
    TooltipModule,
    InputTextModule,
    SelectModule,
    DatePickerModule,
    InplaceModule,
    FluidModule,
    PopoverModule,
    MenuModule,
    ContextMenuModule,
    SortIcon,
    TableFilterComponent
  ],
  templateUrl: './requests-table.component.html',
  styles: [`
    :host ::ng-deep .p-inplace-display {
      padding: 0 !important;
    }

    .context-menu-target {
      cursor: context-menu;
    }
  `],
})
export class RequestsTableComponent implements OnChanges {
  dt = viewChild('dt');
  datePopover = viewChild<Popover>('datePopover');
  datePopoverTo = viewChild<Popover>('datePopoverTo');
  actionMenu = viewChild<Menu>('actionMenu');
  rowContextMenu = viewChild<ContextMenu>('rowContextMenu');
  requestedOn = viewChild<InputMask>('requestedOn');

  requests = input.required<DocumentRequest[]>();
  totalItems = input<number>(0);
  pageSize = input<number>(0);
  currentPage = input<number>(0);
  isLoading = input<boolean>(false);
  courses = input<any[]>([]);

  // Filter signals for table-filter component
  searchInput = signal<{ query?: string, placeholder: string; }>({
    query: '',
    placeholder: 'Search by ID, name, or code'
  });

  selectItems = signal<any[]>([
    {
      id: "status",
      options: [
        { label: 'All Status', value: 'all' },
        { label: 'Pending', value: 'Pending' },
        { label: 'Approved', value: 'Approved' },
        { label: 'Processing', value: 'Processing' },
        { label: 'Available for Claiming', value: 'Available for Claiming' },
        { label: 'Completed', value: 'Completed' },
        { label: 'Declined', value: 'Declined' }
      ],
      selected: { label: 'All Status', value: 'all' },
      icon: 'pi pi-filter'
    },
    {
      id: "hasReceipt",
      options: [
        { label: 'Receipts', value: 'all' },
        { label: 'Has Receipt', value: 'true' },
        { label: 'No Receipt', value: 'false' }
      ],
      selected: { label: 'Receipts', value: 'all' },
      icon: 'pi pi-receipt'
    }
  ]);

  dates = signal<any[]>([
    {
      id: 'dateRequested',
      label: 'Requested On',
      value: [null, null]
    }
  ]);

  pageChange = output<any>();
  viewReceipt = output<DocumentRequest>();
  approveRequest = output<DocumentRequest>();
  declineRequest = output<DocumentRequest>();
  initiateClearance = output<DocumentRequest>();
  editDocuments = output<DocumentRequest>();
  viewDetails = output<DocumentRequest>();
  viewClearance = output<DocumentRequest>();
  exportClearance = output<DocumentRequest>();
  refresh = output<void>();
  filterChange = output<{ status?: string; search?: string; hasReceipt?: string; dateFrom?: string; dateTo?: string; }>();

  protected requestService = inject(RequestService);
  private receiptService = inject(ReceiptService);

  filteredRequests: DocumentRequest[] = [];

  // Menu configuration
  menuItems: MenuItem[] = [];
  contextMenuItems: MenuItem[] = [];
  selectedRequestForMenu: DocumentRequest | null = null;

  ngOnChanges() {
    this.filteredRequests = this.requests();
  }

  onFilterChange(event: any) {
    this.selectItems().forEach((items) => {
      if (items.selected.value === 'all') {
        items.selected.value = undefined;
      }
    });

    const status = this.selectItems()[0].selected.value;
    const hasReceipt = this.selectItems()[1].selected.value;
    const dateFrom = this.dates()[0].value[0];
    const dateTo = this.dates()[0].value[1];

    this.filterChange.emit({
      status: status === 'all' ? undefined : status,
      search: this.searchInput().query,
      hasReceipt: hasReceipt === 'all' ? undefined : hasReceipt,
      dateFrom,
      dateTo
    });
  }


  //=================== Menu Actions ==================

  buildMenuItems(request: DocumentRequest): MenuItem[] {
    const items: MenuItem[] = [
      {
        label: 'View Details',
        icon: 'pi pi-info-circle',
        command: () => this.onViewDetails(request)
      },
      {
        label: 'View Receipt',
        icon: 'pi pi-file-pdf',
        visible: request.hasReceipt,
        command: () => this.onViewReceipt(request)
      },
      {
        label: 'View Clearance',
        icon: 'pi pi-file-check',
        visible: request.needsClearance && request.status !== "Pending",
        command: () => this.onViewClearance(request)
      },
      {
        label: 'Initial Clearance',
        icon: 'pi pi-file-check',
        visible:
          request.status !== 'Completed' &&
          request.status !== 'Declined' &&
          !request.needsClearance,
        command: () => this.onInitiateClearance(request)
      },
      {
        label: 'Approve',
        icon: 'pi pi-check',
        visible: request.status === 'Pending',
        command: () => this.onApproveRequest(request)
      },
      {
        label: 'Decline',
        icon: 'pi pi-trash',
        visible: request.status === 'Pending',
        command: () => this.onDeclineRequest(request)
      },
      {
        label: 'Edit Documents',
        icon: 'pi pi-pencil',
        visible: request.status === 'Pending' && !request.hasReceipt,
        command: () => this.onEditDocuments(request)
      },
      {
        label: 'Export Clearance',
        icon: 'pi pi-file-export',
        visible: request.needsClearance && request.status !== "Pending",
        command: () => this.onExportClearance(request)
      }
    ];
    return items;
  }

  updateMenuItemsVisibility(request: DocumentRequest) {
    this.contextMenuItems = this.buildMenuItems(request);
    this.menuItems = this.buildMenuItems(request);
  }

  openMenu(event: Event, request: DocumentRequest): void {
    event.stopPropagation();
    this.selectedRequestForMenu = request;
    this.updateMenuItemsVisibility(request);

    if (this.actionMenu()) {
      this.actionMenu()!.toggle(event);
    }
  }

  onContextMenu(event: any, request: DocumentRequest): void {
    event.preventDefault();
    this.selectedRequestForMenu = request;
    this.updateMenuItemsVisibility(request);

    if (this.rowContextMenu()) {
      this.rowContextMenu()!.show(event);
    }
  }



  onRefresh() {
    this.refresh.emit();
  }

  getStatusDot(status: string): string {
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

  onViewReceipt(request: DocumentRequest, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    this.viewReceipt.emit(request);
  }

  onApproveRequest(request: DocumentRequest, event?: Event): void {
    event?.preventDefault();
    this.approveRequest.emit(request);
  }

  onDeclineRequest(request: DocumentRequest, event?: Event): void {
    event?.preventDefault();
    this.declineRequest.emit(request);
  }

  onEditDocuments(request: DocumentRequest, event?: Event): void {
    event?.preventDefault();
    this.editDocuments.emit(request);
  }

  onInitiateClearance(request: DocumentRequest, event?: Event): void {
    event?.preventDefault();
    this.initiateClearance.emit(request);
  }

  onViewDetails(request: DocumentRequest, event?: Event): void {
    event?.preventDefault();
    this.viewDetails.emit(request);
  }

  onViewClearance(request: DocumentRequest, event?: Event): void {
    event?.preventDefault();
    this.viewClearance.emit(request);
  }

  onExportClearance(request: DocumentRequest, event?: Event): void {
    event?.preventDefault();
    this.exportClearance.emit(request);
  }
  onPageChange(event: any): void {
    this.pageChange.emit(event);
  }
}
