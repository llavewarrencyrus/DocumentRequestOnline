import { Component, ViewChild, Input, Output, EventEmitter, OnChanges, OnInit, inject, viewChild, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';
import { SkeletonModule } from 'primeng/skeleton';
import { SelectModule } from 'primeng/select';
import { Menu, MenuModule } from 'primeng/menu';
import { ContextMenuModule } from 'primeng/contextmenu';
import { MenuItem } from 'primeng/api';
import { ContextMenu } from 'primeng/contextmenu';

import { User } from '@account/account.model';
import { AccountService } from '@account/account.service';
import { map } from 'rxjs';
import { TableFilterComponent } from "@shared/components/table-filters/table-filter.component";

export interface FilterOption {
  label: string;
  value: string | 'all';
  icon?: string;
}

@Component({
  selector: 'user-table',
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
    MenuModule,
    ContextMenuModule,
    TableFilterComponent,
  ],
  templateUrl: './user-table.component.html',
  styles: [`
    :host {
      display: block;
    }
    
    .context-menu-target {
      cursor: context-menu;
    }
  `]
})
export class UserTableComponent implements OnChanges, OnInit {
  private accountService = inject(AccountService);

  rowContextMenu = viewChild<ContextMenu>('rowContextMenu');
  actionMenu = viewChild<Menu>('actionMenu');

  users = input<User[]>();
  loading = input<boolean>(false);
  totalRecords = input<number>();
  currentPage = input<number>(1);
  pageSize = input<number>(10);

  refresh = output<void>();
  pageChange = output<any>();
  invitationLink = output<User>();
  viewUser = output<User>();
  editUser = output<User>();
  toggleStatus = output<User>();
  resetPassword = output<User>();
  filterChange = output<any>();

  // Filter signals for table-filter component
  searchInput = signal<{ query?: string, placeholder: string; }>({
    query: '',
    placeholder: 'Search by username or role'
  });

  selectItems = signal<any[]>([
    {
      id: "role",
      options: [
        { label: 'All Roles', value: 'all' },
        { label: 'Administrator', value: 'Admin' },
        { label: 'Cashier', value: 'Cashier' },
        { label: 'Librarian', value: 'Librarian' },
        { label: 'School Dean/Principal', value: 'Director' },
        { label: 'Accountant', value: 'Accountant' },
        { label: 'Inventory', value: 'Inventory' },
        { label: 'Counselor', value: 'Counselor' }
      ],
      selected: { label: 'All Roles', value: 'all' },
      icon: 'pi pi-filter'
    },
    {
      id: "status",
      options: [
        { label: 'All Status', value: 'all' },
        { label: 'Active', value: 'true' },
        { label: 'Inactive', value: 'false' }
      ],
      selected: { label: 'All Status', value: 'all' },
      icon: 'pi pi-filter'
    }
  ]);

  dates = signal<any[]>([
    {
      id: 'lastLogin',
      label: 'Last Login',
      value: [null, null] as [string | null, string | null]
    },
    {
      id: 'created',
      label: 'Created',
      value: [null, null] as [string | null, string | null]
    }
  ]);

  filteredUsers: User[] = [];
  departments: Map<number, string> = new Map();

  selectedUser: User | null = null;
  contextMenuItems: MenuItem[] = [];

  ngOnInit() {
    this.accountService.getDepartments().pipe(
      map(response => {
        response.forEach(dept => {
          this.departments.set(dept.id, this.toCamelCase(dept.description));
        });
      })
    ).subscribe();
  }

  ngOnChanges() {
    this.filterUsers();
  }

