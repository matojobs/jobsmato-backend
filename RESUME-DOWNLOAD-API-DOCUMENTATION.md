# Resume Download API Documentation

## 📥 Endpoint

**GET** `/api/files/download/resume/:filename`

## 🔐 Authentication

**Required:** Yes (JWT Bearer Token)

**Header:**
```
Authorization: Bearer <your_jwt_token>
```

---

## 📋 Request

### URL Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `filename` | string | Yes | Resume filename, Google Drive URL, or Google Drive file ID | `resume_1764663588598_Resume.docx` or `https://drive.google.com/file/d/FILE_ID/view` |

### Supported Formats

The API supports three formats:

1. **Local Filename:** `resume_1764663588598_Resume.docx`
2. **Google Drive URL:** `https://drive.google.com/file/d/FILE_ID/view?usp=drivesdk`
3. **Google Drive File ID:** `1DRZ2fAKR0zzKbA66QspY3Hf0dgmZeYkC`

### URL Encoding

If the filename contains spaces or special characters, URL-encode it:

**Example (Local File):**
- Original: `resume_1764663588598_John Doe Resume.docx`
- Encoded: `resume_1764663588598_John%20Doe%20Resume.docx`
- URL: `/api/files/download/resume/resume_1764663588598_John%20Doe%20Resume.docx`

**Example (Google Drive URL):**
- Original: `https://drive.google.com/file/d/FILE_ID/view?usp=drivesdk`
- Encoded: `https%3A%2F%2Fdrive.google.com%2Ffile%2Fd%2FFILE_ID%2Fview%3Fusp%3Ddrivesdk`
- URL: `/api/files/download/resume/https%3A%2F%2Fdrive.google.com%2Ffile%2Fd%2FFILE_ID%2Fview%3Fusp%3Ddrivesdk`

---

## ✅ Response

### Success Response (200 OK)

**Content-Type:** 
- `application/pdf` (for PDF files)
- `application/msword` (for DOC files)
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document` (for DOCX files)

**Headers:**
```
Content-Type: application/pdf
Content-Disposition: attachment; filename="resume_1764663588598_Resume.docx"
Content-Length: 245760
Cache-Control: no-cache
```

**Body:** Binary file stream (the actual resume file)

---

## ❌ Error Responses

### 400 Bad Request

**Invalid filename or file type**

```json
{
  "statusCode": 400,
  "message": "Invalid filename"
}
```

**Causes:**
- Path traversal attempt (`..`, `/`, `\`) - only for local files
- Invalid file extension (not `.pdf`, `.doc`, or `.docx`) - only for local files
- Note: Google Drive URLs are exempt from these validations

### 401 Unauthorized

**Missing or invalid authentication token**

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 403 Forbidden

**User doesn't have permission to download this resume**

```json
{
  "statusCode": 403,
  "message": "You don't have permission to download this resume"
}
```

### 404 Not Found

**Resume file not found**

```json
{
  "statusCode": 404,
  "message": "Resume file not found"
}
```

### 500 Internal Server Error

**Server error while retrieving file**

```json
{
  "statusCode": 500,
  "message": "Failed to retrieve resume file"
}
```

---

## 🔒 Authorization Rules

### Admin (`ADMIN`)
- ✅ Can download **any** resume

### Job Seeker (`JOB_SEEKER`)
- ✅ Can download their own resume (from profile)
- ✅ Can download resumes from their own applications

### Employer (`EMPLOYER`)
- ✅ Can download resumes of candidates who applied to their jobs
- ❌ Cannot download resumes from other employers' jobs

---

## 🛡️ Security Features

### 1. Path Traversal Prevention
- Blocks filenames containing `..`, `/`, or `\`
- Prevents accessing files outside the uploads directory

### 2. File Type Validation
- Only allows: `.pdf`, `.doc`, `.docx`
- Rejects other file types

### 3. URL Decoding
- Automatically decodes URL-encoded filenames
- Handles spaces (`%20`) and special characters

### 4. Authorization Checks
- Verifies user has permission before serving file
- Role-based access control

### 5. File Existence Check
- Validates file exists before streaming
- Searches multiple possible paths

---

## 📁 File Storage

### Storage Types

The API supports two storage types:

#### 1. Google Drive Storage (Primary)
- Files are stored in Google Drive
- Backend uses service account credentials to access files
- No public sharing required
- Supports Google Drive URLs and file IDs

#### 2. Local File Storage (Fallback)
- Files are stored in: `uploads/Resumes/`
- Search paths (in order):
  1. `uploads/Resumes/{filename}`
  2. `uploads/Resumes/{original_filename}`
  3. `uploads/{filename}`
  4. `uploads/{original_filename}`

### Supported File Types
- **PDF**: `.pdf` → `application/pdf`
- **DOC**: `.doc` → `application/msword`
- **DOCX**: `.docx` → `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

