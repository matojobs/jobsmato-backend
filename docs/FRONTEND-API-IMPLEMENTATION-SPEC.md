# APIs Required by Frontend – Implementation Spec

This document lists **every API** the Recruiter App frontend calls. Use it to implement or verify backend endpoints. Base URL is `NEXT_PUBLIC_API_BASE_URL` (e.g. `http://localhost:5000/api`).

---

## Part 1: Recruiter Portal APIs

**Prefix:** Recruiter routes use `/api/recruiter/*`.  
**Auth:** Recruiter JWT from `POST /api/auth/login`. Send `Authorization: Bearer <token>` on all recruiter requests.

---

### 1.1 Authentication (no /recruiter prefix)

| Method | Full path | Auth | Description |
|--------|-----------|------|-------------|
| POST | `/api/auth/login` | None | Recruiter login |

**Request body:**
```json
{
  "email": "recruiter@example.com",
  "password": "your_password"
}
```

**Response 200:** Frontend expects at least one of:
- `accessToken` or top-level `token`
- User identity: `user.id` or `userId`, `user.email` or `email`, `user.role` or `role`

Example shape frontend can use:
```json
{
  "accessToken": "eyJ...",
  "user": {
    "id": 1,
    "email": "recruiter@example.com",
    "role": "recruiter"
  }
}
```
Or flat: `{ "accessToken": "...", "userId": 1, "email": "...", "role": "recruiter" }`.

**Response 401:** Invalid credentials.

**Notes:** CORS must allow the frontend origin. OPTIONS preflight must return 200 with appropriate `Access-Control-*` headers.

---

### 1.2 Master data

| Method | Full path | Auth | Description |
|--------|-----------|------|-------------|
| GET | `/api/recruiter/recruiters` | Bearer | List all recruiters |
| GET | `/api/recruiter/companies` | Bearer | List all companies |
| GET | `/api/recruiter/companies/:id` | Bearer | Get company by ID **with** `job_roles` array |
| GET | `/api/recruiter/job-roles` | Bearer | List job roles (optional `?company_id=1`) |
| POST | `/api/recruiter/job-roles` | Bearer | Create job role |
| GET | `/api/recruiter/candidates` | Bearer | List candidates (optional `?search=...`) |
| POST | `/api/recruiter/candidates` | Bearer | Create candidate |

**GET /api/recruiter/recruiters**  
- Response: array or `{ data: [] }` / `{ items: [] }`.  
- Each item: `id`, `name`, `email`, `phone?`, `is_active?`, `created_at`, `updated_at` (snake_case).

**GET /api/recruiter/companies**  
- Response: array or wrapped.  
- Each item: `id`, `name`, `industry?`, `size?`, `website?`, `created_at?`, `job_roles_count?`, `slug?`, `description?`.

**GET /api/recruiter/companies/:id** (required for Add New Candidate – Company → Job Role dropdown)  
- Response 200: single object with **`job_roles`** array.  
- Company: `id`, `name`, `slug?`, `description?`, `website?`, `industry?`, `job_roles_count?`.  
- `job_roles`: array of `{ id, company_id, role_name, department?, is_active?, created_at? }`.  
- Response 404: `{ statusCode: 404, message: "Company with ID X not found", error: "Not Found" }`.

**GET /api/recruiter/job-roles**  
- Query: `company_id` (optional).  
- Response: array or wrapped. Each item: `id`, `company_id`, `role_name`, `department?`, `is_active?`, `created_at`, `company?` (nested company object).

**POST /api/recruiter/job-roles**  
- Body: `{ "company_id": number, "role_name": string, "department"?: string }`.  
- Response 201: created job role object (same shape as list item).

**GET /api/recruiter/candidates**  
- Query: `search` (optional).  
- Response: array or wrapped. Each item: `id`, `candidate_name`, `phone`, `email`, `qualification`, `work_exp_years?`, `portal_id?`, `created_at`.

**POST /api/recruiter/candidates**  
- Body: `candidate_name`, `phone`, `email`, `qualification`, `work_exp_years?`, `portal_id?` (snake_case).  
- Response 201: created candidate object.

---

### 1.3 Applications CRUD

