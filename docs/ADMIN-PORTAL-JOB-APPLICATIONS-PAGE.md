# Admin Portal — Job Applications Page

This document describes the **Job Applications** feature for the admin portal: APIs, permissions, and how to build a page where admins can list, view, modify, and delete job applications.

---

## 1. Overview

- **Purpose:** Let admins manage all job applications (job portal) in one place: filter, view details, change status, and delete when needed.
- **Base path:** All endpoints are under **`/api/admin/applications`**.
- **Auth:** Admin JWT required (`Authorization: Bearer <token>`). Admin login: `POST /api/admin/auth/login`.
- **Permissions:** The backend checks:
  - **view_applications** — list and get one
  - **edit_applications** — update status
  - **delete_applications** — delete an application

---

## 2. API Endpoints

### 2.1 List applications (paginated, with filters)

| Method | URL | Permission |
|--------|-----|------------|
| **GET** | `/api/admin/applications` | view_applications |

**Query parameters (all optional):**

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Page size (default: 20, max: 100) |
| `jobId` | number | Filter by job ID |
| `userId` | number | Filter by applicant (user) ID |
| `status` | string | Filter by status (see §3) |

**Example:**  
`GET /api/admin/applications?page=1&limit=20&status=pending`

**Response (200):**

```json
{
  "applications": [
    {
      "id": 1,
      "jobId": 7,
      "userId": 31,
      "status": "pending",
      "candidateName": "a a",
      "candidateEmail": "a@a.com",
      "candidatePhone": "8765432190",
      "coverLetter": "...",
      "resume": "...",
      "createdAt": "2026-02-25T00:25:39.034Z",
      "updatedAt": "2026-02-25T08:10:57.348Z",
      "job": {
        "id": 7,
        "title": "Telematics Application Engineer",
        "company": { "id": 16, "name": "z z's Company" }
      },
      "user": {
        "id": 31,
        "firstName": "a",
        "lastName": "a",
        "email": "a@a.com",
        "phone": "8765432190"
      }
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

---

### 2.2 Get one application

| Method | URL | Permission |
|--------|-----|------------|
| **GET** | `/api/admin/applications/:id` | view_applications |

**Example:**  
`GET /api/admin/applications/1`

**Response (200):** Single application object (same shape as an item in the list above), with full `job` and `job.company` and `user` details.

**Response (404):** Application not found.

---

### 2.3 Update application status

| Method | URL | Permission |
|--------|-----|------------|
| **PATCH** | `/api/admin/applications/:id/status` | edit_applications |

**Body:**

```json
{
  "status": "shortlisted"
}
```

**Allowed status values:** See §3.

**Response (200):** Updated application (same shape as GET by id).

**Response (404):** Application not found.

---

### 2.4 Delete application

| Method | URL | Permission |
|--------|-----|------------|
| **DELETE** | `/api/admin/applications/:id` | delete_applications |

**Example:**  
`DELETE /api/admin/applications/1`

**Response (200):**

```json
{
  "success": true,
  "message": "Application deleted successfully"
}
```

**Response (404):** Application not found.

Deleting an application also decrements the related job’s `applicationsCount`.

---

## 3. Application status values

Use these when displaying or updating status:

| Value | Description |
|-------|-------------|
| `pending` | New, not yet reviewed |
| `reviewing` | Under review |
| `shortlisted` | Shortlisted |
| `interview` | Interview stage |
| `rejected` | Rejected |
| `accepted` | Accepted |
| `withdrawn` | Withdrawn by candidate |

---

## 4. Suggested UI (Job Applications page)

1. **List view**
   - Table or cards: application id, candidate name/email, job title, company, status, applied date.
   - Filters: Job (dropdown or ID), User (applicant), Status (dropdown).
   - Pagination: use `page` and `limit`; show `total` and `totalPages`.

2. **Row actions**
   - **View** — open detail (GET `/api/admin/applications/:id`) in a side panel or modal.
   - **Edit status** — open a small form/modal with status dropdown; submit PATCH `/api/admin/applications/:id/status` with `{ "status": "..." }`.
   - **Delete** — confirm dialog; on confirm call DELETE `/api/admin/applications/:id`, then refresh list or remove row.

3. **Detail view (optional)**
   - Show full application (cover letter, resume link, recruiter call fields if present, timestamps).
   - Same “Edit status” and “Delete” actions as in the list.

4. **Permissions**
   - Show/hide “Edit” and “Delete” based on admin permissions (`edit_applications`, `delete_applications`) from the admin login/me response.

---

## 5. Permissions in admin login

After `POST /api/admin/auth/login`, the response includes a `permissions` array. Ensure the admin role has:

- `view_applications` — to see the Job Applications page and call list/get.
- `edit_applications` — to show and use “Edit status”.
- `delete_applications` — to show and use “Delete”.

If the backend returns all permissions for role `admin`, no extra config is needed for full-access admins.

---

## 6. Summary

- **List:** `GET /api/admin/applications?page=&limit=&jobId=&userId=&status=`
- **Get one:** `GET /api/admin/applications/:id`
- **Update status:** `PATCH /api/admin/applications/:id/status` with body `{ "status": "..." }`
- **Delete:** `DELETE /api/admin/applications/:id`

All require admin JWT and the corresponding permission (view_applications, edit_applications, delete_applications).
