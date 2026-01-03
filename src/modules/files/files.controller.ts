import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserRole } from '../../entities/user.entity';
import { FilesService } from './files.service';
import { Logger } from '@nestjs/common';

@ApiTags('files')
@Controller('files')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FilesController {
  private readonly logger = new Logger(FilesController.name);
  
  constructor(private readonly filesService: FilesService) {}

  @Get('download/resume/*')
  @ApiOperation({ summary: 'Download a candidate resume file (path parameter - backward compatible)' })
  @ApiParam({
    name: '0',
    description: 'Resume filename or Google Drive URL (URL-encoded)',
    required: false,
    example: 'resume_1764663588598_Resume.docx',
  })
  @ApiResponse({
    status: 200,
    description: 'Resume file downloaded successfully',
    content: {
      'application/pdf': {},
      'application/msword': {},
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {},
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid filename or file type' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 403, description: 'You don\'t have permission to download this resume' })
  @ApiResponse({ status: 404, description: 'Resume file not found' })
  @ApiResponse({ status: 500, description: 'Failed to retrieve resume file' })
  async downloadResumeByPath(
    @Param('0') filename: string,
    @Req() req: Request,
    @CurrentUser() user: User,
    @Res() res: Response,
  ): Promise<void> {
    return this.downloadResume(null as any, null as any, req, user, res);
  }

  @Get('download/resume')
  @ApiOperation({ summary: 'Download a candidate resume file (query parameters - recommended)' })
  @ApiQuery({
    name: 'url',
    description: 'Google Drive URL (use this for Google Drive files)',
    required: false,
    example: 'https://drive.google.com/file/d/FILE_ID/view',
  })
  @ApiQuery({
    name: 'filename',
    description: 'Local filename (use this for local files)',
    required: false,
    example: 'resume_1764663588598_Resume.docx',
  })
  @ApiResponse({
    status: 200,
    description: 'Resume file downloaded successfully',
    content: {
      'application/pdf': {},
      'application/msword': {},
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {},
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid filename or file type' })
  @ApiResponse({ status: 401, description: 'Authentication required' })
  @ApiResponse({ status: 403, description: 'You don\'t have permission to download this resume' })
  @ApiResponse({ status: 404, description: 'Resume file not found' })
  @ApiResponse({ status: 500, description: 'Failed to retrieve resume file' })
  async downloadResume(
    @Query('url') url: string | null,
    @Query('filename') queryFilename: string | null,
    @Req() req: Request,
    @CurrentUser() user: User,
    @Res() res: Response,
  ): Promise<void> {
    try {
      // Support both query parameters and path parameter (backward compatibility)
      // Query parameter 'url' for Google Drive URLs (recommended)
      // Query parameter 'filename' for local files
      // Path parameter for backward compatibility with existing frontend code
      
      let rawFilename = url || queryFilename;
      
      // If no query params, try to extract from path (backward compatibility)
      if (!rawFilename) {
        // Extract from path - handle both /api/files/download/resume/... and /download/resume/...
        const pathMatch = req.path.match(/\/(?:api\/files\/)?download\/resume\/(.+)$/);
        if (pathMatch && pathMatch[1]) {
          rawFilename = pathMatch[1];
        } else {
          // Fallback to req.url if path doesn't match
          const urlMatch = req.url.match(/\/download\/resume\/(.+?)(?:\?|$)/);
          if (urlMatch && urlMatch[1]) {
            rawFilename = urlMatch[1];
          }
        }
      }
      
      if (!rawFilename) {
        throw new BadRequestException('Either url or filename parameter is required');
      }
      
      // Decode URL-encoded filename (handles %20 for spaces, %3A for :, etc.)
      let decodedFilename = decodeURIComponent(rawFilename);
      
      // Fix common URL encoding issues (https:/ -> https://)
      decodedFilename = decodedFilename.replace(/^https:\//, 'https://');
      decodedFilename = decodedFilename.replace(/^http:\//, 'http://');
      
      // Check if it's a Google Drive URL or file ID
      const isGoogleDriveUrl = decodedFilename.startsWith('http://') || 
                                decodedFilename.startsWith('https://') ||
                                /^[a-zA-Z0-9_-]+$/.test(decodedFilename); // Could be a file ID

      // For local files, validate filename and extension
      if (!isGoogleDriveUrl) {
        // Security: Prevent path traversal (check decoded filename)
        if (decodedFilename.includes('..') || decodedFilename.includes('/') || decodedFilename.includes('\\')) {
          throw new BadRequestException('Invalid filename');
        }

        // Validate file extension (use decoded filename)
        const allowedExtensions = ['.pdf', '.doc', '.docx'];
        const fileExt = decodedFilename.toLowerCase().substring(decodedFilename.lastIndexOf('.'));
        if (!allowedExtensions.includes(fileExt)) {
          throw new BadRequestException('Invalid file type. Only PDF, DOC, and DOCX files are allowed');
        }
      }

      // Check authorization (use decoded filename)
      const hasPermission = await this.filesService.checkDownloadPermission(user, decodedFilename);
      if (!hasPermission) {
        throw new ForbiddenException('You don\'t have permission to download this resume');
      }

      // Get file path and stream (use decoded filename)
      const fileInfo = await this.filesService.getResumeFile(decodedFilename);
      if (!fileInfo) {
        throw new NotFoundException('Resume file not found');
      }

      // Set headers
      res.setHeader('Content-Type', fileInfo.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.filename}"`);
      res.setHeader('Content-Length', fileInfo.size);
      res.setHeader('Cache-Control', 'no-cache');

      // Stream file to response
      fileInfo.stream.pipe(res);

      // Log download (use decoded filename)
      this.logger.log(`Resume downloaded: ${decodedFilename} by user ${user.id} (${user.email})`);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      console.error('Error serving resume file:', error);
      throw new InternalServerErrorException('Failed to retrieve resume file');
    }
  }
}

