import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between, In, FindManyOptions, Not, MoreThan } from 'typeorm';
import { Job, JobType, JobStatus, Experience, Industry } from '../../entities/job.entity';
import { Company } from '../../entities/company.entity';
import { User, UserRole } from '../../entities/user.entity';
import { JobView } from '../../entities/job-view.entity';
import { JobStatistics } from '../../entities/job-statistics.entity';
import { CreateJobDto, UpdateJobDto, JobSearchDto, JobResponseDto } from './dto/job.dto';
import { CompaniesService } from '../companies/companies.service';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private jobRepository: Repository<Job>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    @InjectRepository(JobView)
    private jobViewRepository: Repository<JobView>,
    @InjectRepository(JobStatistics)
    private jobStatisticsRepository: Repository<JobStatistics>,
    private companiesService: CompaniesService,
  ) {}

  async create(createJobDto: CreateJobDto, userId: number): Promise<JobResponseDto> {
    const companyIds = await this.companiesService.getCompanyIdsForUser(userId);
    if (!companyIds.length) {
      throw new ForbiddenException('You must have a company profile to post jobs');
    }
    let companyId: number;
    if (createJobDto.companyId != null) {
      if (!(await this.companiesService.canUserAccessCompany(userId, createJobDto.companyId))) {
        throw new ForbiddenException('You do not have access to this company');
      }
      companyId = createJobDto.companyId;
    } else {
      companyId = companyIds[0];
    }
    const company = await this.companyRepository.findOne({ where: { id: companyId } });
    if (!company) {
      throw new ForbiddenException('Company not found');
    }

    // Check active job limit (max 10 active jobs per employer)
    const activeJobsCount = await this.jobRepository.count({
      where: {
        companyId: company.id,
        status: JobStatus.ACTIVE,
      },
    });

    if (activeJobsCount >= 10) {
      throw new BadRequestException('Maximum 10 active jobs allowed. Please pause or close an existing job before creating a new one.');
    }

    // Check if same company already has a job with same title and location
    const existingJob = await this.jobRepository.findOne({
      where: {
        companyId: company.id,
        title: createJobDto.title,
        location: createJobDto.location,
      },
    });
    if (existingJob) {
      throw new BadRequestException('A job with this title already exists for this location');
    }

    // Generate slug from title and company ID, ensuring uniqueness
    const slug = await this.generateUniqueSlug(createJobDto.title, company.id);

    // Create job - always set status to ACTIVE by default for new job postings
    // This ensures all newly created jobs are immediately visible
    const job = this.jobRepository.create({
      ...createJobDto,
      slug,
      companyId: company.id,
      status: JobStatus.ACTIVE, // Always activate new jobs by default (overrides any status in DTO)
    });

    const savedJob = await this.jobRepository.save(job);
    
    // Load the job with company relation
    const jobWithCompany = await this.jobRepository.findOne({
      where: { id: savedJob.id },
      relations: ['company'],
    });
    
    if (!jobWithCompany) {
      throw new Error('Failed to load job with company relation');
    }
    
    return this.formatJobResponse(jobWithCompany);
  }

  async findAll(searchDto: JobSearchDto, user?: User): Promise<{
    jobs: JobResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      search,
      location,
      type,
      category,
      industry,
      experience,
      minSalary,
      maxSalary,
      isRemote,
      isFeatured,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = searchDto;

    const queryBuilder = this.jobRepository
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.company', 'company')
      .where('job.status = :status', { status: JobStatus.ACTIVE });

    // Role-based filtering
    if (user) {
      if (user.role === UserRole.EMPLOYER) {
        // Employers can only see their own jobs
        queryBuilder.andWhere('company.userId = :userId', { userId: user.id });
      }
      // Candidates and Admins can see all jobs (no additional filtering)
    }

    // Search filters
    if (search) {
      queryBuilder.andWhere(
        '(job.title ILIKE :search OR job.description ILIKE :search OR company.name ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (location) {
      queryBuilder.andWhere('job.location ILIKE :location', { location: `%${location}%` });
    }

    if (type) {
      queryBuilder.andWhere('job.type = :type', { type });
    }

    if (category) {
      queryBuilder.andWhere('job.category = :category', { category });
    }

    if (industry) {
      queryBuilder.andWhere('job.industry = :industry', { industry });
    }

    if (experience !== undefined) {
      queryBuilder.andWhere('job.experience = :experience', { experience });
    }

    if (isRemote !== undefined) {
      queryBuilder.andWhere('job.isRemote = :isRemote', { isRemote });
    }

    if (isFeatured !== undefined) {
      queryBuilder.andWhere('job.isFeatured = :isFeatured', { isFeatured });
    }

    // Salary range (simplified - would need more complex parsing for real implementation)
    if (minSalary !== undefined) {
      queryBuilder.andWhere('CAST(SUBSTRING(job.salary FROM \'[0-9]+\') AS INTEGER) >= :minSalary', {
        minSalary,
      });
    }

    if (maxSalary !== undefined) {
      queryBuilder.andWhere('CAST(SUBSTRING(job.salary FROM \'[0-9]+\') AS INTEGER) <= :maxSalary', {
        maxSalary,
      });
    }

    // Sorting
    queryBuilder.orderBy(`job.${sortBy}`, sortOrder.toUpperCase() as 'ASC' | 'DESC');

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [jobs, total] = await queryBuilder.getManyAndCount();

    return {
      jobs: jobs.map((job) => this.formatJobResponse(job)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: number): Promise<JobResponseDto> {
    const job = await this.jobRepository.findOne({
      where: { id },
      relations: ['company'],
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // Increment view count
    await this.jobRepository.update(id, { views: job.views + 1 });

    return this.formatJobResponse(job);
  }

  async update(id: number, updateJobDto: UpdateJobDto, userId: number): Promise<JobResponseDto> {
    const job = await this.jobRepository.findOne({
      where: { id },
      relations: ['company'],
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (!(await this.companiesService.canUserAccessCompany(userId, job.companyId))) {
      throw new ForbiddenException('You can only update jobs for companies you have access to');
    }

    // Map 'featured' alias to 'isFeatured' if provided
    if (updateJobDto.featured !== undefined && updateJobDto.isFeatured === undefined) {
      updateJobDto.isFeatured = updateJobDto.featured;
      delete updateJobDto.featured;
    }

    // Check active job limit when updating status to 'active'
    if (updateJobDto.status === JobStatus.ACTIVE) {
      const activeJobsCount = await this.jobRepository.count({
        where: {
          companyId: job.companyId,
          status: JobStatus.ACTIVE,
          id: Not(id), // Exclude current job
        },
      });

      if (activeJobsCount >= 10) {
        throw new BadRequestException('Maximum 10 active jobs allowed. Please pause or close another job first.');
      }
    }

    // Update slug if title or location changed
    const titleChanged = updateJobDto.title && updateJobDto.title !== job.title;
    const locationChanged = updateJobDto.location && updateJobDto.location !== job.location;
    
    if (titleChanged || locationChanged) {
      const newTitle = updateJobDto.title || job.title;
      const newLocation = updateJobDto.location || job.location;
      
      // Check if same company already has a job with same title and location
      const existingJob = await this.jobRepository.findOne({
        where: {
          companyId: job.companyId,
          title: newTitle,
          location: newLocation,
        },
      });
      
      if (existingJob && existingJob.id !== id) {
        throw new BadRequestException('A job with this title already exists for this location');
      }
      
      // Update slug if title changed, ensuring uniqueness
      if (titleChanged) {
        const newSlug = await this.generateUniqueSlug(newTitle, job.companyId);
        updateJobDto['slug'] = newSlug;
      }
    }

    await this.jobRepository.update(id, updateJobDto);
    const updatedJob = await this.jobRepository.findOne({
      where: { id },
      relations: ['company'],
    });

    if (!updatedJob) {
      throw new NotFoundException('Job not found after update');
    }

    return this.formatJobResponse(updatedJob);
  }

  async remove(id: number, userId: number): Promise<void> {
    const job = await this.jobRepository.findOne({
      where: { id },
      relations: ['company'],
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (!(await this.companiesService.canUserAccessCompany(userId, job.companyId))) {
      throw new ForbiddenException('You can only delete jobs for companies you have access to');
    }
    await this.jobRepository.remove(job);
  }

  async getFeaturedJobs(limit: number = 6): Promise<JobResponseDto[]> {
    const jobs = await this.jobRepository.find({
      where: {
        status: JobStatus.ACTIVE,
        isFeatured: true,
      },
      relations: ['company'],
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return jobs.map((job) => this.formatJobResponse(job));
  }

  async getHotJobs(limit: number = 6): Promise<JobResponseDto[]> {
    const jobs = await this.jobRepository.find({
      where: {
        status: JobStatus.ACTIVE,
        isUrgent: true,
      },
      relations: ['company'],
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return jobs.map((job) => this.formatJobResponse(job));
  }

  async getJobsByCompany(companyId: number): Promise<JobResponseDto[]> {
    const jobs = await this.jobRepository.find({
      where: { companyId },
      relations: ['company'],
      order: { createdAt: 'DESC' },
    });

    return jobs.map((job) => this.formatJobResponse(job));
  }

  async getMyJobs(userId: number, searchDto?: JobSearchDto): Promise<{
    jobs: JobResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const companyIds = await this.companiesService.getCompanyIdsForUser(userId);
    if (!companyIds.length) {
      return {
        jobs: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      };
    }

    const {
      search,
      location,
      type,
      category,
      industry,
      experience,
      minSalary,
      maxSalary,
      isRemote,
      isFeatured,
      status,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = searchDto || {};

    const queryBuilder = this.jobRepository
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.company', 'company')
      .where('job.companyId IN (:...companyIds)', { companyIds });

    // Apply search filters
    if (search) {
      queryBuilder.andWhere(
        '(job.title ILIKE :search OR job.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (location) {
      queryBuilder.andWhere('job.location ILIKE :location', { location: `%${location}%` });
    }

    if (type) {
      queryBuilder.andWhere('job.type = :type', { type });
    }

    if (category) {
      queryBuilder.andWhere('job.category = :category', { category });
    }

    if (industry) {
      queryBuilder.andWhere('job.industry = :industry', { industry });
    }

    if (experience !== undefined) {
      queryBuilder.andWhere('job.experience = :experience', { experience });
    }

    if (isRemote !== undefined) {
      queryBuilder.andWhere('job.isRemote = :isRemote', { isRemote });
    }

    if (isFeatured !== undefined) {
      queryBuilder.andWhere('job.isFeatured = :isFeatured', { isFeatured });
    }

    // Status filter
    if (status) {
      queryBuilder.andWhere('job.status = :status', { status });
    }

    // Salary range
    if (minSalary !== undefined) {
      queryBuilder.andWhere('CAST(SUBSTRING(job.salary FROM \'[0-9]+\') AS INTEGER) >= :minSalary', {
        minSalary,
      });
    }

    if (maxSalary !== undefined) {
      queryBuilder.andWhere('CAST(SUBSTRING(job.salary FROM \'[0-9]+\') AS INTEGER) <= :maxSalary', {
        maxSalary,
      });
    }

    // Sorting: Active jobs first, then by date (newest first)
    // Use addSelect to create computed columns, then order by them
    queryBuilder
      .addSelect(
        `CASE WHEN job.status = 'active' THEN 0 ELSE 1 END`,
        'status_priority'
      )
      .addSelect(
        `COALESCE(job.postedDate, job.createdAt)`,
        'sort_date'
      )
      .orderBy('status_priority', 'ASC')
      .addOrderBy('sort_date', 'DESC');

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [jobs, total] = await queryBuilder.getManyAndCount();

    return {
      jobs: jobs.map((job) => this.formatJobResponse(job)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getJobCategories(): Promise<{ category: string; count: number }[]> {
    const result = await this.jobRepository
      .createQueryBuilder('job')
      .select('job.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .where('job.status = :status', { status: JobStatus.ACTIVE })
      .groupBy('job.category')
      .orderBy('count', 'DESC')
      .getRawMany();

    return result.map((item) => ({
      category: item.category,
      count: parseInt(item.count),
    }));
  }

  async getJobsByIndustry(industry: Industry): Promise<JobResponseDto[]> {
    const jobs = await this.jobRepository.find({
      where: { industry, status: JobStatus.ACTIVE },
      relations: ['company'],
      order: { createdAt: 'DESC' },
    });

    return jobs.map((job) => this.formatJobResponse(job));
  }

  async getIndustryStats(): Promise<{ industry: string; count: number }[]> {
    const result = await this.jobRepository
      .createQueryBuilder('job')
      .select('job.industry', 'industry')
      .addSelect('COUNT(*)', 'count')
      .where('job.status = :status', { status: JobStatus.ACTIVE })
      .andWhere('job.industry IS NOT NULL')
      .groupBy('job.industry')
      .orderBy('count', 'DESC')
      .getRawMany();

    return result.map((item) => ({
      industry: item.industry,
      count: parseInt(item.count),
    }));
  }

  private generateSlug(title: string, companyId?: number): string {
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    
    // Append company ID to ensure uniqueness across companies
    return companyId ? `${baseSlug}-${companyId}` : baseSlug;
  }

  private async generateUniqueSlug(title: string, companyId: number): Promise<string> {
    let baseSlug = this.generateSlug(title, companyId);
    let slug = baseSlug;
    let counter = 1;

    // Check if slug exists and append counter until unique
    while (await this.jobRepository.findOne({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  private formatJobResponse(job: Job): JobResponseDto {
    return {
      id: job.id,
      title: job.title,
      slug: job.slug,
      description: job.description,
      requirements: job.requirements,
      benefits: job.benefits,
      salary: job.salary,
      location: job.location,
      type: job.type,
      category: job.category,
      industry: job.industry,
      experience: job.experience,
      isRemote: job.isRemote,
      isUrgent: job.isUrgent,
      isFeatured: job.isFeatured,
      status: job.status,
      views: job.views,
      applicationsCount: job.applicationsCount,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      postedDate: job.postedDate,
      applicationDeadline: job.applicationDeadline,
      hrName: job.hrName,
      hrContact: job.hrContact,
      hrWhatsapp: job.hrWhatsapp,
      company: job.company ? {
        id: job.company.id,
        name: job.company.name,
        logo: job.company.logo,
        location: job.company.location,
      } : {
        id: job.companyId,
        name: 'Unknown Company',
        logo: null,
        location: 'Unknown',
      },
    };
  }

  async getSimilarJobs(jobId: number, limit: number = 3): Promise<{ jobs: any[] }> {
    // Get the current job
    const currentJob = await this.jobRepository.findOne({
      where: { id: jobId },
      relations: ['company'],
    });

    if (!currentJob) {
      throw new NotFoundException('Job not found');
    }

    // Find potential similar jobs (exclude current job and inactive jobs)
    const potentialJobs = await this.jobRepository.find({
      where: {
        id: Not(jobId),
        status: JobStatus.ACTIVE,
        applicationDeadline: MoreThan(new Date()),
      },
      relations: ['company'],
      take: limit * 3, // Get more jobs to filter and score
    });

    // Calculate similarity scores
    const scoredJobs = potentialJobs.map(job => ({
      ...this.formatJobResponse(job),
      score: this.calculateSimilarityScore(currentJob, job),
    }));

    // Sort by score (highest first) and limit results
    const similarJobs = scoredJobs
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return { jobs: similarJobs };
  }

  private calculateSimilarityScore(job1: Job, job2: Job): number {
    let score = 0;

    // Category match (highest priority - 3 points)
    if (job1.category === job2.category) {
      score += 3;
    }

    // Location match (2 points for exact, 1 for partial)
    if (job1.location === job2.location) {
      score += 2;
    } else if (job1.location.toLowerCase().includes(job2.location.toLowerCase()) ||
               job2.location.toLowerCase().includes(job1.location.toLowerCase())) {
      score += 1;
    }

    // Job type match (2 points)
    if (job1.type === job2.type) {
      score += 2;
    }

    // Industry match (1 point)
    if (job1.industry === job2.industry) {
      score += 1;
    }

    // Experience level match (1 point)
    if (job1.experience === job2.experience) {
      score += 1;
    }

    // Remote work preference (1 point)
    if (job1.isRemote === job2.isRemote) {
      score += 1;
    }

    // Salary range similarity (1 point for similar ranges)
    if (this.isSalaryRangeSimilar(job1.salary, job2.salary)) {
      score += 1;
    }

    return score;
  }

  private isSalaryRangeSimilar(salary1: string, salary2: string): boolean {
    // Extract numbers from salary strings for comparison
    const extractNumbers = (salary: string): number[] => {
      return salary.match(/\d+/g)?.map(Number) || [];
    };

    const numbers1 = extractNumbers(salary1);
    const numbers2 = extractNumbers(salary2);

    if (numbers1.length === 0 || numbers2.length === 0) {
      return false;
    }

    // Compare the highest numbers from each salary range
    const max1 = Math.max(...numbers1);
    const max2 = Math.max(...numbers2);

    // Consider similar if within 20% of each other
    const difference = Math.abs(max1 - max2);
    const average = (max1 + max2) / 2;
    
    return difference / average <= 0.2;
  }

  async getJobStats(jobId: number) {
    // Get job details
    const job = await this.jobRepository.findOne({
      where: { id: jobId },
      relations: ['company'],
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // Get or calculate statistics
    let stats = await this.jobStatisticsRepository.findOne({
      where: { jobId },
    });

    if (!stats) {
      // Calculate from raw data
      const [totalViews, totalApplications] = await Promise.all([
        this.jobViewRepository.count({ where: { jobId } }),
        this.jobRepository
          .createQueryBuilder('job')
          .leftJoin('job.applications', 'application')
          .where('job.id = :jobId', { jobId })
          .getCount(),
      ]);

      // Create statistics record
      stats = await this.jobStatisticsRepository.save({
        jobId,
        totalViews,
        totalApplications,
        uniqueViews: totalViews, // Simplified for quick start
        lastViewedAt: new Date(),
      });
    }

    return {
      jobStats: {
        applicants: stats.totalApplications,
        views: stats.totalViews,
        posted: this.formatPostedDate(job.createdAt),
        expires: this.formatExpiryDate(job.applicationDeadline),
        applications: stats.totalApplications,
        shortlisted: 0, // Add later
        interviewed: 0, // Add later
        hired: 0, // Add later
      },
    };
  }

  async trackJobView(jobId: number, req: Request, user?: User) {
    // Check if job exists
    const job = await this.jobRepository.findOne({ where: { id: jobId } });
    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // Get client IP address
    const ipAddress = req.ip || req.connection?.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Create view record
    await this.jobViewRepository.save({
      jobId,
      userId: user?.id || undefined,
      ipAddress,
      userAgent,
    });

    // Update statistics
    await this.updateJobStatistics(jobId);

    return { success: true };
  }

  private async updateJobStatistics(jobId: number) {
    const [totalViews, totalApplications] = await Promise.all([
      this.jobViewRepository.count({ where: { jobId } }),
      this.jobRepository
        .createQueryBuilder('job')
        .leftJoin('job.applications', 'application')
        .where('job.id = :jobId', { jobId })
        .getCount(),
    ]);

    await this.jobStatisticsRepository.upsert({
      jobId,
      totalViews,
      totalApplications,
      uniqueViews: totalViews, // Simplified
      lastViewedAt: new Date(),
    }, ['jobId']);
  }

  private formatPostedDate(date: Date): string {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  }

  private formatExpiryDate(date: Date): string {
    if (!date) return 'No deadline';
    
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Expired';
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day';
    if (diffDays < 7) return `${diffDays} days`;
    return `${Math.floor(diffDays / 7)} weeks`;
  }
}
