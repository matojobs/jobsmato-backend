import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobApplication, ApplicationStatus } from '../../entities/job-application.entity';
import { Job } from '../../entities/job.entity';
import { User } from '../../entities/user.entity';
import { CreateApplicationDto, UpdateApplicationStatusDto, ApplicationResponseDto } from './dto/application.dto';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(JobApplication)
    private applicationRepository: Repository<JobApplication>,
    @InjectRepository(Job)
    private jobRepository: Repository<Job>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(createApplicationDto: CreateApplicationDto, userId: number): Promise<ApplicationResponseDto> {
    const { jobId, resume, coverLetter } = createApplicationDto;

    // Check if job exists
    const job = await this.jobRepository.findOne({
      where: { id: jobId },
      relations: ['company'],
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // Check if user already applied
    const existingApplication = await this.applicationRepository.findOne({
      where: { userId, jobId },
    });

    if (existingApplication) {
      throw new ConflictException('You have already applied for this job');
    }

    // Create application
    const application = this.applicationRepository.create({
      userId,
      jobId,
      resume,
      coverLetter,
      status: ApplicationStatus.PENDING,
    });

    const savedApplication = await this.applicationRepository.save(application);

    // Update job applications count
    await this.jobRepository.update(jobId, {
      applicationsCount: job.applicationsCount + 1,
    });

    // Fetch the application with relations for proper response formatting
    const applicationWithRelations = await this.applicationRepository.findOne({
      where: { id: savedApplication.id },
      relations: ['user', 'job', 'job.company'],
    });

    if (!applicationWithRelations) {
      throw new InternalServerErrorException('Failed to retrieve created application');
    }

    return this.formatApplicationResponse(applicationWithRelations);
  }

  async findAll(userId: number): Promise<ApplicationResponseDto[]> {
    const applications = await this.applicationRepository.find({
      where: { userId },
      relations: ['job', 'job.company', 'user'],
      order: { createdAt: 'DESC' },
    });

    return applications.map((application) => this.formatApplicationResponse(application));
  }

  async findOne(id: number, userId: number): Promise<ApplicationResponseDto> {
    const application = await this.applicationRepository.findOne({
      where: { id },
      relations: ['job', 'job.company', 'user'],
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // Check if user owns this application or is the job owner
    if (application.userId !== userId) {
      const job = await this.jobRepository.findOne({
        where: { id: application.jobId },
        relations: ['company'],
      });

      if (job?.company?.userId !== userId) {
        throw new ForbiddenException('You can only view your own applications');
      }
    }

    return this.formatApplicationResponse(application);
  }

  async updateStatus(
    id: number,
    updateStatusDto: UpdateApplicationStatusDto,
    userId: number,
  ): Promise<ApplicationResponseDto> {
    const application = await this.applicationRepository.findOne({
      where: { id },
      relations: ['job', 'job.company'],
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // Check if user is the job owner
    if (application.job?.company?.userId !== userId) {
      throw new ForbiddenException('You can only update applications for your own jobs');
    }

    await this.applicationRepository.update(id, updateStatusDto);
    const updatedApplication = await this.applicationRepository.findOne({
      where: { id },
      relations: ['job', 'job.company', 'user'],
    });

    if (!updatedApplication) {
      throw new NotFoundException('Application not found after update');
    }

    return this.formatApplicationResponse(updatedApplication);
  }

  async remove(id: number, userId: number): Promise<void> {
    const application = await this.applicationRepository.findOne({
      where: { id },
      relations: ['job'],
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // Check if user owns this application
    if (application.userId !== userId) {
      throw new ForbiddenException('You can only delete your own applications');
    }

    await this.applicationRepository.remove(application);

    // Update job applications count
    await this.jobRepository.update(application.jobId, {
      applicationsCount: application.job.applicationsCount - 1,
    });
  }

  async getJobApplications(jobId: number, userId: number): Promise<ApplicationResponseDto[]> {
    // Check if job exists and user owns it
    const job = await this.jobRepository.findOne({
      where: { id: jobId },
      relations: ['company'],
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job?.company?.userId !== userId) {
      throw new ForbiddenException('You can only view applications for your own jobs');
    }

    const applications = await this.applicationRepository.find({
      where: { jobId },
      relations: ['user', 'job', 'job.company'],
      order: { createdAt: 'DESC' },
    });

    return applications.map((application) => this.formatApplicationResponse(application));
  }

  private formatApplicationResponse(application: JobApplication): ApplicationResponseDto {
    return {
      id: application.id,
      resume: application.resume,
      coverLetter: application.coverLetter,
      status: application.status,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
      user: {
        id: application.user.id,
        firstName: application.user.firstName,
        lastName: application.user.lastName,
        email: application.user.email,
        avatar: application.user.avatar,
      },
      job: {
        id: application.job.id,
        title: application.job.title,
        company: {
          id: application.job.company.id,
          name: application.job.company.name,
          logo: application.job.company.logo,
        },
      },
    };
  }
}
