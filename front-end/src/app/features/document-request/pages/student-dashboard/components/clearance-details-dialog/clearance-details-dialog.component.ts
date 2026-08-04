// clearance-details-dialog.component.ts
import { Component, Input, Output, EventEmitter, inject, signal, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

// PrimeNG Imports
import { DialogModule } from 'primeng/dialog';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { ProgressBarModule } from 'primeng/progressbar';

import { ClearanceDetailsComponent } from '../../../../components/clearance-details/clearance-details.component';
import { ClearanceRequest } from '@clearance/clearance.model';
import { ClearanceService } from '@clearance/clearance.service';
import { animate, state, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'clearance-details-dialog',
  standalone: true,
  imports: [
    CommonModule,
    DialogModule,
    CardModule,
    TagModule,
    ButtonModule,
    DividerModule,
    ProgressBarModule,
    ClearanceDetailsComponent,
  ],
  templateUrl: './clearance-details-dialog.component.html',
  animations: [
    trigger('expandCollapse', [
      state('collapsed', style({
        height: '60px',
        overflow: 'hidden',
      })),
      state('expanded', style({
        height: '*',
      })),
      transition('collapsed <=> expanded', [
        animate('300ms ease-in-out')
      ])
    ])
  ]
})
export class ClearanceDetailsDialogComponent {
  isVisible = input<boolean>(false);
  request = input<ClearanceRequest | null>(null);
  isVisibleChange = output<boolean>();

  showAll = signal(false);

  protected clearanceService = inject(ClearanceService);

  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'APPROVED': return 'success';
      case 'ON_HOLD': return 'danger';
      case 'IN_REVIEW': return 'info';
      case 'PENDING': return 'warn';
      default: return 'secondary';
    }
  }

  getApprovalSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' {
    switch (status) {
      case 'APPROVED': return 'success';
      case 'ON_HOLD': return 'danger';
      case 'PENDING': return 'warn';
      default: return 'info';
    }
  }

  getOfficeIconBg(status: string): string {
    return status === 'APPROVED'
      ? 'bg-green-500 text-white'
      : 'bg-gray-200 text-gray-500';
  }

  getOfficeIcon(office: string): string {
    const iconMap: { [key: string]: string; } = {
      'Cashier': 'pi-credit-card',
      'Librarian': 'pi-book',
      'Accountant': 'pi-calculator',
      'Inventory': 'pi-box',
      'Counselor': 'pi-users',
      'Director': 'pi-user'
    };
    return iconMap[office] || 'pi-building';
  }

  // getTotalApprovals(): number {
  //   return this.request?.approvals?.length || 0;
  // }

  // getApprovedCount(): number {
  //   return this.request?.approvals?.filter(a => a.status === 'APPROVED').length || 0;
  // }

  getProgressPercentage(): number {
    const total = 0; //this.getTotalApprovals();
    if (total === 0) return 0;
    return 0;//(this.getApprovedCount() / total) * 100;
  }

  getFilteredApprovals() {
    return this.request()?.approvals?.filter(a => a.office !== 'CASHIER') || [];
  }

  isPaymentVerified(): boolean {
    return this.request()?.approvals?.some(a => a.office === 'CASHIER' && a.status === 'APPROVED') ?? false;
  }

  onClose(): void {
    this.isVisibleChange.emit(false);
  }
}
