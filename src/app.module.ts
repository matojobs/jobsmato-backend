import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { getDatabaseConfig } from './config/database.config';

// Modules
import { AuthModule } from './modules/auth/auth.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { UsersModule } from './modules/users/users.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { UploadModule } from './modules/upload/upload.module';
import { EmailModule } from './modules/email/email.module';
import { AdminModule } from './modules/admin/admin.module';
import { FilesModule } from './modules/files/files.module';
import { RecruiterModule } from './modules/recruiter/recruiter.module';
import { CommonModule } from './common/common.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { BatchesModule } from './modules/batches/batches.module';
import { InternshipsModule } from './modules/internships/internships.module';
import { OperationsModule } from './modules/operations/operations.module';
import { BatchTasksModule } from './modules/batch-tasks/batch-tasks.module';
import { TrainingDataModule } from './modules/training-data/training-data.module';
import { JobRoleMappingModule } from './modules/job-role-mapping/job-role-mapping.module';
import { ActivityLogsModule } from './modules/activity-logs/activity-logs.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { EvaluationsModule } from './modules/evaluations/evaluations.module';
import { CertificatesModule } from './modules/certificates/certificates.module';
import { CandidateSignupModule } from './modules/candidate-signup/candidate-signup.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getDatabaseConfig,
      inject: [ConfigService],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),

    // Scheduling
    ScheduleModule.forRoot(),

    // Event emitter
    EventEmitterModule.forRoot(),

    // Common module (logging, error handling)
    CommonModule,

    // Feature modules
    AuthModule,
    JobsModule,
    UsersModule,
    RecruiterModule, // Must be before ApplicationsModule to handle /api/applications for recruiters
    ApplicationsModule,
    CompaniesModule,
    UploadModule,
    EmailModule,
    AdminModule,
    FilesModule,

    // Billing & payments
    InvoicesModule,
    PaymentsModule,

    // Internship platform
    BatchesModule,
    InternshipsModule,
    OperationsModule,
    BatchTasksModule,
    TrainingDataModule,
    JobRoleMappingModule,
    ActivityLogsModule,
    CouponsModule,
    EvaluationsModule,
    CertificatesModule,
    CandidateSignupModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
