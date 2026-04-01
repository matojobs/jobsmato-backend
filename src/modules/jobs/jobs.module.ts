import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { Job } from '../../entities/job.entity';
import { Company } from '../../entities/company.entity';
import { JobView } from '../../entities/job-view.entity';
import { JobStatistics } from '../../entities/job-statistics.entity';
import { AuthModule } from '../auth/auth.module';
import { CompaniesModule } from '../companies/companies.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Job, Company, JobView, JobStatistics]),
    AuthModule,
    CompaniesModule,
  ],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService],
})
export class JobsModule {}
