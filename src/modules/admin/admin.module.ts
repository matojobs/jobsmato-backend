import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { Job } from '../../entities/job.entity';
import { Company } from '../../entities/company.entity';
import { AdminActionLog } from '../../entities/admin-action-log.entity';
import { BulkUpload } from '../../entities/bulk-upload.entity';
import { SystemSetting } from '../../entities/system-setting.entity';
import { AuthModule } from '../auth/auth.module';

// Controllers
import { AdminAuthController } from './controllers/admin-auth.controller';
import { AdminDashboardController } from './controllers/admin-dashboard.controller';
import { AdminUsersController } from './controllers/admin-users.controller';
import { AdminCompaniesController } from './controllers/admin-companies.controller';
import { AdminJobsController } from './controllers/admin-jobs.controller';
import { AdminBulkUploadController } from './controllers/admin-bulk-upload.controller';
import { AdminSettingsController } from './controllers/admin-settings.controller';
import { AdminActivityController } from './controllers/admin-activity.controller';
import { AdminLogsController } from './controllers/admin-logs.controller';

// Services
import { AdminService } from './services/admin.service';
import { AdminDashboardService } from './services/admin-dashboard.service';
import { AdminUsersService } from './services/admin-users.service';
import { AdminCompaniesService } from './services/admin-companies.service';
import { AdminJobsService } from './services/admin-jobs.service';
import { AdminBulkUploadService } from './services/admin-bulk-upload.service';
import { AdminSettingsService } from './services/admin-settings.service';
import { AdminActivityService } from './services/admin-activity.service';
import { AdminAuditService } from './services/admin-audit.service';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Job,
      Company,
      AdminActionLog,
      BulkUpload,
      SystemSetting,
    ]),
    AuthModule,
    CommonModule,
  ],
  controllers: [
    AdminAuthController,
    AdminDashboardController,
    AdminUsersController,
    AdminCompaniesController,
    AdminJobsController,
    AdminBulkUploadController,
    AdminSettingsController,
    AdminActivityController,
    AdminLogsController,
  ],
  providers: [
    AdminService,
    AdminDashboardService,
    AdminUsersService,
    AdminCompaniesService,
    AdminJobsService,
    AdminBulkUploadService,
    AdminSettingsService,
    AdminActivityService,
    AdminAuditService,
  ],
  exports: [AdminService, AdminAuditService],
})
export class AdminModule {}

