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
import { User, UserRole } from '../../entities/user.entity';
import { CreateApplicationDto, UpdateApplicationStatusDto, ApplicationResponseDto } from './dto/application.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(JobApplication)
    private applicationRepository: Repository<JobApplication>,
    @InjectRepository(Job)
    private jobRepository: Repository<Job>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private emailService: EmailService,
  ) {}

  async create(createApplicationDto: CreateApplicationDto, userId: number): Promise<ApplicationResponseDto> {
    const { jobId, candidateName, candidateEmail, candidatePhone, resume, coverLetter } = createApplicationDto;

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
      candidateName,
      candidateEmail,
      candidatePhone,
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
    // Load without user relation to avoid schema mismatch
    const applicationWithRelations = await this.applicationRepository
      .createQueryBuilder('application')
      .innerJoinAndSelect('application.job', 'job')
      .innerJoinAndSelect('job.company', 'company')
      .where('application.id = :id', { id: savedApplication.id })
      .getOne();

    if (!applicationWithRelations) {
      throw new InternalServerErrorException('Failed to retrieve created application');
    }

    // Load user separately with explicit column selection (excluding googleId)
    const user = await this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.firstName',
        'user.lastName',
        'user.email',
        'user.phone',
        'user.location',
        'user.avatar',
        'user.role',
        'user.bio',
        'user.experience',
        'user.education',
        'user.skills',
        'user.technicalSkills',
        'user.functionalSkills',
        'user.currentJobTitle',
        'user.portfolio',
        'user.linkedin',
        'user.github',
        'user.resume',
        'user.salaryExpectation',
        'user.createdAt',
        'user.updatedAt',
      ])
      .where('user.id = :userId', { userId: applicationWithRelations.userId })
      .getOne();

    // Attach user to application
    applicationWithRelations.user = user || undefined;

    return this.formatApplicationResponse(applicationWithRelations);
  }

  async findAll(userId: number): Promise<ApplicationResponseDto[]> {
    // Load applications without user relation to avoid schema mismatch
    const applications = await this.applicationRepository
      .createQueryBuilder('application')
      .innerJoinAndSelect('application.job', 'job')
      .innerJoinAndSelect('job.company', 'company')
      .where('application.userId = :userId', { userId })
      .orderBy('application.createdAt', 'DESC')
      .getMany();

    // Load users separately with explicit column selection (excluding googleId)
    const userIds = applications.map(app => app.userId);
    if (userIds.length > 0) {
      const users = await this.userRepository
        .createQueryBuilder('user')
        .select([
          'user.id',
          'user.firstName',
          'user.lastName',
          'user.email',
          'user.phone',
          'user.location',
          'user.avatar',
          'user.role',
          'user.bio',
          'user.experience',
          'user.education',
          'user.skills',
          'user.technicalSkills',
          'user.functionalSkills',
          'user.currentJobTitle',
          'user.portfolio',
          'user.linkedin',
          'user.github',
          'user.resume',
          'user.salaryExpectation',
          'user.createdAt',
          'user.updatedAt',
        ])
        .where('user.id IN (:...userIds)', { userIds })
        .getMany();

      // Map users to applications
      const userMap = new Map(users.map(u => [u.id, u]));
      applications.forEach(app => {
        app.user = userMap.get(app.userId);
      });
    }

    return applications.map((application) => this.formatApplicationResponse(application));
  }

  async findOne(id: number, userId: number): Promise<ApplicationResponseDto> {
    // Load application without user relation to avoid schema mismatch
    const application = await this.applicationRepository
      .createQueryBuilder('application')
      .innerJoinAndSelect('application.job', 'job')
      .innerJoinAndSelect('job.company', 'company')
      .where('application.id = :id', { id })
      .getOne();

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

    // Load user separately with explicit column selection (excluding googleId)
    const user = await this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.firstName',
        'user.lastName',
        'user.email',
        'user.phone',
        'user.location',
        'user.avatar',
        'user.role',
        'user.bio',
        'user.experience',
        'user.education',
        'user.skills',
        'user.technicalSkills',
        'user.functionalSkills',
        'user.currentJobTitle',
        'user.portfolio',
        'user.linkedin',
        'user.github',
        'user.resume',
        'user.salaryExpectation',
        'user.createdAt',
        'user.updatedAt',
      ])
      .where('user.id = :userId', { userId: application.userId })
      .getOne();

    // Attach user to application
    application.user = user || undefined;

    return this.formatApplicationResponse(application);
  }

  async updateStatus(
    id: number,
    updateStatusDto: UpdateApplicationStatusDto,
    userId: number,
  ): Promise<ApplicationResponseDto> {
    // Load application without user relation to avoid schema mismatch
    const application = await this.applicationRepository
      .createQueryBuilder('application')
      .innerJoinAndSelect('application.job', 'job')
      .innerJoinAndSelect('job.company', 'company')
      .where('application.id = :id', { id })
      .getOne();

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // Check if user is the job owner
    if (application.job?.company?.userId !== userId) {
      throw new ForbiddenException('You can only update applications for your own jobs');
    }

    const previousStatus = application.status;
    const newStatus = updateStatusDto.status;

    await this.applicationRepository.update(id, updateStatusDto);
    
    // Load updated application without user relation
    const updatedApplication = await this.applicationRepository
      .createQueryBuilder('application')
      .innerJoinAndSelect('application.job', 'job')
      .innerJoinAndSelect('job.company', 'company')
      .where('application.id = :id', { id })
      .getOne();

    if (!updatedApplication) {
      throw new NotFoundException('Application not found after update');
    }

    // Load user separately with explicit column selection (excluding googleId)
    const user = await this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.firstName',
        'user.lastName',
        'user.email',
        'user.phone',
        'user.location',
        'user.avatar',
        'user.role',
        'user.bio',
        'user.experience',
        'user.education',
        'user.skills',
        'user.technicalSkills',
        'user.functionalSkills',
        'user.currentJobTitle',
        'user.portfolio',
        'user.linkedin',
        'user.github',
        'user.resume',
        'user.salaryExpectation',
        'user.createdAt',
        'user.updatedAt',
      ])
      .where('user.id = :userId', { userId: updatedApplication.userId })
      .getOne();

    // Attach user to application
    updatedApplication.user = user || undefined;

    // Send email notifications if status changed to selected or rejected
    if (previousStatus !== newStatus && updatedApplication.user) {
      const candidate = updatedApplication.user;
      const jobTitle = updatedApplication.job.title;
      const companyName = updatedApplication.job.company.name;

      // Send email notification (non-blocking)
      if (newStatus === ApplicationStatus.ACCEPTED) {
        this.emailService
          .sendApplicationSelectedEmail(
            candidate.email,
            candidate.fullName,
            jobTitle,
            companyName,
          )
          .catch((error) => {
            console.error('Failed to send application selected email:', error);
          });
      } else if (newStatus === ApplicationStatus.REJECTED) {
        this.emailService
          .sendApplicationRejectedEmail(
            candidate.email,
            candidate.fullName,
            jobTitle,
            companyName,
          )
          .catch((error) => {
            console.error('Failed to send application rejected email:', error);
          });
      }
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
    // Check if job exists and user owns it - use QueryBuilder to avoid schema issues
    const job = await this.jobRepository
      .createQueryBuilder('job')
      .innerJoinAndSelect('job.company', 'company')
      .where('job.id = :jobId', { jobId })
      .getOne();

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    if (job?.company?.userId !== userId) {
      throw new ForbiddenException('You can only view applications for your own jobs');
    }

    // Load applications without user relation to avoid schema mismatch
    const applications = await this.applicationRepository
      .createQueryBuilder('application')
      .innerJoinAndSelect('application.job', 'job')
      .innerJoinAndSelect('job.company', 'company')
      .where('application.jobId = :jobId', { jobId })
      .orderBy('application.createdAt', 'DESC')
      .getMany();

    // Load users separately with explicit column selection
    const userIds = applications.map(app => app.userId);
    if (userIds.length > 0) {
      const users = await this.userRepository
        .createQueryBuilder('user')
        .select([
          'user.id',
          'user.firstName',
          'user.lastName',
          'user.email',
          'user.phone',
          'user.location',
          'user.avatar',
          'user.role',
          'user.bio',
          'user.experience',
          'user.education',
          'user.skills',
          'user.technicalSkills',
          'user.functionalSkills',
          'user.currentJobTitle',
          'user.portfolio',
          'user.linkedin',
          'user.github',
          'user.resume',
          'user.salaryExpectation',
          'user.createdAt',
          'user.updatedAt',
        ])
        .where('user.id IN (:...userIds)', { userIds })
        .getMany();

      // Map users to applications
      const userMap = new Map(users.map(u => [u.id, u]));
      applications.forEach(app => {
        app.user = userMap.get(app.userId);
      });
    }

    return applications.map((application) => this.formatApplicationResponse(application));
  }

  private formatApplicationResponse(application: JobApplication): ApplicationResponseDto {
    const user = application.user;
    
    // Use candidate contact details from application if provided, otherwise fall back to user profile
    const candidateName = application.candidateName;
    const candidateEmail = application.candidateEmail;
    const candidatePhone = application.candidatePhone;
    
    // Handle missing user gracefully - return minimal user info if user not found
    // This prevents crashes when a user is deleted but their application still exists
    if (!user) {
      // Parse candidate name if provided
      const nameParts = candidateName ? candidateName.split(' ') : ['Unknown', 'User'];
      const firstName = nameParts[0] || 'Unknown';
      const lastName = nameParts.slice(1).join(' ') || 'User';
      
      return {
        id: application.id,
        jobId: application.jobId,
        userId: application.userId,
        status: application.status,
        coverLetter: application.coverLetter || undefined,
        resume: application.resume || undefined,
        appliedAt: application.createdAt.toISOString(),
        createdAt: application.createdAt.toISOString(),
        updatedAt: application.updatedAt.toISOString(),
        expectedSalary: undefined,
        user: {
          id: application.userId,
          firstName: firstName,
          lastName: lastName,
          email: candidateEmail || 'user@unknown.com',
          phone: candidatePhone || undefined,
          avatar: undefined,
          location: undefined,
          profile: undefined,
        },
        job: {
          id: application.job.id,
          title: application.job.title,
          hrName: application.job.hrName || undefined,
          hrContact: application.job.hrContact || undefined,
          hrWhatsapp: application.job.hrWhatsapp || undefined,
          company: {
            id: application.job.company.id,
            name: application.job.company.name,
            logo: application.job.company.logo || undefined,
          },
        },
      };
    }
    
    // Build profile object from user's job seeker fields
    // Combine all skills arrays and remove duplicates
    const allSkills = [
      ...(user.skills || []),
      ...(user.technicalSkills || []),
      ...(user.functionalSkills || []),
    ];
    const uniqueSkills = allSkills.length > 0 
      ? Array.from(new Set(allSkills.filter(skill => skill && skill.trim()))) 
      : undefined;
    
    const profile = user.role === UserRole.JOB_SEEKER ? {
      headline: user.currentJobTitle || undefined,
      summary: user.bio || undefined,
      experience: user.experience || undefined,
      education: user.education || undefined,
      skills: uniqueSkills,
      location: user.location || undefined,
      phone: user.phone || undefined,
      portfolio: user.portfolio || undefined,
      linkedin: user.linkedin || undefined,
      github: user.github || undefined,
      resume: user.resume || undefined,
      createdAt: user.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: user.updatedAt?.toISOString() || new Date().toISOString(),
    } : undefined;

    // Use candidate contact details from application if provided, otherwise use user profile
    let displayFirstName = user.firstName;
    let displayLastName = user.lastName;
    let displayEmail = user.email;
    let displayPhone = user.phone || undefined;
    
    if (candidateName) {
      const nameParts = candidateName.split(' ');
      displayFirstName = nameParts[0] || user.firstName;
      displayLastName = nameParts.slice(1).join(' ') || user.lastName;
    }
    
    if (candidateEmail) {
      displayEmail = candidateEmail;
    }
    
    if (candidatePhone) {
      displayPhone = candidatePhone;
    }
    
    return {
      id: application.id,
      jobId: application.jobId,
      userId: application.userId,
      status: application.status,
      coverLetter: application.coverLetter || undefined,
      resume: application.resume || undefined,
      appliedAt: application.createdAt.toISOString(),
      createdAt: application.createdAt.toISOString(),
      updatedAt: application.updatedAt.toISOString(),
      expectedSalary: user.salaryExpectation || undefined,
      user: {
        id: user.id,
        firstName: displayFirstName,
        lastName: displayLastName,
        email: displayEmail,
        phone: displayPhone,
        avatar: user.avatar || undefined,
        location: user.location || undefined,
        profile: profile,
      },
      job: {
        id: application.job.id,
        title: application.job.title,
        hrName: application.job.hrName || undefined,
        hrContact: application.job.hrContact || undefined,
        hrWhatsapp: application.job.hrWhatsapp || undefined,
        company: {
          id: application.job.company.id,
          name: application.job.company.name,
          logo: application.job.company.logo || undefined,
        },
      },
    };
  }
}