  filterUsers() {
    let filtered = [...this.users()!];

    const searchQuery = this.searchInput().query;
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        user.username.toLowerCase().includes(searchLower) ||
        user.role.toLowerCase().includes(searchLower) ||
        (user.office?.toLowerCase().includes(searchLower))
      );
    }

    const role = this.selectItems()[0].selected.value;
    if (role && role !== 'all') {
      filtered = filtered.filter(user => user.role === role);
    }

    const status = this.selectItems()[1].selected.value;
    if (status && status !== 'all') {
      const isActive = status === 'true';
      filtered = filtered.filter(user => user.isActive === isActive);
    }

    this.filteredUsers = filtered;
  }

  onFilterChange(event: any) {
    this.selectItems().forEach((items) => {
      if (items.selected.value === 'all') {
        items.selected.value = undefined;
      }
    });

    const role = this.selectItems()[0].selected.value;
    const status = this.selectItems()[1].selected.value;
    const lastLoginFrom = this.dates()[0].value[0];
    const lastLoginTo = this.dates()[0].value[1];
    const createdFrom = this.dates()[1].value[0];
    const createdTo = this.dates()[1].value[1];

    this.filterChange.emit({
      role: role === 'all' ? undefined : role,
      isActive: status === 'all' ? undefined : status,
      search: this.searchInput().query,
      lastLoginFrom: lastLoginFrom || undefined,
      lastLoginTo: lastLoginTo || undefined,
      createdFrom: createdFrom || undefined,
      createdTo: createdTo || undefined
    });
  }

  onRefresh() {
    this.refresh.emit();
  }

  onPageChange(event: any) {
    this.pageChange.emit(event);
  }

  getRoleSeverity(role: string): string {
    const severityMap: Record<string, string> = {
      'ADMIN': 'danger',
      'Cashier': 'info',
      'Librarian': 'info',
      'Director': 'warning',
      'Accountant': 'success',
      'Inventory': 'info',
      'Counselor': 'help',
    };
    return severityMap[role] || 'secondary';
  }

  getRoleIcon(role: string): string {
    const iconMap: Record<string, string> = {
      'ADMIN': 'pi pi-shield',
      'Cashier': 'pi pi-dollar',
      'Librarian': 'pi pi-book',
      'Director': 'pi pi-building',
      'Accountant': 'pi pi-chart-line',
      'Inventory': 'pi pi-box',
      'Counselor': 'pi pi-users',
    };
    return iconMap[role] || 'pi pi-user';
  }

  formatDate(date: Date): string {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString();
  }


  getOffice(office: string, departmentId?: number): string {
    const officeMapping: Record<string, string> = {
      'Admin': 'Admin',
      'CASHIER': 'Cashier',
      'LIBRARY': 'Library',
      'SCHOOL': this.getDepartment(departmentId),
      'ACCOUNTS': 'Students Accounts Office',
      'INVENTORY': 'Inventory Office',
      'CCSD': 'Center For Counseling and Student Development',
    };

    return officeMapping[office] || office;
  }

  getDepartment(departmentId?: number): string {
    if (departmentId && this.departments.has(departmentId)) {
      return this.departments.get(departmentId)!;
    }
    return 'Department';
  }

  toCamelCase(str: string): string {
    return str
      .toLowerCase()
      .replace(/(?:^|\s)\w/g, match => match.toUpperCase());
  }

  onRowContextMenu(event: MouseEvent, user: User) {
    event.preventDefault();
    this.selectedUser = user;

    if (this.actionMenu) {
      this.actionMenu()!.hide();
    }

    this.updateMenuItemsVisibility(user);

    if (this.rowContextMenu) {
      this.rowContextMenu()!.show(event);
    }
  }

  onRowClick(user: User) {
    this.viewUser.emit(user);
  }

  onActionMenuClick(event: MouseEvent, user: User) {
    event.stopPropagation();
    this.selectedUser = user;

    if (this.rowContextMenu) {
      this.rowContextMenu()!.hide();
    }

    this.updateMenuItemsVisibility(user);

    if (this.actionMenu) {
      this.actionMenu()!.toggle(event);
    }
  }

  updateMenuItemsVisibility(user: User) {
    this.contextMenuItems = [
      {
        label: 'View Invitation Link',
        icon: 'pi pi-link',
        visible: !!(this.selectedUser && !this.selectedUser.lastLogin),
        command: () => {
          if (this.selectedUser) {
            this.invitationLink.emit(this.selectedUser);
          }
        }
      },
      {
        label: 'Reset Password',
        icon: 'pi pi-key',
        visible: !!(this.selectedUser && this.selectedUser.lastLogin),
        command: () => {
          if (this.selectedUser) {
            this.resetPassword.emit(this.selectedUser);
          }
        }
      },
      {
        label: 'Edit User',
        icon: 'pi pi-pencil',
        command: () => {
          if (this.selectedUser) {
            this.editUser.emit(this.selectedUser);
          }
        }
      },
      {
        label: this.selectedUser?.isActive ? 'Deactivate User' : 'Activate User',
        icon: this.selectedUser?.isActive ? 'pi pi-ban' : 'pi pi-check-circle',
        command: () => {
          if (this.selectedUser) {
            this.toggleStatus.emit(this.selectedUser);
          }
        }
      },
    ];
  }
}