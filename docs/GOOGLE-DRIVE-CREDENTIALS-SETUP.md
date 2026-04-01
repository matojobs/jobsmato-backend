# Google Drive Credentials Setup Guide

## 🔍 Why You Need These Credentials

The resume download API needs Google Drive service account credentials to:
- Download files from Google Drive automatically
- Access files without user interaction
- Work seamlessly with Google Drive URLs

## 📋 Required Credentials

You need to add these two variables to your `.env` file:

```bash
GOOGLE_DRIVE_CLIENT_EMAIL="your-service-account@project-id.iam.gserviceaccount.com"
GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## 🚀 Quick Setup (3 Options)

### Option 1: Use Helper Script (Recommended)

If you have a service account JSON file:

1. Place the JSON file in project root as `service-account.json`
2. Run: `node setup-google-drive-credentials.js`
3. The script will automatically extract and add credentials to `.env`

### Option 2: Get from Google Cloud Console

1. **Go to Google Cloud Console:**
   - Visit: https://console.cloud.google.com/iam-admin/serviceaccounts
   - Select your project (the same one used for uploads)

2. **Create or Select Service Account:**
   - If you don't have one, click "Create Service Account"
   - Name it (e.g., "jobsmato-drive-service")
   - Grant it "Editor" or "Storage Admin" role

3. **Create JSON Key:**
   - Click on the service account
   - Go to "Keys" tab
   - Click "Add Key" > "Create new key"
   - Select "JSON" format
   - Download the JSON file

4. **Extract Credentials:**
   - Open the downloaded JSON file
   - Copy the `client_email` value
   - Copy the `private_key` value (entire key including BEGIN/END lines)

5. **Add to .env:**
   ```bash
   GOOGLE_DRIVE_CLIENT_EMAIL="paste-client-email-here"
   GOOGLE_DRIVE_PRIVATE_KEY="paste-private-key-here"
   ```
   
   **Important:** For `GOOGLE_DRIVE_PRIVATE_KEY`, replace actual newlines with `\n`:
   ```bash
   GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
   ```

### Option 3: Manual .env Edit

1. Open `.env` file
2. Add these lines at the end:
   ```bash
   # Google Drive Service Account (for file downloads)
   GOOGLE_DRIVE_CLIENT_EMAIL="your-service-account@project.iam.gserviceaccount.com"
   GOOGLE_DRIVE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY_HERE\n-----END PRIVATE KEY-----\n"
   ```
3. Replace the values with your actual credentials
4. **Important:** Keep the quotes and use `\n` for newlines in the private key

## ✅ Verify Setup

After adding credentials:

1. **Restart Server:**
   ```bash
   killall -9 node
   PORT=5001 npm run start:dev
   ```

2. **Check Server Logs:**
   Look for: `✅ Google Drive API initialized for file downloads`
   
   If you see: `⚠️ Failed to initialize Google Drive API`, check:
   - Credentials are correct
   - Private key has `\n` for newlines
   - Service account has Drive API access

3. **Test Download:**
   ```bash
   curl -X GET \
     "http://localhost:5001/api/files/download/resume/https%3A%2F%2Fdrive.google.com%2Ffile%2Fd%2F1DRZ2fAKR0zzKb66QspY3Hf0dgmZeYkC%2Fview%3Fusp%3Ddrivesdk" \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

## 🔐 Security Notes

- **Never commit `.env` file to git** (it should be in `.gitignore`)
- **Keep service account JSON files secure**
- **Use different service accounts for dev/prod if possible**
- **Limit service account permissions** (only what's needed)

## 🆘 Troubleshooting

### Error: "Google Drive API not initialized"
- Check credentials are in `.env`
- Verify private key format (use `\n` for newlines)
- Restart server after adding credentials

### Error: "Permission denied" (403)
- Service account needs access to the file
- Share the Google Drive folder/file with the service account email
- Or grant service account "Editor" role on the folder

### Error: "File not found" (404)
- Verify file ID is correct
- Check file exists in Google Drive
- Ensure service account has access to the file

## 📞 Need Help?

If you need help:
1. Check server logs for specific error messages
2. Verify credentials format in `.env`
3. Test with a simple Google Drive file ID first

---

**Last Updated:** December 19, 2025

