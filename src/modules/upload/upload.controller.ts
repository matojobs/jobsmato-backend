import {
  Controller,
  Post,
  Delete,
  Get,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
  NotFoundException,
  Inject,
  Req,
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
import { CloudinaryService } from './cloudinary.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';

@ApiTags('upload')
@Controller('upload')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadController {
  constructor(
    @Inject('UploadService') private readonly uploadService: UploadService | LocalUploadService | OAuthDriveUploadService,
    private readonly cloudinaryService: CloudinaryService,
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
  @ApiOperation({ summary: 'Upload a company logo (uses Cloudinary if configured, otherwise falls back to Google Drive)' })
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
        useCloudinary: {
          type: 'boolean',
          description: 'Force use Cloudinary (default: true if configured)',
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
    @Query('useCloudinary') useCloudinary?: string,
    @CurrentUser() user?: User,
  ): Promise<{ success: boolean; data: UploadResult | any }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate that it's an image file
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (!allowedImageTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, GIF, and WebP images are allowed for company logos');
    }

    // Check if Cloudinary is configured and should be used
    const shouldUseCloudinary = useCloudinary !== 'false' && 
      process.env.CLOUDINARY_CLOUD_NAME && 
      process.env.CLOUDINARY_API_KEY && 
      process.env.CLOUDINARY_API_SECRET;

    if (shouldUseCloudinary) {
      // Use Cloudinary for image upload
      const cloudinaryResult = await this.cloudinaryService.uploadCompanyLogo(file);
      
      return {
        success: true,
        data: {
          fileId: cloudinaryResult.publicId,
          fileName: file.originalname,
          fileUrl: cloudinaryResult.secureUrl,
          mimeType: file.mimetype,
          size: cloudinaryResult.bytes,
          // Additional Cloudinary-specific fields
          publicId: cloudinaryResult.publicId,
          secureUrl: cloudinaryResult.secureUrl,
          width: cloudinaryResult.width,
          height: cloudinaryResult.height,
          format: cloudinaryResult.format,
        },
      };
    }

    // Fallback to existing upload service (Google Drive)
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

  @Post('google-drive')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a file to Google Drive with optional folder ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File to upload to Google Drive',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        folderId: {
          type: 'string',
          description: 'Optional Google Drive folder ID to upload to',
          example: '1Vy45PqTpaDiNlV8T1SGIy7ZND29E4zhl',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully to Google Drive',
    schema: {
      type: 'object',
      properties: {
        fileId: { type: 'string' },
        webViewLink: { type: 'string' },
        webContentLink: { type: 'string', nullable: true },
        thumbnailLink: { type: 'string', nullable: true },
        name: { type: 'string' },
        mimeType: { type: 'string' },
        size: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid file, file too large, or invalid folder ID' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Upload failed (may fallback to local storage)' })
  async uploadToGoogleDrive(
    @UploadedFile() file: Express.Multer.File,
    @Req() request: any,
    @CurrentUser() user: User,
  ): Promise<{
    fileId: string;
    webViewLink: string;
    webContentLink?: string;
    thumbnailLink?: string;
    name: string;
    mimeType: string;
    size: number;
  }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Extract folderId from form data
    const folderId = request.body?.folderId || undefined;

    try {
      // Check if uploadService has uploadFileToFolder method (Google Drive services)
      if (typeof (this.uploadService as any).uploadFileToFolder === 'function') {
        const result = await (this.uploadService as any).uploadFileToFolder(
          file,
          folderId,
        );
        return result;
      } else {
        // Fallback: use regular upload method
        console.warn('Google Drive upload not available, using fallback method');
        const result = await this.uploadService.uploadFile(file, 'Jobsmato Uploads');
        return {
          fileId: result.fileId,
          webViewLink: result.fileUrl,
          webContentLink: result.fileUrl,
          thumbnailLink: file.mimetype.startsWith('image/') ? result.fileUrl : undefined,
          name: result.fileName,
          mimeType: result.mimeType,
          size: result.size,
        };
      }
    } catch (error) {
      console.error('Google Drive upload error:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      // Try fallback to regular upload
      try {
        console.log('Attempting fallback upload...');
        const result = await this.uploadService.uploadFile(file, 'Jobsmato Uploads');
        return {
          fileId: result.fileId,
          webViewLink: result.fileUrl,
          webContentLink: result.fileUrl,
          thumbnailLink: file.mimetype.startsWith('image/') ? result.fileUrl : undefined,
          name: result.fileName,
          mimeType: result.mimeType,
          size: result.size,
        };
      } catch (fallbackError) {
        throw new BadRequestException('File upload failed. Please try again.');
      }
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
