// frontend/src/app/modules/users/pages/dashboard/dashboard.page.ts
import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

// PrimeNG Imports
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { BadgeModule } from 'primeng/badge';
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { MessageService } from 'primeng/api';
import { ConfirmationService } from 'primeng/api';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';

import { MasterDialogComponent } from '@shared/components/master-dialog/master-dialog.component';
import { MasterDialogConfig, FooterAction } from '@shared/components/master-dialog/master-dialog.config';
import { AccountService } from '@account/account.service';
import { User, CreateUserDto, UpdateUserDto } from '@account/account.model';
import { UserTableComponent } from './components/user-table/user-table.component';
import { UserFormComponent } from './components/user-form/user-form.component';
import { UserDetailsComponent } from './components/user-details/user-details.component';
import { UserLinkDialogComponent } from './components/user-link-dialog/user-link-dialog.component';
import { StatsComponent, StatItem } from '@shared/components/stats/stats.component';
import { trigger, transition, style, animate } from '@angular/animations';

@Component({
  selector: 'Account-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    CardModule,
    ButtonModule,
    TagModule,
    BadgeModule,
    DialogModule,
    ProgressSpinnerModule,
    InputTextModule,
    SelectModule,
    CheckboxModule,
    UserTableComponent,
    StatsComponent,
    MasterDialogComponent,
  ],
  templateUrl: './dashboard.page.html',
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
  ],
})
export class AccountDashboard implements OnInit {
  @ViewChild(MasterDialogComponent) masterDialog!: MasterDialogComponent;
  @ViewChild(UserFormComponent) userFormComponent!: UserFormComponent;

  private userService = inject(AccountService);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  users: User[] = [];
  totalRecords: number = 0;
  loading: boolean = true;
  linkLoading: boolean = false;

  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;

  // Filters
  selectedRole: string = '';
  selectedStatus: string = '';
  searchText: string = '';
  lastLoginFrom: string = '';
  lastLoginTo: string = '';
  createdFrom: string = '';
  createdTo: string = '';

  // Dialog
  showMasterDialog: boolean = false;
  openUserDialog: boolean = false;
  dialogMode: 'create' | 'edit' = 'create';
  selectedUser: User | null = null;
  generatedLink: string | null = null;

  resetLink: string = '';
  linkType: 'reset' | 'invitation' = 'reset';

  // View User Dialog
  viewUser: User | null = null;

  // Form state for dialog
  isFormDisabled: boolean = true;
  submitData: CreateUserDto | UpdateUserDto | null = null;

  private readonly viewWidths: Record<string, number> = {
    form: 550,
    success: 450,
    default: 550
  };

  // Stats
  stats = {
    total: 0,
    active: 0,
    inactive: 0,
    roles: {} as Record<string, number>,
  };

  get statsItems(): StatItem[] {
    return [
      {
        title: 'Total Users',
        value: this.stats.total,
        icon: 'pi-users',
        bgColor: 'bg-blue-50',
        iconColor: 'text-blue-600',
      },
      {
        title: 'Active',
        value: this.stats.active,
        icon: 'pi-check-circle',
        bgColor: 'bg-emerald-50',
        iconColor: 'text-emerald-600',
      },
      {
        title: 'Inactive',
        value: this.stats.inactive,
        icon: 'pi-times-circle',
        bgColor: 'bg-rose-50',
        iconColor: 'text-rose-600',
      },
    ];
  }