| Method | Full path | Auth | Description |
|--------|-----------|------|-------------|
| GET | `/api/recruiter/applications` | Bearer | List applications (with filters) |
| GET | `/api/recruiter/applications/:id` | Bearer | Get one application |
| POST | `/api/recruiter/applications` | Bearer | Create application |
| PATCH | `/api/recruiter/applications/:id` | Bearer | Update application |
| DELETE | `/api/recruiter/applications/:id` | Bearer | Delete application |

**GET /api/recruiter/applications**  
- Query (all optional): `page`, `limit`, `recruiter_id`, `job_role_id`, `company_id`, `call_status`, `interested_status`, `selection_status`, `joining_status`, `start_date`, `end_date` (not `date_from`/`date_to`).  
- Response: array or `{ data: [] }` / `{ applications: [] }` / `{ items: [] }`.  
- Each item: `id`, `recruiter_id`, `candidate_id`, `job_role_id`, `assigned_date`, `call_date`, `call_status`, `interested_status`, `selection_status`, `joining_status`, `notes?`, `portal?`, `created_at`, `updated_at`, and nested `candidate`, `job_role`, `company`, `recruiter` (optional but used by frontend).

**GET /api/recruiter/applications/:id**  
- Response 200: single application with same shape and relations.  
- Response 404: `{ statusCode: 404, message: "Application not found", error: "Not Found" }`.

**POST /api/recruiter/applications**  
- Body (snake_case): `candidate_id`, `job_role_id`, `assigned_date` (required); `call_date`, `call_status`, `interested_status`, `selection_status`, `joining_status`, `notes` (optional).  
- Status values: strings (e.g. "Connected", "Yes", "Selected", "Pending", "Joined").  
- Response 201: created application (id, etc.).  
- Response 400 (e.g. duplicate): `{ statusCode: 400, message: "...", error: "Bad Request" }`.

**PATCH /api/recruiter/applications/:id**  
- Body: partial; can include `call_date`, `call_status`, `interested_status`, `selection_status`, `joining_status`, `notes`, `interview_date`, `interview_status`, `joining_date`.  
- Response 200: updated application or full object with relations.

**DELETE /api/recruiter/applications/:id**  
- Response 200: e.g. `{ "message": "Application deleted successfully" }` or empty body.

---

### 1.4 Dashboard

| Method | Full path | Auth | Description |
|--------|-----------|------|-------------|
| GET | `/api/recruiter/dashboard/stats` | Bearer | Dashboard KPIs |
| GET | `/api/recruiter/dashboard/pipeline` | Bearer | Pipeline breakdown |

**GET /api/recruiter/dashboard/stats**  
- Query: `recruiter_id` (optional).  
- Response 200: object with snake_case keys, e.g.  
  `total_applications`, `total_candidates`, `total_calls`, `avg_calls_per_day`, `connected_calls`, `interested_candidates`, `selected_candidates`, `joined_candidates`, `conversion_rate`, `call_to_interest_rate`, `interest_to_selection_rate`, `selection_to_join_rate`.  
- Frontend maps these to camelCase (e.g. `totalSourced`, `connectedToday`).

**GET /api/recruiter/dashboard/pipeline**  
- Query: same filter params as applications (e.g. `start_date`, `end_date`).  
- Response 200: array of `{ stage: string, count: number }`, e.g.  
  `["New Applications", "Contacted", "Interested", "Selected", "Joined", ...]`.  
- Frontend maps stages to pipeline keys (sourced, callDone, connected, etc.).

---

## Part 2: Admin Panel APIs

**Prefix:** All under `/api/admin/*`.  
**Auth:** Admin JWT from `POST /api/admin/auth/login`. Send `Authorization: Bearer <token>` on all admin requests except login.

---

### 2.1 Admin auth

| Method | Full path | Auth | Description |
|--------|-----------|------|-------------|
| POST | `/api/admin/auth/login` | None | Admin login |
| GET | `/api/admin/auth/permissions` | Bearer | Current permissions |
| POST | `/api/admin/auth/logout` | Bearer | Logout |

