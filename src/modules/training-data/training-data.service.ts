import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TrainingCandidate } from '../../entities/training-candidate.entity';

@Injectable()
export class TrainingDataService {
  constructor(
    @InjectRepository(TrainingCandidate)
    private candidateRepo: Repository<TrainingCandidate>,
  ) {}

  async getStats() {
    const total = await this.candidateRepo.count();
    const assigned = await this.candidateRepo
      .createQueryBuilder('c')
      .innerJoin('task_assignments', 'ta', 'ta.candidateId = c.id')
      .getCount();
    const available = total - assigned;
    const byStatus = await this.candidateRepo
      .createQueryBuilder('c')
      .select('c.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('c.status')
      .getRawMany();
    const bySource = await this.candidateRepo
      .createQueryBuilder('c')
      .select('c.source', 'source')
      .addSelect('COUNT(*)', 'count')
      .groupBy('c.source')
      .limit(10)
      .getRawMany();
    const portals = bySource.map(r => ({ name: r.source || 'Unknown', count: parseInt(r.count) }));
    return { total, assigned, available, byStatus, bySource, portals };
  }

  findAll(page = 1, search?: string) {
    const take = 50;
    const qb = this.candidateRepo.createQueryBuilder('c').orderBy('c.id', 'ASC');
    if (search) qb.where('c.name ILIKE :s OR c.phone ILIKE :s', { s: `%${search}%` });
    return qb.skip((page - 1) * take).take(take).getManyAndCount();
  }

  /** Distinct company names in the pool */
  async getCompanies() {
    const rows = await this.candidateRepo
      .createQueryBuilder('c')
      .select('DISTINCT c.currentCompany', 'company')
      .where('c.currentCompany IS NOT NULL')
      .orderBy('company', 'ASC')
      .getRawMany();
    return rows.map(r => r.company).filter(Boolean);
  }

  /** Distinct job profiles/roles in the pool, optionally filtered by companies */
  async getProfiles(companies?: string[]) {
    const qb = this.candidateRepo
      .createQueryBuilder('c')
      .select('DISTINCT c.currentDesignation', 'profile')
      .where('c.currentDesignation IS NOT NULL');
    if (companies?.length) qb.andWhere('c.currentCompany IN (:...companies)', { companies });
    const rows = await qb.orderBy('profile', 'ASC').getRawMany();
    return rows.map(r => r.profile).filter(Boolean);
  }

  /** Cities with candidate count, filtered by company + profile */
  async getCities(companies?: string[], profiles?: string[]) {
    const qb = this.candidateRepo
      .createQueryBuilder('c')
      .select('c.currentCity', 'city')
      .addSelect('COUNT(*)', 'count')
      .where('c.currentCity IS NOT NULL');
    if (companies?.length) qb.andWhere('c.currentCompany IN (:...companies)', { companies });
    if (profiles?.length) qb.andWhere('c.currentDesignation IN (:...profiles)', { profiles });
    const rows = await qb.groupBy('c.currentCity').orderBy('count', 'DESC').limit(50).getRawMany();
    return rows.map(r => ({ city: r.city, count: parseInt(r.count) }));
  }

  /** Preview candidates matching filters */
  async previewCandidates(
    companies: string[], profiles: string[], cities: string[],
    page = 1, limit = 20,
  ) {
    const qb = this.candidateRepo.createQueryBuilder('c').orderBy('c.id', 'ASC');
    if (companies?.length) qb.andWhere('c.currentCompany IN (:...companies)', { companies });
    if (profiles?.length) qb.andWhere('c.currentDesignation IN (:...profiles)', { profiles });
    if (cities?.length) qb.andWhere('c.currentCity IN (:...cities)', { cities });
    // Exclude candidates already locked (interested/submitted by another intern)
    qb.andWhere('c."lockedByEnrollmentId" IS NULL');
    const [candidates, total] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    return { candidates, total, page, totalPages: Math.ceil(total / limit) };
  }
}
