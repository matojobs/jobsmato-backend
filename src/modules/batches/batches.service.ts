import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Batch, InternshipDomain, BatchStatus } from '../../entities/batch.entity';
import { InternshipEnrollment, EnrollmentStatus } from '../../entities/internship-enrollment.entity';

@Injectable()
export class BatchesService {
  constructor(
    @InjectRepository(Batch)
    private batchRepo: Repository<Batch>,
    @InjectRepository(InternshipEnrollment)
    private enrollmentRepo: Repository<InternshipEnrollment>,
  ) {}

  /** Compute live enrolledCount for a list of batches */
  private async withLiveCount(batches: Batch[]): Promise<(Batch & { enrolledCount: number })[]> {
    if (!batches.length) return [];
    const batchIds = batches.map(b => b.id);
    const counts = await this.enrollmentRepo
      .createQueryBuilder('e')
      .select('e.batchId', 'batchId')
      .addSelect('COUNT(e.id)', 'count')
      .where('e.batchId IN (:...batchIds)', { batchIds })
      .andWhere('e.status = :status', { status: EnrollmentStatus.ACTIVE })
      .groupBy('e.batchId')
      .getRawMany();
    const countMap: Record<string, number> = {};
    counts.forEach(r => { countMap[r.batchId] = parseInt(r.count); });
    return batches.map(b => ({ ...b, enrolledCount: countMap[b.id] ?? 0 }));
  }

  async findAll(domain?: InternshipDomain) {
    const qb = this.batchRepo.createQueryBuilder('b')
      .where('b.status IN (:...statuses)', { statuses: [BatchStatus.UPCOMING, BatchStatus.ACTIVE, BatchStatus.COMING_SOON] });
    if (domain) qb.andWhere('b.domain = :domain', { domain });
    const batches = await qb.orderBy('b.startDate', 'ASC').getMany();
    return this.withLiveCount(batches);
  }

  async findAllAdmin() {
    const batches = await this.batchRepo.find({ order: { createdAt: 'DESC' } });
    return this.withLiveCount(batches);
  }

  async findOne(id: string) {
    const batch = await this.batchRepo.findOne({ where: { id } });
    if (!batch) throw new NotFoundException('Batch not found');
    return batch;
  }

  create(data: Partial<Batch>) {
    const batch = this.batchRepo.create(data);
    return this.batchRepo.save(batch);
  }

  async update(id: string, data: Partial<Batch>) {
    await this.findOne(id);
    await this.batchRepo.update(id, data);
    return this.findOne(id);
  }
}
