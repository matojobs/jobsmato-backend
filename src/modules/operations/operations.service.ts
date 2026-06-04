import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { InternActivityLog, PipelineStage } from '../../entities/intern-activity-log.entity';
import { TrainingCandidate } from '../../entities/training-candidate.entity';
import { Company } from '../../entities/company.entity';

const OPS_STAGES = [
  PipelineStage.SUBMITTED, PipelineStage.SHORTLISTED,
  PipelineStage.INTERVIEW_R1, PipelineStage.INTERVIEW_R2, PipelineStage.FINAL_ROUND,
  PipelineStage.SELECTED, PipelineStage.OFFER_RELEASED, PipelineStage.OFFER_ACCEPTED,
  PipelineStage.JOINED, PipelineStage.CLIENT_REJECTED, PipelineStage.INTERVIEW_FAILED,
  PipelineStage.OFFER_DECLINED,
];

/** Outcomes that release the candidate back to the talent pool */
const REJECTION_OUTCOMES = ['client_rejected', 'interview_failed', 'offer_declined'];

@Injectable()
export class OperationsService {
  constructor(
    @InjectRepository(InternActivityLog)
    private logRepo: Repository<InternActivityLog>,
    @InjectRepository(TrainingCandidate)
    private candidateRepo: Repository<TrainingCandidate>,
    @InjectRepository(Company)
    private companyRepo: Repository<Company>,
  ) {}

  async getClientCompanies(): Promise<string[]> {
    const rows = await this.companyRepo
      .createQueryBuilder('c')
      .select('c.name', 'name')
      .where('c.name IS NOT NULL')
      .orderBy('c.name', 'ASC')
      .getRawMany();
    return rows.map(r => r.name).filter(Boolean);
  }

  async getPipeline(query: {
    stage?: string; domain?: string; enrollmentId?: string;
    page?: number; limit?: number; search?: string;
  }) {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 30, 100);

    const stages = query.stage
      ? query.stage.split(',') as PipelineStage[]
      : OPS_STAGES;

    const qb = this.logRepo.createQueryBuilder('log')
      .leftJoinAndSelect('log.candidate', 'candidate')
      .leftJoinAndSelect('log.enrollment', 'enrollment')
      .leftJoinAndSelect('enrollment.user', 'user')
      .where('log.pipelineStage IN (:...stages)', { stages })
      .orderBy('log.updatedAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.enrollmentId) {
      qb.andWhere('log.enrollmentId = :enrollmentId', { enrollmentId: query.enrollmentId });
    }

    if (query.search) {
      qb.andWhere(
        '(candidate.candidateName ILIKE :s OR candidate.phone ILIKE :s OR log.clientName ILIKE :s)',
        { s: `%${query.search}%` },
      );
    }

    const [logs, total] = await qb.getManyAndCount();

