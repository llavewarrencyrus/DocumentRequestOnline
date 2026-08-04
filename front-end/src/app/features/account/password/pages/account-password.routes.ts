import { Routes } from '@angular/router';
import { SetupPasswordPage } from './setup-password/setup-password.page';
import { ChangePasswordPage } from './change-password/change-password.page';

export const ACCOUNT_ROUTES_PASSWORD: Routes = [
  {
    path: 'setup-password',
    component: SetupPasswordPage,
  },
  {
    path: 'reset-password',
    component: ChangePasswordPage,
  }
];