# Frontend – Search & filter APIs

This doc describes the **search and filter** query parameters for recruiter and admin list endpoints. Use these to power search boxes and filter dropdowns in the frontend.

---

## 1. Recruiter – Applications list

**Endpoint:** `GET /api/recruiter/applications`  
**Auth:** Recruiter JWT

Recruiters only see **their own** applications. The backend uses the recruiter ID from the JWT; there is no way to list another recruiter’s data.

### Search (one text box)

| Param   | Type   | Description |
|--------|--------|-------------|
| `search` | string | Optional. Case-insensitive “contains” match on **candidate name**, **phone**, **email**, **portal**, **job role name**, or **company name**. |

One `search` term is matched against all of the above. Example: `search=John` returns applications where the candidate name, phone, email, portal, job role name, or company name contains “John”.

**Example:**

```
GET /api/recruiter/applications?page=1&limit=20&search=Naukri
```

### Filters (combine with search)

All optional. Use the same names in query params (snake_case).

| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number (default `1`). |
| `limit` | number | Page size (default `20`). |
| `recruiter_id` | number | Filter by recruiter ID. |
| `job_role_id` | number | Filter by job role ID. |
| `company_id` | number | Filter by company ID. |
| `call_status` | string | One of: `Connected`, `RNR`, `Busy`, `Switched Off`, `Incoming Off`, `Call Back`, `Invalid`, `Wrong Number`, `Out of network`. |
| `interested_status` | string | One of: `Yes`, `No`, `Call Back Later`. |
| `selection_status` | string | One of: `Selected`, `Not Selected`, `Pending`. |
| `joining_status` | string | One of: `Joined`, `Not Joined`, `Pending`, `Backed Out`. |
| `start_date` | string | Assigned date from (ISO `YYYY-MM-DD`). |
| `end_date` | string | Assigned date to (ISO `YYYY-MM-DD`). |
| `interview_scheduled` | boolean | Filter by interview scheduled (`true` / `false`). |
| `interview_status` | string | Filter by interview status (e.g. `Done`). |

**Example with search + filters:**

```
GET /api/recruiter/applications?page=1&limit=20&search=john&company_id=2&call_status=Connected
```

---

## 2. Recruiter – Candidates list

**Endpoint:** `GET /api/recruiter/candidates`  
**Auth:** Recruiter JWT

Recruiters only see **their own** candidates: those that have at least one application assigned to the current recruiter. The recruiter ID comes from the JWT; there is no way to list another recruiter’s candidates. You can narrow by search and/or filters.

### Search

| Param   | Type   | Description |
|--------|--------|-------------|
| `search` | string | Optional. Case-insensitive “contains” match on **candidate name**, **phone**, or **email**. |

**Example:**

```
GET /api/recruiter/candidates?search=98765
```

### Filters

All optional. Combine with `search` as needed.

| Param | Type | Description |
|-------|------|-------------|
| `job_role_id` | number | Only candidates that have at least one application for this job role. |
| `company_id` | number | Only candidates that have at least one application for a job role in this company. |
| `portal_id` | number | Only candidates with this portal ID. |

**Example:**

```
GET /api/recruiter/candidates?search=John&company_id=2&portal_id=1
```

**Note:** Response is limited to 100 candidates (backend default). Pagination is not applied on this endpoint.

---

## 3. Admin – Job applications list

**Endpoint:** `GET /api/admin/applications`  
**Auth:** Admin JWT + permission to view applications

Lists **job portal** applications (applicants = users). Search matches the **applicant** (user) details.

### Search

| Param   | Type   | Description |
|--------|--------|-------------|
| `search` | string | Optional. Case-insensitive “contains” match on applicant **first name**, **last name**, **email**, or **phone**. |

**Example:**

```
GET /api/admin/applications?page=1&limit=20&search=john@example.com
```

### Filters

| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number (default `1`). |
| `limit` | number | Page size (default `20`, max 100). |
| `jobId` | number | Filter by job ID. |
| `userId` | number | Filter by applicant (user) ID. |
| `status` | string | One of: `pending`, `reviewing`, `shortlisted`, `interview`, `rejected`, `accepted`, `withdrawn`. |

**Example:**

```
GET /api/admin/applications?page=1&limit=20&search=Smith&status=pending
```

---

## Summary for frontend

| Screen / role   | Endpoint | Search matches | Main filters |
|-----------------|----------|----------------|--------------|
| Recruiter – Applications | `GET /api/recruiter/applications` | Candidate name, phone, email, portal, job role name, company name | job_role_id, company_id, call_status, dates, interview_* |
| Recruiter – Candidates  | `GET /api/recruiter/candidates`    | Candidate name, phone, email | job_role_id, company_id, portal_id |
| Admin – Applications    | `GET /api/admin/applications`     | Applicant first name, last name, email, phone | jobId, userId, status |

- Use **one search input** and send it as the `search` query param; backend matches across the relevant fields.
- All search is **case-insensitive** and **substring** (“contains”).
- Combine `search` with any of the listed filters; backend applies both.
