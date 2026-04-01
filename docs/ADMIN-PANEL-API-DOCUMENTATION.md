# Admin Panel API Documentation

This document describes **every API** needed to build an **admin panel**, including for the **recruiter portal**. It covers admin role, permissions, authentication, and all endpoints with request/response details.

**Base URL:** All admin routes are under `/api/admin/*` (global prefix is `api`).

---

## 1. Admin Role & Responsibilities

### Who is an admin?

- A user with **`role = 'admin'`** in the `users` table.
- Admin panel APIs require **JWT** from **admin login** and (for most routes) **permission checks**.

### Responsibilities (by area)

| Area | Responsibility | Main permissions |
|------|----------------|------------------|
| **Dashboard** | View stats, user/job/application analytics | `view_dashboard`, `view_analytics` |
| **Users** | List, create, edit, delete, verify, suspend users (including recruiters) | `view_users`, `create_users`, `edit_users`, `delete_users`, `verify_users`, `suspend_users` |
| **Companies** | List, create, view, full update, delete, update status, verify companies | `view_companies`, `create_companies`, `edit_companies`, `delete_companies`, `verify_companies`, `suspend_companies` |
| **Jobs** | List, create, view, update status, delete, bulk actions | `view_jobs`, `create_jobs`, `edit_jobs`, `delete_jobs`, `approve_jobs`, `bulk_operations` |
| **Settings** | Read/update system settings | `manage_settings` |
| **Logs** | Error logs, activity logs, export | `view_logs`, `export_data` |

### Permission model

- Each admin user has a **`permissions`** array (e.g. stored in DB or derived from role).
- Each endpoint (except login) is protected by **AdminGuard** (role must be admin) and optionally **AdminPermissionGuard** (user must have the required permission).
- The frontend should **hide or disable** UI for actions the user is not allowed to perform based on the permissions returned from **GET /api/admin/auth/permissions**.

---

## 2. Permissions Reference

| Permission | Description |
|------------|-------------|
| `view_dashboard` | Access dashboard |
| `view_analytics` | View analytics (users, jobs, applications) |
| `view_users` | List and view users |
| `create_users` | Create users (job seeker, employer, **recruiter**, admin) |
| `edit_users` | Update user details |
| `delete_users` | Delete users |
| `verify_users` | Verify user accounts |
| `suspend_users` | Suspend users |
| `view_companies` | List and view companies |
| `create_companies` | Create companies |
| `edit_companies` | Update company (full or status) |
| `delete_companies` | Delete companies |
| `verify_companies` | Verify companies |
| `suspend_companies` | Suspend companies |
| `view_jobs` | List and view jobs |
| `create_jobs` | Create jobs |
| `edit_jobs` | Update job status |
| `delete_jobs` | Delete jobs |
| `approve_jobs` | Approve jobs |
| `bulk_operations` | Bulk job actions, bulk upload, upload history |
| `manage_settings` | Get/update system settings |
| `view_logs` | View activity logs |
| `export_data` | Export activity logs |

---

## 3. Authentication

### 3.1 Admin login

**POST** `/api/admin/auth/login`

**Auth:** None (public for this endpoint).

**Request body (JSON):**
```json
{
  "email": "admin@example.com",
  "password": "your_password"
}
```

**Success (200):**
```json
{
  "success": true,
  "user": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "userId": 1,
    "email": "admin@example.com",
    "fullName": "Admin User",
    "role": "admin",
    "onboardingComplete": true
  },
  "token": "eyJ...",
  "permissions": ["view_dashboard", "view_analytics", "view_users", "create_users", ...]
}
```

**Error (401):** Invalid credentials.  
**Note:** If the user is not an admin (`role !== 'admin'`), the backend may throw; only admin users should use this endpoint for the admin panel.

**Usage in admin panel:**  
Store `accessToken` (or `token`) and optionally `permissions`. Send token in header: `Authorization: Bearer <accessToken>` for all other admin APIs.

---

### 3.2 Get current permissions

**GET** `/api/admin/auth/permissions`

**Auth:** `Authorization: Bearer <admin_jwt>`

**Success (200):**
```json
{
  "permissions": ["view_dashboard", "view_analytics", "view_users", "create_users", ...],
  "role": "admin",
  "isAdmin": true
}
```

Use this on app load to show/hide menu items and buttons based on `permissions`.

