import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Batch, InternshipDomain, BatchStatus } from '../../entities/batch.entity';

@Injectable()
export class BatchesService {
  constructor(
    @InjectRepository(Batch)
    private batchRepo: Repository<Batch>,
  ) {}

  findAll(domain?: InternshipDomain) {
    const qb = this.batchRepo.createQueryBuilder('b')
      .where('b.status IN (:...statuses)', { statuses: [BatchStatus.UPCOMING, BatchStatus.ACTIVE, BatchStatus.COMING_SOON] });
    if (domain) qb.andWhere('b.domain = :domain', { domain });
    return qb.orderBy('b.startDate', 'ASC').getMany();
  }

  findAllAdmin() {
    return this.batchRepo.find({ order: { createdAt: 'DESC' } });
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
