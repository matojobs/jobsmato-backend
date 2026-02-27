# Portal Login & Frontend Changes

This document describes **required frontend changes** for the three portals (Admin, Recruiter, Job Portal) after backend updates for **portal separation** and **recruiters as employers** on the job portal. Each portal section lists the **backend changes that affect it** (with reasons) and the **frontend changes** that follow.

---

## Quick reference: which login per portal

| Portal | Login endpoint | Who can log in |
|--------|----------------|----------------|
| **Admin panel** | `POST /api/admin/auth/login` | `admin` only |
| **Recruiter portal (HRMS)** | `POST /api/auth/recruiter-login` | `recruiter` only |
| **Job portal (employer side)** | `POST /api/auth/login` | `employer` and `recruiter` |

---

## 1. Admin Panel – Backend & Frontend

### Backend changes (and reasons)

| Backend change | Reason |
|----------------|--------|
| Admin login now returns **401 Unauthorized** (instead of 500) when the user’s role is not `admin`. Response message: *"Unauthorised"* | So the admin panel can show a clear auth error (401), not a server error. |

No other backend changes were made specifically for the admin panel. The admin login endpoint itself is unchanged; only the error type and message for non-admin users were fixed.

### Frontend changes required

1. **Login**
   - Use **only** `POST /api/admin/auth/login` with `{ "email", "password" }`.
   - Do **not** use the general `POST /api/auth/login` on the admin panel.

2. **Error handling**
   - **401**: Invalid credentials or user is not an admin. Show *"Unauthorised"* (or the backend message).
   - **403**: Show *"Unauthorised"* or redirect to login.

3. **Token usage**
   - Store the token from admin login and send it only in requests to `/api/admin/*`. Do not use this token for recruiter or job-portal APIs.

---

## 2. Recruiter Portal – Backend & Frontend

### Backend changes (and reasons)

| Backend change | Reason |
|----------------|--------|
| New endpoint: **`POST /api/auth/recruiter-login`**. Same request body as normal login (`email`, `password`). Returns the same token/response shape as login, but only if the user’s role is `recruiter`. Otherwise returns **401** with message: *"Unauthorised"* | So the recruiter portal can have a **recruiter-only** login. Admins and employers get 401 if they try to log in there, enforcing portal separation. |
| **RecruiterGuard** debug `console.log` removed. | Cleanup; no behavior change. |

The general `POST /api/auth/login` still accepts all roles (including recruiter). The recruiter portal should **not** use that endpoint so that only recruiters can obtain a token from the recruiter portal.

### Frontend changes required

1. **Login**
   - Use **only** `POST /api/auth/recruiter-login` with `{ "email", "password" }`.
   - Do **not** use `POST /api/auth/login` on the recruiter portal.
   - On success, the response is the same as normal login (`accessToken`, `refreshToken`, `userId`, `email`, `fullName`, `role`, `onboardingComplete`). Store the token and use it for `/api/recruiter/*`.

2. **Error handling**
   - **401**: Invalid credentials or user is not a recruiter. Show *"Unauthorised"* (or the backend message).
   - **403**: e.g. wrong role on a recruiter route. Show *"Unauthorised"* or redirect to recruiter login.

3. **Token usage**
   - Use this token only for recruiter APIs. For the **job portal** (posting jobs, companies), the same user logs in again there using the **job portal login** (see Job Portal section).

---

## 3. Job Portal (Employer Side) – Backend & Frontend

### Backend changes (and reasons)

