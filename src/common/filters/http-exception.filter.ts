import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { AppLoggerService } from '../services/logger.service';
import { ErrorLogService } from '../services/error-log.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);
  private appLogger: AppLoggerService;
  private errorLogService: ErrorLogService;

  constructor(
    @Inject(forwardRef(() => AppLoggerService))
    appLogger: AppLoggerService,
    @Inject(forwardRef(() => ErrorLogService))
    errorLogService: ErrorLogService,
  ) {
    this.appLogger = appLogger;
    this.errorLogService = errorLogService;
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errorDetails: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || message;
        errorDetails = exceptionResponse;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      errorDetails = {
        name: exception.name,
        stack: exception.stack,
      };
    }

    // Log error with full context
    const requestContext = {
      method: request.method,
      url: request.url,
      body: request.body,
      query: request.query,
      params: request.params,
      user: (request as any).user,
      ip: request.ip || request.connection?.remoteAddress,
      userAgent: request.get('user-agent'),
    };

    try {
      // Log to file
      if (this.appLogger) {
        this.appLogger.logError(
          exception instanceof Error ? exception : new Error(message),
          AllExceptionsFilter.name,
          requestContext,
        );
      }

      // Log to database (async, don't wait)
      if (this.errorLogService) {
        this.errorLogService.logError(
          exception instanceof Error ? exception : new Error(message),
          AllExceptionsFilter.name,
          requestContext,
          status,
        ).catch((dbError) => {
          // If database logging fails, log to console
          this.logger.error('Failed to save error log to database', dbError);
        });
      }
    } catch (logError) {
      // Fallback to console if logger fails
      this.logger.error('Failed to log error', logError);
    }

    // Log to console for development
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${message}`,
      exception instanceof Error ? exception.stack : undefined,
    );

    // Send error response
    response.status(status).json({
      statusCode: status,
      message: message,
      error: errorDetails?.error || HttpStatus[status],
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(process.env.NODE_ENV === 'development' && errorDetails ? { details: errorDetails } : {}),
    });
  }
}

