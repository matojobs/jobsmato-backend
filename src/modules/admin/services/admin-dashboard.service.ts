import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { User } from '../../../entities/user.entity';
import { Job, JobStatus } from '../../../entities/job.entity';
import { Company } from '../../../entities/company.entity';
import { AdminActionLog } from '../../../entities/admin-action-log.entity';
import { JobApplication, ApplicationStatus } from '../../../entities/job-application.entity';

export interface DashboardStats {
  totalUsers: number;
  totalJobs: number;
  totalCompanies: number;
  totalApplications: number;
  activeJobs: number;
  pendingApplications: number;
  newUsersToday: number;
  newJobsToday: number;
  userGrowthRate: number;
  jobPostingRate: number;
  applicationRate: number;
}

export interface TimeSeriesData {
  date: string;
  value: number;
}

export interface EngagementData {
  metric: string;
  value: number;
  change: number;
}

@Injectable()
export class AdminDashboardService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Job)
    private jobRepository: Repository<Job>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    @InjectRepository(AdminActionLog)
    private adminActionLogRepository: Repository<AdminActionLog>,
    @InjectRepository(JobApplication)
    private applicationRepository: Repository<JobApplication>,
  ) {}

  async getDashboardStats(): Promise<DashboardStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalJobs,
      totalCompanies,
      totalApplications,
      pendingApplications,
      activeJobs,
      newUsersToday,
      newJobsToday,
    ] = await Promise.all([
      this.userRepository.count(),
      this.jobRepository.count(),
      this.companyRepository.count(),
      this.applicationRepository.count(),
      this.applicationRepository.count({ where: { status: ApplicationStatus.PENDING } }),
      this.jobRepository.count({ where: { status: JobStatus.ACTIVE } }),
      this.userRepository.count({
        where: {
          createdAt: MoreThanOrEqual(today),
        },
      }),
      this.jobRepository.count({
        where: {
          createdAt: MoreThanOrEqual(today),
        },
      }),
    ]);

    return {
      totalUsers,
      totalJobs,
      totalCompanies,
      totalApplications,
      activeJobs,
      pendingApplications,
      newUsersToday,
      newJobsToday,
      userGrowthRate: await this.calculateUserGrowthRate(),
      jobPostingRate: await this.calculateJobPostingRate(),
      applicationRate: await this.calculateApplicationRate(),
    };
  }

  async getUserAnalytics(days: number = 30): Promise<{
    userGrowth: TimeSeriesData[];
    userEngagement: EngagementData[];
    topUsers: any[];
    userRetention: any[];
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // User growth over time
    const userGrowth = await this.userRepository
      .createQueryBuilder('user')
      .select('DATE(user.createdAt)', 'date')
      .addSelect('COUNT(*)', 'value')
      .where('user.createdAt >= :startDate', { startDate })
      .groupBy('DATE(user.createdAt)')
      .orderBy('DATE(user.createdAt)', 'ASC')
      .getRawMany();

    // Top active users
    const topUsers = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.applications', 'applications')
      .select('user.id', 'id')
      .addSelect('user.firstName', 'firstName')
      .addSelect('user.lastName', 'lastName')
      .addSelect('user.email', 'email')
      .addSelect('COUNT(applications.id)', 'applicationCount')
      .where('user.createdAt >= :startDate', { startDate })
      .groupBy('user.id')
      .orderBy('COUNT(applications.id)', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      userGrowth: userGrowth.map(item => ({
        date: item.date,
        value: parseInt(item.value),
      })),
      userEngagement: [
        { metric: 'Active Users', value: 150, change: 12.5 },
        { metric: 'New Registrations', value: 25, change: 8.3 },
        { metric: 'Email Verified', value: 120, change: 15.2 },
      ],
      topUsers,
      userRetention: [], // Placeholder - implement retention analysis
    };
  }

  async getJobAnalytics(days: number = 30): Promise<{
    jobPostingTrends: TimeSeriesData[];
    categoryDistribution: any[];
    topCompanies: any[];
    jobPerformance: any[];
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Job posting trends
    const jobPostingTrends = await this.jobRepository
      .createQueryBuilder('job')
      .select('DATE(job.createdAt)', 'date')
      .addSelect('COUNT(*)', 'value')
      .where('job.createdAt >= :startDate', { startDate })
      .groupBy('DATE(job.createdAt)')
      .orderBy('DATE(job.createdAt)', 'ASC')
      .getRawMany();

    // Category distribution
    const categoryDistribution = await this.jobRepository
      .createQueryBuilder('job')
      .select('job.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .where('job.createdAt >= :startDate', { startDate })
      .groupBy('job.category')
      .orderBy('COUNT(*)', 'DESC')
      .getRawMany();

    // Top companies by job count
    const topCompanies = await this.companyRepository
      .createQueryBuilder('company')
      .leftJoinAndSelect('company.jobs', 'jobs')
      .select('company.id', 'id')
      .addSelect('company.name', 'name')
      .addSelect('COUNT(jobs.id)', 'jobCount')
      .where('company.createdAt >= :startDate', { startDate })
      .groupBy('company.id')
      .orderBy('COUNT(jobs.id)', 'DESC')
      .limit(10)
      .getRawMany();

    const jobPerformance = await this.jobRepository
      .createQueryBuilder('job')
      .leftJoin('job.applications', 'app')
      .select('job.id', 'jobId')
      .addSelect('job.title', 'title')
      .addSelect('job.status', 'status')
      .addSelect('COUNT(app.id)', 'applicationCount')
      .where('job.createdAt >= :startDate', { startDate })
      .groupBy('job.id')
      .addGroupBy('job.title')
      .addGroupBy('job.status')
      .orderBy('COUNT(app.id)', 'DESC')
      .limit(20)
      .getRawMany();

    return {
      jobPostingTrends: jobPostingTrends.map(item => ({
        date: item.date,
        value: parseInt(item.value),
      })),
      categoryDistribution,
      topCompanies,
      jobPerformance: jobPerformance.map((r) => ({
        jobId: parseInt(r.jobId, 10),
        title: r.title,
        status: r.status,
        applicationCount: parseInt(r.applicationCount, 10),
      })),
    };
  }

  private async calculateUserGrowthRate(): Promise<number> {
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [currentWeek, previousWeek] = await Promise.all([
      this.userRepository.count({
        where: { createdAt: MoreThanOrEqual(lastWeek) },
      }),
      this.userRepository.count({
        where: {
          createdAt: MoreThanOrEqual(twoWeeksAgo),
        },
      }),
    ]);

    if (previousWeek === 0) return currentWeek > 0 ? 100 : 0;
    return ((currentWeek - previousWeek) / previousWeek) * 100;
  }

  private async calculateJobPostingRate(): Promise<number> {
    const now = new Date();
    const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const [currentWeek, previousWeek] = await Promise.all([
      this.jobRepository.count({
        where: { createdAt: MoreThanOrEqual(lastWeek) },
      }),
      this.jobRepository.count({
        where: {
          createdAt: MoreThanOrEqual(twoWeeksAgo),
        },
      }),
    ]);

    if (previousWeek === 0) return currentWeek > 0 ? 100 : 0;
    return ((currentWeek - previousWeek) / previousWeek) * 100;
  }

  private async calculateApplicationRate(): Promise<number> {
    const [totalJobs, totalApplications] = await Promise.all([
      this.jobRepository.count(),
      this.applicationRepository.count(),
    ]);
    if (totalJobs === 0) return 0;
    return totalApplications / totalJobs;
  }

  async getApplicationAnalytics(days: number = 30): Promise<{
    applicationRates: TimeSeriesData[];
    applicationStatus: { status: string; count: number }[];
    topJobs: { jobId: number; title: string; applicationCount: number }[];
    applicationTrends: TimeSeriesData[];
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const applicationTrends = await this.applicationRepository
      .createQueryBuilder('app')
      .select('DATE(app.createdAt)', 'date')
      .addSelect('COUNT(*)', 'value')
      .where('app.createdAt >= :startDate', { startDate })
      .groupBy('DATE(app.createdAt)')
      .orderBy('DATE(app.createdAt)', 'ASC')
      .getRawMany();

    const applicationStatus = await this.applicationRepository
      .createQueryBuilder('app')
      .select('app.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('app.createdAt >= :startDate', { startDate })
      .groupBy('app.status')
      .getRawMany();

    const topJobs = await this.applicationRepository
      .createQueryBuilder('app')
      .innerJoin('app.job', 'job')
      .select('job.id', 'jobId')
      .addSelect('job.title', 'title')
      .addSelect('COUNT(app.id)', 'applicationCount')
      .where('app.createdAt >= :startDate', { startDate })
      .groupBy('job.id')
      .addGroupBy('job.title')
      .orderBy('COUNT(app.id)', 'DESC')
      .limit(10)
      .getRawMany();

    const applicationRates = await this.applicationRepository
      .createQueryBuilder('app')
      .select('DATE(app.createdAt)', 'date')
      .addSelect('COUNT(*)', 'value')
      .where('app.createdAt >= :startDate', { startDate })
      .groupBy('DATE(app.createdAt)')
      .orderBy('DATE(app.createdAt)', 'ASC')
      .getRawMany();

    return {
      applicationRates: applicationRates.map((r) => ({ date: r.date, value: parseInt(r.value, 10) })),
      applicationStatus: applicationStatus.map((r) => ({ status: r.status, count: parseInt(r.count, 10) })),
      topJobs: topJobs.map((r) => ({
        jobId: parseInt(r.jobId, 10),
        title: r.title,
        applicationCount: parseInt(r.applicationCount, 10),
      })),
      applicationTrends: applicationTrends.map((r) => ({ date: r.date, value: parseInt(r.value, 10) })),
    };
  }
}
