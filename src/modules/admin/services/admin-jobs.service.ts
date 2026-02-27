import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job, JobStatus, JobType, Industry } from '../../../entities/job.entity';
import { Company } from '../../../entities/company.entity';
import { JobApplication } from '../../../entities/job-application.entity';

function slugify(text: string): string {
  return text
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-+|-+$/g, '') || 'job';
}

export interface GetJobsQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  adminStatus?: string;
  companyId?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface GetJobsResponse {
  jobs: Job[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const VALID_JOB_STATUSES = Object.values(JobStatus);
const VALID_ADMIN_STATUSES = ['pending', 'approved', 'rejected', 'suspended'];
const BULK_ACTIONS = ['approve', 'reject', 'suspend', 'pause', 'close', 'activate'];

export interface CreateJobDto {
  companyId: number;
  title: string;
  description: string;
  requirements: string;
  location: string;
  type: JobType;
  category: string;
  benefits?: string;
  salary?: string;
  industry?: Industry;
  experience?: number;
  isRemote?: boolean;
  isUrgent?: boolean;
  isFeatured?: boolean;
  status?: JobStatus;
  applicationDeadline?: string;
  hrName?: string;
  hrContact?: string;
  hrWhatsapp?: string;
}

@Injectable()
export class AdminJobsService {
  constructor(
    @InjectRepository(Job)
    private jobRepository: Repository<Job>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    @InjectRepository(JobApplication)
    private jobApplicationRepository: Repository<JobApplication>,
  ) {}

  async getJobs(query: GetJobsQuery): Promise<GetJobsResponse> {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 20, 100);
    const search = query.search?.trim();
    const status = query.status;
    const adminStatus = query.adminStatus;
    const companyId = query.companyId;
    const sortField = query.sortBy ?? query.sort_by ?? 'createdAt';
    const sortDir = (query.sortOrder ?? query.sort_order ?? 'desc').toLowerCase() as 'asc' | 'desc';
    const sortByMapped = sortField === 'created_at' ? 'createdAt' : sortField === 'updated_at' ? 'updatedAt' : sortField;

    const qb = this.jobRepository
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.company', 'company')
      .orderBy(`job.${sortByMapped}`, sortDir === 'asc' ? 'ASC' : 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) {
      qb.andWhere(
        '(job.title ILIKE :search OR job.slug ILIKE :search OR job.category ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status) {
      qb.andWhere('job.status = :status', { status });
    }

    if (adminStatus) {
      qb.andWhere('job.adminStatus = :adminStatus', { adminStatus });
    }

    if (companyId != null) {
      qb.andWhere('job.companyId = :companyId', { companyId });
    }

    const [jobs, total] = await qb.getManyAndCount();

    return {
      jobs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getJob(id: number) {
    const job = await this.jobRepository.findOne({
      where: { id },
      relations: ['company'],
    });
    if (!job) {
      throw new NotFoundException('Job not found');
    }
    return job;
  }

  async createJob(dto: CreateJobDto) {
    const company = await this.companyRepository.findOne({ where: { id: dto.companyId } });
    if (!company) {
      throw new NotFoundException('Company not found');
    }
    const baseSlug = slugify(dto.title);
    let slug = baseSlug;
    let attempt = 0;
    while (await this.jobRepository.findOne({ where: { slug } })) {
      slug = `${baseSlug}-${++attempt}`;
    }
    const job = this.jobRepository.create({
      companyId: dto.companyId,
      title: dto.title.trim(),
      slug,
      description: dto.description.trim(),
      requirements: dto.requirements.trim(),
      benefits: dto.benefits?.trim(),
      salary: dto.salary?.trim(),
      location: dto.location.trim(),
      type: dto.type,
      category: dto.category.trim(),
      industry: dto.industry,
      experience: dto.experience,
      isRemote: dto.isRemote ?? false,
      isUrgent: dto.isUrgent ?? false,
      isFeatured: dto.isFeatured ?? false,
      status: dto.status ?? JobStatus.DRAFT,
      applicationDeadline: dto.applicationDeadline ? new Date(dto.applicationDeadline) : undefined,
      hrName: dto.hrName?.trim(),
      hrContact: dto.hrContact?.trim(),
      hrWhatsapp: dto.hrWhatsapp?.trim(),
      adminStatus: 'approved',
    });
    await this.jobRepository.save(job);
    return { success: true, job };
  }

  async deleteJob(id: number, cascade = false) {
    const job = await this.getJob(id);
    const applicationCount = await this.jobApplicationRepository.count({ where: { jobId: id } });
    if (applicationCount > 0 && !cascade) {
      throw new ConflictException(
        `Cannot delete job: it has ${applicationCount} application(s). Remove applications first, or use ?cascade=true to delete the job and its applications.`,
      );
    }
    if (applicationCount > 0 && cascade) {
      await this.jobApplicationRepository.delete({ jobId: id });
    }
    await this.jobRepository.remove(job);
    return {
      success: true,
      message: cascade && applicationCount > 0
        ? `Job and ${applicationCount} application(s) deleted successfully`
        : 'Job deleted successfully',
    };
  }

  async updateJobStatus(id: number, status: string, adminNotes?: string, adminId?: number) {
    const job = await this.getJob(id);

    if (VALID_ADMIN_STATUSES.includes(status)) {
      job.adminStatus = status;
      job.adminNotes = adminNotes ?? job.adminNotes;
      job.adminReviewedAt = new Date();
      if (adminId != null) job.adminReviewedBy = adminId;
    }

    if (VALID_JOB_STATUSES.includes(status as JobStatus)) {
      job.status = status as JobStatus;
    }

    await this.jobRepository.save(job);
    return { success: true, job };
  }

  async bulkJobAction(action: string, jobIds: number[], adminNotes?: string, adminId?: number) {
    const normalizedAction = action?.toLowerCase();
    if (!BULK_ACTIONS.includes(normalizedAction)) {
      throw new BadRequestException(
        `Invalid action. Use one of: ${BULK_ACTIONS.join(', ')}`,
      );
    }

    const errors: { jobId: number; error: string }[] = [];
    let processed = 0;
    let failed = 0;

    for (const jobId of jobIds) {
      try {
        const job = await this.jobRepository.findOne({ where: { id: jobId } });
        if (!job) {
          errors.push({ jobId, error: 'Job not found' });
          failed++;
          continue;
        }

        switch (normalizedAction) {
          case 'approve':
            job.adminStatus = 'approved';
            break;
          case 'reject':
            job.adminStatus = 'rejected';
            break;
          case 'suspend':
            job.adminStatus = 'suspended';
            break;
          case 'pause':
            job.status = JobStatus.PAUSED;
            break;
          case 'close':
            job.status = JobStatus.CLOSED;
            break;
          case 'activate':
            job.status = JobStatus.ACTIVE;
            break;
        }
        if (adminNotes) job.adminNotes = adminNotes;
        job.adminReviewedAt = new Date();
        if (adminId != null) job.adminReviewedBy = adminId;

        await this.jobRepository.save(job);
        processed++;
      } catch (e) {
        errors.push({ jobId, error: e instanceof Error ? e.message : 'Unknown error' });
        failed++;
      }
    }

    return {
      success: true,
      processed,
      failed,
      errors,
    };
  }
}



