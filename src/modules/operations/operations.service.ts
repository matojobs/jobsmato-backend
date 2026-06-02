import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { InternActivityLog, PipelineStage } from '../../entities/intern-activity-log.entity';

const OPS_STAGES = [
  PipelineStage.SUBMITTED, PipelineStage.SHORTLISTED,
  PipelineStage.INTERVIEW_R1, PipelineStage.INTERVIEW_R2, PipelineStage.FINAL_ROUND,
  PipelineStage.SELECTED, PipelineStage.OFFER_RELEASED, PipelineStage.OFFER_ACCEPTED,
  PipelineStage.JOINED, PipelineStage.CLIENT_REJECTED, PipelineStage.INTERVIEW_FAILED,
  PipelineStage.OFFER_DECLINED,
];

@Injectable()
export class OperationsService {
  constructor(
    @InjectRepository(InternActivityLog)
    private logRepo: Repository<InternActivityLog>,
  ) {}

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
    clientName: string; interviewMode: string; interviewLocation?: string; opsNotes?: string;
  }) {
    const log = await this.logRepo.findOne({ where: { id: logId } });
    if (!log) throw new NotFoundException('Log not found');

    log.interviewDate = dto.interviewDate;
    log.interviewTime = dto.interviewTime ?? log.interviewTime;
    log.clientName = dto.clientName;
    log.interviewMode = dto.interviewMode;
    log.interviewLocation = dto.interviewLocation ?? log.interviewLocation;
    log.opsNotes = dto.opsNotes ?? log.opsNotes;
    log.interviewScheduled = true;
    log.pipelineStage = PipelineStage.INTERVIEW_R1;

    await this.logRepo.save(log);
    return this.formatLog(log);
  }

  async updateOutcome(logId: string, dto: {
    outcome: 'selected' | 'client_rejected' | 'interview_failed' | 'offer_accepted' | 'joined';
    clientFeedback?: string; opsNotes?: string;
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

    await this.logRepo.save(log);
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

  private formatLog(l: InternActivityLog) {
    return {
      id: l.id,
      pipelineStage: l.pipelineStage,
      callDate: l.callDate,
      updatedAt: l.updatedAt,
      cvUrl: l.cvUrl,
      interviewDate: l.interviewDate,
      interviewTime: l.interviewTime,
      clientName: l.clientName,
      interviewMode: l.interviewMode,
      interviewLocation: l.interviewLocation,
      clientFeedback: l.clientFeedback,
      opsNotes: l.opsNotes,
      interviewScheduled: l.interviewScheduled,
      notes: l.notes,
      candidate: l.candidate ? {
        id: l.candidate.id,
        name: l.candidate.candidateName,
        phone: l.candidate.phone,
        jobRole: l.candidate.jobRole,
        companyName: l.candidate.companyName,
        location: l.candidate.location,
        experience: l.candidate.totalExperience,
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
