# Admin Panel – Frontend CRUD API Reference

This document is for **frontend developers** building the admin panel UI. It lists every **CRUD and action** endpoint so you can implement list, create, edit, delete, and extra actions for **Users**, **Companies**, and **Jobs**.

**Base URL:** `https://your-api.com/api` (all admin routes are under `/api/admin/*`).

**Auth:** Send the admin JWT on every request:
```http
Authorization: Bearer <accessToken>
```

Get the token from **POST /api/admin/auth/login**. Use **GET /api/admin/auth/permissions** on app load to show/hide UI based on `permissions`.

---

## 1. Permissions (hide/show UI)

| Permission | Use to show |
|------------|-------------|
| `view_users` | Users menu, list & view user |
| `create_users` | "Create user" button |
| `edit_users` | "Edit" on user row, user edit page |
| `delete_users` | "Delete" on user row |
| `verify_users` | "Verify" on user |
| `suspend_users` | "Suspend" on user |
| `view_companies` | Companies menu, list & view company |
| `create_companies` | "Create company" button |
| `edit_companies` | "Edit" on company, "Update status", full update |
| `delete_companies` | "Delete" on company |
| `verify_companies` | "Verify" on company |
| `view_jobs` | Jobs menu, list & view job |
| `create_jobs` | "Create job" button |
| `edit_jobs` | "Edit status" on job |
| `delete_jobs` | "Delete" on job |
| `bulk_operations` | Bulk job actions, bulk upload |

---

## 2. Users – CRUD + actions

| Action | Method | Path | Permission | Body |
|--------|--------|------|------------|------|
| **List** | GET | `/api/admin/users` | view_users | — |
| **Create** | POST | `/api/admin/users` | create_users | JSON (see below) |
| **Read one** | GET | `/api/admin/users/:id` | view_users | — |
| **Update** | PUT | `/api/admin/users/:id` | edit_users | JSON (see below) |
| **Delete** | DELETE | `/api/admin/users/:id` | delete_users | — |
| Verify | POST | `/api/admin/users/:id/verify` | verify_users | — |
| Suspend | POST | `/api/admin/users/:id/suspend` | suspend_users | JSON (see below) |

### Query for list (GET /api/admin/users)

| Query | Type | Default | Description |
|-------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 20 | Items per page |
| search | string | — | Search firstName, lastName, email |
| role | string | — | job_seeker, employer, recruiter, admin |
| status | string | — | User status |
| sort_by | string | created_at | created_at, updated_at, etc. |
| sort_order | string | desc | asc, desc |

**Response (200):**
```json
{
  "users": [ { "id", "email", "firstName", "lastName", "role", "status", "company", ... } ],
  "total": 100,
  "page": 1,
  "limit": 20,
  "totalPages": 5
}
```

### Create user (POST /api/admin/users)

**Body:**
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

**Response (200):** `{ "success": true, "user": { ... } }`  
**Errors:** 400 (invalid role), 409 (email exists).

### Update user (PUT /api/admin/users/:id)

**Body (all optional):**
```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "email": "new@example.com",
  "role": "recruiter",
  "isActive": true,
  "isVerified": true
}
```

**Response (200):** `{ "success": true, "user": { ... } }`

### Delete user (DELETE /api/admin/users/:id)

**Response (200):** `{ "success": true, "message": "User deleted successfully" }`  
**Note:** Cannot delete admin users (400).

### Suspend user (POST /api/admin/users/:id/suspend)

**Body:**
```json
{
  "reason": "Violation of terms",
  "duration": 7
}
```
- **reason:** required  
- **duration:** optional, days  

**Response (200):** `{ "success": true, "user": { ... } }`

---

## 3. Companies – CRUD + actions

| Action | Method | Path | Permission | Body |
|--------|--------|------|------------|------|
| **Create** | POST | `/api/admin/companies` | create_companies | JSON (see below) |
| **List** | GET | `/api/admin/companies` | view_companies | — |
| **Read one** | GET | `/api/admin/companies/:id` | view_companies | — |
| **Update (full)** | PUT | `/api/admin/companies/:id` | edit_companies | JSON (see below) |
| **Delete** | DELETE | `/api/admin/companies/:id` | delete_companies | — |
| Update status | PUT | `/api/admin/companies/:id/status` | edit_companies | JSON (status, adminNotes) |
| Verify | POST | `/api/admin/companies/:id/verify` | verify_companies | — |

### Query for list (GET /api/admin/companies)

| Query | Type | Default | Description |
|-------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 20 | Items per page |
| search | string | — | Search name, slug, industry |
| adminStatus | string | — | pending, approved, rejected, suspended |
| sort_by | string | created_at | created_at, updated_at |
| sort_order | string | desc | asc, desc |

