import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { BatchTask, BatchTaskStatus } from '../../entities/batch-task.entity';
import { TaskAssignment, AssignmentStatus } from '../../entities/task-assignment.entity';
import { InternshipEnrollment, EnrollmentStatus } from '../../entities/internship-enrollment.entity';
import { TrainingCandidate } from '../../entities/training-candidate.entity';
import { InternActivityLog } from '../../entities/intern-activity-log.entity';
import { Job } from '../../entities/job.entity';

@Injectable()
export class BatchTasksService {
  constructor(
    @InjectRepository(BatchTask)
    private taskRepo: Repository<BatchTask>,
    @InjectRepository(TaskAssignment)
    private assignmentRepo: Repository<TaskAssignment>,
    @InjectRepository(InternshipEnrollment)
    private enrollmentRepo: Repository<InternshipEnrollment>,
    @InjectRepository(TrainingCandidate)
    private candidateRepo: Repository<TrainingCandidate>,
    @InjectRepository(InternActivityLog)
    private activityLogRepo: Repository<InternActivityLog>,
    @InjectRepository(Job)
    private jobRepo: Repository<Job>,
  ) {}

  /** All active jobs — for the task wizard job picker.
   *  Jobs with a vacancies array show real city openings in Step 4.
   *  Jobs without vacancies fall back to the candidate-data city list. */
  async getJobsWithVacancies() {
    const jobs = await this.jobRepo
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.company', 'company')
      .where("job.status IN ('active', 'draft')")
      .orderBy('job.createdAt', 'DESC')
      .getMany();

    return jobs.map(j => ({
      id: j.id,
      title: j.title,
      company: j.company?.name ?? null,
      vacancies: j.vacancies ?? [],
      totalOpenings: (j.vacancies ?? []).reduce((s, v) => s + (v.openings || 0), 0),
    }));
  }

