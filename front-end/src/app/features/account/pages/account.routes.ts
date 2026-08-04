import { Routes } from '@angular/router';
import { AuthGuard } from '@core/guards/auth.guard';
import { RoleGuard } from '@core/guards/role.guard';
import { AccountDashboard } from './dashboard/dashboard.page';

export const ACCOUNT_ROUTES: Routes = [
  {
    path: '',
    canActivate: [AuthGuard, RoleGuard],
    data: {
      expectedRole: 'Admin'
    },
    children: [
      {
        path: 'dashboard',
        component: AccountDashboard
      }
    ]
  }
];