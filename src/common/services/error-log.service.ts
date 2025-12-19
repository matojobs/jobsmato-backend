import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ErrorLog } from '../../entities/error-log.entity';
import { AppLoggerService } from './logger.service';

@Injectable()
export class ErrorLogService {
  constructor(
    @InjectRepository(ErrorLog)
    private errorLogRepository: Repository<ErrorLog>,
    private readonly logger: AppLoggerService,
  ) {}

  async logError(
    error: Error | string,
    context: string,
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
    statusCode?: number,
  ): Promise<ErrorLog> {
    try {
      const errorMessage = error instanceof Error ? error.message : error;
      const errorStack = error instanceof Error ? error.stack : undefined;
      const errorName = error instanceof Error ? error.name : 'UnknownError';

      const errorLog = this.errorLogRepository.create({
        errorType: errorName,
        message: errorMessage,
        stack: errorStack,
        method: request?.method || 'UNKNOWN',
        url: request?.url || 'UNKNOWN',
        statusCode: statusCode || 500,
        userId: request?.user?.id,
        userEmail: request?.user?.email,
        userRole: request?.user?.role,
        ipAddress: request?.ip,
        userAgent: request?.userAgent,
        requestData: request ? {
          query: request.query,
          params: request.params,
          body: this.sanitizeData(request.body),
        } : undefined,
        context,
      });

      const savedLog = await this.errorLogRepository.save(errorLog);
      
      // Also log to file
      this.logger.logError(error instanceof Error ? error : new Error(errorMessage), context, request);

      return savedLog;
    } catch (logError) {
      // If database logging fails, at least log to file
      this.logger.error(
        'Failed to save error log to database',
        logError instanceof Error ? logError.stack : undefined,
        'ErrorLogService',
      );
      throw logError;
    }
  }

  async getErrorLogs(
    page: number = 1,
    limit: number = 50,
    filters?: {
      errorType?: string;
      statusCode?: number;
      userId?: number;
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<{ logs: ErrorLog[]; total: number }> {
    const queryBuilder = this.errorLogRepository.createQueryBuilder('errorLog');

    if (filters?.errorType) {
      queryBuilder.andWhere('errorLog.errorType = :errorType', { errorType: filters.errorType });
    }

    if (filters?.statusCode) {
      queryBuilder.andWhere('errorLog.statusCode = :statusCode', { statusCode: filters.statusCode });
    }

    if (filters?.userId) {
      queryBuilder.andWhere('errorLog.userId = :userId', { userId: filters.userId });
    }

    if (filters?.startDate) {
      queryBuilder.andWhere('errorLog.createdAt >= :startDate', { startDate: filters.startDate });
    }

    if (filters?.endDate) {
      queryBuilder.andWhere('errorLog.createdAt <= :endDate', { endDate: filters.endDate });
    }

    const [logs, total] = await queryBuilder
      .orderBy('errorLog.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { logs, total };
  }

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

