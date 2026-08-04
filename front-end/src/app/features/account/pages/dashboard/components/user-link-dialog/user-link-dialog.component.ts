import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

@Component({
  selector: 'user-link-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ProgressSpinnerModule,
  ],
  templateUrl: './user-link-dialog.component.html',
})
export class UserLinkDialogComponent {
  readonly link = input<string>('');
  readonly title = input<string>('');
  readonly description = input<string>('');
  readonly loading = input<boolean>(false);
}
