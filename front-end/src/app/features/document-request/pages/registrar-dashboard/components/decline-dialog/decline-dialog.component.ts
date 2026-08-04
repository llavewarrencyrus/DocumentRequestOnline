import { Component, input, output, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';
import { MessageService } from 'primeng/api';

import { DocumentRequest } from '@features/document-request/request.model';

@Component({
  selector: 'app-decline-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    TextareaModule
  ],
  templateUrl: './decline-dialog.component.html',
})
export class DeclineDialogComponent {
  selectedRequest = input.required<DocumentRequest>();
  declineReason: string = '';

  declineReasonChange = output<string>();
  submit = input<(remarks: string) => void>();
  cancel = input<() => void>();
  onDeclineReasonChange = input<(reason: string) => void>();

  constructor() {
    effect(() => {
      const callback = this.onDeclineReasonChange();
      if (callback) {
        callback(this.declineReason);
      }
    });
  }

  private messageService = inject(MessageService);

  onSubmit() {
    const reason = this.declineReason;
    if (!reason || !reason.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Warning',
        detail: 'Please provide a reason for declining',
        life: 3000
      });
      return;
    }
    const callback = this.submit();
    if (callback) {
      callback(reason);
    }
  }

  onReasonChange() {
    const callback = this.onDeclineReasonChange();
    if (callback) {
      callback(this.declineReason);
    }
  }

  // onSubmit(): void {
  //   const reason = this.declineReason;
  //   if (!reason || !reason.trim()) {
  //     this.messageService.add({
  //       severity: 'warn',
  //       summary: 'Warning',
  //       detail: 'Please provide a reason for declining',
  //       life: 3000
  //     });
  //     return;
  //   }
  //   this.submit.emit();
  // }

  onCancel(): void {
    const callback = this.cancel();
    if (callback) {
      callback();
    }
  }
}
