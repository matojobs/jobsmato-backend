import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobRoleMapping } from '../../entities/job-role-mapping.entity';
import { TrainingCandidate } from '../../entities/training-candidate.entity';
import { JobRoleMappingService } from './job-role-mapping.service';
import { JobRoleMappingController } from './job-role-mapping.controller';

@Module({
  imports: [TypeOrmModule.forFeature([JobRoleMapping, TrainingCandidate])],
  providers: [JobRoleMappingService],
  controllers: [JobRoleMappingController],
  exports: [JobRoleMappingService],
})
export class JobRoleMappingModule {}
