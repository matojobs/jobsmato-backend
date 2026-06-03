import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrainingCandidate } from '../../entities/training-candidate.entity';
import { Job } from '../../entities/job.entity';
import { TrainingDataController } from './training-data.controller';
import { TrainingDataService } from './training-data.service';

@Module({
  imports: [TypeOrmModule.forFeature([TrainingCandidate, Job])],
  controllers: [TrainingDataController],
  providers: [TrainingDataService],
})
export class TrainingDataModule {}
