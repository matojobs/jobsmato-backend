# Recruiter Portal: Sourcing Page & Pending Applications

This document describes the **Sourcing** and **Pending Applications** flows for the recruiter portal frontend, with the APIs to use and how they fit together. No duplicate candidates: the same application/candidate record is used; when the recruiter updates call details or status, it reflects on the application and candidate profile.

---

## 1. Overview

| Page | Purpose | Data source |
|------|--------|-------------|
| **Sourcing** | Job posts (roles) the recruiter has **sourced candidates** for. Clicking a job opens a page showing those **sourced candidates** (sourcing applications). | `sourcing.applications` (recruiter-created candidates linked to job roles). |
| **Pending Applications** | Job applications from **candidates who applied on the job portal** to jobs the recruiter has access to. Recruiter has not yet filled **Call Date**, **Call Status**, **Interested**. After filling and submitting, the application moves out of “pending” and reflects in dashboard/workflow. | `job_applications` (public job portal applications). |

- **No duplicate candidate:** Sourcing candidates and job-portal applicants are different flows (sourcing vs job_applications), but for a given application we use a single record. When the recruiter updates call date/status/interested on a **job application**, that same application (and candidate) shows the updated data everywhere (e.g. dashboard, workflow, candidate profile).

---

## 2. Sourcing Page

### 2.1 What to build

- **Sourcing page:** List of **job roles** (job posts) the recruiter has sourced candidates for.
- **Clicking a job role** opens a **detail page** that shows the **sourced candidates** (sourcing applications) for that job role.

### 2.2 APIs (use recruiter token: `Authorization: Bearer <recruiter_token>`)

**List job roles the recruiter has sourced for (Sourcing page list):**

```http
GET /api/recruiter/sourced-job-roles
Authorization: Bearer <recruiter_token>
```

**Response:** Array of:

```json
{
  "jobRoleId": 1,
  "jobRoleName": "Software Engineer",
  "department": "Engineering",
  "companyId": 5,
  "companyName": "Acme Corp",
  "applicationCount": 3
}
```

- Use this to render the Sourcing page: one row/card per job role (job post). Show `jobRoleName`, `companyName`, `applicationCount`. Link to the detail page with `job_role_id=<jobRoleId>`.

**Sourced candidates for a job role (detail page):**

```http
GET /api/recruiter/applications?job_role_id=<jobRoleId>
Authorization: Bearer <recruiter_token>
```

- Optional: `page`, `limit`, and other existing query params (see recruiter applications API).
- Response is the existing applications list: each item is a sourcing application (candidate, call_date, call_status, interested, selection_status, joining_status, etc.). Use this to show the table/list of sourced candidates for that job role.

### 2.3 Flow

1. Sourcing page: call `GET /api/recruiter/sourced-job-roles` → show job roles with counts.
2. User clicks a job role → navigate to e.g. `/sourcing/job-role/:jobRoleId`.
3. Detail page: call `GET /api/recruiter/applications?job_role_id=<jobRoleId>` → show sourced candidates (and their status; same data as recruiter dashboard/workflow).

---

## 3. Pending Applications Page

### 3.1 What to build

- **Pending Applications** page: List of **job applications** (candidates who applied on the **job portal**) for jobs the recruiter has access to, where the recruiter has **not yet** filled Call Date, Call Status, and Interested. These stay “pending” until the recruiter submits.
- **Clicking an application** opens a **popup/modal** with:
  - Candidate details: name, email, phone, resume, etc. (from application + user).
  - Inputs: **Call Date**, **Call Status**, **Interested** (required to submit).
- On **Submit**, send the three values to the API. After success, the application is no longer “pending” and will reflect on the recruiter dashboard/workflow; the same application/candidate shows updated data (no duplicate).

### 3.2 APIs (recruiter token)

**Base URL for these endpoints:** `/api/applications` (same as job portal applications; recruiter token with role `recruiter` is allowed).

**List pending job applications (recruiter):**

```http
GET /api/applications/pending
Authorization: Bearer <recruiter_token>
```

**Response:** Array of application objects (same shape as other application APIs). Each includes:

- `id`, `jobId`, `userId`, `status`, `coverLetter`, `resume`, `appliedAt`, `createdAt`, `updatedAt`
- `recruiterCallDate`, `recruiterCallStatus`, `recruiterInterested` (will be `null` for pending)
- `user`: candidate contact and profile (e.g. `firstName`, `lastName`, `email`, `phone`, `profile`)
- `job`: `id`, `title`, `company` (id, name, logo)

Use this to render the Pending Applications list. For the popup, you can either use this list or fetch one by id.

**Get one application (for popup details):**

```http
GET /api/applications/:id
Authorization: Bearer <recruiter_token>
```

- Recruiter can only get applications for jobs they have access to (same as pending list). Returns full application with `user` (candidate phone, email, etc.) and `job`. Use for popup when you want fresh data.

**Submit Call Date, Call Status, Interested (recruiter):**

```http
PATCH /api/applications/:id/recruiter-call
Authorization: Bearer <recruiter_token>
Content-Type: application/json

{
  "callDate": "2024-01-15",
  "callStatus": "reached",
  "interested": true
}
```

- **callDate:** string, date only, e.g. `YYYY-MM-DD`.
- **callStatus:** string, e.g. `reached`, `not_reached`, `callback`.
- **interested:** boolean (optional in DTO but required for “no longer pending” behaviour; recommend required in UI).

