import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { UploadService, UploadResult } from './upload.service';
import { LocalUploadService } from './local-upload.service';
import { OAuthDriveUploadService } from './oauth-drive-upload.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';

@ApiTags('upload')
@Controller('upload')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadController {
  constructor(
    @Inject('UploadService') private readonly uploadService: UploadService | LocalUploadService | OAuthDriveUploadService
  ) {}

  @Post('file')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a file to Google Drive' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File to upload',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        folder: {
          type: 'string',
          description: 'Folder name in Google Drive (optional)',
          example: 'Resumes',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            fileId: { type: 'string' },
            fileName: { type: 'string' },
            fileUrl: { type: 'string' },
            mimeType: { type: 'string' },
            size: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid file or file too large' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ): Promise<{ success: boolean; data: UploadResult }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Create folder name based on user role
    const folderName = user.role === 'employer' ? 'Company Documents' : 'User Documents';
    
    const result = await this.uploadService.uploadFile(file, folderName);
    
    return {
      success: true,
      data: result,
    };
  }

  @Post('resume')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a resume file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Resume file to upload',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Resume uploaded successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid file or file too large' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async uploadResume(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ): Promise<{ success: boolean; data: UploadResult }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate that it's a document file for resumes
    const allowedResumeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];

    if (!allowedResumeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only PDF, DOC, and DOCX files are allowed for resumes');
    }

    const result = await this.uploadService.uploadFile(file, 'Resumes');
    
    return {
      success: true,
      data: result,
    };
  }

  @Post('company-logo')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a company logo' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Company logo image to upload',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Company logo uploaded successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid file or file too large' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async uploadCompanyLogo(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ): Promise<{ success: boolean; data: UploadResult }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate that it's an image file
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif'];

    if (!allowedImageTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, and GIF images are allowed for company logos');
    }

    const result = await this.uploadService.uploadFile(file, 'Company Logos');
    
    return {
      success: true,
      data: result,
    };
  }

  @Delete(':fileId')
  @ApiOperation({ summary: 'Delete a file from Google Drive' })
  @ApiResponse({
    status: 200,
    description: 'File deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'File not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteFile(
    @Param('fileId') fileId: string,
    @CurrentUser() user: User,
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.uploadService.deleteFile(fileId);
      return {
        success: true,
        message: 'File deleted successfully',
      };
    } catch (error) {
      throw new NotFoundException('File not found or could not be deleted');
    }
  }

  @Get(':fileId')
  @ApiOperation({ summary: 'Get file information' })
  @ApiResponse({
    status: 200,
    description: 'File information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            webViewLink: { type: 'string' },
            size: { type: 'string' },
            mimeType: { type: 'string' },
            createdTime: { type: 'string' },
            modifiedTime: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'File not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getFileInfo(
    @Param('fileId') fileId: string,
    @CurrentUser() user: User,
  ): Promise<{ success: boolean; data: any }> {
    try {
      const fileInfo = await this.uploadService.getFileInfo(fileId);
      return {
        success: true,
        data: fileInfo,
      };
    } catch (error) {
      throw new NotFoundException('File not found');
    }
  }

  @Get('limits/info')
  @ApiOperation({ summary: 'Get upload limits and allowed file types' })
  @ApiResponse({
    status: 200,
    description: 'Upload limits retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            maxFileSize: { type: 'number' },
            maxFileSizeMB: { type: 'number' },
            allowedMimeTypes: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  })
  async getUploadLimits(): Promise<{
    success: boolean;
    data: {
      maxFileSize: number;
      maxFileSizeMB: number;
      allowedMimeTypes: string[];
    };
  }> {
    return {
      success: true,
      data: {
        maxFileSize: this.uploadService.getMaxFileSize(),
        maxFileSizeMB: this.uploadService.getMaxFileSize() / (1024 * 1024),
        allowedMimeTypes: this.uploadService.getAllowedMimeTypes(),
      },
    };
  }
}
