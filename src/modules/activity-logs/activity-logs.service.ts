import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InternActivityLog } from '../../entities/intern-activity-log.entity';
import { InternshipEnrollment } from '../../entities/internship-enrollment.entity';
import { TrainingCandidate } from '../../entities/training-candidate.entity';

@Injectable()
export class ActivityLogsService {
  constructor(
    @InjectRepository(InternActivityLog)
    private logRepo: Repository<InternActivityLog>,
    @InjectRepository(InternshipEnrollment)
    private enrollmentRepo: Repository<InternshipEnrollment>,
    @InjectRepository(TrainingCandidate)
    private candidateRepo: Repository<TrainingCandidate>,
  ) {}

  private async verifyOwnership(enrollmentId: string, userId: number) {
    const enrollment = await this.enrollmentRepo.findOne({ where: { id: enrollmentId, userId } });
    if (!enrollment) throw new ForbiddenException('Access denied to this enrollment');
    return enrollment;
  }

  private getWeekNumber(enrollment: InternshipEnrollment): number {
    const startDate = new Date(enrollment.enrolledAt);
    const now = new Date();
    const diffMs = now.getTime() - startDate.getTime();
    return Math.max(1, Math.ceil(diffMs / (7 * 24 * 60 * 60 * 1000)));
  }

  async log(userId: number, data: any) {
    const enrollment = await this.verifyOwnership(data.enrollmentId, userId);
    const weekNumber = this.getWeekNumber(enrollment);
    const log = this.logRepo.create({ ...data, userId, weekNumber });
    return this.logRepo.save(log);
  }

  async getTodayStats(enrollmentId: string, userId: number) {
    await this.verifyOwnership(enrollmentId, userId);
    const today = new Date().toISOString().split('T')[0];
    const logs = await this.logRepo.find({ where: { enrollmentId, callDate: today } });
    return {
      totalCalls: logs.length,
      connected: logs.filter(l => l.callStatus === 'connected').length,
      interested: logs.filter(l => l.interestStatus === 'yes').length,
      interviewScheduled: logs.filter(l => l.interviewScheduled).length,
    };
  }

  async getWeekStats(enrollmentId: string, userId: number, weekNumber: number) {
    await this.verifyOwnership(enrollmentId, userId);
    const logs = await this.logRepo.find({ where: { enrollmentId, weekNumber } });
    return {
      weekNumber,
      totalCalls: logs.length,
      connected: logs.filter(l => l.callStatus === 'connected').length,
      interested: logs.filter(l => l.interestStatus === 'yes').length,
      interviewScheduled: logs.filter(l => l.interviewScheduled).length,
      selected: logs.filter(l => l.selectionStatus === 'selected').length,
      joined: logs.filter(l => l.joiningStatus === 'joined').length,
    };
  }

