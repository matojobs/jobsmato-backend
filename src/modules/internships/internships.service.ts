import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InternshipEnrollment, EnrollmentStatus } from '../../entities/internship-enrollment.entity';
import { Batch } from '../../entities/batch.entity';

@Injectable()
export class InternshipsService {
  constructor(
    @InjectRepository(InternshipEnrollment)
    private enrollmentRepo: Repository<InternshipEnrollment>,
    @InjectRepository(Batch)
    private batchRepo: Repository<Batch>,
  ) {}

  async enroll(userId: number, data: {
    batchId: string;
    domain: any;
    paymentId?: string;
    aptitudeScore?: number;
    aptitudePassed?: boolean;
  }) {
    const batch = await this.batchRepo.findOne({ where: { id: data.batchId } });
    if (!batch) throw new NotFoundException('Batch not found');
    if (batch.enrolledCount >= batch.totalSeats) throw new BadRequestException('Batch is full');

    const existing = await this.enrollmentRepo.findOne({
      where: { userId, batchId: data.batchId },
    });
    if (existing) throw new BadRequestException('Already enrolled in this batch');

    const enrollment = this.enrollmentRepo.create({
      userId,
      batchId: data.batchId,
      domain: data.domain,
      paymentId: data.paymentId,
      paymentVerified: !!data.paymentId,
      aptitudeScore: data.aptitudeScore,
      aptitudePassed: data.aptitudePassed ?? false,
      status: EnrollmentStatus.ACTIVE,
    });
    await this.batchRepo.increment({ id: data.batchId }, 'enrolledCount', 1);
    return this.enrollmentRepo.save(enrollment);
  }

  getMy(userId: number) {
    return this.enrollmentRepo.findOne({
      where: { userId, status: EnrollmentStatus.ACTIVE },
      relations: ['batch'],
      order: { enrolledAt: 'DESC' },
    });
  }

  getMyHistory(userId: number) {
    return this.enrollmentRepo.find({
      where: { userId },
      relations: ['batch'],
      order: { enrolledAt: 'DESC' },
    });
  }

  getAllAdmin(filters: { domain?: string; status?: string; batchId?: string }) {
    const qb = this.enrollmentRepo.createQueryBuilder('e')
      .leftJoinAndSelect('e.batch', 'batch')
      .leftJoinAndSelect('e.user', 'user')
      .select(['e', 'batch', 'user.id', 'user.firstName', 'user.lastName', 'user.email']);
    if (filters.domain) qb.andWhere('e.domain = :domain', { domain: filters.domain });
    if (filters.status) qb.andWhere('e.status = :status', { status: filters.status });
    if (filters.batchId) qb.andWhere('e.batchId = :batchId', { batchId: filters.batchId });
    return qb.orderBy('e.enrolledAt', 'DESC').getMany();
  }

  async assignMentor(enrollmentId: string, mentorId: number) {
    const enrollment = await this.enrollmentRepo.findOne({ where: { id: enrollmentId } });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    enrollment.mentorId = mentorId;
    return this.enrollmentRepo.save(enrollment);
  }

  async updateStatus(enrollmentId: string, status: string, finalScore?: number, finalGrade?: string) {
    const enrollment = await this.enrollmentRepo.findOne({ where: { id: enrollmentId } });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    enrollment.status = status as EnrollmentStatus;
    if (finalScore !== undefined) enrollment.finalScore = finalScore;
    if (finalGrade) enrollment.finalGrade = finalGrade;
    if (status === EnrollmentStatus.COMPLETED) enrollment.completedAt = new Date().toISOString().split('T')[0];
    return this.enrollmentRepo.save(enrollment);
  }

}