**POST /api/admin/auth/login**  
- Body: `{ "email": string, "password": string }`.  
- Response 200: `success`, `user` (with `accessToken`, `userId`, `email`, `fullName`, `role`), optional top-level `token`, and **`permissions`** (array of strings).  
- Response 401: invalid credentials or non-admin user.

**GET /api/admin/auth/permissions**  
- Response 200: `{ "permissions": string[], "role": string, "isAdmin": boolean }`.

**POST /api/admin/auth/logout**  
- Response 200: e.g. `{ "success": true, "message": "Logged out successfully" }`.

---

### 2.2 Admin dashboard

| Method | Full path | Permission | Description |
|--------|-----------|------------|-------------|
| GET | `/api/admin/dashboard/stats` | view_analytics | Dashboard stats |
| GET | `/api/admin/dashboard/analytics/users?days=30` | view_analytics | User analytics |
| GET | `/api/admin/dashboard/analytics/jobs?days=30` | view_analytics | Job analytics |
| GET | `/api/admin/dashboard/analytics/applications?days=30` | view_analytics | Application analytics |

**GET /api/admin/dashboard/stats**  
- Response 200: camelCase, e.g.  
  `totalUsers`, `totalJobs`, `totalCompanies`, `totalApplications`, `activeJobs`, `pendingApplications`, `newUsersToday`, `newJobsToday`, `userGrowthRate?`, `jobPostingRate?`, `applicationRate?`.

**GET /api/admin/dashboard/analytics/users**  
- Query: `days` (number, default 30).  
- Response 200: time-series structure; frontend expects a plottable array (e.g. `dates` with `date` and `count` or similar). If not implemented, return `{ dates: [] }` or 403.

**GET /api/admin/dashboard/analytics/jobs**  
- Query: `days`.  
- Response 200: job posting trends; frontend expects array or `{ data: [] }` with plottable points.

**GET /api/admin/dashboard/analytics/applications**  
- Query: `days`.  
- Response 200: e.g. `{ applicationRates: [], applicationStatus: [], topJobs: [], applicationTrends: [] }`. Frontend can plot `applicationTrends` or a similar array. Return 403 if permission missing; frontend handles 403 per tab.

---

### 2.3 Admin users

| Method | Full path | Permission | Description |
|--------|-----------|------------|-------------|
| GET | `/api/admin/users` | view_users | List users |
| GET | `/api/admin/users/:id` | view_users | Get user |
| POST | `/api/admin/users` | create_users | Create user |
| PUT | `/api/admin/users/:id` | edit_users | Update user |
| DELETE | `/api/admin/users/:id` | delete_users | Delete user |
| POST | `/api/admin/users/:id/verify` | verify_users | Verify user |
| POST | `/api/admin/users/:id/suspend` | suspend_users | Suspend user |

**GET /api/admin/users**  
- Query: `page`, `limit`, `search`, `role`, `status`, `sortBy`, `sortOrder` (asc/desc).  
- Response 200: `{ users: [], total, page, limit, totalPages }`.  
- User: `id`, `email`, `firstName`, `lastName`, `role`, `status`, `isActive`, `company?`, `createdAt?`, `updatedAt?`.

**POST /api/admin/users**  
- Body: `email`, `password`, `firstName`, `lastName`, `role` (job_seeker | employer | recruiter | admin), `phone?`, `location?`.  
- Response 201: `{ success: true, user: { ... } }`. For `role: "recruiter"`, backend should create sourcing.recruiters row.

**PUT /api/admin/users/:id**  
- Body: partial (firstName, lastName, email, role, isActive, isVerified).  
- Response 200: `{ success: true, user: { ... } }`.

**POST /api/admin/users/:id/suspend**  
- Body: `{ "reason": string, "duration"?: number }`.  
- Response 200: `{ success: true, user: { ... } }`.

---

### 2.4 Admin companies

| Method | Full path | Permission | Description |
|--------|-----------|------------|-------------|
| GET | `/api/admin/companies` | view_companies | List companies |
| GET | `/api/admin/companies/:id` | view_companies | Get company |
| PUT | `/api/admin/companies/:id/status` | edit_companies | Update status |
| POST | `/api/admin/companies/:id/verify` | verify_companies | Verify company |

**GET /api/admin/companies**  
- Query: `page`, `limit`.  
- Response 200: `{ companies: [], total, page, limit }`.

