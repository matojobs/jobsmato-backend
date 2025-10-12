import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../entities/user.entity';
import { Job, JobStatus } from '../../../entities/job.entity';
import { Company } from '../../../entities/company.entity';
import { AdminActionLog } from '../../../entities/admin-action-log.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Job)
    private jobRepository: Repository<Job>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    @InjectRepository(AdminActionLog)
    private adminActionLogRepository: Repository<AdminActionLog>,
  ) {}

  async getSystemOverview() {
    const [
      totalUsers,
      totalJobs,
      totalCompanies,
      totalAdminActions,
      activeUsers,
      activeJobs,
      verifiedCompanies,
    ] = await Promise.all([
      this.userRepository.count(),
      this.jobRepository.count(),
      this.companyRepository.count(),
      this.adminActionLogRepository.count(),
      this.userRepository.count({ where: { isActive: true } }),
      this.jobRepository.count({ where: { status: JobStatus.ACTIVE } }),
      this.companyRepository.count({ where: { isVerified: true } }),
    ]);

    return {
      totalUsers,
      totalJobs,
      totalCompanies,
      totalAdminActions,
      activeUsers,
      activeJobs,
      verifiedCompanies,
    };
  }

  async getRecentActivity(limit: number = 10) {
    return this.adminActionLogRepository
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.admin', 'admin')
      .orderBy('log.createdAt', 'DESC')
      .limit(limit)
      .getMany();
  }
}
