# Deployment Activity Log

This file tracks deployment activities.

---

## 2025-12-11 - Candidate Contact Fields: Applications API Update

### Changes Deployed
- **Feature:** Added candidate contact fields to job applications API
- **Migration:** `1700000000019-AddCandidateContactFieldsToJobApplication`
- **Database Changes:**
  - Added `candidateName` column to `job_applications` table
  - Added `candidateEmail` column to `job_applications` table
  - Added `candidatePhone` column to `job_applications` table

### API Changes
- **Endpoint:** `POST /api/applications`
- **New Required Fields:**
  - `candidateName` (string) - Full Name
  - `candidateEmail` (string) - Email Address (with email validation)
- **New Optional Fields:**
  - `candidatePhone` (string) - Phone Number

### Files Modified
- `src/entities/job-application.entity.ts` - Added candidate contact fields
- `src/modules/applications/dto/application.dto.ts` - Updated DTO with new fields
- `src/modules/applications/applications.service.ts` - Updated service to save and use candidate fields
- `src/migrations/1700000000019-AddCandidateContactFieldsToJobApplication.ts` - Migration file

### Deployment Steps
1. ✅ Built Docker image: `jobsmato-backend:latest`
2. ✅ Created deployment script: `deploy-candidate-fields.sh`
3. ✅ Created frontend documentation: `FRONTEND-APPLICATIONS-API-UPDATE.md`
4. ✅ **Deployed to production server (52.87.186.34)** - December 19, 2025
5. ✅ **Database migration executed successfully**
6. ✅ **Containers running and healthy**

### Breaking Changes
⚠️ **Breaking Change:** The API now requires `candidateName` and `candidateEmail` fields. Existing frontend code must be updated.

### Frontend Documentation
- **File:** `FRONTEND-APPLICATIONS-API-UPDATE.md`
- **Includes:** API specification, TypeScript interfaces, React examples, form validation, UI/UX recommendations

### Testing Checklist
- [ ] Test application creation with all required fields
- [ ] Test application creation with optional phone field
- [ ] Test validation errors (missing fields, invalid email)
- [ ] Test duplicate application prevention
- [ ] Verify response includes candidate contact information
- [ ] Test backward compatibility (if any)

### Deployment Details
- **Server IP:** 52.87.186.34
- **Deployment Date:** December 19, 2025
- **Migration Status:** ✅ Completed successfully
- **Containers:** ✅ Running (API, PostgreSQL, Redis)
- **API Status:** ✅ Application started successfully
- **Database Columns Added:**
  - ✅ `candidatename` (character varying, nullable) - lowercase in DB
  - ✅ `candidateemail` (character varying, nullable) - lowercase in DB
  - ✅ `candidatephone` (character varying, nullable) - lowercase in DB

### Fix Applied (December 19, 2025 - 06:35 UTC)
- **Issue:** Column name mismatch - TypeORM expected camelCase but database had lowercase
- **Error:** `column JobApplication.candidateName does not exist`
- **Solution:** Updated entity to explicitly map column names using `@Column({ name: 'candidatename' })`
- **Files Modified:**
  - `src/entities/job-application.entity.ts` - Added explicit column name mapping
- **Status:** ✅ Fixed and redeployed

### Notes
- Migration can be run independently if needed
- Candidate contact fields are stored per application
- Response uses candidate fields if provided, otherwise falls back to user profile
- Email validation ensures proper email format

---

## 2025-12-19 - Resume Filename Extraction Fix: Application Response Update

### Changes Deployed
- **Feature:** Fixed application response to return filename instead of fileUrl for resume field
- **Issue:** Download API expects filename, but application response was sending full fileUrl path
- **Solution:** Extract filename from stored fileUrl before returning in application response

### API Changes
- **Endpoint:** `GET /api/applications` (all endpoints returning application data)
- **Response Change:**
  - **Before:** `resume: "/uploads/Resumes/resume_1764663588598_Resume.docx"`
  - **After:** `resume: "resume_1764663588598_Resume.docx"`

### Files Modified
- `src/modules/applications/applications.service.ts`
  - Added `extractFilename()` helper method to extract filename from paths
  - Updated `formatApplicationResponse()` to return filename instead of fileUrl
- `src/modules/applications/dto/application.dto.ts`
  - Updated API documentation to clarify resume field contains filename for download API

### Deployment Steps
1. ✅ Built Docker image: `jobsmato-backend:latest`
2. ✅ Created deployment script: `deploy-resume-filename-fix.sh`
3. ✅ **Deployed to production server (52.87.186.34)** - December 19, 2025, 07:40 UTC
4. ✅ **Containers running and healthy**
5. ✅ **API started successfully**

