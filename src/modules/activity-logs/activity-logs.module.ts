import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InternActivityLog } from '../../entities/intern-activity-log.entity';
import { InternshipEnrollment } from '../../entities/internship-enrollment.entity';
import { TrainingCandidate } from '../../entities/training-candidate.entity';
import { ActivityLogsController } from './activity-logs.controller';
import { ActivityLogsService } from './activity-logs.service';

@Module({
  imports: [TypeOrmModule.forFeature([InternActivityLog, InternshipEnrollment, TrainingCandidate])],
  controllers: [ActivityLogsController],
  providers: [ActivityLogsService],
})
export class ActivityLogsModule {}
