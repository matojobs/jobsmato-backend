# Google Drive API Setup Guide

This guide will help you set up Google Drive API for file uploads in the Jobsmato backend.

## Prerequisites

- Google Cloud Platform account
- Access to Google Cloud Console

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note down your project ID

## Step 2: Enable Google Drive API

1. In the Google Cloud Console, go to "APIs & Services" > "Library"
2. Search for "Google Drive API"
3. Click on it and press "Enable"

## Step 3: Create Service Account

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Fill in the service account details:
   - Name: `jobsmato-file-upload`
   - Description: `Service account for Jobsmato file uploads`
4. Click "Create and Continue"
5. Skip the optional steps and click "Done"

## Step 4: Generate Service Account Key

1. In the Credentials page, find your service account
2. Click on the service account email
3. Go to the "Keys" tab
4. Click "Add Key" > "Create new key"
5. Choose "JSON" format
6. Download the JSON file

## Step 5: Configure Environment Variables

1. Open the downloaded JSON file
2. Copy the following values to your `.env` file:

```bash
# Google Drive API Configuration
GOOGLE_DRIVE_CLIENT_EMAIL="your-service-account-email@project.iam.gserviceaccount.com"
GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour-Private-Key-Here\n-----END PRIVATE KEY-----\n"
```

**Important Notes:**
- Replace `\n` with actual newlines in the private key
- The private key should be on multiple lines
- Keep the quotes around the values

## Step 6: Create Google Drive Folder (Optional)

1. Go to [Google Drive](https://drive.google.com/)
2. Create a folder named "Jobsmato Uploads"
3. Right-click on the folder > "Share"
4. Add your service account email with "Editor" permissions
5. Copy the folder ID from the URL (the long string after `/folders/`)

## Step 7: Install Dependencies

```bash
cd /path/to/jobsmato_backend
npm install googleapis
```

## Step 8: Test the Setup

1. Start your backend server
2. Make a test upload request to `/api/upload/limits/info`
3. Check the logs for any Google Drive initialization errors

## Environment Variables Reference

```bash
# Required
GOOGLE_DRIVE_CLIENT_EMAIL="service-account@project.iam.gserviceaccount.com"
GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Optional
GOOGLE_DRIVE_FOLDER_ID="your-default-folder-id"
```

## File Upload Limits

- **Maximum file size:** 5MB
- **Allowed file types:**
  - PDF documents
  - Microsoft Word documents (.doc, .docx)
  - Images (JPEG, PNG, GIF)
  - Plain text files

## API Endpoints

- `POST /api/upload/file` - Upload any file
- `POST /api/upload/resume` - Upload resume (PDF, DOC, DOCX only)
- `POST /api/upload/company-logo` - Upload company logo (images only)
- `DELETE /api/upload/:fileId` - Delete a file
- `GET /api/upload/:fileId` - Get file information
- `GET /api/upload/limits/info` - Get upload limits and allowed types

## Troubleshooting

### Common Issues

1. **"Invalid credentials" error:**
   - Check that the service account email and private key are correct
   - Ensure the private key has proper newlines

2. **"Permission denied" error:**
   - Make sure the service account has access to the Google Drive folder
   - Check that the Google Drive API is enabled

3. **"File not found" error:**
   - Verify the folder ID is correct
   - Ensure the service account has editor permissions on the folder

### Testing Upload Limits

```bash
curl -X GET http://localhost:5000/api/upload/limits/info
```

Expected response:
```json
{
  "success": true,
  "data": {
    "maxFileSize": 5242880,
    "maxFileSizeMB": 5,
    "allowedMimeTypes": [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/jpeg",
      "image/png",
      "image/gif",
      "text/plain"
    ]
  }
}
```

## Security Notes

- Never commit the service account JSON file to version control
- Use environment variables for all sensitive data
- Regularly rotate service account keys
- Monitor API usage in Google Cloud Console
- Set up proper IAM permissions for the service account

## Support

If you encounter issues:
1. Check the backend logs for detailed error messages
2. Verify all environment variables are set correctly
3. Test the Google Drive API access in Google Cloud Console
4. Ensure the service account has the necessary permissions