  get dialogConfig(): MasterDialogConfig {
    return {
      views: [
        {
          id: 'details',
          component: UserDetailsComponent,
          width: 650,
          header: 'User Details',
          showBackButton: false,
          data: {
            user: this.viewUser,
          },
          footerActions: [
            {
              label: 'Reset Password',
              icon: 'pi pi-key',
              severity: 'secondary',
              outlined: true,
              visible: () => this.viewUser?.lastLogin !== null,
              action: () => {
                this.onResetPassword(this.viewUser!);
              }
            },
            {
              label: 'View Invitation',
              icon: 'pi pi-envelope',
              severity: 'secondary',
              outlined: true,
              visible: () => this.viewUser?.lastLogin === null,
              action: () => {
                this.onViewInvitation(this.viewUser!);
              }
            },
            {
              label: 'Edit User',
              icon: 'pi pi-pencil',
              outlined: true,
              action: () => {
                this.openEditDialog(this.viewUser!);
              }
            }
          ]
        },
        {
          id: 'form',
          component: UserFormComponent,
          width: 500,
          header: this.dialogMode === 'edit' ? `Edit User ${this.selectedUser?.username}` : 'Create User',
          showBackButton: true,
          data: {
            user: this.selectedUser,
            mode: this.dialogMode,
            onFormStateChange: (disabled: boolean, userData: CreateUserDto | UpdateUserDto) => {
              this.isFormDisabled = disabled;
              this.submitData = userData;
            }
          },
          footerActions: [
            {
              label: this.selectedUser?.isActive ? 'Deactivate' : 'Activate',
              icon: this.selectedUser?.isActive ? 'pi pi-ban' : 'pi pi-check-circle',
              severity: 'primary',
              position: 'left',
              outlined: true,
              visible: this.selectedUser?.isActive !== undefined,
              action: () => {
                this.onDeactivate(this.selectedUser!);
              }
            },
            {
              label: 'Cancel',
              icon: 'pi pi-times',
              severity: 'secondary',
              text: true,
              action: () => {
                this.masterDialog.dialogInstance.goBack();
              }
            },
            {
              label: 'Save Changes',
              icon: 'pi pi-save',
              severity: 'primary',
              disabled: () => this.isFormDisabled,
              action: () => {
                this.onSaveUser(this.submitData!);
              }
            }
          ]
        },
        {
          id: 'link',
          component: UserLinkDialogComponent,
          width: 450,
          header: this.linkType === 'reset' ? 'Reset Password' : 'Send Invitation',
          showBackButton: true,
          data: {
            link: this.resetLink,
            title: this.linkType === 'reset' ? 'Reset Password Link' : 'Invitation Link',
            description: this.linkType === 'reset'
              ? 'Share this reset password link with the user to reset their account password.'
              : 'Share this invitation link with the user to set up their account.',
            loading: this.linkLoading,
          },
          footerActions: [
            {
              label: this.linkType === 'reset' ? 'Generate Reset Link' : 'Generate Invitation Link',
              icon: 'pi pi-link',
              width: 'full',
              visible: this.resetLink ? false : true,
              action: () => {
                this.generateNewToken(this.selectedUser!.id);
              }
            },
            {
              label: 'Generate New Link',
              icon: 'pi pi-link',
              width: 'full',
              position: 'left',
              outlined: true,
              visible: this.resetLink ? true : false,
              action: () => {
                this.confirmationService.confirm({
                  message: this.linkType === 'reset'
                    ? 'This will invalidate the current reset link and generate a new one. Continue?'
                    : 'This will invalidate the current invitation link and generate a new one. Continue?',
                  header: 'Generate New Link',
                  icon: 'pi pi-exclamation-triangle',
                  accept: () => {
                    this.generateNewToken(this.selectedUser!.id);
                  }
                });
              }
            },
            {
              label: 'Copy Link',
              icon: 'pi pi-copy',
              width: 'full',
              styleClass: '!bg-red-700 !border-red-700 hover:!bg-red-800 rounded px-8 py-3 font-black text-[11px] uppercase tracking-widest shadow-lg',
              visible: this.resetLink ? true : false,
              action: () => {
                this.copyToClipboard();
              }
            }
          ]
        }
      ],
      initialView: 'details',
      defaultWidth: 650,
      onClose: () => this.closeDialog()
    };
  };

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loading = true;

    const params: any = {
      page: this.currentPage,
      limit: this.pageSize,
    };

    if (this.selectedRole) params.role = this.selectedRole;
    if (this.selectedStatus) params.isActive = this.selectedStatus;
    if (this.searchText) params.search = this.searchText;
    if (this.lastLoginFrom) params.lastLoginFrom = this.lastLoginFrom;
    if (this.lastLoginTo) params.lastLoginTo = this.lastLoginTo;
    if (this.createdFrom) params.createdFrom = this.createdFrom;
    if (this.createdTo) params.createdTo = this.createdTo;

