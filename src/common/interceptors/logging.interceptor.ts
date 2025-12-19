import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { AppLoggerService } from '../services/logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    @Inject(forwardRef(() => AppLoggerService))
    private readonly logger: AppLoggerService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, body, query, params } = request;
    const startTime = Date.now();

    // Log request
    this.logger.log(
      `Incoming Request: ${method} ${url}`,
      context.getClass().name,
      {
        method,
        url,
        query,
        params,
        body: this.sanitizeBody(body),
        ip: request.ip || request.connection?.remoteAddress,
        userAgent: request.get('user-agent'),
        userId: (request as any).user?.id,
        userEmail: (request as any).user?.email,
      },
    );

    return next.handle().pipe(
      tap({
        next: (data) => {
          const responseTime = Date.now() - startTime;
          const response = context.switchToHttp().getResponse();
          
          this.logger.logRequest(request, response, responseTime);
          
          // Log slow requests
          if (responseTime > 1000) {
            this.logger.warn(
              `Slow Request: ${method} ${url} took ${responseTime}ms`,
              context.getClass().name,
            );
          }
        },
        error: (error) => {
          const responseTime = Date.now() - startTime;
          this.logger.error(
            `Request Error: ${method} ${url} - ${error.message}`,
            error.stack,
            context.getClass().name,
            {
              method,
              url,
              responseTime: `${responseTime}ms`,
              error: error.message,
            },
          );
        },
      }),
    );
  }

  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') return body;

    const sensitiveFields = ['password', 'token', 'secret', 'authorization', 'apiKey', 'api_key'];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}

