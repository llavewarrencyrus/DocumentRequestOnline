import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { AuthService, UserInfo } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { environment } from '@src/environments/environment';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { DividerModule } from 'primeng/divider';
import { CalendarModule } from 'primeng/calendar';
import { PasswordModule } from 'primeng/password';
import { PanelModule } from 'primeng/panel';
import { InputMaskModule } from 'primeng/inputmask';
import { CardModule } from 'primeng/card';
import { BadgeModule } from 'primeng/badge';
import { InputTextModule } from 'primeng/inputtext';
import { DatePickerModule } from 'primeng/datepicker';
import { MessageModule } from 'primeng/message';

@Component({
  selector: 'app-student-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    ButtonModule,
    IconFieldModule,
    InputIconModule,
    DividerModule,
    CalendarModule,
    PasswordModule,
    PanelModule,
    InputMaskModule,
    CardModule,
    BadgeModule,
    InputTextModule,
    DatePickerModule,
    MessageModule,
  ],
  templateUrl: './student-login.page.html',
})
export class StudentLoginComponent implements OnInit, OnDestroy {
  environment = environment;

  date: string | undefined;

  loginForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  showPassword = false;
  returnUrl: string = '/student/dashboard';

  // Demo student account
  demoAccount = {
    title: 'Student Demo',
    username: '20201234',
    birthdate: '11/02/2002',
    password: 'student123',
    icon: '🎓',
  };

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private userService: UserService,
    private router: Router,
    private route: ActivatedRoute,
    private messageService: MessageService,
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required, Validators.pattern('^[0-9]{8,9}$')]],
      birthdate: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(3)]],
    });
  }

  ngOnInit(): void {
    // Check if user is already logged in
    if (this.authService.isLoggedIn()) {
      const userInfo = this.authService.getUserInfo();
      if (userInfo?.role === 'Student') {
        this.router.navigate(['/student/dashboard']);
        return;
      }
    }

    this.returnUrl =
      this.route.snapshot.queryParams['returnUrl'] || '/student/dashboard';
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

    const rawDate = this.loginForm.get('birthdate')?.value;
    const [month, day, year] = rawDate.split('/');
    const formattedDate = `${year}-${month}-${day}`;

    const credentials = {
      username: this.loginForm.get('username')?.value.trim(),
      birthdate: formattedDate,
      password: this.loginForm.get('password')?.value,
    };

    this.authService
      .login(credentials)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isLoading = false;
          this.handleSuccessfulLogin();
        },
        error: (error) => {
          this.isLoading = false;
          this.handleError(error);
        },
      });
  }

  fillDemoCredentials(): void {
    this.loginForm.patchValue({
      username: this.demoAccount.username,
      birthdate: this.demoAccount.birthdate,
      password: this.demoAccount.password,
    });

    this.messageService.add({
      severity: 'info',
      summary: 'Demo Credentials Loaded',
      detail:
        'Student demo account credentials have been filled. Click Sign In to continue.',
      life: 3000,
    });
  }

  private handleSuccessfulLogin(): void {
    const userInfo = this.authService.getUserInfo();

    if (userInfo) {
      const studentName =
        `${userInfo.lastName}, ${userInfo.firstName} ${userInfo.middleName}`.trim();
      const courseInfo = userInfo.code ? `(${userInfo.code})` : '';

      this.messageService.add({
        severity: 'success',
        summary: 'Login Successful',
        detail: `Welcome back, ${userInfo.firstName || userInfo.username}! ${courseInfo}`,
        life: 2000,
      });

      setTimeout(() => {
        this.router.navigateByUrl(this.returnUrl);
      }, 1000);
    } else {
      this.errorMessage = 'Unable to retrieve user information';
      this.authService.clearSession();
    }
  }

  private handleError(error: any): void {
    console.error('Login error:', error);

    if (error.status === 401) {
      this.errorMessage =
        'Invalid Student ID, Birthdate, or Password. Please check your credentials and try again.';
    } else if (error.status === 0) {
      this.errorMessage =
        'Unable to connect to the server. Please check your internet connection.';
    } else if (error.status === 404) {
      this.errorMessage = 'Login service unavailable. Please try again later.';
    } else {
      this.errorMessage = 'Login failed. Please try again.';
    }

    this.messageService.add({
      severity: 'error',
      summary: 'Login Failed',
      detail: this.errorMessage,
      life: 5000,
    });
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.values(formGroup.controls).forEach((control) => {
      control.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  get todayDate(): Date {
    return new Date();
  }

  get currentYear(): number {
    return new Date().getFullYear();
  }

  // Form getters
  get username() {
    return this.loginForm.get('username');
  }
  get birthdate() {
    return this.loginForm.get('birthdate');
  }
  get password() {
    return this.loginForm.get('password');
  }

  getUsernameError(): string {
    if (this.username?.errors?.['required']) return 'Student ID is required';
    if (this.username?.errors?.['pattern'])
      return 'Student ID must be 8-9 digits';
    return '';
  }

  getBirthdateError(): string {
    if (this.birthdate?.errors?.['required']) return 'Birthdate is required';
    return '';
  }

  getPasswordError(): string {
    if (this.password?.errors?.['required']) return 'Password is required';
    if (this.password?.errors?.['minlength'])
      return 'Password must be at least 3 characters';
    return '';
  }
}
