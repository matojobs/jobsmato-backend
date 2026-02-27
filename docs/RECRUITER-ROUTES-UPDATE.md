# Recruiter Routes Update

## Route Path Changes

All recruiter endpoints have been moved to `/api/recruiter/` prefix to avoid conflicts with job seeker routes.

### Old Routes (Conflicted) → New Routes (Isolated)

| Old Route | New Route | Status |
|-----------|-----------|--------|
| `GET /api/recruiters` | `GET /api/recruiter/recruiters` | ✅ Updated |
| `GET /api/companies` | `GET /api/recruiter/companies` | ✅ Updated (was conflicting with CompaniesController) |
| `GET /api/job-roles` | `GET /api/recruiter/job-roles` | ✅ Updated |
| `POST /api/job-roles` | `POST /api/recruiter/job-roles` | ✅ Updated |
| `GET /api/candidates` | `GET /api/recruiter/candidates` | ✅ Updated |
| `POST /api/candidates` | `POST /api/recruiter/candidates` | ✅ Updated |
| `GET /api/applications` | `GET /api/recruiter/applications` | ✅ Updated (was conflicting with ApplicationsController) |
| `GET /api/applications/:id` | `GET /api/recruiter/applications/:id` | ✅ Updated |
| `POST /api/applications` | `POST /api/recruiter/applications` | ✅ Updated (was conflicting with ApplicationsController) |
| `PATCH /api/applications/:id` | `PATCH /api/recruiter/applications/:id` | ✅ Updated |
| `DELETE /api/applications/:id` | `DELETE /api/recruiter/applications/:id` | ✅ Updated |
| `GET /api/dashboard/stats` | `GET /api/recruiter/dashboard/stats` | ✅ Updated |
| `GET /api/dashboard/pipeline` | `GET /api/recruiter/dashboard/pipeline` | ✅ Updated |
| `GET /api/reports/recruiter-performance` | `GET /api/recruiter/reports/recruiter-performance` | ✅ Updated |

## Conflicts Resolved

### 1. `/api/applications` Conflict
- **Job Seeker Routes**: `/api/applications` (ApplicationsController)
  - `GET /api/applications` - Get user's applications
  - `POST /api/applications` - Apply for a job (JOB_SEEKER role)
  - `GET /api/applications/:id` - Get application by ID
  - `PATCH /api/applications/:id/status` - Update application status
  - `DELETE /api/applications/:id` - Withdraw application

- **Recruiter Routes**: `/api/recruiter/applications` (RecruiterController)
  - `GET /api/recruiter/applications` - Get recruiter's applications
  - `POST /api/recruiter/applications` - Create application (RECRUITER role)
  - `GET /api/recruiter/applications/:id` - Get application by ID
  - `PATCH /api/recruiter/applications/:id` - Update application
  - `DELETE /api/recruiter/applications/:id` - Delete application

### 2. `/api/companies` Conflict
- **Public/Employer Routes**: `/api/companies` (CompaniesController)
  - `GET /api/companies` - Get all companies
  - `POST /api/companies` - Create company (EMPLOYER role)
  - `GET /api/companies/:id` - Get company by ID
  - `PATCH /api/companies/:id` - Update company
  - `DELETE /api/companies/:id` - Delete company

- **Recruiter Routes**: `/api/recruiter/companies` (RecruiterController)
  - `GET /api/recruiter/companies` - Get companies (read-only for recruiters)

## No Conflicts

These routes are unique to recruiters:
- `/api/recruiter/recruiters` - No conflict
- `/api/recruiter/job-roles` - No conflict
- `/api/recruiter/candidates` - No conflict
- `/api/recruiter/dashboard/stats` - No conflict
- `/api/recruiter/dashboard/pipeline` - No conflict
- `/api/recruiter/reports/recruiter-performance` - No conflict

## Testing

Use the updated test script:
```bash
node test-recruiter-routes-new.js
```

All routes should now work without conflicts!
