// request-details-dialog.component.ts
import { Component, input, model, inject, signal, effect } from "@angular/core";
import { DatePipe } from '@angular/common';

import { DialogModule } from "primeng/dialog";

import { DocumentRequest } from "@features/document-request/request.model";
import { ClearanceRequest, ClearanceApproval } from "@features/clearance/clearance.model";

import { RequestService } from "@features/document-request/request.service";
import { ClearanceService } from "@features/clearance/clearance.service";

@Component({
  selector: 'request-details-dialog',
  standalone: true,
  imports: [
    DialogModule,
    DatePipe
  ],
  templateUrl: './request-details-dialog.component.html'
})
export class RequestDetailsDialogComponent {
  request = model<DocumentRequest | null>(null);
  clearanceRequest = signal<ClearanceRequest | null>(null);
  copySuccess = false;
  private copyTimeout: any;

  protected requestService = inject(RequestService);
  protected clearanceService = inject(ClearanceService);

  // Watch for request changes and fetch clearance data when needed
  private requestChangeEffect = effect(() => {
    const req = this.request();
    if (req?.status === 'ACTION_REQUIRED' && req.requestNumber) {
      this.loadClearanceData(req.requestNumber);
    } else {
      this.clearanceRequest.set(null);
    }
  });

  private loadClearanceData(requestNumber: string): void {
    this.requestService.getClearanceByRequestId(requestNumber).subscribe({
      next: (clearance) => {
        this.clearanceRequest.set(clearance);
      },
      error: (error) => {
        console.error('Failed to load clearance data:', error);
        this.clearanceRequest.set(null);
      }
    });
  }

  getActionRequiredApprovals(): ClearanceApproval[] {
    const clearance = this.clearanceRequest();
    if (!clearance?.approvals) return [];

    return clearance.approvals.filter(approval =>
      approval.status === 'REJECTED' ||
      approval.status === 'ON_HOLD' ||
      (approval.remarks && approval.remarks.trim() !== '')
    );
  }

  copyShortCode(shortCode: string): void {
    navigator.clipboard.writeText(shortCode).then(() => {
      this.copySuccess = true;

      if (this.copyTimeout) {
        clearTimeout(this.copyTimeout);
      }

      this.copyTimeout = setTimeout(() => {
        this.copySuccess = false;
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy short code:', err);
    });
  }
}