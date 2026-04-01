# Recruiter – Single API to Create Candidate + Application

This doc describes the **new transactional API** that lets the recruiter portal create a **candidate and sourcing application in one request**. It replaces the old 2-step flow (`POST /candidates` then `POST /applications`) to avoid the bug where a candidate is created but the application fails.

---

## Endpoint

- **Method**: `POST`
- **URL**: `/api/recruiter/applications/with-candidate`
- **Auth**: Recruiter JWT (same as other recruiter APIs)

Backend wraps both inserts in a **database transaction**:

- If **any** validation fails (duplicate phone, invalid job_role_id, duplicate application, etc.), **nothing is created**.
- On success, it returns the **full application** (same shape as `GET /api/recruiter/applications/:id`), including the nested `candidate`.

---

## Request Body

Top-level object:

```json
{
  "candidate": { /* CreateCandidateDto */ },
  "application": { /* CreateApplicationDto (candidate_id ignored) */ }
}
```

### 1. `candidate` (CreateCandidateDto)

```json
{
  "candidate_name": "John Doe",
  "phone": "+91 9876543210",
  "email": "john@example.com",
  "qualification": "B.Tech",
  "work_exp_years": 3,
  "portal_id": 1,
  "age": 25,
  "date_of_birth": "2000-01-01"
}
```

- **Required**
  - `candidate_name` (string)
  - `phone` (string)
- **Optional**
  - `email` (string, email)
  - `qualification` (string)
  - `work_exp_years` (number)
  - `portal_id` (number)
  - `age` (number) – if `date_of_birth` is not provided, backend infers DOB as `YYYY-01-01` based on age.
  - `date_of_birth` (string, `YYYY-MM-DD`)

**Duplicate check**

- Backend computes a **phone hash** and rejects the request with **400** if a candidate with the same phone already exists:
  - `message: "Candidate with this phone number already exists"`

### 2. `application` (CreateApplicationDto)

```json
{
  "candidate_id": 0,
  "job_role_id": 123,
  "assigned_date": "2026-03-13",
  "call_date": null,
  "call_status": null,
  "interested_status": null,
  "selection_status": null,
  "joining_status": null,
  "notes": "Initial sourcing from portal"
}
```

- **Important**: `candidate_id` in this object is **ignored**. Backend always uses the ID of the newly created candidate.
- **Required**
  - `job_role_id` (number) – must exist in `sourcing.job_roles` and be active.
  - `assigned_date` (string, `YYYY-MM-DD`)
- **Optional**
  - `call_date` (string, `YYYY-MM-DD` or `null`)
  - `call_status` (string) – one of the 9 call status options (see `FRONTEND-CALL-STATUS-OPTIONS.md`)
  - `interested_status` (string) – `Yes` / `No` / `Call Back Later`
  - `selection_status` (string) – `Selected` / `Not Selected` / `Pending`
  - `joining_status` (string) – `Joined` / `Not Joined` / `Pending` / `Backed Out`
  - `notes` (string)

**Duplicate application check**

- Backend rejects if an application already exists for the same candidate, job role, and assigned date:

```json
{
  "statusCode": 400,
  "message": "Application already exists for this candidate, job role, and assigned date",
  "error": "Bad Request"
}
```

---

## Response

On success (`201 Created`), response body is the **same shape** as other recruiter application endpoints (sourcing application), e.g.:

```json
{
  "id": 12345,
  "candidate_id": 67890,
  "job_role_id": 111,
  "assigned_date": "2026-03-13",
  "call_date": null,
  "call_status": "Connected",
  "interested_status": "Yes",
  "selection_status": "Pending",
  "joining_status": "Pending",
  "notes": "Initial sourcing from portal",
  "candidate": {
    "id": 67890,
    "candidate_name": "John Doe",
    "phone": "+91 9876543210",
    "email": "john@example.com",
    "age": 25,
    "date_of_birth": "2000-01-01",
    "portal_id": 1,
    "qualification": "B.Tech",
    "work_exp_years": 3
  },
  "job_role": {
    "id": 111,
    "role_name": "Senior Developer",
    "company": {
      "id": 10,
      "name": "Acme Corp"
    }
  }
}
```

Exact shape matches existing recruiter application response (used in Candidates / Sourcing pages).

---

## Frontend Changes

### Old flow (to be replaced)

In `AddApplicationModal`:

1. `POST /candidates` – create candidate, get `candidate.id`.
2. `POST /applications` – create application with `candidate_id`.
3. If step 2 fails, candidate is already created → inconsistent state.

### New flow (preferred)

Replace the two-step flow with **one call**:

```ts
// Pseudo-code for AddApplicationModal / Candidates page
import { createRecruiterApplicationWithCandidate } from '@/lib/backend-api';

const payload = {
  candidate: {
    candidate_name,
    phone,
    email,
    qualification,
    work_exp_years,
    portal_id,
    age,
    date_of_birth,
  },
  application: {
    job_role_id,
    assigned_date,
    call_date,
    call_status,
    interested_status,
    selection_status,
    joining_status,
    notes,
    // candidate_id is ignored by backend; you can omit or set 0
  },
};

const application = await createRecruiterApplicationWithCandidate(payload);
```

**Key points for frontend:**

- Do **not** call `/api/recruiter/candidates` separately when using this endpoint.
- Use the returned `application` object to update the UI (list, counts, etc.).
- Handle 400/409 responses:
  - `Candidate with this phone number already exists`
  - `Application already exists for this candidate, job role, and assigned date`

---

## Summary

- **Endpoint:** `POST /api/recruiter/applications/with-candidate`
- **What it does:** Creates candidate + sourcing application **atomically** (single transaction).
- **Why:** Fixes the bug where a candidate is created but application creation fails, and simplifies the frontend flow.
- **Frontend:** Replace two API calls (`POST /candidates` then `POST /applications`) with one call to the new endpoint using the `candidate` + `application` payload described above.

