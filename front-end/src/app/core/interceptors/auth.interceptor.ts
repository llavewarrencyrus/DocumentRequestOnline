// auth.interceptor.ts
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (req.url.includes('/auth/login')) {
    return next(req);
  }

  const token = authService.getToken();
  const externalToken = authService.getExternalToken();

  if (token) {
    // Start with Authorization header
    let headers: any = {
      Authorization: `Bearer ${token}`
    };

    if (externalToken && req.url.includes('/student/my-requests') || req.url.includes('/requests') || req.url.includes('/status') || /\/requests\/[^/]+\/status/.test(req.url)) {
      headers['X-External-Token'] = externalToken;
    }

    const authReq = req.clone({
      setHeaders: headers
    });

    return next(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          console.log('Token expired or invalid');

          authService.clearSession();
          router.navigate(['/login/student'], {
            queryParams: { expired: 'true' }
          });
        }
        return throwError(() => error);
      })
    );
  }

  return next(req);
};