**Note:** File type validation only applies to local files. Google Drive files are validated by their MIME type from Google Drive API.

---

## 💻 Frontend Implementation

### JavaScript/TypeScript Example

```typescript
async function downloadResume(filename: string, authToken: string) {
  try {
    // URL encode the filename if needed
    const encodedFilename = encodeURIComponent(filename);
    
    const response = await fetch(
      `${API_URL}/files/download/resume/${encodedFilename}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Download failed');
    }

    // Get the filename from Content-Disposition header
    const contentDisposition = response.headers.get('Content-Disposition');
    const downloadFilename = contentDisposition
      ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
      : filename;

    // Create blob and download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = downloadFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
}
```

### React Example

```typescript
import { useState } from 'react';

function ResumeDownloadButton({ application }) {
  const [downloading, setDownloading] = useState(false);
  const authToken = localStorage.getItem('authToken');

  const handleDownload = async () => {
    if (!application.resume) {
      alert('No resume available');
      return;
    }

      // Works with Google Drive URLs, file IDs, and local files!
      // No need to check format - API handles everything
    setDownloading(true);
    try {
      const encodedFilename = encodeURIComponent(application.resume);
      const response = await fetch(
        `${API_URL}/files/download/resume/${encodedFilename}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = application.resume;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert(`Download failed: ${error.message}`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <button 
      onClick={handleDownload} 
      disabled={downloading || !application.resume}
    >
      {downloading ? 'Downloading...' : 'Download Resume'}
    </button>
  );
}
```

### Axios Example

```typescript
import axios from 'axios';

async function downloadResume(filename: string, authToken: string) {
  try {
    const encodedFilename = encodeURIComponent(filename);
    
    const response = await axios.get(
      `${API_URL}/files/download/resume/${encodedFilename}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
        responseType: 'blob', // Important!
      }
    );

    // Create download link
    const blob = new Blob([response.data]);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    if (error.response) {
      console.error('Download error:', error.response.data);
    } else {
      console.error('Download error:', error.message);
    }
    throw error;
  }
}
```

---

## 🔄 Complete Flow Example

### Step 1: Get Application (with resume URL/filename)

```http
GET /api/applications/123
Authorization: Bearer <token>
```

**Response (Google Drive):**
```json
{
  "id": 123,
  "resume": "https://drive.google.com/file/d/1DRZ2fAKR0zzKbA66QspY3Hf0dgmZeYkC/view?usp=drivesdk",
  ...
}
```

**Response (Local File):**
```json
{
  "id": 123,
  "resume": "resume_1764663588598_Resume.docx",
  ...
}
```

### Step 2: Download Resume

**For Google Drive URL:**
```http
GET /api/files/download/resume/https%3A%2F%2Fdrive.google.com%2Ffile%2Fd%2F1DRZ2fAKR0zzKbA66QspY3Hf0dgmZeYkC%2Fview%3Fusp%3Ddrivesdk
Authorization: Bearer <token>
```

**For Local File:**
```http
GET /api/files/download/resume/resume_1764663588598_Resume.docx
Authorization: Bearer <token>
```

**Response:** Binary file stream (same for both)

---

## 📝 Important Notes

### 1. Google Drive URLs ✅ NOW SUPPORTED
The download API **now supports Google Drive URLs and file IDs**. You can use the same endpoint for both Google Drive files and local files.

**How It Works:**
- Backend automatically detects if it's a Google Drive URL or file ID
- Backend extracts the file ID from the URL if needed
- Backend uses Google Drive API (service account) to download the file
- Backend streams the file to the frontend

**✅ CORRECT (Works with all formats):**
```typescript
// Simple - works with Google Drive URLs, file IDs, and local files!
function downloadResume(resume: string, authToken: string) {
  const url = `/api/files/download/resume/${encodeURIComponent(resume)}`;
  // No need to check if it's a URL anymore!
  // Works with:
  // - Google Drive URLs: https://drive.google.com/file/d/FILE_ID/view
  // - Google Drive File IDs: FILE_ID
  // - Local files: resume_123.docx
}

