import { Injectable, ForbiddenException, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InternActivityLog } from '../../entities/intern-activity-log.entity';
import { InternshipEnrollment } from '../../entities/internship-enrollment.entity';
import { TrainingCandidate } from '../../entities/training-candidate.entity';
import { CandidateSignupToken } from '../../entities/candidate-signup-token.entity';

@Injectable()
export class ActivityLogsService {
  private readonly logger = new Logger(ActivityLogsService.name);

  constructor(
    @InjectRepository(InternActivityLog)
    private logRepo: Repository<InternActivityLog>,
    @InjectRepository(InternshipEnrollment)
    private enrollmentRepo: Repository<InternshipEnrollment>,
    @InjectRepository(TrainingCandidate)
    private candidateRepo: Repository<TrainingCandidate>,
    @InjectRepository(CandidateSignupToken)
    private tokenRepo: Repository<CandidateSignupToken>,
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
    const saved = await this.logRepo.save(log);

    // Persist LinkedIn URL back to the training_candidate record if provided
    if (data.candidateId && data.linkedIn) {
      await this.candidateRepo.update(data.candidateId, { linkedIn: data.linkedIn });
    }

    return saved;
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

  /** Follow-ups: logs with followupDate set, sorted by date ASC */
  async getFollowups(
    enrollmentId: string,
    userId: number,
    filter: 'today' | 'overdue' | 'upcoming' | 'all' = 'all',
  ) {
    await this.verifyOwnership(enrollmentId, userId);
    const today = new Date().toISOString().split('T')[0];

    const qb = this.logRepo
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.candidate', 'candidate')
      .where('log.enrollmentId = :enrollmentId', { enrollmentId })
      .andWhere('log.followupDate IS NOT NULL')
      // Exclude candidates already moved past follow_up stage
      .andWhere("log.pipelineStage IN ('follow_up','no_response','contacted')")
      .orderBy('log.followupDate', 'ASC')
      .addOrderBy('log.followupTime', 'ASC');

    if (filter === 'today')    qb.andWhere('log.followupDate = :today', { today });
    if (filter === 'overdue')  qb.andWhere('log.followupDate < :today', { today });
    if (filter === 'upcoming') qb.andWhere('log.followupDate > :today', { today });

    const logs = await qb.getMany();
    return logs.map(log => ({
      id: log.id,
      candidateId: log.candidateId,
      candidate: log.candidate,
      followupDate: log.followupDate,
      followupTime: (log as any).followupTime,
      pipelineStage: log.pipelineStage,
      notes: log.notes,
      isOverdue: log.followupDate < today,
      isToday: log.followupDate === today,
    }));
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
    try {
      // Validate required fields
      if (!data.enrollmentId) throw new BadRequestException('enrollmentId is required');
      if (!data.candidateId) throw new BadRequestException('candidateId is required');

      const candidateId = parseInt(data.candidateId, 10);
      if (isNaN(candidateId)) throw new BadRequestException('candidateId must be a valid number');

      this.logger.debug(`upsertLog called: userId=${userId}, candidateId=${candidateId}, enrollmentId=${data.enrollmentId}`);

      const enrollment = await this.verifyOwnership(data.enrollmentId, userId);
      const weekNumber = this.getWeekNumber(enrollment);

      const existing = await this.logRepo.findOne({
        where: { enrollmentId: data.enrollmentId, candidateId },
      });

      if (!existing) {
        const newLog = this.logRepo.create({ ...data, userId, weekNumber, candidateId });
        const saved = await this.logRepo.save(newLog);
        this.logger.debug(`Created new activity log: ${(saved as any).id}`);

        try {
          await this.handleCandidateLock(candidateId, data.enrollmentId, data.pipelineStage);
        } catch (lockErr) {
          this.logger.warn(`handleCandidateLock failed: ${lockErr.message}`);
          // Don't block on lock failures
        }
        return saved;
      }

      // Merge — never overwrite with undefined/null
      Object.keys(data).forEach(k => {
        if (data[k] !== undefined && data[k] !== null) (existing as any)[k] = data[k];
      });
      const saved = await this.logRepo.save(existing);
      this.logger.debug(`Updated activity log: ${(existing as any).id}`);

      try {
        await this.handleCandidateLock(candidateId, data.enrollmentId, data.pipelineStage);
      } catch (lockErr) {
        this.logger.warn(`handleCandidateLock failed: ${lockErr.message}`);
        // Don't block on lock failures
      }
      return saved;
    } catch (err) {
      this.logger.error(`upsertLog error: ${err.message}`, err.stack);
      throw err;
    }
  }

  // ── Admin: cross-intern leaderboard ──────────────────────────────────────────

  async getAdminLeaderboard(period: string) {
    let dateFilter = '';
    const now = new Date();
    if (period === 'today') {
      dateFilter = `AND l."callDate" = '${now.toISOString().split('T')[0]}'`;
    } else if (period === 'week') {
      const d = new Date(now); d.setDate(d.getDate() - 7);
      dateFilter = `AND l."callDate" >= '${d.toISOString().split('T')[0]}'`;
    } else if (period === 'month') {
      const d = new Date(now); d.setDate(d.getDate() - 30);
      dateFilter = `AND l."callDate" >= '${d.toISOString().split('T')[0]}'`;
    }

    const sql = `
      SELECT
        e.id                                                              AS "enrollmentId",
        u."firstName",
        u."lastName",
        u.email,
        UPPER(b.domain::text) || '-' || UPPER(b."batchType"::text)       AS "batchCode",
        e.domain,
        e.status,
        COUNT(l.id)                                                       AS "callsMade",
        COUNT(l.id) FILTER (WHERE l."callStatus" = 'connected')          AS "connected",
        COUNT(l.id) FILTER (WHERE l."interestStatus" = 'yes')            AS "interested",
        COUNT(l.id) FILTER (WHERE l."pipelineStage" IN (
          'submitted','shortlisted','interview_r1','interview_r2',
          'final_round','selected','offer_released','offer_accepted','joined'
        ))                                                                AS "submitted",
        COUNT(l.id) FILTER (WHERE l."pipelineStage" IN (
          'interview_r1','interview_r2','final_round',
          'selected','offer_released','offer_accepted','joined'
        ))                                                                AS "interviews",
        COUNT(l.id) FILTER (WHERE l."pipelineStage" IN (
          'selected','offer_released','offer_accepted','joined'
        ))                                                                AS "selected",
        COUNT(l.id) FILTER (
          WHERE l."joiningStatus" = 'joined' OR l."pipelineStage" = 'joined'
        )                                                                 AS "joined",
        COALESCE(MAX(sig.signups), 0)                                    AS "signups"
      FROM internship_enrollments e
      JOIN users u ON e."userId" = u.id
      LEFT JOIN batches b ON e."batchId" = b.id
      LEFT JOIN intern_activity_logs l ON l."enrollmentId" = e.id ${dateFilter}
      LEFT JOIN (
        SELECT enrollment_id::text, COUNT(*) AS signups
        FROM candidate_signup_tokens
        WHERE used_at IS NOT NULL
        GROUP BY enrollment_id
      ) sig ON sig.enrollment_id = e.id::text
      WHERE e.status = 'active'
      GROUP BY e.id, u."firstName", u."lastName", u.email, b.domain, b."batchType", e.domain, e.status
      ORDER BY "joined" DESC, "interviews" DESC, "signups" DESC, "callsMade" DESC
    `;

    const rows: any[] = await this.logRepo.manager.query(sql);

    return rows.map((r, idx) => ({
      rank: idx + 1,
      enrollmentId: r.enrollmentId,
      name: `${r.firstName || ''} ${r.lastName || ''}`.trim(),
      email: r.email,
      batchCode: r.batchCode || '—',
      domain: r.domain,
      funnel: {
        callsMade:  parseInt(r.callsMade)  || 0,
        connected:  parseInt(r.connected)  || 0,
        interested: parseInt(r.interested) || 0,
        submitted:  parseInt(r.submitted)  || 0,
        interviews: parseInt(r.interviews) || 0,
        selected:   parseInt(r.selected)   || 0,
        joined:     parseInt(r.joined)     || 0,
      },
      signups:         parseInt(r.signups) || 0,
      billingEstimate: (parseInt(r.joined) || 0) * 2000,
    }));
  }

  // ── Intern performance summary (all-time or filtered by period) ─────────────

  async getPerformanceSummary(enrollmentId: string, userId: number, period: string) {
    await this.verifyOwnership(enrollmentId, userId);

    // Build date filter based on period
    let fromDate: string | null = null;
    const now = new Date();
    if (period === 'today') {
      fromDate = now.toISOString().split('T')[0];
    } else if (period === 'week') {
      const d = new Date(now); d.setDate(d.getDate() - 7);
      fromDate = d.toISOString().split('T')[0];
    } else if (period === 'month') {
      const d = new Date(now); d.setDate(d.getDate() - 30);
      fromDate = d.toISOString().split('T')[0];
    }

    let qb = this.logRepo.createQueryBuilder('l')
      .where('l.enrollmentId = :enrollmentId', { enrollmentId });
    if (fromDate) qb = qb.andWhere('l.callDate >= :fromDate', { fromDate });
    const logs = await qb.getMany();

    // ── Funnel counts ──────────────────────────────────────────────────────
    const INTERVIEW_STAGES = ['interview_r1', 'interview_r2', 'final_round', 'selected', 'offer_released', 'offer_accepted', 'joined'];
    const SUBMITTED_STAGES = ['submitted', 'shortlisted', ...INTERVIEW_STAGES];
    const SELECTED_STAGES  = ['selected', 'offer_released', 'offer_accepted', 'joined'];

    const callsMade = logs.length;
    const connected = logs.filter(l => l.callStatus === 'connected').length;
    const interested = logs.filter(l => l.interestStatus === 'yes').length;
    const submitted = logs.filter(l => SUBMITTED_STAGES.includes(l.pipelineStage as string)).length;
    const interviews = logs.filter(l => INTERVIEW_STAGES.includes(l.pipelineStage as string)).length;
    const selected  = logs.filter(l => SELECTED_STAGES.includes(l.pipelineStage as string)).length;
    const joined    = logs.filter(l => l.joiningStatus === 'joined' || l.pipelineStage === 'joined').length;

    // ── Signups: count converted tokens for this enrollment ───────────────
    const signups = await this.tokenRepo.count({
      where: { enrollmentId, usedAt: undefined as any },
    });
    // refine — count only those where usedAt IS NOT NULL
    const signupsCount = await this.tokenRepo
      .createQueryBuilder('t')
      .where('t.enrollmentId = :enrollmentId', { enrollmentId })
      .andWhere('t.usedAt IS NOT NULL')
      .getCount();

    // ── Weekly breakdown (all-time, last 12 weeks) ────────────────────────
    const allLogs = await this.logRepo.find({
      where: { enrollmentId },
      order: { weekNumber: 'ASC' },
    });
    const weekMap: Record<number, { week: number; calls: number; connected: number; interested: number; interviews: number; joined: number }> = {};
    for (const l of allLogs) {
      const w = l.weekNumber;
      if (!weekMap[w]) weekMap[w] = { week: w, calls: 0, connected: 0, interested: 0, interviews: 0, joined: 0 };
      weekMap[w].calls++;
      if (l.callStatus === 'connected') weekMap[w].connected++;
      if (l.interestStatus === 'yes') weekMap[w].interested++;
      if (INTERVIEW_STAGES.includes(l.pipelineStage as string)) weekMap[w].interviews++;
      if (l.joiningStatus === 'joined' || l.pipelineStage === 'joined') weekMap[w].joined++;
    }
    const weeklyBreakdown = Object.values(weekMap).slice(-12);

    // ── Billing estimate: ₹2,000 per joining ─────────────────────────────
    const BILLING_RATE_PER_JOINING = 2000;
    const billingEstimate = joined * BILLING_RATE_PER_JOINING;

    return {
      period,
      funnel: { callsMade, connected, interested, submitted, interviews, selected, joined },
      signups: signupsCount,
      billingEstimate,
      weeklyBreakdown,
    };
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
      'offer_declined', 'talent_pool', 'no_response', 'wrong_number',
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
