import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class AppLoggerService implements NestLoggerService {
  private logger: winston.Logger;
  private errorLogger: winston.Logger;

  constructor() {
    // Ensure logs directory exists
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Define log format
    const logFormat = winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json(),
    );

    // Console format (more readable)
    const consoleFormat = winston.format.combine(
      winston.format.colorize(),
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(meta).length > 0) {
          msg += ` ${JSON.stringify(meta)}`;
        }
        return msg;
      }),
    );

    // General logger (info, warn, debug)
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: logFormat,
      defaultMeta: { service: 'jobsmato-api' },
      transports: [
        // Console transport
        new winston.transports.Console({
          format: consoleFormat,
        }),
        // Daily rotate file for all logs
        new DailyRotateFile({
          filename: path.join(logsDir, 'application-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '14d', // Keep logs for 14 days
          format: logFormat,
        }),
      ],
    });

    // Error logger (errors only)
    this.errorLogger = winston.createLogger({
      level: 'error',
      format: logFormat,
      defaultMeta: { service: 'jobsmato-api' },
      transports: [
        // Console transport
        new winston.transports.Console({
          format: consoleFormat,
        }),
        // Daily rotate file for errors
        new DailyRotateFile({
          filename: path.join(logsDir, 'error-%DATE%.log'),
          datePattern: 'YYYY-MM-DD',
          zippedArchive: true,
          maxSize: '20m',
          maxFiles: '30d', // Keep error logs for 30 days
          format: logFormat,
        }),
      ],
    });
  }

  log(message: string, context?: string, ...meta: any[]) {
    this.logger.info(message, { context, ...this.flattenMeta(meta) });
  }

  error(message: string, trace?: string, context?: string, ...meta: any[]) {
    const errorMeta = {
      context,
      trace,
      ...this.flattenMeta(meta),
    };
    this.errorLogger.error(message, errorMeta);
    this.logger.error(message, errorMeta);
  }

  warn(message: string, context?: string, ...meta: any[]) {
    this.logger.warn(message, { context, ...this.flattenMeta(meta) });
  }

  debug(message: string, context?: string, ...meta: any[]) {
    this.logger.debug(message, { context, ...this.flattenMeta(meta) });
  }

  verbose(message: string, context?: string, ...meta: any[]) {
    this.logger.verbose(message, { context, ...this.flattenMeta(meta) });
  }

  /**
   * Log API request
   */
  logRequest(req: any, res: any, responseTime?: number) {
    const logData = {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      responseTime: responseTime ? `${responseTime}ms` : undefined,
      ip: req.ip || req.connection?.remoteAddress,
      userAgent: req.get('user-agent'),
      userId: req.user?.id,
      userEmail: req.user?.email,
      userRole: req.user?.role,
    };

    if (res.statusCode >= 400) {
      this.errorLogger.warn('API Request Error', logData);
    } else {
      this.logger.info('API Request', logData);
    }
  }

  /**
   * Log error with full context
   */
  logError(
    error: Error | string,
    context?: string,
    request?: {
      method?: string;
      url?: string;
      body?: any;
      query?: any;
      params?: any;
      user?: any;
      ip?: string;
      userAgent?: string;
    },
  ) {
    const errorData = {
      context,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
      request: request ? {
        method: request.method,
        url: request.url,
        body: this.sanitizeData(request.body),
        query: request.query,
        params: request.params,
        user: request.user ? {
          id: request.user.id,
          email: request.user.email,
          role: request.user.role,
        } : undefined,
        ip: request.ip,
        userAgent: request.userAgent,
      } : undefined,
      timestamp: new Date().toISOString(),
    };

    this.errorLogger.error('Application Error', errorData);
  }

  /**
   * Flatten meta objects into single object
   */
  private flattenMeta(meta: any[]): any {
    if (meta.length === 0) return {};
    if (meta.length === 1) return meta[0] || {};
    return Object.assign({}, ...meta);
  }

  /**
   * Sanitize sensitive data from logs
   */
  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') return data;

    const sensitiveFields = ['password', 'token', 'secret', 'authorization', 'apiKey', 'api_key'];
    const sanitized = { ...data };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}

