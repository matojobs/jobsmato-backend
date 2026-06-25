import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecruiterController } from './recruiter.controller';
import { RecruiterService } from './recruiter.service';
import { RecruiterGuard } from './guards/recruiter.guard';
import { CompaniesModule } from '../companies/companies.module';
import { ApplicationsModule } from '../applications/applications.module';
import { LocalUploadService } from '../upload/local-upload.service';

@Module({
  imports: [TypeOrmModule.forFeature([]), ConfigModule, CompaniesModule, ApplicationsModule],
  controllers: [RecruiterController],
  providers: [RecruiterService, RecruiterGuard, LocalUploadService],
  exports: [RecruiterService],
})
export class RecruiterModule {}