**Response (200):**
```json
{
  "companies": [ { "id", "name", "slug", "userId", "adminStatus", "user", ... } ],
  "total": 50,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

### Create company (POST /api/admin/companies)

**Body:**
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
- **userId:** required (owner user ID).  
- **name:** required.  
- **slug:** optional; if omitted, generated from name.  
- **size:** optional; one of: `startup`, `small`, `medium`, `large`, `enterprise`.  
- All other fields optional.

**Response (200):** `{ "success": true, "company": { ... } }`  
**Errors:** 404 (user not found), 409 (user already has a company).

### Update company – full (PUT /api/admin/companies/:id)

**Body (all optional):**
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

### Delete company (DELETE /api/admin/companies/:id)

**Response (200):** `{ "success": true, "message": "Company deleted successfully" }`  
**Error (400):** Company has jobs; remove or reassign jobs first.

### Update company status (PUT /api/admin/companies/:id/status)

**Body:**
```json
{
  "status": "approved",
  "adminNotes": "Verified documents"
}
```
- **status:** `pending` | `approved` | `rejected` | `suspended`

**Response (200):** `{ "success": true, "company": { ... } }`

### Verify company (POST /api/admin/companies/:id/verify)

**Response (200):** `{ "success": true, "company": { ... } }`

---

## 4. Jobs – CRUD + actions

| Action | Method | Path | Permission | Body |
|--------|--------|------|------------|------|
| **Create** | POST | `/api/admin/jobs` | create_jobs | JSON (see below) |
| **List** | GET | `/api/admin/jobs` | view_jobs | — |
| **Read one** | GET | `/api/admin/jobs/:id` | view_jobs | — |
| **Update status** | PUT | `/api/admin/jobs/:id/status` | edit_jobs | JSON (status, adminNotes) |
| **Delete** | DELETE | `/api/admin/jobs/:id` | delete_jobs | — |
| Bulk action | POST | `/api/admin/jobs/bulk-action` | bulk_operations | JSON (see below) |

### Query for list (GET /api/admin/jobs)

| Query | Type | Default | Description |
|-------|------|---------|-------------|
| page | number | 1 | Page number |
| limit | number | 20 | Items per page |
| search | string | — | Search title, slug, category |
| status | string | — | draft, active, paused, closed |
| adminStatus | string | — | pending, approved, rejected, suspended |
| companyId | number | — | Filter by company |
| sort_by | string | created_at | created_at, updated_at |
| sort_order | string | desc | asc, desc |

**Response (200):**
```json
{
  "jobs": [ { "id", "title", "slug", "companyId", "company", "status", "adminStatus", ... } ],
  "total": 200,
  "page": 1,
  "limit": 20,
  "totalPages": 10
}
```

### Create job (POST /api/admin/jobs)

**Body:**
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
- **type:** `full_time` | `part_time` | `contract` | `intern` | `temporary`.  
- **status:** optional; default `draft`.  
- All other fields optional. **industry** must match backend enum values if sent.

**Response (200):** `{ "success": true, "job": { ... } }`  
**Errors:** 404 (company not found).

### Update job status (PUT /api/admin/jobs/:id/status)

**Body:**
```json
{
  "status": "active",
  "adminNotes": "Approved after review"
}
```
- **status:** Can be job status (`draft`, `active`, `paused`, `closed`) or admin status (`pending`, `approved`, `rejected`, `suspended`).

**Response (200):** `{ "success": true, "job": { ... } }`

### Delete job (DELETE /api/admin/jobs/:id)

**Response (200):** `{ "success": true, "message": "Job deleted successfully" }`

### Bulk job action (POST /api/admin/jobs/bulk-action)

**Body:**
```json
{
  "action": "approve",
  "jobIds": [1, 2, 3],
  "adminNotes": "Bulk approved"
}
```
- **action:** `approve` | `reject` | `suspend` | `pause` | `close` | `activate`

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

## 5. System settings (read/update)

| Action | Method | Path | Permission |
|--------|--------|------|------------|
| List | GET | `/api/admin/settings` | manage_settings |
| Update | PUT | `/api/admin/settings` | manage_settings |

### Update settings (PUT /api/admin/settings)

**Body:**
```json
{
  "settings": [
    { "key": "site_name", "value": "Jobsmato" },
    { "key": "max_upload_size", "value": 5242880 }
  ]
}
```

**Response (200):** `{ "success": true, "settings": [ ... ] }`

---

## 6. Quick reference – all admin CRUD endpoints

| Resource | Create | List | Read one | Update | Delete | Extra |
|----------|--------|------|----------|--------|--------|--------|
| **Users** | POST /api/admin/users | GET /api/admin/users | GET /api/admin/users/:id | PUT /api/admin/users/:id | DELETE /api/admin/users/:id | POST :id/verify, POST :id/suspend |
| **Companies** | POST /api/admin/companies | GET /api/admin/companies | GET /api/admin/companies/:id | PUT /api/admin/companies/:id | DELETE /api/admin/companies/:id | PUT :id/status, POST :id/verify |
| **Jobs** | POST /api/admin/jobs | GET /api/admin/jobs | GET /api/admin/jobs/:id | PUT /api/admin/jobs/:id/status | DELETE /api/admin/jobs/:id | POST /api/admin/jobs/bulk-action |
| **Settings** | — | GET /api/admin/settings | — | PUT /api/admin/settings | — | — |

**UI checklist:**
- **Users:** List (table + filters), Create (form), View (detail), Edit (form), Delete (confirm), Verify button, Suspend button.
- **Companies:** List (table + filters), Create (form + select owner user), View (detail), Edit (form), Delete (confirm; disable or warn if company has jobs), Update status (dropdown + notes), Verify button.
- **Jobs:** List (table + filters), Create (form + select company), View (detail), Update status (dropdown + notes), Delete (confirm), Bulk select + action dropdown (approve, reject, etc.).

For dashboard, bulk upload, activity logs, and error logs, see **ADMIN-PANEL-API-DOCUMENTATION.md**.
