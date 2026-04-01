# Job Portal – Multiple Users per Company

This document is for the **Job Portal** (frontend / consumers of the job-portal APIs). It describes backend support for **multiple users per company** and what, if anything, the portal may want to use.

**Recruiter portal:** This feature does **not** affect the recruiter portal or `/api/recruiter/*` endpoints. Recruiter flows (companies, job roles, candidates, sourcing) are unchanged.

---

## Summary

- **No breaking changes.** Existing job-portal API usage keeps working as before.
- The backend now allows **multiple users to have access to the same company** (via a `company_members` join table and roles: owner, admin, member).
- **New optional endpoints** for listing and adding company members, if the job portal wants to expose “team” or “members” features.

---

## What stayed the same

| Area | Details |
|------|--------|
| **Auth** | Same JWT, same roles. No new required headers or params. |
| **Company APIs** | Same URLs and request/response shapes for company CRUD. |
| **Job APIs** | Same URLs and shapes for job create/update/delete and listing. |
| **Application APIs** | Same URLs and shapes for viewing and updating application status. |
| **Single-owner use** | If the portal only has one user per company (the owner), behavior is unchanged. |

So the job portal does **not** need any changes to keep working.

---

## What changed (backend behavior)

1. **Who can manage a company**  
   In addition to the **primary owner** (`companies.userId`), any **company member** (owner, admin, or member in `company_members`) can:
   - Update or delete the company
   - Create, update, or delete jobs for that company
   - View and update applications for that company’s jobs

2. **“My jobs”**  
   The “my jobs” API returns jobs from **all companies the user has access to** (primary company + any companies they are a member of). If a user has only one company, the result is the same as before.

3. **Job creation**  
   When creating a job, the backend still uses the **first** company the user has access to (primary or membership). No change for users with a single company.

---

## New optional endpoints (for “team” / “members” features)

If the job portal wants to support multiple users per company in the UI:

| Method | Endpoint | Description |
|--------|----------|-------------|
| **GET** | `/api/companies/:id/members` | List company members (id, userId, role, and optional user info: id, firstName, lastName, email). Requires auth; caller must have access to the company. |
| **POST** | `/api/companies/:id/members` | Add a member. Requires auth; only **owner** or **admin** can add. Body: `{ "userId"?: number, "email"?: string, "role": "owner" \| "admin" \| "member" }`. Provide either `userId` or `email`. |

- Only the **primary owner** can assign the `owner` role.
- Only **owners** and **admins** can add or manage members.

Example – add by email:

```json
POST /api/companies/5/members
{
  "email": "teammate@example.com",
  "role": "member"
}
```

Example – add by user ID:

```json
POST /api/companies/5/members
{
  "userId": 42,
  "role": "admin"
}
```

---

## Optional job-portal actions

- **No action required** – Everything continues to work without changes.
- **If you want team features:**
  - Add a “Team” or “Members” section for a company and call `GET /api/companies/:id/members`.
  - Add “Invite member” (by email or user) using `POST /api/companies/:id/members`.
- **If a user can have multiple companies:**  
  Consider a company picker when creating a job (backend could later support an optional `companyId` in the job-creation payload if needed).

---

## Recruiter portal

The **recruiter portal** and all **`/api/recruiter/*`** endpoints are **unchanged** and **unaffected** by this feature. Multi-user-per-company applies only to the job-portal company/job/application flows above.
