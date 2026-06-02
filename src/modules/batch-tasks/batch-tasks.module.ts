import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BatchTask } from '../../entities/batch-task.entity';
import { TaskAssignment } from '../../entities/task-assignment.entity';
import { InternshipEnrollment } from '../../entities/internship-enrollment.entity';
import { TrainingCandidate } from '../../entities/training-candidate.entity';
import { InternActivityLog } from '../../entities/intern-activity-log.entity';
import { Job } from '../../entities/job.entity';
import { BatchTasksController } from './batch-tasks.controller';
import { BatchTasksService } from './batch-tasks.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      BatchTask, TaskAssignment, InternshipEnrollment,
      TrainingCandidate, InternActivityLog, Job,
    ]),
  ],
  controllers: [BatchTasksController],
  providers: [BatchTasksService],
  exports: [BatchTasksService],
})
export class BatchTasksModule {}
