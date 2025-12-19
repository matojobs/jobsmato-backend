import {
  Controller,
  Get,
  Param,
  Res,
  UseGuards,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import type { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserRole } from '../../entities/user.entity';
import { FilesService } from './files.service';

@ApiTags('files')
@Controller('files')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Get('download/resume/:filename')
  @ApiOperation({ summary: 'Download a candidate resume file' })
  @ApiParam({
    name: 'filename',
    description: 'Resume filename (e.g., resume_1764663588598_Resume.docx)',
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
    @Param('filename') filename: string,
    @CurrentUser() user: User,
    @Res() res: Response,
  ): Promise<void> {
    try {
      // Decode URL-encoded filename (handles %20 for spaces, etc.)
      const decodedFilename = decodeURIComponent(filename);
      
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
      console.log(`Resume downloaded: ${decodedFilename} by user ${user.id} (${user.email})`);
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

