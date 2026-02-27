# Recruiter Portal — Dashboard APIs

This document describes how the **Recruiter Dashboard** should get its data using the dedicated backend endpoints, without loading all applications into the browser.

---

## 1. Overview

- **Purpose:** Show the recruiter a high-level view of their sourcing + job-portal work: totals, today/this-month metrics, and pipeline stages.
- **Do NOT** call `GET /api/recruiter/applications?limit=1000` just to compute counts on the frontend.
- Instead, use the **dashboard aggregate endpoints**:
  - `GET /api/recruiter/dashboard/stats`
  - `GET /api/recruiter/dashboard/pipeline`

All endpoints below require a **recruiter JWT**:

```http
Authorization: Bearer <recruiter_token>
```

---

## 2. Dashboard stats (top cards)

### 2.1 Endpoint

```http
GET /api/recruiter/dashboard/stats
Authorization: Bearer <recruiter_token>
```

### 2.2 Response shape

```json
{
  "total_applications": 31,
  "total_candidates": 10,
  "total_calls": 25,
  "connected_calls": 18,
  "interested_count": 12,
  "selected_count": 5,
  "joined_count": 2,
  "conversion_rate": 16.67,
  "avg_calls_per_day": 3.2
}
```

- These numbers already include:
  - **Sourcing applications** (`sourcing.applications`) for this recruiter.
  - **Job portal applications** (`job_applications`) where this recruiter has access and has filled call details.
- Frontend should bind the **top summary cards** directly to this response, e.g.:
  - **Total Sourced** → `total_applications`
  - **Calls Done** → `total_calls`
  - **Connected** → `connected_calls`
  - **Interested** → `interested_count`
  - **Selected** → `selected_count`
  - **Joined** → `joined_count`
  - **Pending Joining** → `selected_count - joined_count` (if you need a separate card)

> Implementation detail: the backend also computes `conversion_rate` and `avg_calls_per_day` so the frontend does **not** need to recalculate them.

---

## 3. Dashboard pipeline (funnel / stages)

### 3.1 Endpoint

```http
GET /api/recruiter/dashboard/pipeline
Authorization: Bearer <recruiter_token>
```

### 3.2 Response shape

```json
[
  { "stage": "Not Called", "count": 5, "percentage": 16.1 },
  { "stage": "Busy", "count": 3, "percentage": 9.7 },
  { "stage": "RNR", "count": 4, "percentage": 12.9 },
  { "stage": "Connected", "count": 6, "percentage": 19.4 },
  { "stage": "Interested", "count": 5, "percentage": 16.1 },
  { "stage": "Selected", "count": 3, "percentage": 9.7 },
  { "stage": "Joined", "count": 2, "percentage": 6.5 },
  { "stage": "Pending", "count": 2, "percentage": 6.5 }
]
```

- `stage` values are derived from call + interested + selection + joining statuses (see backend comments in `recruiter.service.ts`).
- `percentage` is **already computed** on the backend (count / total * 100).
- Frontend should use this array to render:
  - A **funnel / pipeline chart**, or
  - A simple **table / horizontal bar chart** with stage name, count, and percentage.

---

## 4. Which endpoint to use where

### 4.1 Cards and charts

- **Dashboard summary cards** → `GET /api/recruiter/dashboard/stats`
- **Pipeline / funnel widget** → `GET /api/recruiter/dashboard/pipeline`

> Do **not** try to derive these numbers from `/api/recruiter/applications`. The dashboard endpoints are optimized SQL that already aggregate across sourcing + job portal applications.

### 4.2 Lists and tables

For **tables** on the dashboard (e.g. “Recent candidates” / “Recent sourced applications”):

```http
GET /api/recruiter/applications?page=1&limit=20
Authorization: Bearer <recruiter_token>
```

- Use **pagination** (`page`, `limit`) and optional filters (`job_role_id`, `company_id`, `start_date`, `end_date`, `call_status`, etc).
- This list is only for showing rows; it should **not** be used to compute dashboard totals.

---

## 5. Data sources (for reference)

Internally, the backend aggregates from:

- `sourcing.applications` — recruiter-created sourcing candidates linked to job roles.
- `job_applications` — job portal applications where:
  - the recruiter has access to the job’s company, and
  - recruiter call details have been filled (call date/status, interested).

The dashboard is the **single source of truth** for counts; all recruiter-portal dashboards should rely on these endpoints rather than loading “all applications” into the browser.

