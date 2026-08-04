// [file name]: app.routes.ts
import { Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';
import { MainLayoutComponent } from './shared/layout/main-layout.component';
import { UnauthorizedComponent } from './shared/unauthorized.component';
import { RoleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadChildren: () => import('./features/login/login.route').then(m => m.LOGIN_ROUTES)
  },
  {
    path: 'clearance',
    loadChildren: () => import('./features/clearance/public/clearance-public.routes').then(m => m.CLEARANCE_ROUTES)
  },
  {
    path: 'account',
    loadChildren: () => import('./features/account/password/pages/account-password.routes').then(m => m.ACCOUNT_ROUTES_PASSWORD)
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [AuthGuard, RoleGuard],
    children: [
      {
        path: 'student',
        loadChildren: () => import('./features/document-request/pages/student-dashboard/student.routes').then(m => m.STUDENT_ROUTES)
      },
      {
        path: 'arcstaff',
        loadChildren: () => import('./features/document-request/pages/registrar-dashboard/arcstaff.routes').then(m => m.ARCSTAFF_ROUTES)
      },
      {
        path: 'offices',
        loadChildren: () => import('./features/clearance/pages/clearance-offices.routes').then(m => m.CLEARANCE_ROUTES)
      },
      {
        path: 'accounts',
        loadChildren: () => import('./features/account/pages/account.routes').then(m => m.ACCOUNT_ROUTES)
      },
      {
        path: '',
        redirectTo: '/login/student',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: 'unauthorized',
    component: UnauthorizedComponent
  },
  {
    path: '**',
    redirectTo: '/login/student'
  }
];