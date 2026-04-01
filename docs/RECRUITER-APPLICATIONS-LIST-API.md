# Recruiter Applications List API — Pagination & Sorting

This document specifies the **GET** endpoint used by the recruiter portal to list applications with **server-side pagination and sorting**. The frontend uses this for the **Candidates** page and **Sourcing (job role)** page; "Show 10/20/50/100" and Next/Previous page trigger new API calls with `page` and `limit`.

---

## 1. Endpoint

| Method | URL | Auth |
|--------|-----|------|
| **GET** | `/api/recruiter/applications` | `Authorization: Bearer <recruiter_token>` |

All query parameters are optional. If `page` or `limit` are omitted, the backend should use sensible defaults (e.g. `page=1`, `limit=20`).

---

## 2. Query parameters

### 2.1 Pagination (required for correct UX)

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | number | Page number, 1-based. Default: 1. |
| `limit` | number | Page size (max items per page). Default: 20. Frontend sends 10, 20, 50, or 100. |

### 2.2 Filters (optional)

| Parameter | Type | Description |
|-----------|------|-------------|
| `recruiter_id` | string | Filter by recruiter ID (e.g. for dashboard/candidates by recruiter). |
| `job_role_id` | string | Filter by job role ID (e.g. for sourcing job-role page). |
| `portal` | string | Filter by portal (e.g. WorkIndia, Naukri). |
| `call_status` | string | Filter by call status (Busy, RNR, Connected, Wrong Number, etc.). |
| `interested_status` | string | Filter by interested status (Yes, No, Call Back Later). |
| `interview_status` | string | Filter by interview status. |
| `selection_status` | string | Filter by selection status. |
| `joining_status` | string | Filter by joining status. |
| `start_date` | string | Filter applications from this date (YYYY-MM-DD). Frontend sends `date_from` → backend may expect `start_date`. |
| `end_date` | string | Filter applications until this date (YYYY-MM-DD). Frontend sends `date_to` → backend may expect `end_date`. |

### 2.3 Sorting (optional but recommended)

| Parameter | Type | Description |
|-----------|------|-------------|
| `sort_by` | string | Field to sort by. Suggested values: `created_at`, `updated_at`, `call_date`, `assigned_date`, `candidate_name`, etc. Default: e.g. `created_at`. |
| `sort_order` | string | `asc` or `desc`. Default: `desc`. |

**Example:**  
`GET /api/recruiter/applications?page=2&limit=20&recruiter_id=143&sort_by=call_date&sort_order=desc`

---

## 3. Response shape (paginated)

The backend **must** return a **paginated object** (not a raw array) so the frontend can show "Page X of Y" and "Showing 21 to 40 of 1375 candidates".

### 3.1 Recommended format (snake_case)

```json
{
  "applications": [
    {
      "id": 1,
      "recruiter_id": 143,
      "candidate_id": 31,
      "job_role_id": 1,
      "portal": "WorkIndia",
      "assigned_date": "2026-02-25",
      "call_date": "2026-02-25",
      "call_status": "Connected",
      "interested_status": "Yes",
      "not_interested_remark": null,
      "interview_scheduled": true,
      "interview_date": "2026-02-26",
      "turnup": null,
      "interview_status": "Scheduled",
      "selection_status": null,
      "joining_status": null,
      "joining_date": null,
      "backout_date": null,
      "backout_reason": null,
      "hiring_manager_feedback": null,
      "followup_date": null,
      "notes": null,
      "created_at": "2026-02-25T00:25:39.034Z",
      "updated_at": "2026-02-25T08:10:57.348Z",
      "candidate": {
        "id": 31,
        "candidate_name": "a a",
        "phone": "8765432190",
        "email": "a@a.com",
        "qualification": "B.Tech",
        "work_exp_years": 2,
        "age": 28,
        "date_of_birth": "1998-01-15",
        "location": "Mumbai, Maharashtra",
        "created_at": "...",
        "updated_at": "..."
      },
      "job_role": {
        "id": 1,
        "company_id": 16,
        "role_name": "Telematics Application Engineer",
        "company": { "id": 16, "name": "z z's Company" }
      },
      "recruiter": { "id": 143, "name": "z z", "email": "z@z.com" }
    }
  ],
  "total": 1375,
  "page": 2,
  "limit": 20,
  "total_pages": 69
}
```

### 3.2 Field summary

| Field | Type | Description |
|-------|------|-------------|
| `applications` | array | List of application objects for the requested page. |
| `total` | number | **Total** number of applications matching the filters (across all pages). Required for "Showing X to Y of Z". |
| `page` | number | Current page number (1-based). |
| `limit` | number | Page size used. |
| `total_pages` | number | Optional. `ceil(total / limit)`. Frontend can compute if missing. |

### 3.3 Application object

Each item in `applications` should include at least the fields used by the recruiter UI (see **docs/RECRUITER_APPLICATION_UPDATE_API.md** and frontend mappers such as `mapApplication`). At minimum:

- `id`, `recruiter_id`, `candidate_id`, `job_role_id`, `portal`
- `assigned_date`, `call_date`, `call_status`, `interested_status`, `not_interested_remark`
- `interview_scheduled`, `interview_date`, `turnup`, `interview_status`
- `selection_status`, `joining_status`, `joining_date`
- `backout_date`, `backout_reason`, `hiring_manager_feedback`, `followup_date`
- `notes`, `created_at`, `updated_at`
- nested `candidate`, `job_role` (with `company`), and `recruiter` where applicable.

---

## 4. Legacy / fallback

If the backend returns a **plain array** of applications (no `total`, `page`, `limit`), the frontend will:

- Use that array as the single page of results.
- Set `total` to `applications.length`, so "Next" may be incorrect when there are more than one page of data.

So for correct pagination and "Show X per page" behaviour, the backend should return the **paginated object** format above.

---

## 5. Summary for backend

- **GET** `/api/recruiter/applications` with query params: **`page`**, **`limit`**, optional filters (`recruiter_id`, `job_role_id`, etc.) and **`sort_by`**, **`sort_order`**.
- **Response:** JSON object with **`applications`** (array), **`total`** (number), **`page`** (number), **`limit`** (number), and optionally **`total_pages`**.
- **Sorting:** Support at least `sort_by=created_at` and `sort_order=asc|desc`; additional sort fields (e.g. `call_date`, `assigned_date`, `candidate_name`) improve UX.
- **Auth:** Recruiter JWT; apply recruiter scope so users only see their own applications (or as per your role model).

This is the single reference for the recruiter applications **list** API contract. For updating a single application, see **docs/RECRUITER_APPLICATION_UPDATE_API.md**.

