import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { JobApplication } from '../../entities/job-application.entity';
import { User } from '../../entities/user.entity';
import { Company } from '../../entities/company.entity';
import { Job } from '../../entities/job.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([JobApplication, User, Company, Job]),
    ConfigModule,
  ],
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class FilesModule {}