    this.userService.getUsers(params).subscribe({
      next: (response) => {
        if (response) {
          this.users = response.items;
          this.totalRecords = response.meta.totalItems;
          this.currentPage = response.meta.currentPage;
          if (response.meta.stats) {
            this.stats = response.meta.stats;
          } else {
            this.calculateStats(response.items);
          }
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to load users',
        });
        this.loading = false;
      },
    });
  }

  calculateStats(users: User[]) {
    const activeCount = users.filter(u => u.isActive).length;
    const inactiveCount = users.filter(u => !u.isActive).length;

    const roleCount: Record<string, number> = {};
    users.forEach(user => {
      roleCount[user.role] = (roleCount[user.role] || 0) + 1;
    });

    this.stats = {
      total: this.totalRecords,
      active: activeCount,
      inactive: inactiveCount,
      roles: roleCount,
    };
  }

  onPageChange(event: any) {
    this.pageSize = event.rows;
    this.currentPage = Math.floor(event.first / event.rows) + 1;
    this.loadUsers();
  }

  onFilterChange(filters: any) {
    this.currentPage = 1;
    this.selectedRole = filters.role || '';
    this.selectedStatus = filters.isActive || '';
    this.searchText = filters.search || '';
    this.lastLoginFrom = filters.lastLoginFrom || '';
    this.lastLoginTo = filters.lastLoginTo || '';
    this.createdFrom = filters.createdFrom || '';
    this.createdTo = filters.createdTo || '';
    this.loadUsers();
  }

  onSearch() {
    this.currentPage = 1;
    this.loadUsers();
  }

  openCreateDialog() {
    this.dialogMode = 'create';
    this.selectedUser = null;
    this.isFormDisabled = true;
    this.masterDialog.navigateToView('form');
    this.showMasterDialog ||= true;
  }

  openEditDialog(user: User) {
    this.dialogMode = 'edit';
    this.selectedUser = user;
    this.isFormDisabled = true;
    this.masterDialog.navigateToView('form');
    this.showMasterDialog ||= true;
  }

  onSaveUser(userData: CreateUserDto | UpdateUserDto) {
    if (this.dialogMode === 'create') {
      this.userService.createUser(userData as CreateUserDto).subscribe({
        next: (response) => {
          this.generatedLink = `${window.location.origin}/setup-account?token=${response.token}`;
        },
        error: (error) => {
          console.error('Error creating user:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.error?.message || 'Failed to create user',
          });
        },
      });
    } else if (this.selectedUser) {
      this.userService.updateUser(this.selectedUser.id, userData as UpdateUserDto).subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'User updated successfully',
          });
          this.showMasterDialog = false;
          this.loadUsers();
        },
        error: (error) => {
          console.error('Error updating user:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.error?.message || 'Failed to update user',
          });
        },
      });
    }
  }

  copyToClipboard() {
    navigator.clipboard.writeText(this.resetLink).then(() => {
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Link copied to clipboard!',
        life: 3000
      });
    }).catch(() => {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to copy link to clipboard.',
        life: 5000
      });
    });
  }

  checkTokenExists(userId: any) {
    this.linkLoading = true;
    this.resetLink = this.users.map((user) => {
      if (user.id === userId) {
        return user.link;
      }
      return undefined;
    }).filter(link => link !== undefined)[0];
    if (!this.resetLink) {
      this.userService.copyLink(userId).subscribe({
        next: (response) => {
          if (response.token) {
            const token = response.token;
            const baseUrl = window.location.origin;
            const path = this.linkType === 'reset' ? '/account/reset-password' : '/account/setup-password';
            this.users.map(user => {
              if (user.id === userId) {
                user.link = `${baseUrl}${path}?token=${token}`;
              }
            });
            this.resetLink = `${baseUrl}${path}?token=${token}`;
          }

        },
        error: () => {
        }
      });
    }
    this.linkLoading = false;
  }

  generateNewToken(userId: any) {
    this.linkLoading = true;
    this.userService.generateResetToken(userId).subscribe({
      next: (response) => {
        const token = response.token;
        const baseUrl = window.location.origin;
        const path = this.linkType === 'reset' ? '/account/reset-password' : '/account/setup-password';
        this.resetLink = `${baseUrl}${path}?token=${token}`;
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: this.linkType === 'reset' ? 'New reset link generated successfully.' : 'New invitation link generated successfully.',
          life: 3000
        });
        this.linkLoading = false;
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err.error?.message || (this.linkType === 'reset' ? 'Failed to generate reset link.' : 'Failed to generate invitation link.'),
          life: 5000
        });
        this.linkLoading = false;
      }
    });
  }

  onResetPassword(user: User) {
    this.selectedUser = user;
    this.linkType = 'reset';
    this.resetLink = '';
    this.checkTokenExists(user.id);
    this.masterDialog.navigateToView('link');
    this.showMasterDialog ||= true;
  }

  onDeactivate(user: User) {
    this.confirmationService.confirm({
      message: `Are you sure you want to ${user.isActive ? 'deactivate' : 'activate'} user "${user.username}"?`,
      header: user.isActive ? 'Confirm Deactivation' : 'Confirm Activation',
      icon: user.isActive ? 'pi pi-exclamation-triangle' : 'pi pi-check-circle',
      accept: () => {
        if (user.isActive) {
          this.userService.deactivateUser(user.id).subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'User deactivated successfully',
              });
              this.closeDialog();
              this.loadUsers();
            },
            error: (error) => {
              console.error('Error deactivating user:', error);
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to deactivate user',
              });
            },
          });
        } else {
          this.userService.activateUser(user.id).subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Success',
                detail: 'User activated successfully',
              });
              this.closeDialog();
              this.loadUsers();
            },
            error: (error) => {
              console.error('Error activating user:', error);
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Failed to activate user',
              });
            },
          });
        }
      },
    });
  }

  onViewInvitation(user: User) {
    this.selectedUser = user;
    this.linkType = 'invitation';
    this.resetLink = '';
    this.checkTokenExists(user.id);
    this.masterDialog.navigateToView('link');
    this.showMasterDialog ||= true;
  }

  onInvitationLink(user: User) {
    this.onViewInvitation(user);
  }

  onViewUser(user: User) {
    this.viewUser = user;
    this.showMasterDialog = true;
  }

  refreshData() {
    this.loadUsers();
  }

  closeDialog() {
    this.showMasterDialog = false;
  }
}
