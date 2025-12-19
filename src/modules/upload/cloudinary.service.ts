import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { Readable } from 'stream';

export interface CloudinaryUploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
  width: number;
  height: number;
  format: string;
  resourceType: string;
  bytes: number;
  createdAt: string;
}

export interface CloudinaryUploadOptions {
  folder?: string;
  transformation?: {
    width?: number;
    height?: number;
    crop?: string;
    quality?: string | number;
    format?: string;
  };
  tags?: string[];
  overwrite?: boolean;
}

@Injectable()
export class CloudinaryService {
  private readonly maxFileSize = 10 * 1024 * 1024; // 10MB
  private readonly allowedImageTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
  ];

  constructor(private configService: ConfigService) {
    // Initialize Cloudinary
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  /**
   * Upload an image to Cloudinary
   */
  async uploadImage(
    file: Express.Multer.File,
    options: CloudinaryUploadOptions = {},
  ): Promise<CloudinaryUploadResult> {
    try {
      // Validate file
      this.validateImageFile(file);

      // Default folder structure
      const folder = options.folder || 'jobsmato';

      // Convert buffer to stream
      const fileStream = new Readable();
      fileStream.push(file.buffer);
      fileStream.push(null);

      // Prepare upload options
      const uploadOptions: any = {
        folder,
        resource_type: 'image',
        overwrite: options.overwrite || false,
        invalidate: true, // Invalidate CDN cache
      };

      // Add transformations if provided
      if (options.transformation) {
        uploadOptions.transformation = [];
        if (options.transformation.width || options.transformation.height) {
          uploadOptions.transformation.push({
            width: options.transformation.width,
            height: options.transformation.height,
            crop: options.transformation.crop || 'limit',
          });
        }
        if (options.transformation.quality) {
          uploadOptions.transformation.push({
            quality: options.transformation.quality,
          });
        }
        if (options.transformation.format) {
          uploadOptions.transformation.push({
            format: options.transformation.format,
          });
        }
      }

      // Add tags if provided
      if (options.tags && options.tags.length > 0) {
        uploadOptions.tags = options.tags;
      }

      // Upload to Cloudinary
      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
            if (error) {
              console.error('Cloudinary upload error:', error);
              reject(new InternalServerErrorException(`Image upload failed: ${error.message}`));
              return;
            }

            if (!result) {
              reject(new InternalServerErrorException('Image upload failed: No result returned'));
              return;
            }

            resolve({
              publicId: result.public_id,
              url: result.url,
              secureUrl: result.secure_url,
              width: result.width,
              height: result.height,
              format: result.format,
              resourceType: result.resource_type,
              bytes: result.bytes,
              createdAt: result.created_at,
            });
          },
        );

        fileStream.pipe(uploadStream);
      });
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
        throw error;
      }
      console.error('Cloudinary upload error:', error);
      throw new InternalServerErrorException('Image upload failed');
    }
  }

  /**
   * Upload company logo with optimized settings
   */
  async uploadCompanyLogo(file: Express.Multer.File): Promise<CloudinaryUploadResult> {
    return this.uploadImage(file, {
      folder: 'jobsmato/company-logos',
      transformation: {
        width: 800,
        height: 800,
        crop: 'limit',
        quality: 'auto:good',
        format: 'auto',
      },
      tags: ['company-logo'],
      overwrite: false,
    });
  }

  /**
   * Upload user avatar with optimized settings
   */
  async uploadUserAvatar(file: Express.Multer.File): Promise<CloudinaryUploadResult> {
    return this.uploadImage(file, {
      folder: 'jobsmato/user-avatars',
      transformation: {
        width: 400,
        height: 400,
        crop: 'fill',
        quality: 'auto:good',
        format: 'auto',
      },
      tags: ['user-avatar'],
      overwrite: false,
    });
  }

  /**
   * Upload generic image with custom options
   */
  async uploadGenericImage(
    file: Express.Multer.File,
    folder: string = 'jobsmato/images',
    tags: string[] = [],
  ): Promise<CloudinaryUploadResult> {
    return this.uploadImage(file, {
      folder,
      transformation: {
        quality: 'auto:good',
        format: 'auto',
      },
      tags,
      overwrite: false,
    });
  }

  /**
   * Delete an image from Cloudinary
   */
  async deleteImage(publicId: string): Promise<void> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      if (result.result !== 'ok') {
        throw new InternalServerErrorException(`Failed to delete image: ${result.result}`);
      }
    } catch (error) {
      console.error('Cloudinary delete error:', error);
      throw new InternalServerErrorException('Failed to delete image');
    }
  }

  /**
   * Get image URL with transformations
   */
  getImageUrl(publicId: string, transformations?: any): string {
    return cloudinary.url(publicId, {
      secure: true,
      ...transformations,
    });
  }

  /**
   * Generate optimized image URL for different use cases
   */
  getOptimizedImageUrl(publicId: string, size: 'thumbnail' | 'small' | 'medium' | 'large' | 'original' = 'original'): string {
    const sizeMap = {
      thumbnail: { width: 150, height: 150, crop: 'fill' },
      small: { width: 400, height: 400, crop: 'limit' },
      medium: { width: 800, height: 800, crop: 'limit' },
      large: { width: 1200, height: 1200, crop: 'limit' },
      original: {},
    };

    return cloudinary.url(publicId, {
      secure: true,
      ...sizeMap[size],
      quality: 'auto:good',
      format: 'auto',
    });
  }

  /**
   * Validate image file
   */
  private validateImageFile(file: Express.Multer.File): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file size
    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds 10MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`,
      );
    }

    // Validate file type
    if (!this.allowedImageTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not allowed. Allowed types: JPEG, PNG, GIF, WebP, SVG`,
      );
    }
  }
}