**Response:** Updated application (same shape as GET), including `recruiterCallDate`, `recruiterCallStatus`, `recruiterInterested` now set.

- After a successful PATCH, the application no longer appears in `GET /api/applications/pending` (backend treats “pending” as `recruiter_call_date IS NULL`). The application **status** is automatically set to **`reviewing`** (if it was `pending`), so the employer sees the status change on the job portal. To show it in **Recruiter work / Candidates**, use **`GET /api/applications/recruiter-work`** (see §4).

### 3.3 Flow

1. Pending Applications page: call `GET /api/applications/pending` → show list (e.g. candidate name, job title, company, applied date).
2. User clicks an application → open popup; optionally call `GET /api/applications/:id` for full candidate details.
3. Popup shows candidate details (phone, email, etc.) and three fields: **Call Date**, **Call Status**, **Interested**. All three required before Submit.
4. User fills and submits → `PATCH /api/applications/:id/recruiter-call` with `callDate`, `callStatus`, `interested`.
5. On success: close popup, remove item from list (or refresh list). Same application/candidate now shows updated data in dashboard/workflow and candidate profile (no duplicate).

---

## 4. Recruiter work / Candidates list

The **Candidates** (or "Recruiter work") page should show both:

1. **Sourced candidates** – from `GET /api/recruiter/applications` (sourcing.applications).
2. **Job portal applications the recruiter has worked on** – from `GET /api/applications/recruiter-work`.

**Job portal applications where recruiter filled call details:**

```http
GET /api/applications/recruiter-work
Authorization: Bearer <recruiter_token>
```

- Returns job_applications for jobs the recruiter has access to where **recruiter_call_date** is set (i.e. the recruiter has submitted call date/status from Pending Applications).
- Same response shape as other application APIs (`id`, `user`, `job`, `recruiterCallDate`, `recruiterCallStatus`, `recruiterInterested`, etc.).
- Use this so that when a recruiter submits a pending application, that application appears in the Recruiter work / Candidates list. Merge or display alongside sourced candidates as needed.

---

## 5. API Summary (Recruiter token)

| Purpose | Method | Endpoint |
|--------|--------|----------|
| Job roles recruiter has sourced for (Sourcing page) | GET | `/api/recruiter/sourced-job-roles` |
| Sourced candidates for a job role | GET | `/api/recruiter/applications?job_role_id=<id>` |
| **Recruiter work – job portal apps recruiter has worked on** | GET | `/api/applications/recruiter-work` |
| Pending job applications (no call details yet) | GET | `/api/applications/pending` |
| Single application (e.g. for popup) | GET | `/api/applications/:id` |
| Submit call date / status / interested | PATCH | `/api/applications/:id/recruiter-call` |

All with: `Authorization: Bearer <recruiter_token>` (from recruiter login).

---

## 6. Data and “no duplicate candidate”

- **Sourcing:** Candidates created in the recruiter portal and linked to a job role create rows in **sourcing.applications**. They are the “sourced” candidates and appear in Sourcing (by job role) and in recruiter dashboard/workflow.
- **Job portal applications:** When a candidate applies on the job portal, a row is created in **job_applications**. Recruiters with access to that job see these in **Pending Applications** until they fill Call Date, Call Status, Interested. After that, the **same** job_application row is updated; there is no separate “recruiter copy” of the candidate. Status and recruiter call fields on that application reflect everywhere (dashboard, workflow, candidate profile) without duplicating the candidate.

---

## 7. Backend behaviour (short)

- **Pending** = job_application where `recruiter_call_date` is null, for jobs the recruiter has access to (`canUserAccessCompany`).
- **PATCH /api/applications/:id/recruiter-call** sets `recruiter_call_date`, `recruiter_call_status`, `recruiter_interested` on the same `job_applications` row and, if status was `pending`, sets **status** to **`reviewing`** so the employer sees it on the job portal; no new record is created.
- **Sourcing** list and detail use existing recruiter APIs (`sourced-job-roles`, `applications?job_role_id=`); creating a candidate in the recruiter portal still creates a sourcing application (and does not duplicate job_portal applications).

---

## 8. Frontend checklist

- [ ] **Sourcing page:** Call `GET /api/recruiter/sourced-job-roles`, show job roles; link to detail with `job_role_id`.
- [ ] **Sourcing detail:** Call `GET /api/recruiter/applications?job_role_id=<id>`, show sourced candidates.
- [ ] **Pending Applications page:** Call `GET /api/applications/pending`, show list; on row click open popup.
- [ ] **Popup:** Show candidate details (from list or `GET /api/applications/:id`), inputs for Call Date, Call Status, Interested; Submit = `PATCH /api/applications/:id/recruiter-call`.
- [ ] After submit: refresh pending list (or remove item); no duplicate candidate; same application reflects in dashboard/workflow and candidate profile.
- [ ] **Candidates / Recruiter work:** Include job portal applications via `GET /api/applications/recruiter-work` (merge with sourced candidates from `GET /api/recruiter/applications` as needed) so submitted pending applications appear there.
- [ ] **Dashboard & Flow Tracking:** `GET /api/recruiter/dashboard/stats` and `GET /api/recruiter/dashboard/pipeline` now include job portal applications (where recruiter filled call). Counts (Call Done, Connected, Interested, etc.) and pipeline stages reflect both sourcing and job portal submissions.