**PUT /api/admin/companies/:id/status**  
- Body: `{ "status": string, "adminNotes"?: string }`.  
- Response 200: `{ success: true }` or updated company.

---

### 2.5 Admin jobs

| Method | Full path | Permission | Description |
|--------|-----------|------------|-------------|
| GET | `/api/admin/jobs` | view_jobs | List jobs |
| GET | `/api/admin/jobs/:id` | view_jobs | Get job |
| PUT | `/api/admin/jobs/:id/status` | edit_jobs | Update status |
| POST | `/api/admin/jobs/bulk-action` | bulk_operations | Bulk action |

**GET /api/admin/jobs**  
- Query: `page`, `limit`, `status`, `companyId`.  
- Response 200: `{ jobs: [], total, page, limit }`. Job: `id`, `title`, `company?`, `status`, `postedDate?`, `createdAt?`.

**PUT /api/admin/jobs/:id/status**  
- Body: `{ "status": string, "adminNotes"?: string }`.  
- Response 200: `{ success: true }` or updated job.

**POST /api/admin/jobs/bulk-action**  
- Body: `{ "action": string, "jobIds": number[], "adminNotes"?: string }`.  
- Response 200: `{ success: true, processed, failed, errors: [] }`.

---

### 2.6 Admin bulk upload

| Method | Full path | Permission | Description |
|--------|-----------|------------|-------------|
| POST | `/api/admin/jobs/bulk-upload/validate` | bulk_operations | Validate payload |
| POST | `/api/admin/jobs/bulk-upload/upload` | bulk_operations | Process upload |
| GET | `/api/admin/jobs/bulk-upload/uploads/:id` | bulk_operations | Upload status |
| GET | `/api/admin/jobs/bulk-upload/uploads` | bulk_operations | Upload history |

**POST validate** – Body: `{ "data": [] }`. Response 200: validation result.  
**POST upload** – Body: `{ "data": [], "options"?: {} }`. Response 200: result (e.g. counts, errors).  
**GET uploads** – Response 200: `{ uploads: [], total, page, limit }`.

---

### 2.7 Admin settings

| Method | Full path | Permission | Description |
|--------|-----------|------------|-------------|
| GET | `/api/admin/settings` | manage_settings | Get settings |
| PUT | `/api/admin/settings` | manage_settings | Update settings |

**PUT** – Body: `{ "settings": [ { "key": string, "value": any } ] }`. Response 200: updated or success.

---

### 2.8 Admin logs

| Method | Full path | Permission / Auth | Description |
|--------|-----------|-------------------|-------------|
| GET | `/api/admin/logs/errors` | Admin JWT | Error logs |
| GET | `/api/admin/activity-logs` | view_logs | Activity logs |
| GET | `/api/admin/activity-logs/export` | export_data | Export activity logs |

**GET /api/admin/logs/errors** – Query: `page`, `limit`, `errorType`, `statusCode`, `userId`, `startDate`, `endDate`. Response 200: paginated error logs.  
**GET /api/admin/activity-logs** – Query: `page`, `limit`, `action`, `entityType`, `userId`. Response 200: list of activity entries.  
**GET /api/admin/activity-logs/export** – Same query; response 200: file or JSON array.

---

## Backend Implementation Status

As of the last verification, the backend implements the following. Use this to confirm frontend integration or to find gaps.

### Recruiter portal

