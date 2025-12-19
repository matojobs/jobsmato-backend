import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { CloudinaryService, CloudinaryUploadResult } from './cloudinary.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';

@ApiTags('cloudinary')
@Controller('cloudinary')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CloudinaryController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  @Post('upload/image')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload an image to Cloudinary' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Image file to upload',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        folder: {
          type: 'string',
          description: 'Folder path in Cloudinary (optional)',
          example: 'jobsmato/custom-folder',
        },
        tags: {
          type: 'string',
          description: 'Comma-separated tags (optional)',
          example: 'tag1,tag2',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Image uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            publicId: { type: 'string' },
            url: { type: 'string' },
            secureUrl: { type: 'string' },
            width: { type: 'number' },
            height: { type: 'number' },
            format: { type: 'string' },
            bytes: { type: 'number' },
            createdAt: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid file or file too large' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string,
    @Query('tags') tags?: string,
    @CurrentUser() user?: User,
  ): Promise<{ success: boolean; data: CloudinaryUploadResult }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const tagsArray = tags ? tags.split(',').map((tag) => tag.trim()) : [];

    const result = await this.cloudinaryService.uploadGenericImage(file, folder, tagsArray);

    return {
      success: true,
      data: result,
    };
  }

  @Post('upload/company-logo')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a company logo to Cloudinary (optimized)' })
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
  ): Promise<{ success: boolean; data: CloudinaryUploadResult }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const result = await this.cloudinaryService.uploadCompanyLogo(file);

    return {
      success: true,
      data: result,
    };
  }

  @Post('upload/user-avatar')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a user avatar to Cloudinary (optimized)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'User avatar image to upload',
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
    description: 'User avatar uploaded successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid file or file too large' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async uploadUserAvatar(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: User,
  ): Promise<{ success: boolean; data: CloudinaryUploadResult }> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const result = await this.cloudinaryService.uploadUserAvatar(file);

    return {
      success: true,
      data: result,
    };
  }

  @Get('image/:publicId')
  @ApiOperation({ summary: 'Get image URL with optional transformations' })
  @ApiQuery({
    name: 'size',
    required: false,
    enum: ['thumbnail', 'small', 'medium', 'large', 'original'],
    description: 'Predefined size',
  })
  @ApiQuery({
    name: 'width',
    required: false,
    type: Number,
    description: 'Custom width',
  })
  @ApiQuery({
    name: 'height',
    required: false,
    type: Number,
    description: 'Custom height',
  })
  @ApiQuery({
    name: 'crop',
    required: false,
    enum: ['fill', 'limit', 'fit', 'scale'],
    description: 'Crop mode',
  })
  @ApiResponse({
    status: 200,
    description: 'Image URL generated successfully',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string' },
        publicId: { type: 'string' },
      },
    },
  })
  async getImageUrl(
    @Param('publicId') publicId: string,
    @Query('size') size?: 'thumbnail' | 'small' | 'medium' | 'large' | 'original',
    @Query('width') width?: number,
    @Query('height') height?: number,
    @Query('crop') crop?: 'fill' | 'limit' | 'fit' | 'scale',
  ): Promise<{ url: string; publicId: string }> {
    if (!publicId) {
      throw new BadRequestException('Public ID is required');
    }

    let url: string;

    if (size) {
      url = this.cloudinaryService.getOptimizedImageUrl(publicId, size);
    } else if (width || height) {
      url = this.cloudinaryService.getImageUrl(publicId, {
        width,
        height,
        crop: crop || 'limit',
        quality: 'auto:good',
        format: 'auto',
      });
    } else {
      url = this.cloudinaryService.getImageUrl(publicId);
    }

    return {
      url,
      publicId,
    };
  }

  @Delete('image/:publicId')
  @ApiOperation({ summary: 'Delete an image from Cloudinary' })
  @ApiResponse({
    status: 200,
    description: 'Image deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid public ID' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteImage(@Param('publicId') publicId: string): Promise<{ success: boolean; message: string }> {
    if (!publicId) {
      throw new BadRequestException('Public ID is required');
    }

    await this.cloudinaryService.deleteImage(publicId);

    return {
      success: true,
      message: 'Image deleted successfully',
    };
  }
}

