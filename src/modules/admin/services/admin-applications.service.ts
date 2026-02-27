import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobApplication, ApplicationStatus } from '../../../entities/job-application.entity';
import { Job } from '../../../entities/job.entity';
import { User } from '../../../entities/user.entity';

export interface AdminApplicationsQuery {
  page?: number;
  limit?: number;
  jobId?: number;
  userId?: number;
  status?: ApplicationStatus | string;
}

export interface AdminApplicationsListResponse {
  applications: JobApplication[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class AdminApplicationsService {
  constructor(
    @InjectRepository(JobApplication)
    private applicationRepository: Repository<JobApplication>,
    @InjectRepository(Job)
    private jobRepository: Repository<Job>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async getApplications(query: AdminApplicationsQuery): Promise<AdminApplicationsListResponse> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const jobId = query.jobId ? Number(query.jobId) : undefined;
    const userId = query.userId ? Number(query.userId) : undefined;
    const status = query.status as ApplicationStatus | undefined;

    const qb = this.applicationRepository
      .createQueryBuilder('app')
      .leftJoinAndSelect('app.job', 'job')
      .leftJoinAndSelect('job.company', 'company')
      .orderBy('app.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (jobId != null) qb.andWhere('app.jobId = :jobId', { jobId });
    if (userId != null) qb.andWhere('app.userId = :userId', { userId });
    if (status) qb.andWhere('app.status = :status', { status });

    const [applications, total] = await qb.getManyAndCount();

    const userIds = [...new Set(applications.map((a) => a.userId).filter(Boolean))];
    let userMap = new Map<number, User>();
    if (userIds.length > 0) {
      const users = await this.userRepository.find({
        where: userIds.map((id) => ({ id })),
        select: ['id', 'firstName', 'lastName', 'email', 'phone'],
      });
      users.forEach((u) => userMap.set(u.id, u));
    }

    const applicationsWithUser = applications.map((app) => {
      const u = userMap.get(app.userId);
      return {
        ...app,
        user: u
          ? {
              id: u.id,
              firstName: u.firstName,
              lastName: u.lastName,
              email: u.email,
              phone: u.phone,
            }
          : null,
      };
    });

    return {
      applications: applicationsWithUser,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getApplicationById(id: number) {
    const app = await this.applicationRepository.findOne({
      where: { id },
      relations: ['job', 'job.company'],
    });
    if (!app) throw new NotFoundException('Application not found');
    const user = await this.userRepository.findOne({
      where: { id: app.userId },
      select: ['id', 'firstName', 'lastName', 'email', 'phone', 'createdAt'],
    });
    return { ...app, user: user ?? null };
  }

  async updateApplicationStatus(id: number, status: ApplicationStatus) {
    const app = await this.applicationRepository.findOne({ where: { id } });
    if (!app) throw new NotFoundException('Application not found');
    app.status = status;
    await this.applicationRepository.save(app);
    return this.getApplicationById(id);
  }

  async deleteApplication(id: number): Promise<{ success: boolean; message: string }> {
    const app = await this.applicationRepository.findOne({ where: { id } });
    if (!app) throw new NotFoundException('Application not found');

    const jobId = app.jobId;
    await this.applicationRepository.remove(app);

    await this.jobRepository.increment({ id: jobId }, 'applicationsCount', -1);

    return { success: true, message: 'Application deleted successfully' };
  }
}