---

### 3.3 Logout

**POST** `/api/admin/auth/logout`

**Auth:** `Authorization: Bearer <admin_jwt>`

**Success (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

Frontend should clear stored token and redirect to login.

---

## 4. Dashboard APIs

**Base path:** `/api/admin/dashboard`  
**Auth:** All require `Authorization: Bearer <admin_jwt>` and permission **`view_analytics`**.

### 4.1 Dashboard stats

**GET** `/api/admin/dashboard/stats`

**Response (200):**
```json
{
  "totalUsers": 150,
  "totalJobs": 320,
  "totalCompanies": 45,
  "totalApplications": 1200,
  "activeJobs": 280,
  "pendingApplications": 90,
  "newUsersToday": 5,
  "newJobsToday": 12,
  "userGrowthRate": 2.5,
  "jobPostingRate": 1.8,
  "applicationRate": 3.2
}
```

### 4.2 User analytics

**GET** `/api/admin/dashboard/analytics/users?days=30`

**Query:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| days | number | No | Number of days (default 30) |

**Response (200):** Time-series and engagement data for user signups/activity (structure as returned by `AdminDashboardService.getUserAnalytics`).

### 4.3 Job analytics

**GET** `/api/admin/dashboard/analytics/jobs?days=30`

**Query:** Same as 4.2 (`days` optional).

**Response (200):** Job posting trends and stats.

### 4.4 Application analytics

**GET** `/api/admin/dashboard/analytics/applications?days=30`

**Query:** Same as 4.2.

**Response (200):** Placeholder structure, e.g.:
```json
{
  "applicationRates": [],
  "applicationStatus": [],
  "topJobs": [],
  "applicationTrends": []
}
```

---

## 5. User Management APIs

**Base path:** `/api/admin/users`  
**Auth:** All require admin JWT. Permissions per endpoint below.

### 5.1 List users

**GET** `/api/admin/users`

**Permission:** `view_users`

**Query:**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 20 | Items per page |
| search | string | - | Search in firstName, lastName, email |
| role | string | - | Filter by role: job_seeker, employer, recruiter, admin |
| status | string | - | Filter by status |
| sortBy | string | createdAt | Sort field (camelCase, e.g. createdAt) |
| sortOrder | string | desc | asc \| desc |
| sort_by | string | - | Same as sortBy (snake_case); backend accepts both |
| sort_order | string | - | Same as sortOrder (snake_case). Values: asc, desc |

**Note:** The backend accepts both **camelCase** (`sortBy`, `sortOrder`) and **snake_case** (`sort_by`, `sort_order`). For `sort_by`, use entity property names in snake_case (e.g. `created_at`, `updated_at`); they are mapped to camelCase internally.

**Response (200):**
```json
{
  "users": [
    {
      "id": 1,
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "recruiter",
      "status": "active",
      "isActive": true,
      "company": { ... }
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20,
  "totalPages": 5
}
```

### 5.2 Create user (including recruiter)

**POST** `/api/admin/users`

**Permission:** `create_users`

**Request body (JSON):**
```json
{
  "email": "recruiter@example.com",
  "password": "password123",
  "firstName": "Jane",
  "lastName": "Doe",
  "role": "recruiter",
  "phone": "+1234567890",
  "location": "New York, NY"
}
```

- **role:** `job_seeker` | `employer` | `recruiter` | `admin`
- **phone**, **location:** optional

When **`role`** is **`recruiter`**, the backend also creates a row in **`sourcing.recruiters`** so the user can use recruiter portal APIs immediately.

**Response (201):**
```json
{
  "success": true,
  "user": {
    "id": 10,
    "email": "recruiter@example.com",
    "firstName": "Jane",
    "lastName": "Doe",
    "role": "recruiter",
    "phone": "+1234567890",
    "location": "New York, NY",
    "status": "active",
    "isActive": true,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

**Errors:** 400 invalid role, 409 email already exists.

### 5.3 Get user by ID

**GET** `/api/admin/users/:id`

**Permission:** `view_users`

**Response (200):** Single user object (with `company` relation if present). 404 if not found.

### 5.4 Update user

**PUT** `/api/admin/users/:id`

**Permission:** `edit_users`

**Request body (JSON):** Partial update.
```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "newemail@example.com",
  "role": "recruiter",
  "isActive": true,
  "isVerified": true
}
```

**Response (200):**
```json
{
  "success": true,
  "user": { ... }
}
```

### 5.5 Delete user

**DELETE** `/api/admin/users/:id`

**Permission:** `delete_users`

**Response (200):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

**Note:** Admins cannot be deleted (400).

### 5.6 Verify user

**POST** `/api/admin/users/:id/verify`

**Permission:** `verify_users`

**Response (200):**
```json
{
  "success": true,
  "user": { ... }
}
```

### 5.7 Suspend user

**POST** `/api/admin/users/:id/suspend`

**Permission:** `suspend_users`

**Request body (JSON):**
```json
{
  "reason": "Violation of terms",
  "duration": 7
}
```

- **reason:** required  
- **duration:** optional, days

**Response (200):**
```json
{
  "success": true,
  "user": { ... }
}
```

---

## 6. Company Management APIs

**Base path:** `/api/admin/companies`  
**Auth:** Admin JWT; permissions below.

### 6.1 Create company

**POST** `/api/admin/companies`

**Permission:** `create_companies`

**Request body (JSON):**
```json
{
  "userId": 5,
  "name": "Tech Corp Inc.",
  "slug": "tech-corp-inc",
  "description": "Leading technology company",
  "website": "https://techcorp.com",
  "logo": "https://example.com/logo.png",
  "industry": "Technology",
  "size": "medium",
  "location": "San Francisco, CA",
  "foundedYear": 2015
}
```
- **userId:** required (owner user ID). **name:** required. **slug:** optional (generated from name if omitted).
- **size:** optional; one of: `startup`, `small`, `medium`, `large`, `enterprise`. All other fields optional.

**Response (200):** `{ "success": true, "company": { ... } }`  
**Errors:** 404 user not found, 409 user already has a company.

### 6.2 List companies

**GET** `/api/admin/companies`

**Permission:** `view_companies`

**Query:** `page`, `limit`, `search`, `adminStatus`, `sortBy`/`sort_order` (or `sort_by`/`sort_order`).

**Response (200):**
```json
{
  "companies": [ ... ],
  "total": 50,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

### 6.3 Get company by ID

**GET** `/api/admin/companies/:id`

**Permission:** `view_companies`

**Response (200):** Single company entity (with `user` relation). 404 if not found.

### 6.4 Update company (full)

**PUT** `/api/admin/companies/:id`

**Permission:** `edit_companies`

**Request body (JSON):** All optional.
```json
{
  "name": "New Name",
  "description": "...",
  "website": "https://...",
  "logo": "https://...",
  "industry": "Technology",
  "size": "medium",
  "location": "San Francisco, CA",
  "foundedYear": 2018,
  "adminNotes": "Admin note"
}
```

**Response (200):** `{ "success": true, "company": { ... } }`

### 6.5 Delete company

**DELETE** `/api/admin/companies/:id`

**Permission:** `delete_companies`

**Response (200):** `{ "success": true, "message": "Company deleted successfully" }`  
**Error (400):** Company has jobs; remove or reassign jobs first.

### 6.6 Update company status

**PUT** `/api/admin/companies/:id/status`

**Permission:** `edit_companies`

**Request body (JSON):**
```json
{
  "status": "approved",
  "adminNotes": "Verified documents"
}
```
**status:** `pending` | `approved` | `rejected` | `suspended`

**Response (200):** `{ "success": true, "company": { ... } }`

### 6.7 Verify company

**POST** `/api/admin/companies/:id/verify`

**Permission:** `verify_companies`

**Response (200):** `{ "success": true, "company": { ... } }`

---

## 7. Job Management APIs

**Base path:** `/api/admin/jobs`  
**Auth:** Admin JWT; permissions below.

### 7.1 Create job

**POST** `/api/admin/jobs`

**Permission:** `create_jobs`

**Request body (JSON):**
```json
{
  "companyId": 1,
  "title": "Senior Software Engineer",
  "description": "We are looking for...",
  "requirements": "Bachelor's degree...",
  "location": "San Francisco, CA",
  "type": "full_time",
  "category": "Technology",
  "benefits": "Health insurance, 401k",
  "salary": "$80,000 - $120,000",
  "industry": "Information Technology (IT) & Software",
  "experience": 3,
  "isRemote": false,
  "isUrgent": false,
  "isFeatured": false,
  "status": "draft",
  "applicationDeadline": "2025-12-31",
  "hrName": "John Doe",
  "hrContact": "+1234567890",
  "hrWhatsapp": "+1234567890"
}
```
- **Required:** companyId, title, description, requirements, location, type, category.
- **type:** `full_time` | `part_time` | `contract` | `intern` | `temporary`. **status:** optional (default `draft`). All other fields optional.

**Response (200):** `{ "success": true, "job": { ... } }`  
**Errors:** 404 company not found.

### 7.2 List jobs

**GET** `/api/admin/jobs`

**Permission:** `view_jobs`

**Query:** `page`, `limit`, `search`, `status`, `adminStatus`, `companyId`, `sortBy`/`sort_order` (or `sort_by`/`sort_order`).

**Response (200):**
```json
{
  "jobs": [ ... ],
  "total": 200,
  "page": 1,
  "limit": 20,
  "totalPages": 10
}
```

### 7.3 Get job by ID

**GET** `/api/admin/jobs/:id`

**Permission:** `view_jobs`

**Response (200):** Single job entity (with `company` relation). 404 if not found.

### 7.4 Update job status

**PUT** `/api/admin/jobs/:id/status`

**Permission:** `edit_jobs`

**Request body (JSON):**
```json
{
  "status": "active",
  "adminNotes": "Approved after review"
}
```
**status:** Job status (`draft`, `active`, `paused`, `closed`) or admin status (`pending`, `approved`, `rejected`, `suspended`).

**Response (200):** `{ "success": true, "job": { ... } }`

### 7.5 Delete job

**DELETE** `/api/admin/jobs/:id`

**Permission:** `delete_jobs`

**Response (200):** `{ "success": true, "message": "Job deleted successfully" }`

### 7.6 Bulk job action

**POST** `/api/admin/jobs/bulk-action`

**Permission:** `bulk_operations`

**Request body (JSON):**
```json
{
  "action": "approve",
  "jobIds": [1, 2, 3],
  "adminNotes": "Bulk approved"
}
```
**action:** `approve` | `reject` | `suspend` | `pause` | `close` | `activate`

**Response (200):**
```json
{
  "success": true,
  "processed": 3,
  "failed": 0,
  "errors": []
}
```

---

## 8. Bulk Upload (Jobs)

**Base path:** `/api/admin/jobs/bulk-upload`  
**Auth:** Admin JWT; permission **`bulk_operations`**.

### 8.1 Validate bulk data

**POST** `/api/admin/jobs/bulk-upload/validate`

**Request body (JSON):**
```json
{
  "data": [ { ... job-like objects ... } ]
}
```

**Response (200):** Validation result (structure as implemented).

### 8.2 Process bulk upload

**POST** `/api/admin/jobs/bulk-upload/upload`

**Request body (JSON):**
```json
{
  "data": [ ... ],
  "options": { ... }
}
```

**Response (200):** Upload result (e.g. job count, errors).

### 8.3 Get upload status

**GET** `/api/admin/jobs/bulk-upload/uploads/:id`

**Response (200):** Status of upload by ID.

### 8.4 Get upload history

**GET** `/api/admin/jobs/bulk-upload/uploads`

**Query:** Optional pagination.

**Response (200):**
```json
{
  "uploads": [],
  "total": 0,
  "page": 1,
  "limit": 20
}
```

---

## 9. System Settings

**Base path:** `/api/admin/settings`  
**Auth:** Admin JWT; permission **`manage_settings`**.

### 9.1 Get settings

**GET** `/api/admin/settings`

**Response (200):** Array or object of system settings (key/value).

### 9.2 Update settings

**PUT** `/api/admin/settings`

**Request body (JSON):**
```json
{
  "settings": [
    { "key": "setting_name", "value": "value_or_object" }
  ]
}
```

**Response (200):** Updated settings or success.

---

## 10. Logs & Activity

### 10.1 Error logs

**GET** `/api/admin/logs/errors`

**Auth:** Admin JWT (role admin). No permission decorator; any admin can call.

**Query:**

| Name | Type | Description |
|------|------|-------------|
| page | number | Default 1 |
| limit | number | Default 50 |
| errorType | string | Filter by error type |
| statusCode | number | Filter by HTTP status |
| userId | number | Filter by user |
| startDate | string | ISO date |
| endDate | string | ISO date |

**Response (200):** Paginated error logs (structure from `ErrorLogService.getErrorLogs`).

### 10.2 Activity logs

**GET** `/api/admin/activity-logs`

**Permission:** `view_logs`

**Query:** Optional (e.g. page, limit, action, entityType, userId).

**Response (200):** List of admin activity log entries.

### 10.3 Export activity logs

**GET** `/api/admin/activity-logs/export`

**Permission:** `export_data`

**Query:** Same as 10.2 (filters applied to export).

**Response (200):** Export file or JSON array of activity logs.

---

## 11. Quick Reference – All Admin Endpoints

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| POST | /api/admin/auth/login | - | Admin login |
| GET | /api/admin/auth/permissions | admin | Get current permissions |
| POST | /api/admin/auth/logout | admin | Logout |
| GET | /api/admin/dashboard/stats | view_analytics | Dashboard stats |
| GET | /api/admin/dashboard/analytics/users | view_analytics | User analytics |
| GET | /api/admin/dashboard/analytics/jobs | view_analytics | Job analytics |
| GET | /api/admin/dashboard/analytics/applications | view_analytics | Application analytics |
| GET | /api/admin/users | view_users | List users |
| POST | /api/admin/users | create_users | Create user (incl. recruiter) |
| GET | /api/admin/users/:id | view_users | Get user |
| PUT | /api/admin/users/:id | edit_users | Update user |
| DELETE | /api/admin/users/:id | delete_users | Delete user |
| POST | /api/admin/users/:id/verify | verify_users | Verify user |
| POST | /api/admin/users/:id/suspend | suspend_users | Suspend user |
| GET | /api/admin/companies | view_companies | List companies |
| GET | /api/admin/companies/:id | view_companies | Get company |
| PUT | /api/admin/companies/:id/status | edit_companies | Update company status |
| POST | /api/admin/companies/:id/verify | verify_companies | Verify company |
| GET | /api/admin/jobs | view_jobs | List jobs |
| GET | /api/admin/jobs/:id | view_jobs | Get job |
| PUT | /api/admin/jobs/:id/status | edit_jobs | Update job status |
| POST | /api/admin/jobs/bulk-action | bulk_operations | Bulk job action |
| POST | /api/admin/jobs/bulk-upload/validate | bulk_operations | Validate bulk data |
| POST | /api/admin/jobs/bulk-upload/upload | bulk_operations | Process bulk upload |
| GET | /api/admin/jobs/bulk-upload/uploads/:id | bulk_operations | Upload status |
| GET | /api/admin/jobs/bulk-upload/uploads | bulk_operations | Upload history |
| GET | /api/admin/settings | manage_settings | Get settings |
| PUT | /api/admin/settings | manage_settings | Update settings |
| GET | /api/admin/logs/errors | admin role | Error logs |
| GET | /api/admin/activity-logs | view_logs | Activity logs |
| GET | /api/admin/activity-logs/export | export_data | Export activity |

---

## 12. Using This for the Recruiter Portal Admin Panel

For an **admin panel that manages the recruiter portal** you will typically need:

1. **Auth:** Use **POST /api/admin/auth/login** and store the returned token and **permissions**.
2. **Permissions:** On load, call **GET /api/admin/auth/permissions** and show only menus/actions the user is allowed (e.g. user management, create recruiter).
3. **Recruiter creation:** Use **POST /api/admin/users** with **`role: "recruiter"`** so both `users` and `sourcing.recruiters` are created; the new user can then log in to the recruiter portal.
4. **User list:** **GET /api/admin/users** with optional **`role=recruiter`** to list recruiters; use **PUT /api/admin/users/:id** to edit, **POST .../verify** or **.../suspend** as needed.
5. **Dashboard:** **GET /api/admin/dashboard/stats** and analytics endpoints for overview.
6. **Companies & jobs:** Use companies and jobs endpoints if the admin panel also manages job-portal companies/jobs.
7. **Settings / logs:** Use settings and log endpoints if you expose system settings or audit in the UI.

Always send **`Authorization: Bearer <accessToken>`** for every request except login. Handle **403 Forbidden** (missing permission) by hiding or disabling the corresponding UI and **401 Unauthorized** by redirecting to login.
