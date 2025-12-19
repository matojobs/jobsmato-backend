import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

export interface UploadResult {
  fileId: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  size: number;
}

@Injectable()
export class LocalUploadService {
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
  private readonly uploadDir = path.join(process.cwd(), 'uploads');

  constructor(private configService: ConfigService) {
    this.ensureUploadDirectory();
  }

  private ensureUploadDirectory() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
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
      const folderPath = path.join(this.uploadDir, folderName);
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath, { recursive: true });
      }

      // Generate unique filename
      const timestamp = Date.now();
      const fileExtension = path.extname(file.originalname);
      const baseName = path.basename(file.originalname, fileExtension);
      const fileName = `${baseName}_${timestamp}${fileExtension}`;
      const filePath = path.join(folderPath, fileName);

      // Save file
      fs.writeFileSync(filePath, file.buffer);

      // Generate file URL (relative to the server)
      const fileUrl = `/uploads/${folderName}/${fileName}`;

      return {
        fileId: fileName,
        fileName: file.originalname,
        fileUrl: fileUrl,
        mimeType: file.mimetype,
        size: file.size,
      };
    } catch (error) {
      console.error('Local upload error:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new InternalServerErrorException('File upload failed');
    }
  }

  async deleteFile(fileId: string): Promise<void> {
    try {
      // Find the file in all subdirectories
      const files = this.getAllFiles();
      const fileToDelete = files.find(f => f.endsWith(fileId));
      
      if (fileToDelete) {
        fs.unlinkSync(fileToDelete);
      } else {
        throw new Error('File not found');
      }
    } catch (error) {
      console.error('Delete error:', error);
      throw new InternalServerErrorException('File deletion failed');
    }
  }

  async getFileInfo(fileId: string): Promise<any> {
    try {
      const files = this.getAllFiles();
      const filePath = files.find(f => f.endsWith(fileId));
      
      if (!filePath) {
        throw new Error('File not found');
      }

      const stats = fs.statSync(filePath);
      const fileName = path.basename(filePath);
      const relativePath = path.relative(this.uploadDir, filePath);
      
      return {
        id: fileId,
        name: fileName,
        webViewLink: `/uploads/${relativePath}`,
        size: stats.size.toString(),
        mimeType: this.getMimeType(fileName),
        createdTime: stats.birthtime.toISOString(),
        modifiedTime: stats.mtime.toISOString(),
      };
    } catch (error) {
      console.error('Get file info error:', error);
      throw new InternalServerErrorException('Failed to get file information');
    }
  }

  private getAllFiles(): string[] {
    const files: string[] = [];
    
    const scanDirectory = (dir: string) => {
      const items = fs.readdirSync(dir);
      
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          scanDirectory(fullPath);
        } else {
          files.push(fullPath);
        }
      }
    };
    
    scanDirectory(this.uploadDir);
    return files;
  }

  private getMimeType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.txt': 'text/plain',
    };
    
    return mimeTypes[ext] || 'application/octet-stream';
  }

  async uploadFileToFolder(
    file: Express.Multer.File,
    folderId?: string
  ): Promise<{
    fileId: string;
    webViewLink: string;
    webContentLink?: string;
    thumbnailLink?: string;
    name: string;
    mimeType: string;
    size: number;
  }> {
    // Local storage fallback - ignore folderId, use default folder
    const result = await this.uploadFile(file, 'Jobsmato Uploads');
    
    // Generate full URL for local storage
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5000';
    const fullUrl = `${baseUrl}${result.fileUrl}`;
    
    return {
      fileId: result.fileId,
      webViewLink: fullUrl,
      webContentLink: fullUrl,
      thumbnailLink: file.mimetype.startsWith('image/') ? fullUrl : undefined,
      name: result.fileName,
      mimeType: result.mimeType,
      size: result.size,
    };
  }

  getMaxFileSize(): number {
    return this.maxFileSize;
  }

  getAllowedMimeTypes(): string[] {
    return this.allowedMimeTypes;
  }
}
