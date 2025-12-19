# File Upload API Documentation

## 📋 Overview

The Jobsmato backend provides multiple file upload endpoints for different use cases:
- **Google Drive Upload** - For documents and general files
- **Cloudinary Upload** - For images (logos, avatars) with optimization
- **Resume Upload** - Specifically for resume files

**Base URLs:**
- `/api/upload` - Google Drive upload endpoints
- `/api/cloudinary` - Cloudinary image upload endpoints

**Authentication:** Required (JWT Bearer Token)

---

## 📤 Upload Endpoints

### 1. Upload Any File (Google Drive)

**POST** `/api/upload/file`

**Description:** Upload any file to Google Drive. Folder is determined by user role.

**Request:**
```http
POST /api/upload/file
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <file>
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "fileId": "1a2b3c4d5e6f7g8h9i0j",
    "fileName": "document.pdf",
    "fileUrl": "https://drive.google.com/file/d/1a2b3c4d5e6f7g8h9i0j/view",
    "mimeType": "application/pdf",
    "size": 1024000
  }
}
```

**Folder Assignment:**
- Employers → `Company Documents`
- Job Seekers → `User Documents`

**Allowed File Types:**
- PDF, DOC, DOCX
- Images (JPEG, PNG, GIF)
- Text files

**Max File Size:** 5MB

---

### 2. Upload Resume

**POST** `/api/upload/resume`

**Description:** Upload a resume file (PDF, DOC, DOCX only). Files are stored in the `Resumes` folder.

**Request:**
```http
POST /api/upload/resume
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <resume_file>
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "fileId": "resume_1234567890_John_Doe_Resume.pdf",
    "fileName": "John_Doe_Resume.pdf",
    "fileUrl": "/uploads/Resumes/resume_1234567890_John_Doe_Resume.pdf",
    "mimeType": "application/pdf",
    "size": 245760
  }
}
```

