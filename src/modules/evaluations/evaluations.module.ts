import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WeeklyEvaluation } from '../../entities/weekly-evaluation.entity';
import { InternshipEnrollment } from '../../entities/internship-enrollment.entity';
import { EvaluationsController } from './evaluations.controller';
import { EvaluationsService } from './evaluations.service';

@Module({
  imports: [TypeOrmModule.forFeature([WeeklyEvaluation, InternshipEnrollment])],
  controllers: [EvaluationsController],
  providers: [EvaluationsService],
})
export class EvaluationsModule {}
