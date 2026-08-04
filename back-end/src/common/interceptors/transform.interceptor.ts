import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';

export interface Response<T> {
  success: boolean;
  data: T;
  message?: string;
}

const SKIP_TRANSFORM_KEY = 'skipTransform';

export const SkipTransform = () => (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
  Reflect.defineMetadata(SKIP_TRANSFORM_KEY, true, descriptor.value);
  return descriptor;
};

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T> | T> {
  constructor(private reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T> | T> {
    // Check if the handler should skip transformation
    const skipTransform = this.reflector.get<boolean>(
      SKIP_TRANSFORM_KEY,
      context.getHandler(),
    );

    if (skipTransform) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        // If the controller already returns an object with success/data/message structure,
        // return it as-is to avoid double wrapping
        if (
          data &&
          typeof data === 'object' &&
          'success' in data &&
          'data' in data
        ) {
          return data;
        }

        // If the controller returns an object with a message property,
        // extract it to the top level
        if (
          data &&
          typeof data === 'object' &&
          'message' in data &&
          !('success' in data)
        ) {
          const { message, ...rest } = data as any;
          return {
            success: true,
            data: rest,
            message,
          };
        }

        // Default: wrap the data in the standard response structure
        return {
          success: true,
          data,
        };
      }),
    );
  }
}