| API | Status | Notes |
|-----|--------|--------|
| `POST /api/auth/login` | ✅ Implemented | Returns `accessToken`, `refreshToken`, `userId`, `email`, `fullName`, `role`, `onboardingComplete`. CORS: add frontend origin in `main.ts`. |
| `GET /api/recruiter/recruiters` | ✅ Implemented | Array of recruiters (snake_case). |
| `GET /api/recruiter/companies` | ✅ Implemented | Returns `job_roles_count` per company. |
| `GET /api/recruiter/companies/:id` | ✅ Implemented | Returns company **with `job_roles` array**. |
| `GET /api/recruiter/job-roles` | ✅ Implemented | Query: `company_id` (optional). Returns job roles with nested `company`. |
| `POST /api/recruiter/job-roles` | ✅ Implemented | Body: `company_id`, `role_name`, `department?`. |
| `GET /api/recruiter/candidates` | ✅ Implemented | Query: `search` (optional). |
| `POST /api/recruiter/candidates` | ✅ Implemented | Snake_case body. |
| `GET /api/recruiter/applications` | ✅ Implemented | Query: `page`, `limit`, `recruiter_id`, `job_role_id`, `company_id`, status filters, `start_date`, `end_date`. |
| `GET /api/recruiter/applications/:id` | ✅ Implemented | Single application with relations. |
| `POST /api/recruiter/applications` | ✅ Implemented | Body: snake_case; creates in sourcing schema. |
| `PATCH /api/recruiter/applications/:id` | ✅ Implemented | Partial update. |
| `DELETE /api/recruiter/applications/:id` | ✅ Implemented | Returns success. |
| `GET /api/recruiter/dashboard/stats` | ✅ Implemented | Query: `recruiter_id` optional. Snake_case keys. |
| `GET /api/recruiter/dashboard/pipeline` | ✅ Implemented | Pipeline breakdown by stage. |

### Admin panel

| API | Status | Notes |
|-----|--------|--------|
| `POST /api/admin/auth/login` | ✅ Implemented | Returns `success`, `user` (with tokens, userId, email, role), `token`, **`permissions`** array. Non-admin gets error. |
| `GET /api/admin/auth/permissions` | ✅ Implemented | Returns `permissions`, `role`, `isAdmin`. |
| `POST /api/admin/auth/logout` | ✅ Implemented | Success message. |
| `GET /api/admin/dashboard/stats` | ✅ Implemented | CamelCase stats (totalUsers, totalJobs, etc.). |
| `GET /api/admin/dashboard/analytics/users?days=` | ✅ Implemented | Time-series; default days=30. |
| `GET /api/admin/dashboard/analytics/jobs?days=` | ✅ Implemented | Job trends. |
| `GET /api/admin/dashboard/analytics/applications?days=` | ✅ Implemented | Placeholder structure (applicationRates, applicationStatus, topJobs, applicationTrends). |
| `GET /api/admin/users` | ✅ Implemented | Query: page, limit, search, role, status, sortBy, sortOrder. |
| `GET /api/admin/users/:id` | ✅ Implemented | Single user with company. |
| `POST /api/admin/users` | ✅ Implemented | Creates user; for `role: "recruiter"` also creates `sourcing.recruiters` row. |
| `PUT /api/admin/users/:id` | ✅ Implemented | Partial update. |
| `DELETE /api/admin/users/:id` | ✅ Implemented | Admins cannot be deleted (400). |
| `POST /api/admin/users/:id/verify` | ✅ Implemented | Verify user. |
| `POST /api/admin/users/:id/suspend` | ✅ Implemented | Body: reason, duration?. |
| `GET /api/admin/companies` | ✅ Implemented | Paginated; service may return placeholder list. |
| `GET /api/admin/companies/:id` | ✅ Implemented | Single company. |
| `PUT /api/admin/companies/:id/status` | ✅ Implemented | Body: status, adminNotes?. |
| `POST /api/admin/companies/:id/verify` | ✅ Implemented | Verify company. |
| `GET /api/admin/jobs` | ✅ Implemented | Query: page, limit, etc.; service may return placeholder list. |
| `GET /api/admin/jobs/:id` | ✅ Implemented | Single job. |
| `PUT /api/admin/jobs/:id/status` | ✅ Implemented | Body: status, adminNotes?. |
| `POST /api/admin/jobs/bulk-action` | ✅ Implemented | Body: action, jobIds, adminNotes?. |
| `POST /api/admin/jobs/bulk-upload/validate` | ✅ Implemented | Body: data[]. |
| `POST /api/admin/jobs/bulk-upload/upload` | ✅ Implemented | Body: data[], options?. |
| `GET /api/admin/jobs/bulk-upload/uploads/:id` | ✅ Implemented | Upload status. |
| `GET /api/admin/jobs/bulk-upload/uploads` | ✅ Implemented | History (may return empty list). |
| `GET /api/admin/settings` | ✅ Implemented | System settings. |
| `PUT /api/admin/settings` | ✅ Implemented | Body: settings[ { key, value } ]. |
| `GET /api/admin/logs/errors` | ✅ Implemented | Query: page, limit, errorType, statusCode, userId, startDate, endDate. |
| `GET /api/admin/activity-logs` | ✅ Implemented | Query: page, limit, etc. |
| `GET /api/admin/activity-logs/export` | ✅ Implemented | Export activity logs. |