**Allowed File Types:**
- `application/pdf` - PDF files
- `application/msword` - DOC files
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document` - DOCX files

**Max File Size:** 5MB

**Error Responses:**
- `400 Bad Request` - Invalid file type or file too large
- `401 Unauthorized` - Missing or invalid token

---

### 3. Upload Company Logo

**POST** `/api/upload/company-logo`

**Description:** Upload a company logo. Uses Cloudinary if configured, otherwise falls back to Google Drive.

**Request:**
```http
POST /api/upload/company-logo
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <image_file>
useCloudinary: true (optional query parameter)
```

**Response (201 Created) - Cloudinary:**
```json
{
  "success": true,
  "data": {
    "fileId": "jobsmato/company-logos/abc123",
    "fileName": "company-logo.png",
    "fileUrl": "https://res.cloudinary.com/dhcdcbhe8/image/upload/v1234567890/jobsmato/company-logos/abc123.png",
    "mimeType": "image/png",
    "size": 125000,
    "publicId": "jobsmato/company-logos/abc123",
    "secureUrl": "https://res.cloudinary.com/dhcdcbhe8/image/upload/v1234567890/jobsmato/company-logos/abc123.png",
    "width": 500,
    "height": 500,
    "format": "png"
  }
}
```

**Response (201 Created) - Google Drive Fallback:**
```json
{
  "success": true,
  "data": {
    "fileId": "1a2b3c4d5e6f7g8h9i0j",
    "fileName": "company-logo.png",
    "fileUrl": "https://drive.google.com/file/d/1a2b3c4d5e6f7g8h9i0j/view",
    "mimeType": "image/png",
    "size": 125000
  }
}
```

**Allowed File Types:**
- `image/jpeg` - JPEG images
- `image/png` - PNG images
- `image/gif` - GIF images
- `image/webp` - WebP images

**Max File Size:** 5MB

**Query Parameters:**
- `useCloudinary` (boolean, optional) - Force use Cloudinary (default: true if configured)

---

### 4. Upload to Google Drive with Folder

**POST** `/api/upload/google-drive`

**Description:** Upload a file to Google Drive with optional folder ID.

**Request:**
```http
POST /api/upload/google-drive
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <file>
folderId: 1Vy45PqTpaDiNlV8T1SGIy7ZND29E4zhl (optional)
```

**Response (201 Created):**
```json
{
  "fileId": "1a2b3c4d5e6f7g8h9i0j",
  "webViewLink": "https://drive.google.com/file/d/1a2b3c4d5e6f7g8h9i0j/view",
  "webContentLink": "https://drive.google.com/uc?export=download&id=1a2b3c4d5e6f7g8h9i0j",
  "thumbnailLink": "https://drive.google.com/thumbnail?id=1a2b3c4d5e6f7g8h9i0j",
  "name": "document.pdf",
  "mimeType": "application/pdf",
  "size": 1024000
}
```

**Query Parameters:**
- `folderId` (string, optional) - Google Drive folder ID to upload to

---

## 🖼️ Cloudinary Upload Endpoints

### 5. Upload Generic Image

**POST** `/api/cloudinary/upload/image`

**Description:** Upload an image to Cloudinary with optional folder and tags.

**Request:**
```http
POST /api/cloudinary/upload/image
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <image_file>
folder: jobsmato/custom-folder (optional query parameter)
tags: tag1,tag2 (optional query parameter)
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "publicId": "jobsmato/custom-folder/image123",
    "url": "http://res.cloudinary.com/dhcdcbhe8/image/upload/v1234567890/jobsmato/custom-folder/image123.jpg",
    "secureUrl": "https://res.cloudinary.com/dhcdcbhe8/image/upload/v1234567890/jobsmato/custom-folder/image123.jpg",
    "width": 1920,
    "height": 1080,
    "format": "jpg",
    "bytes": 245760,
    "createdAt": "2025-12-19T06:00:00Z"
  }
}
```

**Query Parameters:**
- `folder` (string, optional) - Folder path in Cloudinary
- `tags` (string, optional) - Comma-separated tags

---

### 6. Upload Company Logo (Cloudinary)

**POST** `/api/cloudinary/upload/company-logo`

**Description:** Upload a company logo to Cloudinary with automatic optimization.

**Request:**
```http
POST /api/cloudinary/upload/company-logo
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <image_file>
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "publicId": "jobsmato/company-logos/logo123",
    "url": "http://res.cloudinary.com/dhcdcbhe8/image/upload/c_limit,w_500,h_500,q_auto:good/jobsmato/company-logos/logo123.png",
    "secureUrl": "https://res.cloudinary.com/dhcdcbhe8/image/upload/c_limit,w_500,h_500,q_auto:good/jobsmato/company-logos/logo123.png",
    "width": 500,
    "height": 500,
    "format": "png",
    "bytes": 125000,
    "createdAt": "2025-12-19T06:00:00Z"
  }
}
```

**Features:**
- Automatic resizing (max 500x500)
- Quality optimization
- Format optimization

---

### 7. Upload User Avatar (Cloudinary)

**POST** `/api/cloudinary/upload/user-avatar`

**Description:** Upload a user avatar to Cloudinary with automatic optimization.

**Request:**
```http
POST /api/cloudinary/upload/user-avatar
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <image_file>
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "publicId": "jobsmato/user-avatars/avatar123",
    "url": "http://res.cloudinary.com/dhcdcbhe8/image/upload/c_fill,w_200,h_200,q_auto:good/r_max/jobsmato/user-avatars/avatar123.jpg",
    "secureUrl": "https://res.cloudinary.com/dhcdcbhe8/image/upload/c_fill,w_200,h_200,q_auto:good/r_max/jobsmato/user-avatars/avatar123.jpg",
    "width": 200,
    "height": 200,
    "format": "jpg",
    "bytes": 45000,
    "createdAt": "2025-12-19T06:00:00Z"
  }
}
```

**Features:**
- Automatic resizing (200x200)
- Circular crop support
- Quality optimization

---

## 📥 File Management Endpoints

### 8. Get File Information

**GET** `/api/upload/:fileId`

**Description:** Get information about an uploaded file.

**Request:**
```http
GET /api/upload/1a2b3c4d5e6f7g8h9i0j
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "1a2b3c4d5e6f7g8h9i0j",
    "name": "document.pdf",
    "webViewLink": "https://drive.google.com/file/d/1a2b3c4d5e6f7g8h9i0j/view",
    "size": "1024000",
    "mimeType": "application/pdf",
    "createdTime": "2025-12-19T06:00:00Z",
    "modifiedTime": "2025-12-19T06:00:00Z"
  }
}
```

---

### 9. Delete File

**DELETE** `/api/upload/:fileId`

**Description:** Delete an uploaded file.

**Request:**
```http
DELETE /api/upload/1a2b3c4d5e6f7g8h9i0j
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

**Error Responses:**
- `404 Not Found` - File not found or could not be deleted

---

### 10. Get Upload Limits

**GET** `/api/upload/limits/info`

**Description:** Get upload limits and allowed file types.

**Request:**
```http
GET /api/upload/limits/info
Authorization: Bearer <token>
```

**Response (200 OK):**
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

---

## 🖼️ Cloudinary Image Management

### 11. Get Image URL with Transformations

