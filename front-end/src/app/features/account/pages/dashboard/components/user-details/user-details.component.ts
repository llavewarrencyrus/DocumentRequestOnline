import { Component, Input, Output, EventEmitter, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';

import { User } from '@account/account.model';
import { AccountService } from '@account/account.service';
import { map } from 'rxjs';

@Component({
  selector: 'user-details',
  standalone: true,
  imports: [
    CommonModule,
    DialogModule,
    ButtonModule,
    TagModule,
  ],
  templateUrl: './user-details.component.html',
})
export class UserDetailsComponent {
  user = input<User | null>(null);

  private accountService = inject(AccountService);

  departments: Map<number, string> = new Map();

  ngOnInit() {
    this.accountService.getDepartments().pipe(
      map(response => {
        response.forEach(dept => {
          this.departments.set(dept.id, this.toCamelCase(dept.description));
        });
      })
    ).subscribe();
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

  formatDate(date: Date | null): string {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  formatDateTime(date: Date | null): string {
    if (!date) return 'Never';
    return new Date(date).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  toCamelCase(str: string): string {
    return str
      .toLowerCase()
      .replace(/(?:^|\s)\w/g, match => match.toUpperCase());
  }
}
