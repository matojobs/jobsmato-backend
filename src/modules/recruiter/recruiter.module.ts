import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecruiterController } from './recruiter.controller';
import { RecruiterService } from './recruiter.service';
import { RecruiterGuard } from './guards/recruiter.guard';
import { CompaniesModule } from '../companies/companies.module';
import { ApplicationsModule } from '../applications/applications.module';

@Module({
  imports: [TypeOrmModule.forFeature([]), CompaniesModule, ApplicationsModule],
  controllers: [RecruiterController],
  providers: [RecruiterService, RecruiterGuard],
  exports: [RecruiterService],
})
export class RecruiterModule {}
