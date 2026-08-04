import { Routes } from '@angular/router';
import { StudentLoginComponent } from './student/student-login.page';
import { StaffLoginComponent } from './staff/staff-login.page';

export const LOGIN_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'student',
    pathMatch: 'full'
  },
  {
    path: 'student',
    component: StudentLoginComponent
  },
  {
    path: 'staff',
    component: StaffLoginComponent
  }
];