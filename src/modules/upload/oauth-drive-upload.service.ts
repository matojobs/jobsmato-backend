import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google } from 'googleapis';
import { Readable } from 'stream';
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
export class OAuthDriveUploadService {
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
  private readonly targetFolderId = '1Vy45PqTpaDiNlV8T1SGIy7ZND29E4zhl'; // Jobsmato folder ID
  private readonly scopes = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive'
  ];

  private initialized = false;

  constructor(private configService: ConfigService) {
    // Initialize only if credentials exist, otherwise skip silently
    const credentialsPath = path.join(process.cwd(), 'credentials.json');
    if (fs.existsSync(credentialsPath)) {
      try {
        this.initializeGoogleDrive();
        this.initialized = true;
      } catch (error) {
        console.warn('Google Drive OAuth initialization failed, will use fallback storage:', error.message);
        this.initialized = false;
      }
    } else {
      console.log('Google Drive OAuth credentials not found, service will not be available');
      this.initialized = false;
    }
  }

  private getCredentials(): { clientId: string; clientSecret: string } {
    const credentialsPath = path.join(process.cwd(), 'credentials.json');
    if (!fs.existsSync(credentialsPath)) {
      throw new Error('OAuth credentials file not found');
    }
    
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    if (credentials.installed) {
      return {
        clientId: credentials.installed.client_id,
        clientSecret: credentials.installed.client_secret,
      };
    } else if (credentials.web) {
      return {
        clientId: credentials.web.client_id,
        clientSecret: credentials.web.client_secret,
      };
    } else {
      throw new Error('Invalid credentials format');
    }
  }

  private async initializeGoogleDrive() {
    try {
      const credentialsPath = path.join(process.cwd(), 'credentials.json');
      const tokenPath = path.join(process.cwd(), 'token.json');

      let auth: any;

      // Check if we have a valid token
      if (fs.existsSync(tokenPath)) {
        console.log('✅ Using existing OAuth token');
        const token = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
        
        // Load credentials to get client ID and secret for token refresh
        const { clientId, clientSecret } = this.getCredentials();
        
        // Create OAuth2 client with credentials (REQUIRED for token refresh)
        auth = new google.auth.OAuth2(clientId, clientSecret);
        auth.setCredentials(token);
        
        // Set up automatic token refresh
        auth.on('tokens', (tokens) => {
          if (tokens.refresh_token) {
            // Save refresh token if provided
            token.refresh_token = tokens.refresh_token;
          }
          // Update access token and expiry
          token.access_token = tokens.access_token;
          token.expiry_date = tokens.expiry_date;
          token.expires_in = tokens.expiry_date
            ? Math.floor((tokens.expiry_date - Date.now()) / 1000)
            : 3600;
          
          // Save updated token
          try {
            fs.writeFileSync(tokenPath, JSON.stringify(token, null, 2));
            console.log('✅ OAuth token automatically refreshed');
          } catch (error) {
            console.error('⚠️  Failed to save refreshed token:', error);
          }
        });
      } else if (fs.existsSync(credentialsPath)) {
        console.log('🔄 Setting up OAuth flow...');
        const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
        
        // Check if it's a web or installed client
        if (credentials.web) {
          console.log('⚠️  Web OAuth client detected. Manual authentication required.');
          console.log('📋 Please follow these steps:');
          console.log('   1. Go to Google OAuth Playground: https://developers.google.com/oauthplayground/');
          console.log('   2. Click the gear icon (settings) in the top right');
          console.log('   3. Check "Use your own OAuth credentials"');
          console.log('   4. Enter your Client ID and Client Secret from credentials.json');
          console.log('   5. In the left panel, find "Google Drive API v3"');
          console.log('   6. Select "https://www.googleapis.com/auth/drive.file"');
          console.log('   7. Click "Authorize APIs" and complete the flow');
          console.log('   8. Click "Exchange authorization code for tokens"');
          console.log('   9. Copy the refresh_token and save it to token.json');
          throw new Error('Web OAuth client requires manual setup. See instructions above.');
        } else {
          // Installed client - use local server flow
          const { OAuth2Client } = require('google-auth-library');
          const oauth2Client = new OAuth2Client(
            credentials.installed.client_id,
            credentials.installed.client_secret,
            credentials.installed.redirect_uris[0]
          );

          const authUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: this.scopes,
          });

          console.log('🔗 Authorize this app by visiting this url:', authUrl);
          console.log('📋 After authorization, you will get a code. Please run the setup script.');
          throw new Error('OAuth setup required. Please run the setup script.');
        }
      } else {
        console.log('❌ No credentials.json found. Please set up OAuth credentials.');
        throw new Error('OAuth credentials not found. Please set up credentials.json.');
      }

      this.drive = google.drive({ version: 'v3', auth });
      console.log('✅ Google Drive API initialized with OAuth');
    } catch (error) {
      console.error('Failed to initialize Google Drive:', error);
      // Don't throw - let the service be available but mark as not initialized
      // The upload module will fall back to LocalUploadService
      this.initialized = false;
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    folderName: string = 'Jobsmato Uploads'
  ): Promise<UploadResult> {
    if (!this.initialized || !this.drive) {
      throw new InternalServerErrorException('Google Drive service is not initialized. Please configure OAuth credentials.');
    }
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
      
      throw new InternalServerErrorException('File upload failed');
    }
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
    if (!this.initialized || !this.drive) {
      throw new InternalServerErrorException('Google Drive service is not initialized. Please configure OAuth credentials.');
    }
    try {
      // Validate file size
      if (file.size > this.maxFileSize) {
        throw new BadRequestException(`File size exceeds 5MB limit. Current size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      }

      // Validate file type
      if (!this.allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException(`File type ${file.mimetype} is not allowed`);
      }

      // Use provided folderId or create default subfolder
      let targetFolderId = folderId;
      if (!targetFolderId) {
        targetFolderId = await this.createSubfolderIfNotExists('Jobsmato Uploads');
      } else {
        // Verify folder exists
        try {
          await this.drive.files.get({
            fileId: targetFolderId,
            fields: 'id,mimeType',
          });
        } catch (error) {
          throw new BadRequestException(`Invalid folder ID: ${targetFolderId}`);
        }
      }

      // Convert buffer to stream
      const fileStream = new Readable();
      fileStream.push(file.buffer);
      fileStream.push(null);

      // Upload file to Google Drive with all required fields
      const response = await this.drive.files.create({
        requestBody: {
          name: file.originalname,
          parents: [targetFolderId],
        },
        media: {
          mimeType: file.mimetype,
          body: fileStream,
        },
        fields: 'id,name,webViewLink,webContentLink,thumbnailLink,size,mimeType',
      });

      const uploadedFile = response.data;

      // Get thumbnail link for images
      let thumbnailLink = uploadedFile.thumbnailLink;
      if (!thumbnailLink && file.mimetype.startsWith('image/')) {
        thumbnailLink = `https://drive.google.com/thumbnail?id=${uploadedFile.id}&sz=w1000`;
      }

      return {
        fileId: uploadedFile.id,
        webViewLink: uploadedFile.webViewLink || '',
        webContentLink: uploadedFile.webContentLink || undefined,
        thumbnailLink: thumbnailLink || undefined,
        name: uploadedFile.name,
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
    if (!this.initialized || !this.drive) {
      throw new InternalServerErrorException('Google Drive service is not initialized. Please configure OAuth credentials.');
    }
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
    if (!this.initialized || !this.drive) {
      throw new InternalServerErrorException('Google Drive service is not initialized. Please configure OAuth credentials.');
    }
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
    if (!this.initialized || !this.drive) {
      throw new InternalServerErrorException('Google Drive service is not initialized. Please configure OAuth credentials.');
    }
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
