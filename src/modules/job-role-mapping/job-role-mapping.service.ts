import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobRoleMapping } from '../../entities/job-role-mapping.entity';
import { TrainingCandidate } from '../../entities/training-candidate.entity';
import { familyKeywordsFor } from '../training-data/role-families';

@Injectable()
export class JobRoleMappingService {
  private readonly logger = new Logger(JobRoleMappingService.name);

  constructor(
    @InjectRepository(JobRoleMapping)
    private mappingRepo: Repository<JobRoleMapping>,
    @InjectRepository(TrainingCandidate)
    private candidateRepo: Repository<TrainingCandidate>,
  ) {}

  /**
   * Get or create role mapping for a job title.
   * If mapping exists, return it.
   * If not, auto-extract keywords and count matching candidates.
   */
  async getOrCreateMapping(jobTitle: string) {
    // Check if mapping exists
    let mapping = await this.mappingRepo.findOne({ where: { jobTitle } });
    if (mapping) {
      return mapping;
    }

    // Auto-extract keywords
    const keywords = familyKeywordsFor(jobTitle);
    const candidateCount = await this.countCandidatesByKeywords(keywords);

    // Create new mapping
    mapping = this.mappingRepo.create({
      jobTitle,
      trainingRoles: keywords,
      matchStrategy: 'keyword',
      candidateCount,
    });

    return this.mappingRepo.save(mapping);
  }

  /**
   * Admin manually saves/updates a role mapping.
   * Useful for frequently-used job titles.
   */
  async saveMapping(jobTitle: string, trainingRoles: string[], userId: number) {
    const candidateCount = await this.countCandidatesByRoles(trainingRoles);

    let mapping = await this.mappingRepo.findOne({ where: { jobTitle } });
    if (mapping) {
      mapping.trainingRoles = trainingRoles;
      mapping.matchStrategy = 'manual';
      mapping.candidateCount = candidateCount;
      mapping.updatedAt = new Date();
    } else {
      mapping = this.mappingRepo.create({
        jobTitle,
        trainingRoles,
        matchStrategy: 'manual',
        candidateCount,
        createdBy: userId,
      });
    }

    return this.mappingRepo.save(mapping);
  }

  /**
   * Get training roles for a job title (with fallback to auto-extraction).
   */
  async getTrainingRoles(jobTitle: string): Promise<string[]> {
    const mapping = await this.getOrCreateMapping(jobTitle);
    return mapping.trainingRoles;
  }

  /**
   * Count candidates matching keywords (used for preview).
   */
  private async countCandidatesByKeywords(keywords: string[]): Promise<number> {
    if (!keywords.length) return 0;

    const qb = this.candidateRepo.createQueryBuilder('c');
    let hasCondition = false;

    keywords.forEach((kw, i) => {
      if (i === 0) {
        qb.where(`c."sourcedForRole" ILIKE :kw${i}`, { [`kw${i}`]: `%${kw}%` });
      } else {
        qb.orWhere(`c."sourcedForRole" ILIKE :kw${i}`, { [`kw${i}`]: `%${kw}%` });
      }
      hasCondition = true;
    });

    return hasCondition ? qb.getCount() : 0;
  }

  /**
   * Count candidates matching exact role names.
   */
  private async countCandidatesByRoles(roles: string[]): Promise<number> {
    if (!roles.length) return 0;

    return this.candidateRepo
      .createQueryBuilder('c')
      .where('c."sourcedForRole" IN (:...roles)', { roles })
      .getCount();
  }

  /**
   * Get all saved mappings (admin dashboard).
   */
  async getAllMappings(page = 1, limit = 20) {
    const [data, total] = await this.mappingRepo.findAndCount({
      order: { updatedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Delete a mapping.
   */
  async deleteMapping(id: string) {
    await this.mappingRepo.delete(id);
    return { deleted: true };
  }
}