**Summary:** All listed APIs are implemented. Admin companies/jobs list endpoints may return placeholder/empty data until services are fully wired to DB; response shape and status codes match the spec.

---

## Checklist: APIs to implement or verify

Use the **Backend Implementation Status** tables above for current status. Below is a copy of the checklist for tracking.

### Recruiter portal

- [x] `POST /api/auth/login` – recruiter login, CORS and response shape
- [x] `GET /api/recruiter/recruiters`
- [x] `GET /api/recruiter/companies`
- [x] `GET /api/recruiter/companies/:id` **with `job_roles` array**
- [x] `GET /api/recruiter/job-roles` (optional `company_id`)
- [x] `POST /api/recruiter/job-roles`
- [x] `GET /api/recruiter/candidates` (optional `search`)
- [x] `POST /api/recruiter/candidates`
- [x] `GET /api/recruiter/applications` (filters, pagination, wrapped or array)
- [x] `GET /api/recruiter/applications/:id`
- [x] `POST /api/recruiter/applications`
- [x] `PATCH /api/recruiter/applications/:id`
- [x] `DELETE /api/recruiter/applications/:id`
- [x] `GET /api/recruiter/dashboard/stats`
- [x] `GET /api/recruiter/dashboard/pipeline`

### Admin panel

- [x] `POST /api/admin/auth/login` – admin login, returns `permissions`
- [x] `GET /api/admin/auth/permissions`
- [x] `POST /api/admin/auth/logout`
- [x] `GET /api/admin/dashboard/stats`
- [x] `GET /api/admin/dashboard/analytics/users?days=`
- [x] `GET /api/admin/dashboard/analytics/jobs?days=`
- [x] `GET /api/admin/dashboard/analytics/applications?days=`
- [x] `GET /api/admin/users` (query params)
- [x] `GET /api/admin/users/:id`
- [x] `POST /api/admin/users`
- [x] `PUT /api/admin/users/:id`
- [x] `DELETE /api/admin/users/:id`
- [x] `POST /api/admin/users/:id/verify`
- [x] `POST /api/admin/users/:id/suspend`
- [x] `GET /api/admin/companies`
- [x] `GET /api/admin/companies/:id`
- [x] `PUT /api/admin/companies/:id/status`
- [x] `POST /api/admin/companies/:id/verify`
- [x] `GET /api/admin/jobs`
- [x] `GET /api/admin/jobs/:id`
- [x] `PUT /api/admin/jobs/:id/status`
- [x] `POST /api/admin/jobs/bulk-action`
- [x] `POST /api/admin/jobs/bulk-upload/validate`
- [x] `POST /api/admin/jobs/bulk-upload/upload`
- [x] `GET /api/admin/jobs/bulk-upload/uploads/:id`
- [x] `GET /api/admin/jobs/bulk-upload/uploads`
- [x] `GET /api/admin/settings`
- [x] `PUT /api/admin/settings`
- [x] `GET /api/admin/logs/errors`
- [x] `GET /api/admin/activity-logs`
- [x] `GET /api/admin/activity-logs/export`

---

## Notes

- **Recruiter** and **admin** use different JWTs and storage keys; auth endpoints differ (`/api/auth/login` vs `/api/admin/auth/login`).
- **403** on admin routes: frontend shows "Permission denied" where applicable (e.g. analytics tabs); do not redirect the whole app.
- **401** on recruiter or admin: frontend clears token and redirects to the correct login page.
- **Response shapes:** Recruiter APIs use **snake_case**; admin dashboard stats use **camelCase**. Other admin payloads follow the Admin Panel API doc.
- **Wrapped lists:** For list endpoints, frontend accepts either a raw array or an object with `data`, `items`, or `applications` (for applications).
