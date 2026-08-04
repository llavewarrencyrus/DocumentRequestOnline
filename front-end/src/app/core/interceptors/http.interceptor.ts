import { HttpEvent, HttpInterceptorFn, HttpResponse } from "@angular/common/http";
import { map } from "rxjs";

export const httpInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    map((event: HttpEvent<any>) => {
      if (event instanceof HttpResponse && event.body && event.body.data) {
        return event.clone({ body: event.body.data });
      }
      return event;
    })
  );
};