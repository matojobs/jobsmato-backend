# API Routes Summary

## 🎯 Two Separate API Portals

This backend serves **two distinct portals** with separate route prefixes:

### 1. **Job Portal** (`/api/*`)
For **Job Seekers** and **Employers** - the main job portal functionality.

### 2. **Recruiter Portal** (`/api/recruiter/*`)
For **Recruiters** - sourcing DataLake and candidate management.

---

## 📋 Job Portal Routes (`/api/*`)

### Applications (Job Seekers & Employers)
- `POST /api/applications` - Apply for a job (JOB_SEEKER only)
- `GET /api/applications` - Get user's applications (any authenticated user)
- `GET /api/applications/:id` - Get application by ID
- `GET /api/applications/job/:jobId` - Get applications for a job (EMPLOYER only)
- `PATCH /api/applications/:id/status` - Update application status (EMPLOYER only)
- `DELETE /api/applications/:id` - Withdraw application (JOB_SEEKER only)

### Jobs
- `GET /api/jobs` - Browse jobs
- `GET /api/jobs/:id` - Get job details
- `POST /api/jobs` - Create job (EMPLOYER only)
- `PATCH /api/jobs/:id` - Update job (EMPLOYER only)
- `DELETE /api/jobs/:id` - Delete job (EMPLOYER only)
- `GET /api/jobs/my-jobs` - Get employer's jobs (EMPLOYER only)
- `GET /api/jobs/featured` - Get featured jobs
- `GET /api/jobs/hot` - Get hot jobs
- `GET /api/jobs/categories` - Get job categories
- `GET /api/jobs/industry/:industry` - Get jobs by industry
- `GET /api/jobs/stats/industries` - Get industry statistics

### Companies
- `GET /api/companies` - Browse companies
- `GET /api/companies/:id` - Get company details
- `POST /api/companies` - Create company (EMPLOYER only)
- `PATCH /api/companies/:id` - Update company (EMPLOYER only)
- `DELETE /api/companies/:id` - Delete company (EMPLOYER only)

### Users & Auth
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register
- `GET /api/users/profile` - Get user profile
- `PATCH /api/users/profile` - Update profile

---

## 🔍 Recruiter Portal Routes (`/api/recruiter/*`)

### Master Data
- `GET /api/recruiter/recruiters` - Get all recruiters
- `GET /api/recruiter/companies` - Get companies (read-only)
- `GET /api/recruiter/job-roles` - Get job roles
- `POST /api/recruiter/job-roles` - Create job role
- `GET /api/recruiter/candidates` - Get candidates
- `POST /api/recruiter/candidates` - Create candidate

### Applications (Full CRUD)
- `GET /api/recruiter/applications` - Get recruiter's applications
- `GET /api/recruiter/applications/:id` - Get application by ID
- `POST /api/recruiter/applications` - Create application
- `PATCH /api/recruiter/applications/:id` - Update application
- `DELETE /api/recruiter/applications/:id` - Delete application

### Dashboard & Reports
- `GET /api/recruiter/dashboard/stats` - Dashboard statistics
- `GET /api/recruiter/dashboard/pipeline` - Pipeline breakdown
- `GET /api/recruiter/reports/recruiter-performance` - Performance report

---

## ✅ No Changes Required for Job Portal Frontend

**Job Seekers and Employers can continue using the same routes:**
- All `/api/applications/*` routes work exactly as before
- All `/api/jobs/*` routes work exactly as before
- All `/api/companies/*` routes work exactly as before

**Only Recruiters need to update their frontend:**
- Change from `/api/applications` → `/api/recruiter/applications`
- Change from `/api/companies` → `/api/recruiter/companies`
- All other recruiter routes now use `/api/recruiter/*` prefix

---

## 🔐 Role-Based Access

### Job Portal Routes
- **Public**: Browse jobs, companies (some endpoints)
- **JOB_SEEKER**: Apply for jobs, view own applications
- **EMPLOYER**: Create jobs, view applications for own jobs, manage companies

### Recruiter Portal Routes
- **RECRUITER**: Full access to all `/api/recruiter/*` endpoints
- **Isolated**: Recruiters cannot access job portal application creation logic

---

## 📝 Notes

- **Route Isolation**: Recruiter routes are completely isolated under `/api/recruiter/*`
- **No Conflicts**: Job portal routes remain unchanged and conflict-free
- **Backward Compatible**: All existing job portal frontend code continues to work
- **Breaking Change**: Only affects recruiter frontend (must use new `/api/recruiter/*` prefix)
