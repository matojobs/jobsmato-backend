# Job Portal: Recruiter “Post for Any Company” Feature

This document describes the **“can post for any company”** permission for recruiters on the job portal: what we want, how the backend implements it, and what the job portal frontend must do.

---

## 1. What we want

- **Recruiters** can log in to the **job portal** (employer side) with the same credentials as the recruiter portal.
- **Two types of recruiters:**
  - **Normal recruiters:** Can post jobs only for companies they are **members of** (via company membership).
  - **Internal recruiters (our employees):** We want to give them a **special permission** so they can:
    - See **all companies** that exist in the system in a dropdown.
    - **Post (and manage) jobs for any company** — not limited to companies they’re members of.

So the job portal must support:
- A **company selector** when creating/editing a job.
- For **employers** and **normal recruiters:** only companies they own or are members of.
- For **recruiters with the special permission:** **all companies** in the system.

---

## 2. How the backend does it

### 2.1 Permission flag

- The backend has a boolean on the **user** record: **`canPostForAnyCompany`** (DB column: `can_post_for_any_company`).
- Default is **`false`**.
- Only **admins** can set this (via Admin Panel → edit user).
- The flag is **meaningful only for users with role `recruiter`**. For other roles it is ignored.

### 2.2 Company list for the dropdown

- **Endpoint:** `GET /api/companies/my`  
  - Auth: Bearer token required.  
  - Roles: `employer`, `recruiter`, `admin`.

- **Behaviour:**
  - **Employer or admin:** Returns companies the user **owns** or is a **member of** (unchanged).
  - **Recruiter with `canPostForAnyCompany === false`:** Returns only companies they **own** or are **members of**.
  - **Recruiter with `canPostForAnyCompany === true`:** Returns **all companies** in the system (ordered by name).

So the job portal **always** uses the same endpoint for the company dropdown; the list size and contents depend on the backend based on role and this flag.

### 2.3 Post / update / delete job

- **Create job:** `POST /api/jobs` accepts optional **`companyId`**.
  - Backend checks: user may create a job for that company only if they have access.
  - **Recruiter with `canPostForAnyCompany === true`:** Allowed for **any** existing company.
  - Others: Allowed only if they own the company or are in `company_members` for it.

- **Update / delete job:** Same rule: recruiters with the flag can update/delete jobs for any company; others only for companies they have access to.

No change to request/response shape; only permission logic changes.

### 2.4 Admin: setting the flag

- **Endpoint:** `PUT /api/admin/users/:id`  
  - Body can include: `canPostForAnyCompany: true | false`.
- Admin panel should expose a checkbox (e.g. “Can post jobs for any company on job portal”) when editing a user, **especially for recruiters**.

---

## 3. What the job portal must do

### 3.1 Use one flow for everyone

- **Post job / Create job page:**
  1. Call **`GET /api/companies/my`** (with the user’s Bearer token).
  2. Use the returned list as the **company dropdown** options (e.g. `id` + `name`).
  3. If the list has **more than one** company: show the dropdown and require the user to select a company; send that **`companyId`** in **`POST /api/jobs`**.
  4. If the list has **one** company: you can pre-select it and still send `companyId`, or omit it (backend will use that company).
  5. If the list is **empty**: show a message that the user must have at least one company (create one or get access). Do not allow posting until they have access to at least one company.

- **No need to know the flag on the frontend:** You do **not** need to call a separate “user profile” or “permissions” API to know whether the user has “can post for any company”. The **same** `GET /api/companies/my` call returns:
  - For employers / normal recruiters: only their companies.
  - For recruiters with the special permission: all companies.

So a single implementation of the company dropdown works for everyone.

### 3.2 Create job request

- **`POST /api/jobs`**  
  - Body must include the usual fields (title, description, etc.).
  - **`companyId`:** Required when the user has **multiple** companies (so they must choose one). Optional when they have exactly one (backend can infer). Sending it when there’s one company is fine.

### 3.3 My jobs / Edit job

- “My jobs” and edit/delete job already use the same token; backend restricts to jobs the user is allowed to manage (including “any company” for recruiters with the flag). No extra frontend logic.

### 3.4 UX suggestions

- **Dropdown label:** e.g. “Company” or “Post job as (company)”.
- **Many companies:** If `GET /api/companies/my` returns many items (e.g. internal recruiter), use a searchable/scrollable dropdown.
- **Empty list:** Clear message: user needs to create or be given access to a company before posting.

---

## 4. API summary for job portal

| What | Method | Endpoint | Notes |
|------|--------|----------|--------|
| Companies for dropdown | GET | `/api/companies/my` | Returns companies user can post for (all if recruiter with permission). |
| Create job | POST | `/api/jobs` | Include `companyId` when user has multiple companies. |
| Update job | PATCH | `/api/jobs/:id` | No change. |
| Delete job | DELETE | `/api/jobs/:id` | No change. |

---

## 5. Who gets “all companies”

- Only **recruiters** with **`canPostForAnyCompany === true`** see all companies and can post for any company.
- This flag is set in the **Admin Panel** (edit user → set “Can post jobs for any company on job portal” or equivalent).
- Employers and recruiters without the flag continue to see only companies they own or are members of.

---

## 6. Summary

- **Goal:** Let internal recruiters (our employees) post jobs for **any** company from the job portal.
- **Mechanism:** User flag **`canPostForAnyCompany`**; backend uses it in `GET /api/companies/my` and in job create/update/delete checks.
- **Job portal:** Always use **`GET /api/companies/my`** for the company dropdown; show one company or many based on the response; send **`companyId`** in **`POST /api/jobs`** when the user selects a company (required when list length > 1). No need to show or check the permission flag in the UI.
