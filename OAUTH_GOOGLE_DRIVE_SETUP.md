# OAuth 2.0 Google Drive Setup for Jobsmato

This guide will help you set up Google Drive integration using OAuth 2.0 (the same method used in your Horilla project).

## Why OAuth 2.0?

- ✅ Works with personal Google Drive folders
- ✅ No quota limitations like service accounts
- ✅ Same method as your successful Horilla project
- ✅ Can access your existing folder: `1Amq5HzoVdKaRp0gtzIkKg4aibIexOePz`

## Step 1: Create OAuth 2.0 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: `thinking-cacao-471703-k5`
3. Go to "APIs & Services" > "Credentials"
4. Click "Create Credentials" > "OAuth 2.0 Client ID"
5. Choose **"Desktop application"** as the application type
6. Give it a name: "Jobsmato Desktop Client"
7. Click "Create"
8. Download the JSON file and save it as `credentials.json` in your backend directory

## Step 2: Run the OAuth Setup Script

```bash
cd /Users/zoro/Projects/\ Jobsmato/jobsmato_backend
node setup-oauth.js
```

This script will:
- Check for `credentials.json`
- Open a browser for authorization
- Save the token to `token.json`
- Test the connection to your folder

## Step 3: Verify Setup

After running the setup script, you should see:
```
✅ Google Drive connection successful!
🎉 OAuth setup completed successfully!
📁 Successfully accessed your folder: Jobsmato File Storage
🔗 Folder URL: https://drive.google.com/drive/folders/1Amq5HzoVdKaRp0gtzIkKg4aibIexOePz
```

## Step 4: Test File Upload

```bash
# Start your backend
npm run start:dev

# In another terminal, test the upload
node test-upload.js
```

## File Structure

After setup, you should have:
```
/Users/zoro/Projects/ Jobsmato/jobsmato_backend/
├── credentials.json          # OAuth 2.0 credentials
├── token.json               # OAuth token (auto-generated)
├── setup-oauth.js           # Setup script
└── src/modules/upload/
    ├── oauth-drive-upload.service.ts  # OAuth upload service
    ├── upload.module.ts      # Updated module
    └── upload.controller.ts  # Upload endpoints
```

## How It Works

1. **OAuth Flow**: Uses your Google account to authorize the app
2. **Token Storage**: Saves refresh token for automatic re-authentication
3. **Folder Access**: Directly uploads to your personal Google Drive folder
4. **Subfolders**: Creates organized subfolders for different upload types
5. **Fallback**: Falls back to local storage if OAuth fails

## Features

- ✅ **5MB File Limit**: Enforced on both client and server
- ✅ **Your Folder**: Uploads directly to your existing folder
- ✅ **Organized**: Creates subfolders (e.g., "Jobsmato Uploads")
- ✅ **Secure**: Uses OAuth 2.0 with refresh tokens
- ✅ **Reliable**: Same method as your working Horilla project

## Troubleshooting

### "credentials.json not found"
- Make sure you downloaded the OAuth 2.0 credentials
- Save it as `credentials.json` in the backend directory

### "Web OAuth client detected"
- You created a "Web application" instead of "Desktop application"
- Create new credentials with "Desktop application" type

### "Authorization code invalid"
- The code expires quickly
- Run the setup script again and paste the code immediately

### "Cannot access folder"
- Make sure the folder ID is correct: `1Amq5HzoVdKaRp0gtzIkKg4aibIexOePz`
- Verify the folder exists and is accessible

## Security Notes

- `credentials.json` contains your OAuth client secrets
- `token.json` contains your access/refresh tokens
- Both files should be kept secure and not committed to git
- The refresh token allows long-term access without re-authorization

## Next Steps

1. Run the setup script
2. Test file uploads
3. Verify files appear in your Google Drive folder
4. Deploy with the same credentials

---

**Note**: This OAuth 2.0 method is the same approach used in your successful Horilla project, so it should work perfectly with your existing Google Drive folder!
