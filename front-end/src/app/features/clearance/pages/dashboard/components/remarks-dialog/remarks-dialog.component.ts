import { Component, effect, inject, input, model } from '@angular/core';

import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TextareaModule } from 'primeng/textarea';

import { ClearanceService } from '@clearance/clearance.service';

@Component({
  selector: 'remarks-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    TextareaModule,
  ],
  templateUrl: './remarks-dialog.component.html'
})
export class RemarksDialogComponent {
  readonly officeName = input<string>('');
  remarks = model<string>('');
  onRemarksChange = input<(remarks: string) => void>();
  protected clearanceService = inject(ClearanceService);

  constructor() {
    effect(() => {
      const remarks = this.remarks();
      const callback = this.onRemarksChange();
      if (callback && remarks.trim()) {
        callback(remarks);
      }
    });
  }
}