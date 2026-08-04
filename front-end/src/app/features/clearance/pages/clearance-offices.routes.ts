import { Routes } from '@angular/router';
import { AuthGuard } from '@core/guards/auth.guard';
import { RoleGuard } from '@core/guards/role.guard';
import { ClearanceDashboard } from './dashboard/dashboard.page';

export const CLEARANCE_ROUTES: Routes = [
  {
    path: '',
    canActivate: [AuthGuard, RoleGuard],
    data: {
      expectedRole: ['Cashier', 'Librarian', 'Accountant', 'Inventory', 'Counselor', 'Director']
    },
    children: [
      {
        path: 'dashboard',
        component: ClearanceDashboard
      }
    ]
  }
];