### Benefits
- ✅ Frontend can now directly use `resume` field for download API
- ✅ No need for frontend to extract filename from path
- ✅ Consistent format across all application responses
- ✅ Backward compatible (handles both path and filename formats)

### Frontend Impact
**Before:**
```typescript
// Had to extract filename manually
const resumePath = application.resume; // "/uploads/Resumes/resume_xxx.docx"
const filename = resumePath.split('/').pop();
const downloadUrl = `/api/files/download/resume/${filename}`;
```

**After:**
```typescript
// Can use directly
const downloadUrl = `/api/files/download/resume/${application.resume}`;
// application.resume = "resume_xxx.docx"
```

### Testing Checklist
- [ ] Test GET /api/applications - verify resume field format
- [ ] Test GET /api/applications/:id - verify resume field format
- [ ] Test resume download using resume field from application response
- [ ] Verify backward compatibility with existing stored paths

### Deployment Details
- **Server IP:** 52.87.186.34
- **Deployment Date:** December 19, 2025, 07:40 UTC
- **Containers:** ✅ Running (API, PostgreSQL, Redis)
- **API Status:** ✅ Application started successfully
- **Build Time:** ~91 seconds
- **Image Size:** 96MB

---

## 2025-12-19 - Google Drive Download Support: Resume Download API Enhancement

### Changes Deployed
- **Feature:** Added Google Drive download support to resume download API
- **Problem Solved:** Google Drive URLs couldn't be opened directly due to permission restrictions
- **Solution:** Backend now downloads files from Google Drive using service account and streams to frontend

### API Changes
- **Endpoint:** `GET /api/files/download/resume/:filename`
- **New Capability:** Now supports Google Drive URLs and file IDs
- **Supported Formats:**
  - Google Drive URLs: `https://drive.google.com/file/d/FILE_ID/view?usp=drivesdk`
  - Google Drive File IDs: `1DRZ2fAKR0zzKbA66QspY3Hf0dgmZeYkC`
  - Local files: `resume_123.docx` (backward compatible)

### Files Modified
- `src/modules/files/files.service.ts`
  - Added Google Drive API integration
  - Added `extractGoogleDriveFileId()` method to extract file ID from URLs
  - Added `getResumeFromGoogleDrive()` method to download from Google Drive
  - Updated `getResumeFile()` to detect and handle Google Drive files
- `src/modules/files/files.controller.ts`
  - Updated validation to allow Google Drive URLs
  - Removed strict filename validation for Google Drive URLs
- `src/modules/files/files.module.ts`
  - Added `ConfigModule` for Google Drive credentials

### How It Works
1. Frontend sends Google Drive URL or file ID to download API
2. Backend detects if it's a Google Drive URL/file ID
3. Backend extracts file ID from URL if needed
4. Backend uses Google Drive API (service account) to download file
5. Backend streams file to frontend

### Benefits
- ✅ No need for public sharing or permission changes
- ✅ Works seamlessly with existing Google Drive URLs
- ✅ Frontend doesn't need special handling
- ✅ Backward compatible with local files
- ✅ Secure (uses service account credentials)

### Frontend Impact
**Before:**
```typescript
// Had to check and handle differently
if (resume.startsWith('http')) {
  window.open(resume, '_blank'); // Doesn't work due to permissions
} else {
  downloadResume(resume);
}
```

**After:**
```typescript
// Simple - works with both!
const url = `/api/files/download/resume/${encodeURIComponent(application.resume)}`;
// Works with Google Drive URLs, file IDs, and local files
```

### Deployment Steps
1. ✅ Built Docker image: `jobsmato-backend:latest`
2. ✅ Created deployment script: `deploy-google-drive-download.sh`
3. ✅ **Deployed to production server (52.87.186.34)** - December 19, 2025, 11:19 UTC
4. ✅ **Containers running and healthy**
5. ✅ **API started successfully**

### Testing Checklist
- [ ] Test with Google Drive URL: `GET /api/files/download/resume/{google_drive_url}`
- [ ] Test with Google Drive file ID: `GET /api/files/download/resume/{file_id}`
- [ ] Test with local filename: `GET /api/files/download/resume/{filename}`
- [ ] Verify authorization still works correctly
- [ ] Verify file streaming works correctly

### Deployment Details
- **Server IP:** 52.87.186.34
- **Deployment Date:** December 19, 2025, 11:19 UTC
- **Containers:** ✅ Running (API, PostgreSQL, Redis)
- **API Status:** ✅ Application started successfully
- **Build Time:** ~83 seconds
- **Image Size:** 96MB
- **Google Drive API:** ✅ Initialized successfully

