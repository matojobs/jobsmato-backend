# Candidate Age — Backend Requirement

This document specifies where and how the **recruiter portal frontend** expects **candidate age** (or date of birth) so that age-based statistics and displays work correctly.

---

## 1. Where age is used in the frontend

| Location | Usage |
|----------|--------|
| **Dashboard → Candidate Age Statistics** | Average age, oldest/youngest candidate, and breakdown: Young (&lt;25), Mid (25–35), Senior (&gt;35). |
| **Dashboard → Candidate list** | Shows "X years" per candidate when age is present. |
| **Dashboard → Candidate details modal** | Shows age in candidate details. |
| **Candidates page → Applications table** | "Age" column shows "X years" per row. |
| **Candidates page → Export Excel** | "Candidate Age" column in exported sheet. |
| **Add Candidate flow** | Recruiter can enter age when creating a candidate (stored via create-application API). |

If the backend does **not** provide age (or DOB), the dashboard shows the message:  
*"Age data is not provided by the backend for these candidates. Average/oldest/youngest and breakdown will show once candidate age is available."*

---

## 2. Where the frontend gets candidate data

Candidate data is **always** received as a **nested `candidate` object** inside application responses. The frontend does **not** call a separate "get candidate by id" for these views; it uses the candidate payload that comes with each application.

**Relevant APIs (recruiter token, base path `/api/recruiter`):**

| Endpoint | Response shape | Where candidate appears |
|----------|----------------|--------------------------|
| `GET /applications` | Array of application objects | Each item may include `candidate: { ... }`. |
| `GET /applications/:id` | Single application object | `candidate: { ... }`. |

Any other recruiter API that returns an **application** (or list of applications) and includes a **candidate** object is in scope: the same `candidate` shape should include age/DOB as below.

---

## 3. Required: age or date of birth on candidate

The frontend expects **one** of the following on the **candidate** object (same shape for all endpoints above).

### Option A — Age (preferred)

- **Field name:** `age`
- **Type:** number (integer)
- **Meaning:** Candidate's age in **full years**.
- **Example:** `"age": 28`

If the backend stores or computes age in years, returning `age` is enough; no frontend calculation is needed.

### Option B — Date of birth

- **Field name:** `date_of_birth` (or `dob`)
- **Type:** string, ISO 8601 date only (e.g. `YYYY-MM-DD`).
- **Example:** `"date_of_birth": "1996-05-15"`

The frontend will derive age in years from today's date (e.g. using the same logic as elsewhere in the app). If both `age` and `date_of_birth` are present, the frontend will prefer `age`.

---

## 4. Candidate object shape (summary)

Current candidate fields the frontend uses (from application responses):

- `id`, `candidate_name`, `phone`, `email`, `qualification`, `work_exp_years`, `created_at` (and any other existing fields).

**Add one of:**

- `age` (number, years), **or**
- `date_of_birth` (string, `YYYY-MM-DD`).

Optional: both can be returned; frontend will use `age` when present, otherwise compute from `date_of_birth`.

---

## 5. Example response (fragment)

```json
{
  "id": 1,
  "candidate_id": 42,
  "job_role_id": 5,
  "call_date": "2026-02-20",
  "call_status": "Connected",
  "candidate": {
    "id": 42,
    "candidate_name": "Jane Doe",
    "phone": "9876543210",
    "email": "jane@example.com",
    "qualification": "B.Tech",
    "work_exp_years": 4,
    "age": 28,
    "created_at": "2026-01-15T10:00:00.000Z"
  },
  "job_role": { ... }
}
```

Or with DOB instead of age:

```json
"candidate": {
  "id": 42,
  "candidate_name": "Jane Doe",
  "date_of_birth": "1996-05-15",
  ...
}
```

---

## 6. Snake_case vs camelCase

Recruiter API responses typically use **snake_case**. The frontend mapper accepts:

- `age` or `date_of_birth` (snake_case)

and maps them to the frontend `Candidate` type (`age: number | null`). If the backend uses different names (e.g. `dob`), the frontend can be updated to accept that name as well; the requirement is that **one** of age-in-years or date-of-birth is provided on the candidate object in application responses.

---

## 7. Frontend implementation note

The recruiter portal already supports both options:

- **lib/api-mappers.ts** `mapCandidate()`:
  - If the backend sends **`age`** (number), it is used as-is (floored to integer).
  - If the backend sends **`date_of_birth`** or **`dob`** (string, `YYYY-MM-DD`), the frontend computes age in years from the current date.
  - If both are present, **`age`** is preferred.

Once the backend adds one of these fields to the candidate object in application responses, no further frontend change is required for age to appear everywhere (dashboard stats, table, export, modals).

---

## 8. Backend behaviour (implemented)

### Sourcing candidates

Applications created in the recruiter portal (sourced candidates) use the normal candidate record; if the backend stores/populates `age` or `date_of_birth` on that candidate, it is returned in `GET /api/recruiter/applications` and `GET /api/recruiter/applications/:id` in the nested `candidate` object.

### Job-portal candidates (in recruiter applications)

- **User loading:** All application users selected in the applications service now include **`user.dateOfBirth`**, so job-portal applications carry DOB when available.
- **Recruiter merged list:** When mapping job-portal applications to the recruiter application shape, the nested **`candidate`** object is filled with:
  - **`age`:** computed from `user.dateOfBirth`.
  - **`date_of_birth`:** formatted from `user.dateOfBirth` (YYYY-MM-DD).

So in the same recruiter applications list:

- **Sourcing:** age/DOB come from the candidate record (if present).
- **Job portal:** same `candidate` shape with `age` and `date_of_birth` derived from `user.dateOfBirth`.

**Frontend:** No change needed. `lib/api-mappers.ts` `mapCandidate()` prefers `age` and falls back to `date_of_birth` / `dob`; it works with this response shape as-is.

---

## 9. Summary

- **Where:** Nested **`candidate`** object in **application** responses from `GET /api/recruiter/applications` and `GET /api/recruiter/applications/:id` (and any other response that includes the same application + candidate shape).
- **What:** Either **`age`** (number, years) or **`date_of_birth`** (string, `YYYY-MM-DD`).
- **Why:** So the dashboard "Candidate Age Statistics", candidate list, applications table, export, and candidate modal can show and aggregate age instead of "Age data is not provided by the backend for these candidates."
- **Backend:** Sourcing candidates use candidate record age/DOB; job-portal candidates get `candidate.age` and `candidate.date_of_birth` from `user.dateOfBirth` in the merged recruiter application list (see §8).
