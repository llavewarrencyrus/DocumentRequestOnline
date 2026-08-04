// clearance/pages/dashboard/components/clearance-details.component.ts
import { Component, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

// PrimeNG Imports
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { TimelineModule } from 'primeng/timeline';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { ProgressBarModule } from 'primeng/progressbar';

import { ClearanceRequest } from '@clearance/clearance.model';

import { ClearanceService } from '@clearance/clearance.service';
import { animate, state, style, transition, trigger } from '@angular/animations';

@Component({
  selector: 'clearance-details',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    TagModule,
    TimelineModule,
    ButtonModule,
    DividerModule,
    ProgressBarModule
  ],
  templateUrl: './clearance-details.component.html',
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
export class ClearanceDetailsComponent {
  readonly request = input.required<ClearanceRequest>();
  readonly currentUserRole = input.required<string>();
  readonly getMappedOffice = input<string>();

  onApprove = input<(request: ClearanceRequest) => void>();
  onHold = input<() => void>();

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

  getTotalApprovals(): number {
    return this.request()?.approvals?.length || 0;
  }

  getApprovedCount(): number {
    return this.request()?.approvals?.filter(a => a.status === 'APPROVED').length || 0;
  }

  getProgressPercentage(): number {
    const total = this.getTotalApprovals();
    if (total === 0) return 0;
    return (this.getApprovedCount() / total) * 100;
  }

  getFilteredApprovals() {
    return this.request().approvals?.filter(a => a.office !== 'CASHIER') || [];
  }

  getOfficeApproval() {
    const role = this.currentUserRole();
    const officeMap: { [key: string]: string; } = {
      'Cashier': 'CASHIER',
      'Librarian': 'LIBRARY',
      'Director': 'SCHOOL',
      'Accountant': 'ACCOUNTS',
      'Inventory': 'INVENTORY',
      'Counselor': 'CCSD'
    };
    return this.request()?.approvals?.find(a => a.office === officeMap[role]);
  }

  isOfficeActionRequired(): boolean {
    const approval = this.getOfficeApproval();
    return approval?.status === 'PENDING' || approval?.status === 'ON_HOLD';
  }

  isPaymentVerified(): boolean {
    return this.request().approvals?.some(a => a.office === 'CASHIER' && a.status === 'APPROVED') ?? false;
  }


  canApprove(): boolean {
    if (!this.request() || this.request().status === 'APPROVED' || this.request().status === 'REJECTED') {
      return false;
    }

    if (this.currentUserRole() === 'Cashier' && this.request().status === 'PENDING') {
      return true;
    }

    if (this.currentUserRole() !== 'Cashier' && (this.request().status === 'IN_REVIEW' || this.request().status === 'ON_HOLD')) {
      const officeApproval = this.request().approvals?.find((a: any) => a.office === this.getMappedOffice());
      return officeApproval?.status === 'PENDING' || officeApproval?.status === 'ON_HOLD';
    }

    return false;
  }

  getYearOrdinal(year: number): string {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = year % 100;
    return (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
  }

  handleOnApprove() {
    const callback = this.onApprove();
    if (callback) {
      callback(this.request());
    }
  }

  handleOnHold() {
    const callback = this.onHold();
    if (callback) {
      callback();
    }
  }
}