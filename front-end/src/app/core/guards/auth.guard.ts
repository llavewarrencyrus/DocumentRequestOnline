// auth.guard.ts
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';

export const AuthGuard = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.waitForInitialization().pipe(
    switchMap(() => {
      if (authService.isLoggedIn()) {
        return of(true);
      }
      
      const currentUrl = router.url;
      if (currentUrl && currentUrl !== '/') {
        return of(router.parseUrl(`/login/student?returnUrl=${encodeURIComponent(currentUrl)}`));
      }
      
      return of(router.parseUrl('/login/student'));
    })
  );
};