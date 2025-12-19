import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { LocalUploadService } from './local-upload.service';
import { OAuthDriveUploadService } from './oauth-drive-upload.service';
import { CloudinaryService } from './cloudinary.service';
import { CloudinaryController } from './cloudinary.controller';
import * as fs from 'fs';
import * as path from 'path';

@Module({
  imports: [ConfigModule],
  controllers: [UploadController, CloudinaryController],
  providers: [
    {
      provide: 'UploadService',
      useFactory: (configService) => {
        // Check for OAuth credentials first (preferred method)
        const credentialsPath = path.join(process.cwd(), 'credentials.json');
        const tokenPath = path.join(process.cwd(), 'token.json');
        
        if (fs.existsSync(credentialsPath) && fs.existsSync(tokenPath)) {
          console.log('Using OAuth 2.0 Google Drive integration');
          return new OAuthDriveUploadService(configService);
        }
        
        // Fallback to service account if available
        const hasServiceAccount = configService.get('GOOGLE_DRIVE_CLIENT_EMAIL') && 
                                 configService.get('GOOGLE_DRIVE_PRIVATE_KEY');
        
        if (hasServiceAccount) {
          console.log('Using Service Account Google Drive integration');
          return new UploadService(configService);
        }
        
        // Final fallback to local storage
        console.log('Using local file storage (Google Drive credentials not found)');
        return new LocalUploadService(configService);
      },
      inject: [ConfigService],
    },
    UploadService,
    LocalUploadService,
    OAuthDriveUploadService,
    CloudinaryService,
  ],
  exports: ['UploadService', CloudinaryService],
})
export class UploadModule {}