**GET** `/api/cloudinary/image/:publicId`

**Description:** Get Cloudinary image URL with optional transformations.

**Request:**
```http
GET /api/cloudinary/image/jobsmato/company-logos/logo123?size=medium
Authorization: Bearer <token>
```

**Query Parameters:**
- `size` (enum, optional) - Predefined size: `thumbnail`, `small`, `medium`, `large`, `original`
- `width` (number, optional) - Custom width
- `height` (number, optional) - Custom height
- `crop` (enum, optional) - Crop mode: `fill`, `limit`, `fit`, `scale`

**Response (200 OK):**
```json
{
  "url": "https://res.cloudinary.com/dhcdcbhe8/image/upload/c_limit,w_500,h_500,q_auto:good/jobsmato/company-logos/logo123.png",
  "publicId": "jobsmato/company-logos/logo123"
}
```

---

### 12. Delete Image from Cloudinary

**DELETE** `/api/cloudinary/image/:publicId`

**Description:** Delete an image from Cloudinary.

**Request:**
```http
DELETE /api/cloudinary/image/jobsmato/company-logos/logo123
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Image deleted successfully"
}
```

---

## 💻 Frontend Implementation Examples

### React/TypeScript Example

```typescript
import axios from 'axios';

const API_BASE_URL = 'https://api.jobsmato.com/api';

// Upload Resume
async function uploadResume(file: File, authToken: string) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post(
    `${API_BASE_URL}/upload/resume`,
    formData,
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data;
}

// Upload Company Logo (Cloudinary)
async function uploadCompanyLogo(file: File, authToken: string) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post(
    `${API_BASE_URL}/cloudinary/upload/company-logo`,
    formData,
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data;
}

// Upload User Avatar
async function uploadUserAvatar(file: File, authToken: string) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axios.post(
    `${API_BASE_URL}/cloudinary/upload/user-avatar`,
    formData,
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data;
}

// Get Upload Limits
async function getUploadLimits(authToken: string) {
  const response = await axios.get(
    `${API_BASE_URL}/upload/limits/info`,
    {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    }
  );

  return response.data;
}
```

### HTML Form Example

```html
<form id="uploadForm" enctype="multipart/form-data">
  <input type="file" id="fileInput" name="file" accept=".pdf,.doc,.docx" />
  <button type="submit">Upload Resume</button>
</form>

<script>
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const fileInput = document.getElementById('fileInput');
  const file = fileInput.files[0];
  
  if (!file) {
    alert('Please select a file');
    return;
  }
  
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await fetch('https://api.jobsmato.com/api/upload/resume', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
      body: formData,
    });
    
    const result = await response.json();
    console.log('Upload successful:', result);
  } catch (error) {
    console.error('Upload failed:', error);
  }
});
</script>
```

---

## 📋 File Type Restrictions

### Resume Upload
- ✅ PDF (`.pdf`)
- ✅ DOC (`.doc`)
- ✅ DOCX (`.docx`)
- ❌ All other formats

### Image Uploads (Company Logo, Avatar)
- ✅ JPEG (`.jpg`, `.jpeg`)
- ✅ PNG (`.png`)
- ✅ GIF (`.gif`)
- ✅ WebP (`.webp`)
- ❌ All other formats

### General File Upload
- ✅ PDF, DOC, DOCX
- ✅ JPEG, PNG, GIF
- ✅ Text files
- ❌ Executables, scripts, archives

---

## ⚠️ Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": "File size exceeds 5MB limit. Current size: 6.2MB",
  "error": "Bad Request"
}
```

### 400 Bad Request - Invalid File Type
```json
{
  "statusCode": 400,
  "message": "Only PDF, DOC, and DOCX files are allowed for resumes",
  "error": "Bad Request"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "error": "Unauthorized"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "File not found",
  "error": "Not Found"
}
```

---

## 🔒 Security Features

1. **Authentication Required:** All endpoints require JWT token
2. **File Size Limits:** Maximum 5MB per file
3. **File Type Validation:** Strict MIME type checking
4. **Path Traversal Prevention:** File names are sanitized
5. **User Isolation:** Files are organized by user role

---

## 📝 Best Practices

1. **Validate File Size:** Check file size before upload
2. **Validate File Type:** Verify MIME type matches expected format
3. **Show Progress:** Display upload progress for large files
4. **Handle Errors:** Provide user-friendly error messages
5. **Store File URLs:** Save returned `fileUrl` or `secureUrl` in your database
6. **Use Cloudinary for Images:** Better performance and optimization
7. **Use Resume Endpoint:** Use `/upload/resume` for resume files

---

**Last Updated:** December 19, 2025

