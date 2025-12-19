import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { User, UserRole } from '../../entities/user.entity';
import { JobApplication } from '../../entities/job-application.entity';
import { Company } from '../../entities/company.entity';
import { Job } from '../../entities/job.entity';

@Injectable()
export class FilesService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads');
  private readonly logger = new Logger(FilesService.name);

  constructor(
    @InjectRepository(JobApplication)
    private applicationRepository: Repository<JobApplication>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    @InjectRepository(Job)
    private jobRepository: Repository<Job>,
  ) {}

  async checkDownloadPermission(user: User, filename: string): Promise<boolean> {
    // Admin can download any resume
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // Helper function to extract filename from resume path and compare
    const matchesFilename = (resumePath: string | null | undefined): boolean => {
      if (!resumePath) return false;
      
      // Extract filename from path (handles /uploads/Resumes/filename.docx or just filename.docx)
      const extractedFilename = this.extractFilename(resumePath);
      const cleanRequestFilename = this.extractFilename(filename);
      
      // Compare filenames (case-insensitive)
      return extractedFilename.toLowerCase() === cleanRequestFilename.toLowerCase() ||
             resumePath.includes(filename) || 
             resumePath.endsWith(filename);
    };

    // Job seeker can download their own resume
    if (user.role === UserRole.JOB_SEEKER) {
      // Check if resume belongs to user's profile
      const userProfile = await this.userRepository.findOne({
        where: { id: user.id },
      });

      if (matchesFilename(userProfile?.resume)) {
        return true;
      }

      // Check if resume belongs to any of user's applications
      const userApplications = await this.applicationRepository.find({
        where: { userId: user.id },
      });

      for (const app of userApplications) {
        if (matchesFilename(app.resume)) {
          return true;
        }
      }

      return false;
    }

    // Employer can download resumes of candidates who applied to their jobs
    if (user.role === UserRole.EMPLOYER) {
      // Get employer's company
      const company = await this.companyRepository.findOne({
        where: { userId: user.id },
      });

      if (!company) {
        return false;
      }

      // Find all applications for employer's jobs
      const applications = await this.applicationRepository
        .createQueryBuilder('application')
        .innerJoinAndSelect('application.job', 'job')
        .where('job.companyId = :companyId', { companyId: company.id })
        .getMany();

      // Check if any application has this resume
      for (const app of applications) {
        if (matchesFilename(app.resume)) {
          return true;
        }
      }

      return false;
    }

    return false;
  }

  /**
   * Extract filename from various path formats
   * Handles: "filename.docx", "/uploads/Resumes/filename.docx", "Resumes/filename.docx"
   */
  private extractFilename(resumePath: string): string {
    if (!resumePath) return '';
    
    // Remove leading slashes and normalize
    const normalized = resumePath.replace(/^\/+/, '').replace(/\\/g, '/');
    
    // Extract filename (last part after slash)
    const parts = normalized.split('/');
    return parts[parts.length - 1];
  }

  async getResumeFile(filename: string): Promise<{
    stream: fs.ReadStream;
    filename: string;
    contentType: string;
    size: number;
  }> {
    // Extract just the filename in case full path was passed
    const cleanFilename = this.extractFilename(filename);
    
    if (!cleanFilename) {
      throw new NotFoundException('Resume file not found');
    }

    // Try different possible paths
    const possiblePaths = [
      path.join(this.uploadDir, 'Resumes', cleanFilename),
      path.join(this.uploadDir, 'Resumes', filename), // Original filename
      path.join(this.uploadDir, cleanFilename),
      path.join(this.uploadDir, filename), // Original filename
    ];

    let filePath: string | null = null;
    for (const possiblePath of possiblePaths) {
      try {
        if (fs.existsSync(possiblePath)) {
          const stats = fs.statSync(possiblePath);
          if (stats.isFile()) {
            filePath = possiblePath;
            break;
          }
        }
      } catch (error) {
        // Continue to next path
        continue;
      }
    }

    if (!filePath) {
      // Log for debugging
      this.logger.error(`Resume file not found: ${filename}`);
      this.logger.debug(`Cleaned filename: ${cleanFilename}`);
      this.logger.debug(`Searched paths: ${possiblePaths.join(', ')}`);
      this.logger.debug(`Upload directory: ${this.uploadDir}`);
      this.logger.debug(`Upload directory exists: ${fs.existsSync(this.uploadDir)}`);
      
      if (fs.existsSync(this.uploadDir)) {
        try {
          const resumesDir = path.join(this.uploadDir, 'Resumes');
          if (fs.existsSync(resumesDir)) {
            const files = fs.readdirSync(resumesDir);
            this.logger.debug(`Files in Resumes directory (${files.length} total): ${files.slice(0, 10).join(', ')}`);
          } else {
            this.logger.debug(`Resumes directory does not exist: ${resumesDir}`);
          }
        } catch (error) {
          this.logger.error(`Error reading Resumes directory: ${error.message}`);
        }
      }
      
      throw new NotFoundException('Resume file not found');
    }

    // Get file stats
    const stats = fs.statSync(filePath);

    // Determine content type
    const ext = path.extname(cleanFilename).toLowerCase();
    const contentTypes: { [key: string]: string } = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    const contentType = contentTypes[ext] || 'application/octet-stream';

    // Create read stream
    const stream = fs.createReadStream(filePath);

    return {
      stream,
      filename: cleanFilename,
      contentType,
      size: stats.size,
    };
  }
}