  /**
   * Derived fill-rate for a job's vacancies.
   * `filled` is NEVER stored — it's a live COUNT of joined activity logs whose
   * task is linked to this job and whose candidate's city matches the vacancy.
   * Self-correcting: any status change just recomputes. See design doc.
   */
  async getJobFillRate(jobId: number) {
    const job = await this.jobRepo.findOne({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');

    const vacancies = job.vacancies ?? [];

    // One grouped query: joined-count per city for this job
    const rows = await this.activityLogRepo
      .createQueryBuilder('ial')
      .innerJoin(TrainingCandidate, 'tc', 'tc.id = ial.candidateId')
      .innerJoin(BatchTask, 'bt', 'bt.id::text = ial.taskId')
      .select('tc.currentCity', 'city')
      .addSelect('COUNT(*)', 'filled')
      .where('ial.joiningStatus = :joined', { joined: 'joined' })
      .andWhere('bt.jobId = :jobId', { jobId })
      .groupBy('tc.currentCity')
      .getRawMany();

    const filledByCity = new Map<string, number>(
      rows.map(r => [r.city, parseInt(r.filled, 10)]),
    );

    const cities = vacancies.map(v => {
      const filled = filledByCity.get(v.city) ?? 0;
      return {
        city: v.city,
        openings: v.openings,
        filled,
        remaining: Math.max(0, v.openings - filled),
        closed: filled >= v.openings,
      };
    });

    const totalOpenings = cities.reduce((s, c) => s + c.openings, 0);
    const totalFilled = cities.reduce((s, c) => s + c.filled, 0);

    return {
      jobId,
      jobTitle: job.title,
      cities,
      totalOpenings,
      totalFilled,
      totalRemaining: Math.max(0, totalOpenings - totalFilled),
      fillPercent: totalOpenings > 0 ? Math.round((totalFilled / totalOpenings) * 100) : 0,
    };
  }

  /** List tasks for a batch */
  getByBatch(batchId: string) {
    return this.taskRepo.find({
      where: { batchId },
      order: { weekNumber: 'ASC', createdAt: 'ASC' },
    });
  }

  /** List ALL tasks (admin) */
  getAll() {
    return this.taskRepo.find({ order: { createdAt: 'DESC' }, relations: ['batch'] });
  }

  /**
   * Admin creates a task for a batch.
   * Supports rich filtering by company, profile, city
   * and per-intern assignment counts.
   */
  async createTask(data: {
    batchId: string;
    title: string;
    description?: string;
    weekNumber?: number;
    targetCallCount?: number;
    dueDate?: string;
    jobId?: number;
    // Legacy simple mode
    candidatesPerIntern?: number;
    candidateSource?: string;
    candidateCity?: string;
    // Rich mode
    companies?: string[];
    profiles?: string[];
    cities?: string[];
    assignments?: { enrollmentId: string; count: number }[];
  }) {
    // Create task
    const task = this.taskRepo.create({
      batchId: data.batchId,
      title: data.title,
      description: data.description,
      weekNumber: data.weekNumber ?? 1,
      targetCallCount: data.targetCallCount ?? 30,
      dueDate: data.dueDate,
      jobId: data.jobId,
      candidateSource: data.candidateSource,
      candidateCity: data.candidateCity,
    });
    await this.taskRepo.save(task);

    let totalAssigned = 0;

    if (data.assignments && data.assignments.length > 0) {
      // Rich mode: per-intern counts with company/profile/city filters
      for (const { enrollmentId, count } of data.assignments) {
        if (count <= 0) continue;
        const assigned = await this.assignCandidatesToEnrollmentRich(
          enrollmentId,
          task.id,
          count,
          data.companies,
          data.profiles,
          data.cities,
        );
        totalAssigned += assigned;
      }
    } else {
      // Simple mode: same count to all interns in batch
      const perIntern = data.candidatesPerIntern ?? data.targetCallCount ?? 30;
      const enrollments = await this.enrollmentRepo.find({
        where: { batchId: data.batchId, status: EnrollmentStatus.ACTIVE },
      });
      for (const enrollment of enrollments) {
        const assigned = await this.assignCandidatesToEnrollment(
          enrollment.id, task.id, perIntern, data.candidateSource, data.candidateCity,
        );
        totalAssigned += assigned;
      }
    }

    const enrollmentsUpdated = data.assignments
      ? data.assignments.filter(a => a.count > 0).length
      : (await this.enrollmentRepo.count({ where: { batchId: data.batchId, status: EnrollmentStatus.ACTIVE } }));

    return { task, enrollmentsUpdated, totalAssigned };
  }

  /** Admin manually assigns N more candidates to a specific enrollment */
  async assignToEnrollment(
    enrollmentId: string,
    count: number,
    taskId?: string,
    candidateSource?: string,
    candidateCity?: string,
  ) {
    const enrollment = await this.enrollmentRepo.findOne({ where: { id: enrollmentId } });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    const assigned = await this.assignCandidatesToEnrollment(
      enrollmentId, taskId ?? null, count, candidateSource, candidateCity,
    );
    return { enrollmentId, assigned };
  }

  /** Rich assignment: filter by company + profile + city */
  private async assignCandidatesToEnrollmentRich(
    enrollmentId: string,
    taskId: string | null,
    count: number,
    companies?: string[],
    profiles?: string[],
    cities?: string[],
  ): Promise<number> {
    const existing = await this.assignmentRepo
      .createQueryBuilder('a').select('a.candidateId')
      .where('a.enrollmentId = :enrollmentId', { enrollmentId })
      .getRawMany();
    const usedIds = existing.map(r => r.a_candidateId);

    const qb = this.candidateRepo.createQueryBuilder('c').orderBy('RANDOM()').limit(count);
    if (usedIds.length > 0) qb.where('c.id NOT IN (:...usedIds)', { usedIds });
    if (companies?.length) qb.andWhere('c.currentCompany IN (:...companies)', { companies });
    if (profiles?.length) qb.andWhere('c.currentDesignation IN (:...profiles)', { profiles });
    if (cities?.length) qb.andWhere('c.currentCity IN (:...cities)', { cities });

    const candidates = await qb.getMany();
    if (candidates.length === 0) return 0;

    const rows = candidates.map(c => this.assignmentRepo.create({
      enrollmentId, candidateId: c.id, taskId: taskId ?? undefined, status: AssignmentStatus.PENDING,
    }));
    await this.assignmentRepo.save(rows);
    return rows.length;
  }

  /** Core assignment logic: pick N unassigned candidates, create TaskAssignment rows */
  private async assignCandidatesToEnrollment(
    enrollmentId: string,
    taskId: string | null,
    count: number,
    source?: string,
    city?: string,
  ): Promise<number> {
    // Get already assigned candidate IDs for this enrollment (avoid duplicates)
    const existing = await this.assignmentRepo
      .createQueryBuilder('a')
      .select('a.candidateId')
      .where('a.enrollmentId = :enrollmentId', { enrollmentId })
      .getRawMany();
    const usedIds = existing.map(r => r.a_candidateId);

    // Build query for available candidates
    const qb = this.candidateRepo.createQueryBuilder('c').orderBy('RANDOM()').limit(count);

    if (usedIds.length > 0) qb.where('c.id NOT IN (:...usedIds)', { usedIds });
    if (source) qb.andWhere('c.source = :source', { source });
    if (city) qb.andWhere('c.currentCity ILIKE :city', { city: `%${city}%` });

    const candidates = await qb.getMany();
    if (candidates.length === 0) return 0;

    const rows = candidates.map(c =>
      this.assignmentRepo.create({
        enrollmentId,
        candidateId: c.id,
        taskId: taskId ?? undefined,
        status: AssignmentStatus.PENDING,
      }),
    );
    await this.assignmentRepo.save(rows);
    return rows.length;
  }

  /** Intern: get tasks for their enrollment (via batchId) */
  async getMyTasks(enrollmentId: string, userId: number) {
    const enrollment = await this.enrollmentRepo.findOne({ where: { id: enrollmentId, userId } });
    if (!enrollment) throw new NotFoundException('Enrollment not found');

    const tasks = await this.taskRepo.find({
      where: { batchId: enrollment.batchId },
      order: { weekNumber: 'ASC', createdAt: 'ASC' },
    });

    // For each task, get intern's assignment progress + (if linked) job vacancy context
    const result = await Promise.all(
      tasks.map(async (task) => {
        const total = await this.assignmentRepo.count({ where: { enrollmentId, taskId: task.id } });
        const called = await this.assignmentRepo.count({
          where: { enrollmentId, taskId: task.id, status: AssignmentStatus.CALLED },
        });

        let job: any = null;
        if (task.jobId) {
          const fullJob = await this.jobRepo.findOne({
            where: { id: task.jobId },
            relations: ['company'],
          });
          if (fullJob) {
            const fill = await this.getJobFillRate(task.jobId);
            job = {
              id: fullJob.id,
              title: fullJob.title,
              company: fullJob.company?.name ?? null,
              cities: fill.cities, // { city, openings, filled, remaining, closed }
              totalOpenings: fill.totalOpenings,
              totalFilled: fill.totalFilled,
              totalRemaining: fill.totalRemaining,
              fillPercent: fill.fillPercent,
            };
          }
        }

        return { ...task, totalAssigned: total, calledCount: called, job };
      }),
    );

    // Only show tasks where this intern actually has candidates assigned.
    // Tasks with 0 assignments mean admin excluded this intern from that task.
    return result.filter(t => t.totalAssigned > 0);
  }

  /**
   * Intern-side: remaining openings per city for a task's linked job.
   * Returns a city → remaining map so the candidates page can show
   * "X openings left in <city>" badges without N round-trips.
   */
  async getTaskCityRemaining(enrollmentId: string, userId: number, taskId: string) {
    const enrollment = await this.enrollmentRepo.findOne({ where: { id: enrollmentId, userId } });
    if (!enrollment) throw new NotFoundException('Enrollment not found');
    const task = await this.taskRepo.findOne({ where: { id: taskId } });
    if (!task) throw new NotFoundException('Task not found');
    if (!task.jobId) return { jobLinked: false, cities: {} as Record<string, number> };

    const fill = await this.getJobFillRate(task.jobId);
    const cities: Record<string, number> = {};
    for (const c of fill.cities) cities[c.city] = c.remaining;
    return {
      jobLinked: true,
      jobId: task.jobId,
      cities,
      totalRemaining: fill.totalRemaining,
      totalOpenings: fill.totalOpenings,
    };
  }

  /** Intern: get assigned candidates for a task (or all unlinked assignments) */
  async getMyCandidates(enrollmentId: string, userId: number, taskId?: string, page = 1, search?: string) {
    const enrollment = await this.enrollmentRepo.findOne({ where: { id: enrollmentId, userId } });
    if (!enrollment) throw new NotFoundException('Enrollment not found');

    const take = 30;
    const qb = this.assignmentRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.candidate', 'c')
      .where('a.enrollmentId = :enrollmentId', { enrollmentId })
      .orderBy('a.assignedAt', 'ASC');

    if (taskId) qb.andWhere('a.taskId = :taskId', { taskId });
    if (search) {
      qb.andWhere('(c.name ILIKE :s OR c.phone ILIKE :s)', { s: `%${search}%` });
    }

    const [assignments, total] = await qb.skip((page - 1) * take).take(take).getManyAndCount();
    return { assignments, total, page, totalPages: Math.ceil(total / take) };
  }

  /** Mark an assignment as called/skipped */
  async updateAssignmentStatus(assignmentId: string, enrollmentId: string, status: AssignmentStatus) {
    const a = await this.assignmentRepo.findOne({ where: { id: assignmentId, enrollmentId } });
    if (!a) throw new NotFoundException('Assignment not found');
    a.status = status;
    return this.assignmentRepo.save(a);
  }

  async updateTask(id: string, data: Partial<BatchTask>) {
    await this.taskRepo.update(id, data);
    return this.taskRepo.findOne({ where: { id } });
  }

  async deleteTask(id: string) {
    await this.taskRepo.delete(id);
    return { deleted: true };
  }
}
