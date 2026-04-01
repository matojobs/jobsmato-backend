import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobApplication, ApplicationStatus } from '../../entities/job-application.entity';
import { Job } from '../../entities/job.entity';
import { User, UserRole } from '../../entities/user.entity';
import { CreateApplicationDto, UpdateApplicationStatusDto, UpdateRecruiterCallDto, ApplicationResponseDto } from './dto/application.dto';
import { EmailService } from '../email/email.service';
import { CompaniesService } from '../companies/companies.service';

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
    private companiesService: CompaniesService,
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

    if (application.userId !== userId) {
      const job = await this.jobRepository.findOne({
        where: { id: application.jobId },
        relations: ['company'],
      });
      if (!job || !(await this.companiesService.canUserAccessCompany(userId, job.companyId))) {
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
        'user.dateOfBirth',
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

    if (!application.job || !(await this.companiesService.canUserAccessCompany(userId, application.job.companyId))) {
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

    if (!(await this.companiesService.canUserAccessCompany(userId, job.companyId))) {
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

  /**
   * Pending job applications for recruiter: applications for jobs they have access to where recruiter has not yet filled call date/status/interested.
   */
  async getPendingJobApplicationsForRecruiter(recruiterUserId: number): Promise<ApplicationResponseDto[]> {
    const companyIds = await this.companiesService.getCompanyIdsForUser(recruiterUserId);
    if (!companyIds.length) return [];

    const jobs = await this.jobRepository.find({ where: companyIds.map(id => ({ companyId: id })), select: ['id'] });
    const jobIds = jobs.map(j => j.id);
    if (!jobIds.length) return [];

    const applications = await this.applicationRepository
      .createQueryBuilder('application')
      .innerJoinAndSelect('application.job', 'job')
      .innerJoinAndSelect('job.company', 'company')
      .where('application.jobId IN (:...jobIds)', { jobIds })
      .andWhere('application.recruiter_call_date IS NULL')
      .orderBy('application.createdAt', 'DESC')
      .getMany();

    const userIds = applications.map(app => app.userId).filter((id, i, a) => a.indexOf(id) === i);
    if (userIds.length > 0) {
      const users = await this.userRepository
        .createQueryBuilder('user')
        .select([
          'user.id', 'user.firstName', 'user.lastName', 'user.email', 'user.phone', 'user.location', 'user.avatar',
          'user.dateOfBirth', 'user.role', 'user.bio', 'user.experience', 'user.education', 'user.skills', 'user.technicalSkills',
          'user.functionalSkills', 'user.currentJobTitle', 'user.portfolio', 'user.linkedin', 'user.github',
          'user.resume', 'user.salaryExpectation', 'user.createdAt', 'user.updatedAt',
        ])
        .where('user.id IN (:...userIds)', { userIds })
        .getMany();
      const userMap = new Map(users.map(u => [u.id, u]));
      applications.forEach(app => { app.user = userMap.get(app.userId); });
    }
    return applications.map((a) => this.formatApplicationResponse(a));
  }

  /**
   * Job portal applications the recruiter has worked on (filled call date/status).
   * Use this for "Recruiter work" / "Candidates" so submissions from Pending Applications appear there.
   */
  async getRecruiterWorkJobApplications(recruiterUserId: number): Promise<ApplicationResponseDto[]> {
    const companyIds = await this.companiesService.getCompanyIdsForUser(recruiterUserId);
    if (!companyIds.length) return [];

    const jobs = await this.jobRepository.find({ where: companyIds.map(id => ({ companyId: id })), select: ['id'] });
    const jobIds = jobs.map(j => j.id);
    if (!jobIds.length) return [];

    const applications = await this.applicationRepository
      .createQueryBuilder('application')
      .innerJoinAndSelect('application.job', 'job')
      .innerJoinAndSelect('job.company', 'company')
      .where('application.jobId IN (:...jobIds)', { jobIds })
      .andWhere('application.recruiter_call_date IS NOT NULL')
      .orderBy('application.recruiter_call_date', 'DESC')
      .addOrderBy('application.createdAt', 'DESC')
      .getMany();

    const userIds = applications.map(app => app.userId).filter((id, i, a) => a.indexOf(id) === i);
    if (userIds.length > 0) {
      const users = await this.userRepository
        .createQueryBuilder('user')
        .select([
          'user.id', 'user.firstName', 'user.lastName', 'user.email', 'user.phone', 'user.location', 'user.avatar',
          'user.dateOfBirth', 'user.role', 'user.bio', 'user.experience', 'user.education', 'user.skills', 'user.technicalSkills',
          'user.functionalSkills', 'user.currentJobTitle', 'user.portfolio', 'user.linkedin', 'user.github',
          'user.resume', 'user.salaryExpectation', 'user.createdAt', 'user.updatedAt',
        ])
        .where('user.id IN (:...userIds)', { userIds })
        .getMany();
      const userMap = new Map(users.map(u => [u.id, u]));
      applications.forEach(app => { app.user = userMap.get(app.userId); });
    }
    return applications.map((a) => this.formatApplicationResponse(a));
  }

  /**
   * Recruiter fills call date, call status, interested for a job application (Pending Applications flow).
   */
  async updateRecruiterCall(id: number, recruiterUserId: number, dto: UpdateRecruiterCallDto): Promise<ApplicationResponseDto> {
    const application = await this.applicationRepository
      .createQueryBuilder('application')
      .innerJoinAndSelect('application.job', 'job')
      .innerJoinAndSelect('job.company', 'company')
      .where('application.id = :id', { id })
      .getOne();

    if (!application) throw new NotFoundException('Application not found');
    if (!(await this.companiesService.canUserAccessCompany(recruiterUserId, application.job.companyId))) {
      throw new ForbiddenException('You can only update applications for jobs you have access to');
    }

    const callDate = dto.callDate ? new Date(dto.callDate) : null;
    const rawStatus = (dto.callStatus ?? '').trim();
    const callStatusNormalized = rawStatus === 'Connected' ? 'Connected' : rawStatus || null;

    if (callStatusNormalized === 'Connected' && (dto.interested !== true && dto.interested !== false)) {
      throw new BadRequestException('Interested is required when Call status is Connected');
    }

    const updatePayload: Partial<JobApplication> = {
      recruiterCallDate: callDate,
      recruiterCallStatus: callStatusNormalized,
      recruiterInterested: dto.interested ?? null,
    };
    // So employer sees status change on job portal: move from pending to reviewing when recruiter fills call details
    if (application.status === ApplicationStatus.PENDING) {
      updatePayload.status = ApplicationStatus.REVIEWING;
    }
    await this.applicationRepository.update(id, updatePayload);

    const updated = await this.applicationRepository
      .createQueryBuilder('application')
      .innerJoinAndSelect('application.job', 'job')
      .innerJoinAndSelect('job.company', 'company')
      .where('application.id = :id', { id })
      .getOne();
    if (!updated) throw new NotFoundException('Application not found after update');

    const user = await this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id', 'user.firstName', 'user.lastName', 'user.email', 'user.phone', 'user.location', 'user.avatar',
        'user.role', 'user.bio', 'user.experience', 'user.education', 'user.skills', 'user.technicalSkills',
        'user.functionalSkills', 'user.currentJobTitle', 'user.portfolio', 'user.linkedin', 'user.github',
        'user.resume', 'user.salaryExpectation', 'user.createdAt', 'user.updatedAt',
      ])
      .where('user.id = :userId', { userId: updated.userId })
      .getOne();
    updated.user = user || undefined;
    return this.formatApplicationResponse(updated);
  }

  /**
   * Full recruiter update for job portal application (Edit Candidate modal).
   * Accepts snake_case payload; persists all provided fields. Used by PATCH /api/recruiter/applications/:id.
   */
  async updateRecruiterApplication(
    id: number,
    recruiterUserId: number,
    payload: {
      portal?: string | null;
      assigned_date?: string | null;
      call_date?: string | null;
      call_status?: string | null;
      interested_status?: string | null;
      not_interested_remark?: string | null;
      interview_scheduled?: boolean;
      interview_date?: string | null;
      turnup?: boolean | null;
      interview_status?: string | null;
      selection_status?: string | null;
      joining_status?: string | null;
      joining_date?: string | null;
      expected_joining_date?: string | null;
      backout_date?: string | null;
      backout_reason?: string | null;
      hiring_manager_feedback?: string | null;
      followup_date?: string | null;
      notes?: string | null;
    },
  ): Promise<ApplicationResponseDto> {
    const application = await this.applicationRepository
      .createQueryBuilder('application')
      .innerJoinAndSelect('application.job', 'job')
      .innerJoinAndSelect('job.company', 'company')
      .where('application.id = :id', { id })
      .getOne();

    if (!application) throw new NotFoundException('Application not found');
    if (!(await this.companiesService.canUserAccessCompany(recruiterUserId, application.job.companyId))) {
      throw new ForbiddenException('You can only update applications for jobs you have access to');
    }

    const rawStatus = (payload.call_status ?? '').trim();
    const callStatusNormalized = rawStatus === 'Connected' ? 'Connected' : rawStatus || null;
    if (callStatusNormalized === 'Connected') {
      const interested = payload.interested_status;
      if (interested !== 'Yes' && interested !== 'No') {
        throw new BadRequestException('Interested is required when Call status is Connected');
      }
    }
    const interestedBool =
      payload.interested_status === 'Yes' ? true : payload.interested_status === 'No' ? false : null;

    const updatePayload: Partial<JobApplication> = {};
    if (payload.portal !== undefined) updatePayload.portal = payload.portal ?? undefined;
    if (payload.assigned_date !== undefined) updatePayload.assignedDate = payload.assigned_date ? new Date(payload.assigned_date) : null;
    if (payload.call_date !== undefined) updatePayload.recruiterCallDate = payload.call_date ? new Date(payload.call_date) : null;
    if (payload.call_status !== undefined) updatePayload.recruiterCallStatus = callStatusNormalized;
    if (payload.interested_status !== undefined) updatePayload.recruiterInterested = interestedBool;
    if (payload.not_interested_remark !== undefined) updatePayload.notInterestedRemark = payload.not_interested_remark ?? undefined;
    if (payload.interview_scheduled !== undefined) updatePayload.interviewScheduled = payload.interview_scheduled;
    if (payload.interview_date !== undefined) updatePayload.interviewDate = payload.interview_date ? new Date(payload.interview_date) : null;
    if (payload.turnup !== undefined) updatePayload.turnup = payload.turnup;
    if (payload.interview_status !== undefined) updatePayload.interviewStatus = payload.interview_status ?? undefined;
    if (payload.selection_status !== undefined) updatePayload.selectionStatus = payload.selection_status ?? undefined;
    if (payload.joining_status !== undefined) updatePayload.joiningStatus = payload.joining_status ?? undefined;
    if (payload.joining_date !== undefined) updatePayload.joiningDate = payload.joining_date ? new Date(payload.joining_date) : null;
    if (payload.expected_joining_date !== undefined) updatePayload.expectedJoiningDate = payload.expected_joining_date ? new Date(payload.expected_joining_date) : null;
    if (payload.backout_date !== undefined) updatePayload.backoutDate = payload.backout_date ? new Date(payload.backout_date) : null;
    if (payload.backout_reason !== undefined) updatePayload.backoutReason = payload.backout_reason ?? undefined;
    if (payload.hiring_manager_feedback !== undefined) updatePayload.hiringManagerFeedback = payload.hiring_manager_feedback ?? undefined;
    if (payload.followup_date !== undefined) updatePayload.followupDate = payload.followup_date ? new Date(payload.followup_date) : null;
    if (payload.notes !== undefined) updatePayload.recruiterNotes = payload.notes ?? undefined;

    if (application.status === ApplicationStatus.PENDING && (payload.call_date != null || payload.call_status != null)) {
      updatePayload.status = ApplicationStatus.REVIEWING;
    }
    // Sync selection_status to job portal status so employer sees it
    if (payload.selection_status === 'Selected') {
      updatePayload.status = ApplicationStatus.SHORTLISTED;
    } else if (payload.selection_status === 'Not Selected') {
      updatePayload.status = ApplicationStatus.REJECTED;
    }

    if (Object.keys(updatePayload).length > 0) {
      await this.applicationRepository.update(id, updatePayload);
    }

    const updated = await this.applicationRepository
      .createQueryBuilder('application')
      .innerJoinAndSelect('application.job', 'job')
      .innerJoinAndSelect('job.company', 'company')
      .where('application.id = :id', { id })
      .getOne();
    if (!updated) throw new NotFoundException('Application not found after update');

    const user = await this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id', 'user.firstName', 'user.lastName', 'user.email', 'user.phone', 'user.dateOfBirth', 'user.location', 'user.avatar',
        'user.role', 'user.bio', 'user.experience', 'user.education', 'user.skills', 'user.technicalSkills',
        'user.functionalSkills', 'user.currentJobTitle', 'user.portfolio', 'user.linkedin', 'user.github',
        'user.resume', 'user.salaryExpectation', 'user.createdAt', 'user.updatedAt',
      ])
      .where('user.id = :userId', { userId: updated.userId })
      .getOne();
    updated.user = user || undefined;
    return this.formatApplicationResponse(updated);
  }

  /**
   * Extract filename from various path formats
   * Handles: 
   * - Local paths: "filename.docx", "/uploads/Resumes/filename.docx", "Resumes/filename.docx"
   * - Google Drive URLs: Returns full URL (frontend can use it directly)
   * - Other URLs: Returns full URL (frontend can use it directly)
   */
  private extractFilename(resumePath: string | null | undefined): string | undefined {
    if (!resumePath) return undefined;
    
    // Handle Google Drive URLs and other external URLs
    // Return the full URL so frontend can use it directly
    // Download API only works with local files, so external URLs should be returned as-is
    if (resumePath.startsWith('http://') || resumePath.startsWith('https://')) {
      return resumePath;
    }
    
    // Handle local paths
    // Remove leading slashes and normalize
    const normalized = resumePath.replace(/^\/+/, '').replace(/\\/g, '/');
    
    // Remove query parameters if any
    const withoutQuery = normalized.split('?')[0];
    
    // Extract filename (last part after slash)
    const parts = withoutQuery.split('/');
    const filename = parts[parts.length - 1];
    
    // Return filename if valid, otherwise return original path
    return filename && filename.length > 0 ? filename : resumePath;
  }

  private formatApplicationResponse(application: JobApplication): ApplicationResponseDto {
    const user = application.user;
    
    // Use candidate contact details from application if provided, otherwise fall back to user profile
    const candidateName = application.candidateName;
    const candidateEmail = application.candidateEmail;
    const candidatePhone = application.candidatePhone;
    
    // Extract filename from resume path/URL for download API compatibility
    const resumeFilename = application.resume 
      ? this.extractFilename(application.resume) 
      : undefined;
    
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
        resume: resumeFilename,
        appliedAt: application.createdAt.toISOString(),
        createdAt: application.createdAt.toISOString(),
        updatedAt: application.updatedAt.toISOString(),
        recruiterCallDate: application.recruiterCallDate ? String(application.recruiterCallDate).split('T')[0] : null,
        recruiterCallStatus: application.recruiterCallStatus ?? null,
        recruiterInterested: application.recruiterInterested ?? null,
        portal: application.portal ?? null,
        assignedDate: application.assignedDate ? String(application.assignedDate).split('T')[0] : null,
        recruiterNotes: application.recruiterNotes ?? null,
        notInterestedRemark: application.notInterestedRemark ?? null,
        interviewScheduled: application.interviewScheduled ?? null,
        interviewDate: application.interviewDate ? String(application.interviewDate).split('T')[0] : null,
        turnup: application.turnup ?? null,
        interviewStatus: application.interviewStatus ?? null,
        selectionStatus: application.selectionStatus ?? null,
        joiningStatus: application.joiningStatus ?? null,
        joiningDate: application.joiningDate ? String(application.joiningDate).split('T')[0] : null,
        backoutDate: application.backoutDate ? String(application.backoutDate).split('T')[0] : null,
        backoutReason: application.backoutReason ?? null,
        hiringManagerFeedback: application.hiringManagerFeedback ?? null,
        followupDate: application.followupDate ? String(application.followupDate).split('T')[0] : null,
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
      resume: resumeFilename,
      appliedAt: application.createdAt.toISOString(),
      createdAt: application.createdAt.toISOString(),
      updatedAt: application.updatedAt.toISOString(),
      recruiterCallDate: application.recruiterCallDate ? String(application.recruiterCallDate).split('T')[0] : null,
      recruiterCallStatus: application.recruiterCallStatus ?? null,
      recruiterInterested: application.recruiterInterested ?? null,
      portal: application.portal ?? null,
      assignedDate: application.assignedDate ? String(application.assignedDate).split('T')[0] : null,
      recruiterNotes: application.recruiterNotes ?? null,
      notInterestedRemark: application.notInterestedRemark ?? null,
      interviewScheduled: application.interviewScheduled ?? null,
      interviewDate: application.interviewDate ? String(application.interviewDate).split('T')[0] : null,
      turnup: application.turnup ?? null,
      interviewStatus: application.interviewStatus ?? null,
      selectionStatus: application.selectionStatus ?? null,
      joiningStatus: application.joiningStatus ?? null,
      joiningDate: application.joiningDate ? String(application.joiningDate).split('T')[0] : null,
      backoutDate: application.backoutDate ? String(application.backoutDate).split('T')[0] : null,
      backoutReason: application.backoutReason ?? null,
      hiringManagerFeedback: application.hiringManagerFeedback ?? null,
      followupDate: application.followupDate ? String(application.followupDate).split('T')[0] : null,
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
