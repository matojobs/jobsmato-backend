import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';
import { google } from 'googleapis';
import { ConfigService } from '@nestjs/config';
import { User, UserRole } from '../../entities/user.entity';
import { JobApplication } from '../../entities/job-application.entity';
import { Company } from '../../entities/company.entity';
import { Job } from '../../entities/job.entity';

@Injectable()
export class FilesService {
  private readonly uploadDir = path.join(process.cwd(), 'uploads');
  private readonly logger = new Logger(FilesService.name);
  private drive: any;

  constructor(
    @InjectRepository(JobApplication)
    private applicationRepository: Repository<JobApplication>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    @InjectRepository(Job)
    private jobRepository: Repository<Job>,
    private configService: ConfigService,
  ) {
    this.initializeGoogleDrive();
  }

  private getOAuthCredentials(): { clientId: string; clientSecret: string } | null {
    const credentialsPath = path.join(process.cwd(), 'credentials.json');
    if (!fs.existsSync(credentialsPath)) {
      return null;
    }
    
    try {
      const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
      if (credentials.installed) {
        return {
          clientId: credentials.installed.client_id,
          clientSecret: credentials.installed.client_secret,
        };
      } else if (credentials.web) {
        return {
          clientId: credentials.web.client_id,
          clientSecret: credentials.web.client_secret,
        };
      }
    } catch (error) {
      this.logger.warn('Failed to parse OAuth credentials:', error);
    }
    return null;
  }

  private async initializeGoogleDrive() {
    try {
      // Try OAuth first (same as upload service)
      const credentialsPath = path.join(process.cwd(), 'credentials.json');
      const tokenPath = path.join(process.cwd(), 'token.json');

      if (fs.existsSync(credentialsPath) && fs.existsSync(tokenPath)) {
        // Use OAuth (same as upload service)
        const oauthCreds = this.getOAuthCredentials();
        if (oauthCreds) {
          const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
          const auth = new google.auth.OAuth2(oauthCreds.clientId, oauthCreds.clientSecret);
          auth.setCredentials(token);
          
          // Set up automatic token refresh
          auth.on('tokens', (tokens) => {
            if (tokens.refresh_token) {
              token.refresh_token = tokens.refresh_token;
            }
            token.access_token = tokens.access_token;
            token.expiry_date = tokens.expiry_date;
            token.expires_in = tokens.expiry_date
              ? Math.floor((tokens.expiry_date - Date.now()) / 1000)
              : 3600;
            
            try {
              fs.writeFileSync(tokenPath, JSON.stringify(token, null, 2));
              this.logger.log('OAuth token automatically refreshed for downloads');
            } catch (error) {
              this.logger.warn('Failed to save refreshed token:', error);
            }
          });

          this.drive = google.drive({ version: 'v3', auth });
          this.logger.log('Google Drive API initialized with OAuth for file downloads');
          return;
        }
      }

      // Fallback to service account if OAuth not available
      const clientEmail = this.configService.get<string>('GOOGLE_DRIVE_CLIENT_EMAIL');
      const privateKey = this.configService.get<string>('GOOGLE_DRIVE_PRIVATE_KEY');
      
      if (clientEmail && privateKey) {
        const auth = new google.auth.GoogleAuth({
          credentials: {
            client_email: clientEmail,
            private_key: privateKey.replace(/\\n/g, '\n'),
          },
          scopes: ['https://www.googleapis.com/auth/drive.readonly'],
        });

        this.drive = google.drive({ version: 'v3', auth });
        this.logger.log('Google Drive API initialized with service account for file downloads');
        return;
      }

      // No credentials available
      this.logger.warn('No Google Drive credentials found. Local file downloads only.');
      this.drive = null;
    } catch (error) {
      this.logger.warn('Failed to initialize Google Drive API. Local file downloads only.', error);
      this.drive = null;
    }
  }

  /**
   * Extract Google Drive file ID from URL
   * Handles formats:
   * - https://drive.google.com/file/d/FILE_ID/view?usp=drivesdk
   * - https://drive.google.com/open?id=FILE_ID
   */
  private extractGoogleDriveFileId(url: string): string | null {
    if (!url) return null;

    // Format 1: /file/d/FILE_ID/view
    const match1 = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match1) return match1[1];

    // Format 2: /open?id=FILE_ID
    const match2 = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match2) return match2[1];

    // If it's already just a file ID (no URL)
    if (/^[a-zA-Z0-9_-]+$/.test(url)) {
      return url;
    }

    return null;
  }

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
    stream: Readable;
    filename: string;
    contentType: string;
    size: number;
  }> {
    // Check if it's a Google Drive URL or file ID
    const decodedFilename = decodeURIComponent(filename);
    const googleDriveFileId = this.extractGoogleDriveFileId(decodedFilename);

    if (googleDriveFileId) {
      if (!this.drive) {
        this.logger.error('Google Drive API not initialized. Missing credentials?');
        throw new NotFoundException('Google Drive service not available. Please check server configuration.');
      }
      // Download from Google Drive
      return await this.getResumeFromGoogleDrive(googleDriveFileId);
    }

    // Try local file system
    return await this.getResumeFromLocalFile(filename);
  }

  private async getResumeFromGoogleDrive(fileId: string): Promise<{
    stream: Readable;
    filename: string;
    contentType: string;
    size: number;
  }> {
    try {
      // Get file metadata
      const fileMetadata = await this.drive.files.get({
        fileId: fileId,
        fields: 'id,name,mimeType,size',
      });

      const fileName = fileMetadata.data.name || 'resume.pdf';
      const mimeType = fileMetadata.data.mimeType || 'application/pdf';
      const fileSize = parseInt(fileMetadata.data.size) || 0;

      // Download file content
      const response = await this.drive.files.get(
        {
          fileId: fileId,
          alt: 'media',
        },
        { responseType: 'stream' }
      );

      return {
        stream: response.data,
        filename: fileName,
        contentType: mimeType,
        size: fileSize,
      };
    } catch (error) {
      this.logger.error(`Failed to download file from Google Drive: ${error.message}`, error.stack);
      
      // Provide more specific error messages
      if (error.code === 404 || error.message?.includes('File not found')) {
        throw new NotFoundException('Resume file not found in Google Drive');
      }
      if (error.code === 403 || error.message?.includes('Permission denied')) {
        this.logger.error(`Permission denied for file ${fileId}. Service account may not have access.`);
        throw new NotFoundException('Resume file not accessible. Service account may not have permission.');
      }
      if (error.code === 401 || error.message?.includes('Invalid Credentials')) {
        this.logger.error('Google Drive authentication failed. Check credentials.');
        throw new NotFoundException('Google Drive authentication failed. Please contact administrator.');
      }
      
      // Generic error
      throw new NotFoundException(`Failed to download resume from Google Drive: ${error.message}`);
    }
  }

  private async getResumeFromLocalFile(filename: string): Promise<{
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

