// clearance-details-dialog.component.ts
import { Component, Input, Output, EventEmitter, inject, signal, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

// PrimeNG Imports
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { ProgressBarModule } from 'primeng/progressbar';

import { ClearanceRequest } from '@clearance/clearance.model';
import { ClearanceService } from '@clearance/clearance.service';
import { AuthService } from '@core/services/auth.service';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { PrivacyDialogComponent } from '../../pages/student-dashboard/components/privacy-dialog/privacy-dialog.component';

@Component({
  selector: 'clearance-details',
  standalone: true,
  imports: [
    CommonModule,
    CardModule,
    TagModule,
    ButtonModule,
    DividerModule,
    ProgressBarModule,
    PrivacyDialogComponent
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
  request = input<ClearanceRequest | null>(null);

  showAll = signal(false);
  isSigning = signal(false);
  showPrivacyDialog = signal(false);

  protected clearanceService = inject(ClearanceService);
  private authService = inject(AuthService);

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

  isStudentSigned(): boolean {
    return this.request()?.requestorSign !== null && this.request()?.requestorSign !== undefined;
  }

  isStudent(): boolean {
    const userInfo = this.authService.getUserInfo();
    const userRole = userInfo?.role?.toLowerCase();
    return userRole === 'student';
  }

  isRegistrar(): boolean {
    const userInfo = this.authService.getUserInfo();
    const userRole = userInfo?.role?.toLowerCase();
    return userRole === 'registrar';
  }

  onSignClearance(): void {
    this.showPrivacyDialog.set(true);
  }

  onPrivacyDialogConfirm(): void {
    const request = this.request();
    if (!request?.id) return;

    this.isSigning.set(true);

    const signatureData = 'SIGNED_BY_STUDENT';

    this.clearanceService.signClearance(request.id, { signature: signatureData }).subscribe({
      next: (response: any) => {
        console.log('Clearance signed successfully:', response);
        this.isSigning.set(false);
        this.showPrivacyDialog.set(false);
        alert('Clearance signed successfully!');
      },
      error: (error: any) => {
        console.error('Failed to sign clearance:', error);
        this.isSigning.set(false);
        this.showPrivacyDialog.set(false);
        alert('Failed to sign clearance. Please try again.');
      }
    });
  }

  onPrivacyDialogCancel(): void {
    this.showPrivacyDialog.set(false);
  }
}
