import { Injectable, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WeeklyEvaluation } from '../../entities/weekly-evaluation.entity';
import { InternshipEnrollment } from '../../entities/internship-enrollment.entity';

@Injectable()
export class EvaluationsService {
  constructor(
    @InjectRepository(WeeklyEvaluation)
    private evalRepo: Repository<WeeklyEvaluation>,
    @InjectRepository(InternshipEnrollment)
    private enrollmentRepo: Repository<InternshipEnrollment>,
  ) {}

  async getByEnrollment(enrollmentId: string, userId: number) {
    const enrollment = await this.enrollmentRepo.findOne({ where: { id: enrollmentId, userId } });
    if (!enrollment) throw new ForbiddenException('Access denied');
    return this.evalRepo.find({
      where: { enrollmentId },
      order: { weekNumber: 'ASC' },
    });
  }

  create(data: Partial<WeeklyEvaluation>) {
    const evaluation = this.evalRepo.create(data);
    return this.evalRepo.save(evaluation);
  }
}