    return {
      data: logs.map(l => this.formatLog(l)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getLog(logId: string) {
    const log = await this.logRepo.findOne({
      where: { id: logId },
      relations: ['candidate', 'enrollment', 'enrollment.user'],
    });
    if (!log) throw new NotFoundException('Log not found');
    return this.formatLog(log);
  }

  async scheduleInterview(logId: string, dto: {
    interviewDate: string; interviewTime?: string;
    clientName: string; interviewMode: string;
    interviewLocation?: string; interviewLink?: string;
    opsNotes?: string; roundNumber?: number;
  }) {
    const log = await this.logRepo.findOne({ where: { id: logId } });
    if (!log) throw new NotFoundException('Log not found');

    const round = dto.roundNumber ?? 1;
    const stageByRound = (r: number): PipelineStage => {
      if (r === 1) return PipelineStage.INTERVIEW_R1;
      if (r === 2) return PipelineStage.INTERVIEW_R2;
      return PipelineStage.FINAL_ROUND;
    };

    log.interviewDate      = dto.interviewDate;
    log.interviewTime      = dto.interviewTime      ?? log.interviewTime;
    log.clientName         = dto.clientName;
    log.interviewMode      = dto.interviewMode;
    log.interviewLocation  = dto.interviewLocation  ?? log.interviewLocation;
    log.interviewLink      = dto.interviewLink       ?? log.interviewLink;
    log.opsNotes           = dto.opsNotes           ?? log.opsNotes;
    log.interviewScheduled = true;
    log.interviewRound     = round;
    log.pipelineStage      = stageByRound(round);
    log.rescheduleRequested = false;  // clear any pending reschedule request
    log.rescheduleReason   = null as any;

    await this.logRepo.save(log);
    return this.formatLog(log);
  }

  /**
   * Ops marks result for a completed interview round.
   * - pass: candidate cleared this round → ops can schedule next or mark selected
   * - fail / dna: candidate failed or did not attend → move to interview_failed
   * - next_round: schedule the next interview round in one shot
   */
  async markRoundResult(logId: string, dto: {
    result: 'pass' | 'fail' | 'dna';
    clientFeedback?: string; opsNotes?: string;
    // If result=pass and ops wants to schedule next round immediately:
    nextRound?: { roundNumber: number; interviewDate: string; interviewTime?: string;
                  clientName: string; interviewMode: string;
                  interviewLocation?: string; interviewLink?: string; };
    // If result=pass and candidate is selected:
    selectedDirectly?: boolean;
    expectedJoiningDate?: string;
  }) {
    const log = await this.logRepo.findOne({ where: { id: logId } });
    if (!log) throw new NotFoundException('Log not found');

    if (dto.result === 'fail' || dto.result === 'dna') {
      log.pipelineStage  = PipelineStage.INTERVIEW_FAILED;
      log.clientFeedback = dto.clientFeedback ?? log.clientFeedback;
      log.opsNotes       = dto.opsNotes       ?? log.opsNotes;
    } else if (dto.result === 'pass') {
      if (dto.selectedDirectly) {
        log.pipelineStage = PipelineStage.SELECTED;
        if (dto.expectedJoiningDate) (log as any).expectedJoiningDate = dto.expectedJoiningDate;
      } else if (dto.nextRound) {
        const nr = dto.nextRound;
        const stageByRound = (r: number): PipelineStage => {
          if (r === 1) return PipelineStage.INTERVIEW_R1;
          if (r === 2) return PipelineStage.INTERVIEW_R2;
          return PipelineStage.FINAL_ROUND;
        };
        log.interviewDate      = nr.interviewDate;
        log.interviewTime      = nr.interviewTime      ?? log.interviewTime;
        log.clientName         = nr.clientName;
        log.interviewMode      = nr.interviewMode;
        log.interviewLocation  = nr.interviewLocation  ?? log.interviewLocation;
        log.interviewLink      = nr.interviewLink       ?? null as any;
        log.interviewRound     = nr.roundNumber;
        log.pipelineStage      = stageByRound(nr.roundNumber);
        log.rescheduleRequested = false;
        log.rescheduleReason   = null as any;
      }
      // if pass but no next round / selected → stays at current stage, ops decides later
      log.clientFeedback = dto.clientFeedback ?? log.clientFeedback;
      log.opsNotes       = dto.opsNotes       ?? log.opsNotes;
    }

    await this.logRepo.save(log);

    // If failed → release candidate back to talent pool
    if (dto.result === 'fail' || dto.result === 'dna') {
      if (log.candidateId) {
        await this.candidateRepo.update(log.candidateId, {
          status: 'talent_pool',
          lockedByEnrollmentId: null as any,
          lockedAt: null as any,
        });
      }
    }

    return this.formatLog(log);
  }

  async updateOutcome(logId: string, dto: {
    outcome: 'selected' | 'client_rejected' | 'interview_failed' | 'offer_accepted' | 'joined';
    clientFeedback?: string; opsNotes?: string;
    expectedJoiningDate?: string; joiningDate?: string;
  }) {
    const log = await this.logRepo.findOne({ where: { id: logId } });
    if (!log) throw new NotFoundException('Log not found');

    const stageMap: Record<string, PipelineStage> = {
      selected: PipelineStage.SELECTED,
      client_rejected: PipelineStage.CLIENT_REJECTED,
      interview_failed: PipelineStage.INTERVIEW_FAILED,
      offer_accepted: PipelineStage.OFFER_ACCEPTED,
      joined: PipelineStage.JOINED,
    };

    log.pipelineStage = stageMap[dto.outcome] ?? log.pipelineStage;
    log.clientFeedback = dto.clientFeedback ?? log.clientFeedback;
    log.opsNotes = dto.opsNotes ?? log.opsNotes;
    if (dto.expectedJoiningDate) (log as any).expectedJoiningDate = dto.expectedJoiningDate;
    if (dto.joiningDate) (log as any).joiningDate = dto.joiningDate;

    await this.logRepo.save(log);

    // ── Update training_candidate status based on outcome ────────────────────
    if (log.candidateId) {
      if (REJECTION_OUTCOMES.includes(dto.outcome)) {
        // Rejected → return to talent pool + release lock so another intern can pitch them
        await this.candidateRepo.update(log.candidateId, {
          status: 'talent_pool',
          lockedByEnrollmentId: null as any,
          lockedAt: null as any,
        });
      } else if (dto.outcome === 'joined') {
        // Joined → mark as hired (remove from callable pool)
        await this.candidateRepo.update(log.candidateId, {
          status: 'hired',
        });
      }
      // 'selected' / 'offer_accepted' → keep locked (still in process), no status change yet
    }

    return this.formatLog(log);
  }

  async getStats() {
    const today = new Date().toISOString().split('T')[0];
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const [submittedToday, interviewsThisWeek, pendingOutcome, selectedTotal] = await Promise.all([
      this.logRepo.count({
        where: { pipelineStage: PipelineStage.SUBMITTED, updatedAt: new Date(today) as any },
      }),
      this.logRepo.createQueryBuilder('l')
        .where('l.pipelineStage IN (:...s)', { s: [PipelineStage.INTERVIEW_R1, PipelineStage.INTERVIEW_R2, PipelineStage.FINAL_ROUND] })
        .andWhere('l.interviewDate >= :w', { w: weekStartStr })
        .getCount(),
      this.logRepo.count({ where: { pipelineStage: In([PipelineStage.SHORTLISTED, PipelineStage.SUBMITTED]) } }),
      this.logRepo.count({ where: { pipelineStage: PipelineStage.SELECTED } }),
    ]);

    // Recent pipeline activity (last 20)
    const recent = await this.logRepo.createQueryBuilder('log')
      .leftJoinAndSelect('log.candidate', 'candidate')
      .leftJoinAndSelect('log.enrollment', 'enrollment')
      .leftJoinAndSelect('enrollment.user', 'user')
      .where('log.pipelineStage IN (:...stages)', { stages: OPS_STAGES })
      .orderBy('log.updatedAt', 'DESC')
      .take(20)
      .getMany();

    return {
      submittedToday,
      interviewsThisWeek,
      pendingOutcome,
      selectedTotal,
      recentActivity: recent.map(l => this.formatLog(l)),
    };
  }

  /** Enhanced stats for ops dashboard — adds today's interviews + action queue */
  async getDashboardStats() {
    const today = new Date().toISOString().split('T')[0];
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const [pendingSchedule, interviewsToday, pendingOutcome, selectedThisWeek, joinedTotal] = await Promise.all([
      // Awaiting interview schedule (submitted or shortlisted, no interview date set)
      this.logRepo.createQueryBuilder('l')
        .where('l.pipelineStage IN (:...s)', { s: [PipelineStage.SUBMITTED, PipelineStage.SHORTLISTED] })
        .getCount(),
      // Interviews today
      this.logRepo.createQueryBuilder('l')
        .where('l.pipelineStage IN (:...s)', { s: [PipelineStage.INTERVIEW_R1, PipelineStage.INTERVIEW_R2, PipelineStage.FINAL_ROUND] })
        .andWhere('l.interviewDate = :today', { today })
        .getCount(),
      // Interview done but outcome not set (past interview date, still in interview stage)
      this.logRepo.createQueryBuilder('l')
        .where('l.pipelineStage IN (:...s)', { s: [PipelineStage.INTERVIEW_R1, PipelineStage.INTERVIEW_R2, PipelineStage.FINAL_ROUND] })
        .andWhere('l.interviewDate < :today', { today })
        .getCount(),
      this.logRepo.createQueryBuilder('l')
        .where('l.pipelineStage = :s', { s: PipelineStage.SELECTED })
        .andWhere('l.updatedAt >= :w', { w: weekStartStr })
        .getCount(),
      this.logRepo.count({ where: { pipelineStage: PipelineStage.JOINED } }),
    ]);

    // Today's interviews with candidate details
    const todayInterviews = await this.logRepo.createQueryBuilder('log')
      .leftJoinAndSelect('log.candidate', 'candidate')
      .leftJoinAndSelect('log.enrollment', 'enrollment')
      .leftJoinAndSelect('enrollment.user', 'user')
      .where('log.pipelineStage IN (:...s)', { s: [PipelineStage.INTERVIEW_R1, PipelineStage.INTERVIEW_R2, PipelineStage.FINAL_ROUND] })
      .andWhere('log.interviewDate = :today', { today })
      .orderBy('log.interviewTime', 'ASC')
      .getMany();

    // Needs action: past interview date with no outcome
    const needsOutcome = await this.logRepo.createQueryBuilder('log')
      .leftJoinAndSelect('log.candidate', 'candidate')
      .leftJoinAndSelect('log.enrollment', 'enrollment')
      .leftJoinAndSelect('enrollment.user', 'user')
      .where('log.pipelineStage IN (:...s)', { s: [PipelineStage.INTERVIEW_R1, PipelineStage.INTERVIEW_R2, PipelineStage.FINAL_ROUND] })
      .andWhere('log.interviewDate < :today', { today })
      .orderBy('log.interviewDate', 'ASC')
      .take(10)
      .getMany();

    // New submissions awaiting review
    const newSubmissions = await this.logRepo.createQueryBuilder('log')
      .leftJoinAndSelect('log.candidate', 'candidate')
      .leftJoinAndSelect('log.enrollment', 'enrollment')
      .leftJoinAndSelect('enrollment.user', 'user')
      .where('log.pipelineStage IN (:...s)', { s: [PipelineStage.SUBMITTED, PipelineStage.SHORTLISTED] })
      .orderBy('log.updatedAt', 'DESC')
      .take(10)
      .getMany();

    return {
      kpis: { pendingSchedule, interviewsToday, pendingOutcome, selectedThisWeek, joinedTotal },
      todayInterviews: todayInterviews.map(l => this.formatLog(l)),
      needsOutcome: needsOutcome.map(l => this.formatLog(l)),
      newSubmissions: newSubmissions.map(l => this.formatLog(l)),
    };
  }

  private formatLog(l: InternActivityLog) {
    return {
      id: l.id,
      pipelineStage: l.pipelineStage,
      callDate: l.callDate,
      updatedAt: l.updatedAt,
      cvUrl: l.cvUrl,
      linkedIn: (l as any).linkedIn,
      interviewRound: l.interviewRound,
      interviewDate: l.interviewDate,
      interviewTime: (l as any).interviewTime,
      interviewLink: l.interviewLink,
      clientName: l.clientName,
      interviewMode: l.interviewMode,
      interviewLocation: l.interviewLocation,
      rescheduleRequested: l.rescheduleRequested,
      rescheduleReason: l.rescheduleReason,
      clientFeedback: l.clientFeedback,
      opsNotes: l.opsNotes,
      interviewScheduled: l.interviewScheduled,
      notes: l.notes,
      expectedJoiningDate: (l as any).expectedJoiningDate,
      joiningDate: (l as any).joiningDate,
      candidate: l.candidate ? {
        id: l.candidate.id,
        name: l.candidate.candidateName,
        phone: l.candidate.phone,
        jobRole: l.candidate.jobRole,
        companyName: l.candidate.companyName,
        currentDesignation: l.candidate.currentDesignation,
        currentCity: l.candidate.currentCity,
        experience: l.candidate.experience,
        currentCTC: l.candidate.currentCTC,
        expectedCTC: l.candidate.expectedCTC,
        skills: l.candidate.skills,
        linkedIn: l.candidate.linkedIn,
        location: l.candidate.location,
      } : null,
      intern: l.enrollment?.user ? {
        id: l.enrollment.user.id,
        name: `${l.enrollment.user.firstName} ${l.enrollment.user.lastName}`,
        email: l.enrollment.user.email,
      } : null,
      enrollmentId: l.enrollmentId,
    };
  }
}
