import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AccountService } from '@account/account.service';

import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { DividerModule } from 'primeng/divider';
import { CardModule } from 'primeng/card';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-setup-password',
  imports: [
    CardModule,
    FormsModule,
    RouterModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    DividerModule
  ],
  templateUrl: './setup-password.page.html',
})
export class SetupPasswordPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private accountService = inject(AccountService);
  private messageService = inject(MessageService);

  token: string | null = null;
  password = '';
  confirmPassword = '';
  loading = false;

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token');
    if (!this.token) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Invalid or missing invitation token.',
        life: 5000
      });
    }
  }

  onSubmit() {
    if (this.password !== this.confirmPassword) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Passwords do not match.',
        life: 5000
      });
      return;
    }

    this.loading = true;
    this.accountService.completeSetup(this.token!, this.password).subscribe({
      next: (response) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Account setup completed successfully!',
          life: 3000
        });
        if (response.isFirstTimeSetup) {
          this.router.navigate(['/login'], { queryParams: { setupSuccess: true } });
        } else {
          this.router.navigate(['/login'], { queryParams: { resetSuccess: true } });
        }
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err.error?.message || err.message || 'Failed to setup account.',
          life: 5000
        });
        this.loading = false;
      }
    });
  }
}