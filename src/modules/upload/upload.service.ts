import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { Readable } from 'stream';

export interface UploadResult {
  fileId: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  size: number;
}

@Injectable()
export class UploadService {
  private drive: any;
  private readonly maxFileSize = 5 * 1024 * 1024; // 5MB
  private readonly allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/plain'
  ];

  constructor(private configService: ConfigService) {
    this.initializeGoogleDrive();
  }

  private async initializeGoogleDrive() {
    try {
      const auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: this.configService.get<string>('GOOGLE_DRIVE_CLIENT_EMAIL'),
          private_key: this.configService.get<string>('GOOGLE_DRIVE_PRIVATE_KEY')?.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/drive.file'],
      });

      this.drive = google.drive({ version: 'v3', auth });
    } catch (error) {
      console.error('Failed to initialize Google Drive:', error);
      throw new InternalServerErrorException('Google Drive service initialization failed');
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    folderName: string = 'Jobsmato Uploads'
  ): Promise<UploadResult> {
    try {
      // Validate file size
      if (file.size > this.maxFileSize) {
        throw new BadRequestException(`File size exceeds 5MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      }

      // Validate file type
      if (!this.allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException(`File type ${file.mimetype} is not allowed`);
      }

      // Create folder if it doesn't exist
      const folderId = await this.createFolderIfNotExists(folderName);

      // Convert buffer to stream
      const fileStream = new Readable();
      fileStream.push(file.buffer);
      fileStream.push(null);

      // Upload file to Google Drive
      const response = await this.drive.files.create({
        requestBody: {
          name: file.originalname,
          parents: [folderId],
        },
        media: {
          mimeType: file.mimetype,
          body: fileStream,
        },
        fields: 'id,name,webViewLink,size,mimeType',
      });

      const uploadedFile = response.data;

      return {
        fileId: uploadedFile.id,
        fileName: uploadedFile.name,
        fileUrl: uploadedFile.webViewLink,
        mimeType: uploadedFile.mimeType,
        size: parseInt(uploadedFile.size) || file.size,
      };
    } catch (error) {
      console.error('Upload error:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('File upload failed');
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    try {
      await this.drive.files.delete({
        fileId: fileId,
      });
    } catch (error) {
      console.error('Delete error:', error);
      throw new InternalServerErrorException('File deletion failed');
    }
  }

  async getFileInfo(fileId: string): Promise<any> {
    try {
      const response = await this.drive.files.get({
        fileId: fileId,
        fields: 'id,name,webViewLink,size,mimeType,createdTime,modifiedTime',
      });
      return response.data;
    } catch (error) {
      console.error('Get file info error:', error);
      throw new InternalServerErrorException('Failed to get file information');
    }
  }

  private async createFolderIfNotExists(folderName: string): Promise<string> {
    try {
      // For now, we'll use a simple approach - create folders in the service account's drive
      // In production, you might want to use a shared drive or OAuth delegation
      
      // Check if folder already exists
      const response = await this.drive.files.list({
        q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder'`,
        fields: 'files(id,name)',
      });

      if (response.data.files && response.data.files.length > 0) {
        return response.data.files[0].id;
      }

      // Create folder if it doesn't exist
      const folderResponse = await this.drive.files.create({
        requestBody: {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
        },
        fields: 'id',
      });

      return folderResponse.data.id;
    } catch (error) {
      console.error('Create folder error:', error);
      // If folder creation fails due to quota issues, we'll use a fallback approach
      console.log('Using fallback approach for file storage...');
      return 'root'; // Use root directory as fallback
    }
  }

  getMaxFileSize(): number {
    return this.maxFileSize;
  }

  getAllowedMimeTypes(): string[] {
    return this.allowedMimeTypes;
  }
}
