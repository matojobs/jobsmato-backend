# Recruiter Today Progress API (Flow Tracking — Today)

This document specifies the **GET** endpoint used by the recruiter portal to show **Flow Tracking** as **recruiter today progress**: pipeline stage counts for the **current day** only (calls made today, status updates today, etc.). The frontend uses this on the **Candidates** page in the "Flow Tracking" widget so recruiters see their **today's** numbers, not all-time or filtered totals.

---

## 1. Endpoint

| Method | URL | Auth |
|--------|-----|------|
| **GET** | `/api/recruiter/dashboard/today-progress` | `Authorization: Bearer <recruiter_token>` |

Alternatively, if the backend uses a shared dashboard prefix:

- **GET** `/api/dashboard/recruiter-today-progress`

The frontend will call whichever path the backend exposes; the response shape is the same.

---

## 2. Query parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `recruiter_id` | string | Optional. Recruiter to get today's progress for. If omitted, backend should derive from the auth token. |

**Example:**  
`GET /api/recruiter/dashboard/today-progress`  
or  
`GET /api/recruiter/dashboard/today-progress?recruiter_id=143`

---

## 3. Definition of "today"

- **Today** = the current calendar day in the **server's timezone** (or the recruiter's timezone if the backend supports a `timezone` query param later).
- Counts should include only applications where the **relevant activity** for that stage occurred on that day (see table below).

Suggested meaning per stage (backend can adjust to match your data model):

| Stage | Meaning for "today" |
|-------|----------------------|
| **Sourced** | Applications **assigned** or **created** today for this recruiter (`assigned_date` or `created_at` = today). |
| **Call Done** | Applications with **call done today** (`call_date` = today). |
| **Connected** | Applications with **call today** and `call_status` = Connected (`call_date` = today, `call_status` = 'Connected'). |
| **Interested** | Applications marked **Interested** today (e.g. `interested_status` = Yes and `updated_at` or a dedicated date = today). |
| **Not Interested** | Applications marked **Not Interested** today. |
| **Interview Scheduled** | Applications with **interview scheduled** today (e.g. `interview_scheduled` = true and `interview_date` set today, or status updated today). |
| **Interview Done** | Applications with **interview done** today (e.g. `interview_status` = Done and relevant date = today). |
| **Selected** | Applications **selected** today (e.g. `selection_status` = Selected and updated today). |
| **Joined** | Applications **joined** today (`joining_status` = Joined and `joining_date` = today). |

Backend is free to use `updated_at`, `call_date`, `assigned_date`, `joining_date`, etc., as long as the same stage names are returned so the frontend can map them.

---

## 4. Response shape

Same structure as the existing **pipeline** API so the frontend can reuse the same mapper (`mapPipelineFlow`): an **array of stage objects** with `stage` and `count`.

### 4.1 Recommended format (array of stages)

```json
[
  { "stage": "sourced", "count": 5 },
  { "stage": "call done", "count": 4 },
  { "stage": "connected", "count": 3 },
  { "stage": "interested", "count": 2 },
  { "stage": "not interested", "count": 0 },
  { "stage": "interview scheduled", "count": 1 },
  { "stage": "interview done", "count": 0 },
  { "stage": "selected", "count": 0 },
  { "stage": "joined", "count": 0 }
]
```

### 4.2 Stage names (normalized)

Frontend maps these (case-insensitive) to the **PipelineFlow** object:

- `sourced` or `new applications` → `sourced`
- `call done` or `contacted` → `callDone`
- `connected` → `connected`
- `interested` → `interested`
- `not interested` → `notInterested`
- `interview scheduled` → `interviewScheduled`
- `interview done` → `interviewDone`
- `selected` → `selected`
- `joined` → `joined`

Missing stages can be omitted; frontend treats missing as `0`.

### 4.3 Alternative: single object

If the backend prefers one object instead of an array:

```json
{
  "sourced": 5,
  "call_done": 4,
  "connected": 3,
  "interested": 2,
  "not_interested": 0,
  "interview_scheduled": 1,
  "interview_done": 0,
  "selected": 0,
  "joined": 0
}
```

Frontend would need a small adapter to convert snake_case to the existing `PipelineFlow` keys. Prefer the **array format** for consistency with `GET /dashboard/pipeline` if possible.

---

## 5. Errors

- **401 Unauthorized** — Missing or invalid recruiter token.
- **403 Forbidden** — Token valid but not allowed to see this recruiter's progress.
- **500** — Server error; frontend will show empty flow (zeros) and optionally a message.

---

## 6. Summary for backend

- **New endpoint:** e.g. **GET** `/api/recruiter/dashboard/today-progress` (or `/api/dashboard/recruiter-today-progress`).
- **Auth:** Recruiter JWT; resolve `recruiter_id` from token or query.
- **Semantics:** Return pipeline stage **counts for today only** (see table in §3). Use the same **array of `{ stage, count }`** as the existing pipeline API so the app can reuse `mapPipelineFlow`.
- **Usage:** Candidates page "Flow Tracking" widget will call this API to show **recruiter today progress** instead of all-time or filtered pipeline.

For the **all-time** (or filtered) pipeline, the app continues to use the existing dashboard pipeline API (e.g. `GET /api/recruiter/dashboard/pipeline`). For **today-only** numbers, the app will call this new endpoint.
