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
