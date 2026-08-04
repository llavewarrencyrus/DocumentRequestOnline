// role.guard.ts
import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) { }

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.authService.waitForInitialization().pipe(
      switchMap(() => {
        const userInfo = this.authService.getUserInfo();

        if (!userInfo) {
          this.router.navigate(['/login/student'], {
            queryParams: { returnUrl: state.url }
          });
          return of(false);
        }

        const expected = route.data['expectedRole'] ?? route.data['roles'];

        if (!expected) {
          return of(true);
        }

        const userRole = userInfo.role;
        let allowed = false;

        if (Array.isArray(expected)) {
          allowed = expected.includes(userRole);
        } else {
          allowed = expected === userRole;
        }

        if (!allowed && userRole) {
          const roleRoutes: Record<string, string> = {
            'Student': '/student/dashboard',
            'Registrar': '/arcstaff/dashboard',
            'Admin': '/admin/dashboard',
            'Cashier': '/clearance/dashboard',
            'Librarian': '/clearance/dashboard',
            'Accountant': '/clearance/dashboard',
            'Inventory': '/clearance/dashboard',
            'Counselor': '/clearance/dashboard',
            'Director': '/clearance/dashboard'
          };

          const destination = roleRoutes[userRole] || '/unauthorized';
          this.router.navigate([destination]);
          return of(false);
        }

        return of(true);
      })
    );
  }
}