// Usage
downloadResume(application.resume, token);
```

**Example with React:**
```typescript
async function handleResumeDownload(resume: string, authToken: string) {
  try {
    const encodedResume = encodeURIComponent(resume);
    const response = await fetch(
      `${API_URL}/files/download/resume/${encodedResume}`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Download failed');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = resume.includes('/') ? resume.split('/').pop() || 'resume' : resume;
    link.click();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Download failed:', error);
  }
}
```

### 2. Filename Format
- **Local files:** `resume_1764663588598_Resume.docx` (use with download API)
- **Google Drive URLs:** `https://drive.google.com/file/d/FILE_ID/view?usp=drivesdk` (use with download API)
- **Google Drive File IDs:** `1DRZ2fAKR0zzKbA66QspY3Hf0dgmZeYkC` (use with download API)

All formats are supported by the download API!

### 3. URL Encoding
Always URL-encode filenames that contain:
- Spaces (` ` → `%20`)
- Special characters (`#`, `&`, `+`, etc.)

### 4. Error Handling
Always handle these error cases:
- 401: User not authenticated (redirect to login)
- 403: User doesn't have permission (show error message)
- 404: File not found (show error message)
- 500: Server error (show error message, retry option)

---

## 🧪 Testing

### cURL Example

```bash
# Download resume
curl -X GET \
  "https://api.jobsmato.com/api/files/download/resume/resume_1764663588598_Resume.docx" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output resume.docx
```

### Postman Example

1. **Method:** GET
2. **URL:** `{{base_url}}/files/download/resume/resume_1764663588598_Resume.docx`
3. **Headers:**
   - `Authorization: Bearer {{auth_token}}`
4. **Send and Download:** Click "Send and Download"

---

## 📊 API Summary

| Property | Value |
|----------|-------|
| **Endpoint** | `GET /api/files/download/resume/:filename` |
| **Authentication** | Required (JWT) |
| **Authorization** | Role-based (Admin/Job Seeker/Employer) |
| **File Types** | PDF, DOC, DOCX |
| **Response Type** | Binary stream |
| **Max File Size** | 5MB (enforced during upload) |
| **Storage** | Google Drive (primary) or Local filesystem (`uploads/Resumes/`) |
| **Supported Formats** | Google Drive URLs, Google Drive File IDs, Local filenames |

---

## 🔍 Troubleshooting

### Issue: 404 Not Found

**Possible Causes:**
1. File doesn't exist in storage
2. Filename mismatch (check exact filename)
3. File was deleted

**Solution:**
- Verify filename matches exactly (case-sensitive)
- Check if file exists in `uploads/Resumes/` directory
- Ensure file was uploaded successfully

### Issue: 403 Forbidden

**Possible Causes:**
1. User doesn't have permission
2. Resume belongs to different user/company

**Solution:**
- Verify user role and permissions
- Check if resume belongs to user's applications (for job seekers)
- Check if resume belongs to employer's job applications (for employers)

### Issue: 400 Bad Request

**Possible Causes:**
1. Invalid filename format
2. Path traversal attempt
3. Invalid file extension

**Solution:**
- Ensure filename doesn't contain `..`, `/`, or `\`
- Verify file extension is `.pdf`, `.doc`, or `.docx`
- URL-encode special characters

---

**Last Updated:** December 19, 2025