### Notes
- Uses Google Drive service account credentials (`GOOGLE_DRIVE_CLIENT_EMAIL`, `GOOGLE_DRIVE_PRIVATE_KEY`)
- Requires `drive.readonly` scope for downloading files
- Files are streamed directly from Google Drive to client (no local caching)
- Authorization checks still apply (users can only download authorized resumes)

---

## 2025-12-21 - Merged Manage Jobs Page: API Enhancements

### Changes Deployed
- **Feature:** Enhanced `/api/jobs/my-jobs` endpoint to support merged Manage Jobs page
- **Requirements:** Implemented based on `BACKEND-MERGED-MANAGE-JOBS-API.md`
- **Status:** ✅ All requirements fulfilled and deployed

### API Changes

#### 1. Status Filter Support
- **Endpoint:** `GET /api/jobs/my-jobs`
- **New Query Parameter:** `status` (optional)
  - Values: `active`, `paused`, `closed`, `draft`
  - Example: `GET /api/jobs/my-jobs?status=active`

#### 2. Enhanced Sorting Logic
- **Automatic Sorting:** Active jobs appear first, then sorted by date (newest first)
- **Date Priority:** Uses `postedDate` if available, falls back to `createdAt`
- **Implementation:** SQL CASE statement for status priority, then COALESCE for date sorting

#### 3. HR Contact Fields Added
- **New Fields in Response:**
  - `hrName` - HR/Recruiter name
  - `hrContact` - HR contact phone/email
  - `hrWhatsapp` - HR WhatsApp number
- **Status:** ✅ Included in all job responses

#### 4. Active Job Limit Enforcement
- **Limit:** Maximum 10 active jobs per employer
- **Validation Points:**
  - When creating new job (`POST /api/jobs`)
  - When updating job status to 'active' (`PATCH /api/jobs/:id`)
- **Error Message:** "Maximum 10 active jobs allowed. Please pause or close an existing job before creating a new one."

### Files Modified
- `src/modules/jobs/dto/job.dto.ts`
  - Added `status` filter to `JobSearchDto`
- `src/modules/jobs/jobs.service.ts`
  - Updated `getMyJobs()` to support status filter
  - Implemented sorting: active jobs first, then by date
  - Added active job limit validation in `create()` method
  - Added active job limit validation in `update()` method
  - Added HR contact fields to `formatJobResponse()`
- `src/modules/jobs/jobs.controller.ts`
  - No changes needed (uses existing endpoint)

### Deployment Steps
1. ✅ Built Docker image: `jobsmato-backend:latest`
2. ✅ Fixed TypeScript compilation error (status comparison)
3. ✅ **Deployed to production server (52.87.186.34)** - December 21, 2025, 18:18 UTC
4. ✅ **Containers running and healthy**
5. ✅ **API started successfully**

### Benefits
- ✅ Better job management UX with status filtering
- ✅ Automatic sorting ensures active jobs are prioritized
- ✅ Active job limit prevents job spam
- ✅ HR contact information readily available
- ✅ Backward compatible - no breaking changes

### Frontend Impact
**New Capabilities:**
```typescript
// Filter by status
GET /api/jobs/my-jobs?status=active

// Jobs automatically sorted: active first, then by date
// No need for frontend sorting

// HR contact fields available
job.hrName, job.hrContact, job.hrWhatsapp
```

**Error Handling:**
```typescript
// Handle active job limit error
if (error.message.includes('Maximum 10 active jobs')) {
  // Show user-friendly message
  alert('You have reached the maximum limit of 10 active jobs.');
}
```

### Testing Checklist
- [x] Status filter works correctly (`status=active`, `status=paused`, etc.)
- [x] Jobs are sorted correctly (active first, then by date)
- [x] Active job limit validation works in create()
- [x] Active job limit validation works in update()
- [x] HR contact fields included in response
- [x] Pagination works with status filter
- [x] Applications count included in response
- [x] Backward compatibility maintained

### Deployment Details
- **Server IP:** 52.87.186.34
- **Deployment Date:** December 21, 2025, 18:18 UTC
- **Containers:** ✅ Running (API, PostgreSQL, Redis)
- **API Status:** ✅ Application started successfully
- **Build Time:** ~65 seconds
- **Image Size:** 96MB
- **TypeScript Compilation:** ✅ No errors

### Frontend Documentation
- **File:** `FRONTEND-MERGED-MANAGE-JOBS-API-CHANGES.md`
- **Includes:** 
  - Complete API reference
  - Status filter usage
  - Sorting behavior explanation
  - Active job limit handling
  - HR contact fields usage
  - Integration examples
  - Troubleshooting guide

### Notes
- All changes are backward compatible
- Status filter is optional - if not provided, all jobs are returned
- Sorting enhancement doesn't break existing functionality
- Active job limit only applies when creating/activating jobs
- HR fields are optional and won't break if missing

---
