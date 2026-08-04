// [file name]: arcstaff.routes.ts
import { Routes } from '@angular/router';
import { AuthGuard } from '../../../../core/guards/auth.guard';
import { RoleGuard } from '../../../../core/guards/role.guard';
import { StaffDashboardComponent } from '@features/document-request/pages/registrar-dashboard/staff-dashboard.component';

export const ARCSTAFF_ROUTES: Routes = [
  {
    path: '',
    canActivate: [AuthGuard, RoleGuard],
    data: {
      expectedRole: 'Registrar'  // Exact case match with token
    },
    children: [
      {
        path: 'dashboard',
        component: StaffDashboardComponent
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  }
];