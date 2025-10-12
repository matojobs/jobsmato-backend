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
export class PersonalDriveUploadService {
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
  private readonly targetFolderId = '1Amq5HzoVdKaRp0gtzIkKg4aibIexOePz'; // Your folder ID

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
        scopes: [
          'https://www.googleapis.com/auth/drive.file',
          'https://www.googleapis.com/auth/drive'
        ],
      });

      this.drive = google.drive({ version: 'v3', auth });
      console.log('✅ Google Drive API initialized for personal folder uploads');
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

      // Convert buffer to stream
      const fileStream = new Readable();
      fileStream.push(file.buffer);
      fileStream.push(null);

      // Create a subfolder in your target folder
      const subfolderId = await this.createSubfolderIfNotExists(folderName);

      // Upload file to the subfolder
      const response = await this.drive.files.create({
        requestBody: {
          name: file.originalname,
          parents: [subfolderId],
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
      
      // If upload fails due to permissions, provide helpful error message
      if (error.message.includes('insufficient authentication') || 
          error.message.includes('permission denied')) {
        throw new InternalServerErrorException(
          'Cannot upload to personal Google Drive folder. Please set up a shared drive or use local storage.'
        );
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

  private async createSubfolderIfNotExists(folderName: string): Promise<string> {
    try {
      // Check if subfolder already exists in the target folder
      const response = await this.drive.files.list({
        q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and parents in '${this.targetFolderId}'`,
        fields: 'files(id,name)',
      });

      if (response.data.files && response.data.files.length > 0) {
        return response.data.files[0].id;
      }

      // Create subfolder in the target folder
      const folderResponse = await this.drive.files.create({
        requestBody: {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [this.targetFolderId],
        },
        fields: 'id',
      });

      return folderResponse.data.id;
    } catch (error) {
      console.error('Create subfolder error:', error);
      // If we can't create subfolders, use the main folder
      return this.targetFolderId;
    }
  }

  getMaxFileSize(): number {
    return this.maxFileSize;
  }

  getAllowedMimeTypes(): string[] {
    return this.allowedMimeTypes;
  }
}
