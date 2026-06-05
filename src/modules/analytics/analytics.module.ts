import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AnalyticsRecruiterController } from './analytics-recruiter.controller';
import { AnalyticsAdminController } from './analytics-admin.controller';
import { AuthModule } from '../auth/auth.module';
import { RecruiterModule } from '../recruiter/recruiter.module';
import { RecruiterGuard } from '../recruiter/guards/recruiter.guard';
import { AdminGuard } from '../admin/guards/admin.guard';

/**
 * Phase 1 — unified analytics. One service (reading sourcing.v_application_facts)
 * powers both the recruiter-scoped and admin endpoints, guaranteeing identical
 * numbers across every screen.
 */
@Module({
  imports: [AuthModule, RecruiterModule],
  controllers: [AnalyticsRecruiterController, AnalyticsAdminController],
  providers: [AnalyticsService, RecruiterGuard, AdminGuard],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
