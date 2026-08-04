// [file name]: student.routes.ts
import { Routes } from '@angular/router';
import { AuthGuard } from '@core/guards/auth.guard';
import { RoleGuard } from '@core/guards/role.guard';
import { StudentDashboardPage } from './student-dashboard.page';
import { DocumentRequestFormPage } from './document-request-form/document-request-form.page';

export const STUDENT_ROUTES: Routes = [
  {
    path: '',
    canActivate: [AuthGuard, RoleGuard],
    data: {
      expectedRole: 'Student'  // Exact case match with token
    },
    children: [
      {
        path: 'dashboard',
        component: StudentDashboardPage
      },
      {
        path: 'requests/new',
        component: DocumentRequestFormPage
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  }
];