  async getMyLogs(enrollmentId: string, userId: number, page = 1) {
    await this.verifyOwnership(enrollmentId, userId);
    const take = 20;
    const [logs, total] = await this.logRepo.findAndCount({
      where: { enrollmentId },
      relations: ['candidate'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * take,
      take,
    });
    return { logs, total, page, totalPages: Math.ceil(total / take) };
  }

  async getCandidateLog(enrollmentId: string, userId: number, candidateId: string) {
    await this.verifyOwnership(enrollmentId, userId);
    return this.logRepo.find({
      where: { enrollmentId, candidateId: parseInt(candidateId) },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Search talent pool against a new vacancy.
   * Matches candidates whose pipeline stage is in talent_pool stages
   * against job criteria: cities, skills/profile keywords, salary range.
   * Returns scored list with match reasons.
   */
  async matchTalentPool(criteria: {
    cities?: string[];           // vacancy cities from jobs.vacancies
    skills?: string;             // keywords from job title / description
    salaryMin?: number;          // expected CTC min
    salaryMax?: number;          // expected CTC max
    jobTitle?: string;           // for role matching
    jobId?: number;
  }) {
    const TALENT_POOL_STAGES = [
      'talent_pool', 'not_interested', 'profile_mismatch',
      'client_rejected', 'interview_failed', 'offer_declined', 'no_response', 'follow_up',
    ];

    // Get all talent pool logs with candidate info
    const logs = await this.logRepo
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.candidate', 'candidate')
      .where('log.pipelineStage IN (:...stages)', { stages: TALENT_POOL_STAGES })
      .getMany();

    const skillKeywords = (criteria.skills || criteria.jobTitle || '')
      .toLowerCase().split(/[\s,\/]+/).filter(Boolean);

    const results = logs.map(log => {
      const c = log.candidate as TrainingCandidate;
      if (!c) return null;

      const matchReasons: string[] = [];
      let score = 0;

      // 1. Location match
      const candidateCity = (c.currentCity || '').toLowerCase();
      const preferredLoc = (log.preferredLocation || '').toLowerCase();
      const vacancyCities = (criteria.cities || []).map(x => x.toLowerCase());

      if (vacancyCities.some(city => candidateCity.includes(city) || city.includes(candidateCity))) {
        score += 40;
        matchReasons.push(`Location: ${c.currentCity}`);
      } else if (vacancyCities.some(city => preferredLoc.includes(city) || city.includes(preferredLoc))) {
        score += 25;
        matchReasons.push(`Preferred location: ${log.preferredLocation}`);
      }

      // 2. Skills / role match
      const candidateSkills = (c.skills || '').toLowerCase();
      const preferredRoles = (log.preferredRoles || '').toLowerCase();
      const designation = (c.currentDesignation || '').toLowerCase();

      const skillMatches = skillKeywords.filter(kw =>
        candidateSkills.includes(kw) || preferredRoles.includes(kw) || designation.includes(kw)
      );
      if (skillMatches.length > 0) {
        score += Math.min(30, skillMatches.length * 10);
        matchReasons.push(`Skills match: ${skillMatches.join(', ')}`);
      }

      // 3. Salary match — parse numeric from strings like "4-5 LPA" or "400000"
      const parseCtc = (s: string) => {
        if (!s) return null;
        const num = parseFloat(s.replace(/[^0-9.]/g, ''));
        // Convert to annual LPA if looks like raw (> 10000 = rupees, else LPA)
        return num > 10000 ? num / 100000 : num;
      };

      const expectedCtc = parseCtc(c.expectedCTC || log.expectedSalary || '');
      if (expectedCtc && criteria.salaryMax) {
        if (expectedCtc <= criteria.salaryMax && (!criteria.salaryMin || expectedCtc >= criteria.salaryMin)) {
          score += 20;
          matchReasons.push(`Salary: ₹${expectedCtc}L (within range)`);
        }
      }

      // 4. Availability bonus
      if (log.availabilityTimeline && ['immediate', '1 week', '15 days'].includes(
        log.availabilityTimeline.toLowerCase()
      )) {
        score += 10;
        matchReasons.push(`Available: ${log.availabilityTimeline}`);
      }

      if (score === 0) return null; // no match at all

      return {
        score,
        matchReasons,
        logId: log.id,
        pipelineStage: log.pipelineStage,
        declineReason: log.declineReason,
        preferredRoles: log.preferredRoles,
        preferredLocation: log.preferredLocation,
        availabilityTimeline: log.availabilityTimeline,
        expectedSalary: log.expectedSalary || c.expectedCTC,
        candidate: {
          id: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email,
          currentCity: c.currentCity,
          currentDesignation: c.currentDesignation,
          currentCompany: c.currentCompany,
          experience: c.experience,
          skills: c.skills,
          expectedCTC: c.expectedCTC,
        },
      };
    })
      .filter(Boolean)
      .sort((a, b) => b!.score - a!.score);

    return {
      total: results.length,
      criteria,
      candidates: results,
    };
  }

  /** Admin: Get paginated talent pool */
  async getTalentPool(page = 1, stage?: string) {
    const TALENT_POOL_STAGES = [
      'talent_pool', 'not_interested', 'profile_mismatch',
      'client_rejected', 'interview_failed', 'offer_declined',
    ];
    const take = 30;
    const qb = this.logRepo
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.candidate', 'candidate')
      .where('log.pipelineStage IN (:...stages)', { stages: stage ? [stage] : TALENT_POOL_STAGES })
      .orderBy('log.updatedAt', 'DESC')
      .skip((page - 1) * take)
      .take(take);

    const [logs, total] = await qb.getManyAndCount();
    return { logs, total, page, totalPages: Math.ceil(total / take) };
  }

  /** Update specific fields on an existing log (pipeline stage advance) */
  async updateLog(id: string, userId: number, data: any) {
    const log = await this.logRepo.findOne({ where: { id, userId } });
    if (!log) throw new NotFoundException('Log not found');
    Object.assign(log, data);
    return this.logRepo.save(log);
  }

  /**
   * Upsert: get or create the single activity log for this candidate+enrollment,
   * then merge the new fields in. This is the primary endpoint for the intern KRA flow.
   */
  async upsertLog(userId: number, data: any) {
    const enrollment = await this.verifyOwnership(data.enrollmentId, userId);
    const weekNumber = this.getWeekNumber(enrollment);

    const existing = await this.logRepo.findOne({
      where: { enrollmentId: data.enrollmentId, candidateId: parseInt(data.candidateId) },
    });

    if (!existing) {
      const newLog = this.logRepo.create({ ...data, userId, weekNumber });
      const saved = await this.logRepo.save(newLog);
      await this.handleCandidateLock(parseInt(data.candidateId), data.enrollmentId, data.pipelineStage);
      return saved;
    }

    // Merge — never overwrite with undefined/null
    Object.keys(data).forEach(k => {
      if (data[k] !== undefined && data[k] !== null) (existing as any)[k] = data[k];
    });
    const saved = await this.logRepo.save(existing);
    await this.handleCandidateLock(parseInt(data.candidateId), data.enrollmentId, data.pipelineStage);
    return saved;
  }

  /**
   * Lock candidate when interested (submitted+), unlock when dropped/rejected/failed.
   * Locked candidates are excluded from admin task assignment queries.
   */
  private async handleCandidateLock(candidateId: number, enrollmentId: string, stage: string) {
    if (!candidateId || !stage) return;

    const LOCK_STAGES = [
      'interested', 'screened', 'qualified', 'submitted', 'shortlisted',
      'interview_r1', 'interview_r2', 'final_round', 'selected',
      'offer_released', 'offer_accepted', 'joined',
    ];
    const UNLOCK_STAGES = [
      'not_interested', 'profile_mismatch', 'client_rejected', 'interview_failed',
      'offer_declined', 'talent_pool', 'no_response',
    ];

    if (LOCK_STAGES.includes(stage)) {
      await this.candidateRepo.update(candidateId, {
        lockedByEnrollmentId: enrollmentId,
        lockedAt: new Date(),
      } as any);
    } else if (UNLOCK_STAGES.includes(stage)) {
      await this.candidateRepo.update(candidateId, {
        lockedByEnrollmentId: null as any,
        lockedAt: null as any,
      });
    }
  }
}
