// clearance/pages/dashboard/components/approval-dialog.component.ts
import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Imports
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { DropdownModule } from 'primeng/dropdown';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { InputTextModule } from 'primeng/inputtext';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';

import { ClearanceRequest, ClearanceApproval } from '@clearance/clearance.model';

@Component({
  selector: 'approval-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    DropdownModule,
    CardModule,
    DividerModule,
    InputTextModule,
    IconFieldModule,
    InputIconModule,
  ],
  templateUrl: './approval-dialog.component.html',
})
export class ApprovalDialogComponent {
  readonly request = input.required<ClearanceRequest>();
  readonly approval = input.required<ClearanceApproval>();
  readonly userRole = input.required<string>();

  onComplete = input<(data: { approved: boolean; remarks?: string; }) => void>();

  remarks: string = '';
  paymentReference: string = '';

  getOfficeIcon(): string {
    const iconMap: { [key: string]: string; } = {
      'Cashier': 'pi-credit-card',
      'Librarian': 'pi-book',
      'Accountant': 'pi-calculator',
      'Inventory': 'pi-box',
      'Counselor': 'pi-users',
      'Director': 'pi-user'
    };
    return iconMap[this.userRole()] || 'pi-building';
  }

  onApprove() {
    const callback = this.onComplete();
    if (callback) {
      callback({
        approved: true,
        remarks: this.remarks || this.paymentReference
      });
    }
  }

  onHold() {
    const callback = this.onComplete();
    if (callback) {
      callback({
        approved: false,
        remarks: this.remarks
      });
    }
  }

  getYearOrdinal(year: number): string {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = year % 100;
    return (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
  }
}