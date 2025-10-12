# Google Drive Shared Drive Setup Guide

Since service accounts don't have storage quota, we need to set up a shared drive for file uploads.

## Option 1: Create a Shared Drive (Recommended)

### Step 1: Create a Shared Drive
1. Go to [Google Drive](https://drive.google.com/)
2. Click on "Shared drives" in the left sidebar
3. Click "New" to create a new shared drive
4. Name it "Jobsmato File Storage"
5. Click "Create"

### Step 2: Add Service Account to Shared Drive
1. Right-click on the "Jobsmato File Storage" shared drive
2. Click "Manage members"
3. Click "Add members"
4. Add the service account email: `jobsmato@thinking-cacao-471703-k5.iam.gserviceaccount.com`
5. Set permission to "Content manager"
6. Click "Send"

### Step 3: Get Shared Drive ID
1. Open the shared drive
2. Copy the ID from the URL (the long string after `/folders/`)
3. Add it to your environment variables:

```bash
GOOGLE_DRIVE_SHARED_DRIVE_ID="your-shared-drive-id-here"
```

## Option 2: Use OAuth Delegation (Alternative)

If you prefer OAuth delegation, you'll need to:

1. Set up OAuth 2.0 credentials in Google Cloud Console
2. Implement OAuth flow in your application
3. Use user's Google Drive instead of service account

## Option 3: Use Local File Storage (Development)

For development/testing, you can modify the upload service to store files locally:

```javascript
// In upload.service.ts, replace Google Drive calls with local storage
const fs = require('fs');
const path = require('path');

async uploadFile(file: Express.Multer.File, folderName: string = 'uploads') {
  const uploadDir = path.join(process.cwd(), 'uploads', folderName);
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  
  const fileName = `${Date.now()}_${file.originalname}`;
  const filePath = path.join(uploadDir, fileName);
  
  fs.writeFileSync(filePath, file.buffer);
  
  return {
    fileId: fileName,
    fileName: file.originalname,
    fileUrl: `/uploads/${folderName}/${fileName}`,
    mimeType: file.mimetype,
    size: file.size,
  };
}
```

## Recommended Approach

For production, I recommend **Option 1 (Shared Drive)** because:
- ✅ No storage quota limitations
- ✅ Centralized file management
- ✅ Easy to manage permissions
- ✅ Scalable solution
- ✅ Professional setup

## Environment Variables Update

Add this to your `.env` file:

```bash
# Google Drive Shared Drive
GOOGLE_DRIVE_SHARED_DRIVE_ID="your-shared-drive-id-here"
```

## Testing

After setting up the shared drive, run the test script:

```bash
node test-google-drive.js
```

The test should now pass all checks including file upload.
