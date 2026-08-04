import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { environment } from '@src/environments/environment';
import { CardModule } from "primeng/card";
import { IconFieldModule } from "primeng/iconfield";
import { InputIconModule } from "primeng/inputicon";
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { MessageModule } from "primeng/message";
import { DividerModule } from "primeng/divider";


@Component({
  selector: 'app-staff-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    ButtonModule,
    CardModule,
    IconFieldModule,
    InputIconModule,
    InputTextModule,
    PasswordModule,
    MessageModule,
    DividerModule
  ],
  templateUrl: './staff-login.page.html'
})
export class StaffLoginComponent implements OnInit, OnDestroy {
  environment = environment;

  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  showPassword = false;
  returnUrl: string = '/arcstaff/dashboard';

  // Demo staff accounts
  demoAccounts = [
    {
      title: 'Registrar',
      username: 'arc.staff',
      password: 'arc123',
      icon: '👨‍💼',
      role: 'Registrar',
      route: '/arcstaff/dashboard'
    },
    {
      title: 'Cashier',
      username: 'cashier.staff',
      password: 'cashier123',
      icon: '👨‍💼',
      role: 'Cashier',
      route: '/offices/dashboard'
    },
    {
      title: 'Librarian',
      username: 'library.staff',
      password: 'library123',
      icon: '👨‍💼',
      role: 'Librarian',
      route: '/offices/dashboard'
    },
    {
      title: 'School Dean/Principal',
      username: 'school.director',
      password: 'director123',
      icon: '👨‍💼',
      role: 'Director',
      route: '/offices/dashboard'
    },
    {
      title: 'Student Accounts Office',
      username: 'accountant.staff',
      password: 'accountant123',
      icon: '👨‍💼',
      role: 'Accountant',
      route: '/offices/dashboard'
    },
    {
      title: 'CCSD',
      username: 'counselor.staff',
      password: 'counselor123',
      icon: '👨‍💼',
      role: 'Counselor',
      route: '/offices/dashboard'
    },
    {
      title: 'Inventory Office',
      username: 'inventory.staff',
      password: 'inventory123',
      icon: '👨‍💼',
      role: 'Inventory',
      route: '/offices/dashboard'
    },

    {
      title: 'ARC Admin',
      username: 'arc.admin',
      password: 'admin123',
      icon: '👨‍💻',
      role: 'Admin',
      route: '/accounts/dashboard'
    }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService
  ) {
    this.loginForm = this.fb.group({
      username: ['', [
        Validators.required
      ]],
      password: ['', [
        Validators.required,
        Validators.minLength(3)
      ]]
    });
  }

  ngOnInit(): void {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.markFormGroupTouched(this.loginForm);
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const credentials = {
      username: this.loginForm.get('username')?.value.trim().toLocaleLowerCase(),
      password: this.loginForm.get('password')?.value
    };

    this.authService.login(credentials)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          this.handleSuccessfulLogin();
        },
        error: (error) => {
          this.isLoading = false;
          this.handleError(error);
        }
      });
  }

  fillDemoCredentials(account: any): void {
    this.loginForm.patchValue({
      username: account.username,
      password: account.password
    });

    this.messageService.add({
      severity: 'info',
      summary: 'Demo Credentials Loaded',
      detail: `${account.title} credentials have been filled`,
      life: 2000
    });
  }

  private handleSuccessfulLogin(): void {
    const userInfo = this.authService.getUserInfo();
    const clearanceRoles = ['Cashier', 'Librarian', 'Accountant', 'Inventory', 'Counselor', 'Director'];
    const allStaffRoles = [...clearanceRoles, 'Registrar', 'Admin'];

    if (userInfo && allStaffRoles.includes(userInfo.role)) {
      this.messageService.add({
        severity: 'success',
        summary: 'Login Successful',
        detail: `Welcome, ${userInfo.role}!`,
        life: 3000
      });

      setTimeout(() => {
        if (this.returnUrl) {
          this.router.navigateByUrl(this.returnUrl);
        } else {
          const roleRouteMap: Record<string, string> = {
            'Registrar': '/arcstaff/dashboard',
            'Admin': '/accounts/dashboard',
            'Cashier': '/offices/dashboard',
            'Librarian': '/offices/dashboard',
            'Accountant': '/offices/dashboard',
            'Inventory': '/offices/dashboard',
            'Counselor': '/offices/dashboard',
            'Director': '/offices/dashboard'
          };

          const targetRoute = roleRouteMap[userInfo.role] || '/unauthorized';
          this.router.navigateByUrl(targetRoute);
        }
      }, 1000);
    } else {
      this.errorMessage = 'Invalid staff credentials';
      this.authService.clearSession();
    }
  }

  private handleError(error: any): void {
    if (error.status === 401) {
      this.errorMessage = 'Invalid username or password.';
    } else {
      this.errorMessage = 'Login failed. Please try again.';
    }

    this.messageService.add({
      severity: 'error',
      summary: 'Login Failed',
      detail: this.errorMessage,
      life: 4000
    });
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach(control => {
      control.markAsTouched();
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  get currentYear(): number {
    return new Date().getFullYear();
  }

  // Form getters
  get username() { return this.loginForm.get('username'); }
  get password() { return this.loginForm.get('password'); }

  getUsernameError(): string {
    if (this.username?.errors?.['required']) return 'Username is required';
    if (this.username?.errors?.['pattern']) return 'Username must start with "arc." (e.g., arc.staff)';
    return '';
  }

  getPasswordError(): string {
    if (this.password?.errors?.['required']) return 'Password is required';
    if (this.password?.errors?.['minlength']) return 'Password must be at least 3 characters';
    return '';
  }
}