| Backend change | Reason |
|----------------|--------|
| **Jobs API:** All employer-only routes (create job, my-jobs, update job, delete job) now allow both **`EMPLOYER`** and **`RECRUITER`** roles. | So recruiters can post and manage jobs from the job portal with the **same account** as they use on the recruiter portal; no separate “employer” user needed. |
| **Companies API:** All company routes (create, update, delete, get members, add member) now allow **`EMPLOYER`**, **`RECRUITER`**, and **`ADMIN`**. Access to a company is still determined by ownership or `company_members` (recruiters get access by being added as members). | So recruiters can manage companies they are members of and post jobs for those companies from the job portal. |
| New endpoint: **`GET /api/companies/my`** (auth required; roles: employer, recruiter, admin). Returns the list of companies the current user can manage (owned or member of). | So the job portal can show a **company dropdown** when posting a job when the user has multiple companies (e.g. recruiters linked to several companies). |
| **`POST /api/jobs`** request body now accepts an optional **`companyId`**. If provided, the backend checks that the user has access to that company (via ownership or `company_members`) and creates the job for that company. If omitted, the backend uses the user’s first company (same as before for single-company users). | So recruiters (and employers with multiple companies) can **choose which company** the job is for when creating a job from the job portal. |

No change was made to the general login endpoint for the job portal; it already accepts all roles. The backend now simply allows `recruiter` on job and company routes.

### Frontend changes required

1. **Login**
   - Use **`POST /api/auth/login`** with `{ "email", "password" }`.
   - **Allowed roles for employer features:** `employer` and `recruiter`. Both can post jobs, manage companies, and use “my jobs” etc.
   - On success, store the token and use it for `/api/companies/*`, `/api/jobs/*`, and other job-portal employer APIs.

2. **Recruiters = same credentials**
   - A **recruiter** user logs in here with the **same email/password** as on the recruiter portal. Do not require a separate “employer” account.
   - If `role === 'recruiter'`, show the same employer flows (post job, my jobs, company selector, etc.) as for `employer`.

3. **Error handling**
   - **401**: Invalid credentials. Show *"Unauthorised"*.
   - **403**: User not allowed (e.g. job seeker on employer-only action). Show *"Unauthorised"* or redirect.

4. **Company selector when posting a job**
   - Call **`GET /api/companies/my`** when the user is on the “Post job” / “Create job” page.
   - If the list has **more than one** company: show a **Company** dropdown (required) and send the selected **`companyId`** in **`POST /api/jobs`**.
   - If the list has **one** company: you can hide the dropdown and omit `companyId` (backend will use that company), or show the company name and still send `companyId` for consistency.

---

## 4. API Quick Reference

| Purpose | Method | Endpoint | Auth | Roles |
|---------|--------|----------|------|--------|
| Admin login | POST | `/api/admin/auth/login` | - | - |
| Recruiter portal login | POST | `/api/auth/recruiter-login` | - | - |
| Job portal (employer/recruiter) login | POST | `/api/auth/login` | - | - |
| List companies I can manage | GET | `/api/companies/my` | Bearer | employer, recruiter, admin |
| Create job (optional `companyId`) | POST | `/api/jobs` | Bearer | employer, recruiter |
| My jobs | GET | `/api/jobs/my-jobs` | Bearer | employer, recruiter |

---

## 5. Checklist by portal

**Admin panel**
- [ ] Uses only `POST /api/admin/auth/login`; never uses general login.
- [ ] Handles 401 with *"Unauthorised"* (or backend message).
- [ ] Uses admin token only for `/api/admin/*`.

**Recruiter portal**
- [ ] Uses only `POST /api/auth/recruiter-login`; never uses general login.
- [ ] Handles 401/403 with *"Unauthorised"* (or backend message).
- [ ] Uses recruiter token only for `/api/recruiter/*`.

**Job portal (employer side)**
- [ ] Uses `POST /api/auth/login`; allows both `employer` and `recruiter` for employer features.
- [ ] Treats recruiters with same credentials (no separate employer account).
- [ ] On “Post job”, calls `GET /api/companies/my`; if multiple companies, shows dropdown and sends `companyId` in `POST /api/jobs`.

**All portals**
- [ ] Do not mix tokens across portals (admin token ≠ recruiter token ≠ job-portal token).
