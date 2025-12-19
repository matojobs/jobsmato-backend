import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AppLoggerService } from './services/logger.service';
import { ErrorLogService } from './services/error-log.service';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { SanitizeResponseInterceptor } from './interceptors/sanitize-response.interceptor';
import { AllExceptionsFilter } from './filters/http-exception.filter';
import { ErrorLog } from '../entities/error-log.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([ErrorLog]),
  ],
  providers: [
    AppLoggerService,
    ErrorLogService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SanitizeResponseInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
  exports: [AppLoggerService, ErrorLogService],
})
export class CommonModule {}

