# Vacancy-Driven Sourcing — Design Doc

**Status:** Implemented in dev (Changes 1–4). Prod migration still needed.
**Date:** 2026-05-31
**Owner:** Saket
**Scope:** Job portal (`jobs` table) + Internship task creation (`batch_tasks`) in `E:/jobsmato-backend`

---

## 1. Problem

Today an admin creates an internship task by picking filter *strings* (company, profile, city)
and assigning N candidates per intern. There is **no concept of a vacancy** — no "we need 6
people in Delhi." So:

- Interns call candidates with no target to fill.
- Admin can't see fill-rate (how many of the needed hires are done).
- The "City" step in the task wizard shows **candidate-pool size** (how many candidates exist
  in a city) instead of **open positions** (how many we need to hire). Wrong number.

## 2. Goal

Let a recruitment client post a job with **per-city vacancies**. Internship tasks source
against those vacancies. A vacancy fills automatically when an intern marks a candidate
`Joined`. Admin sees live fill-rate per city.

```
Job Post: Spinny · TeleSales
   ├─ Delhi   → 6 openings   (3 filled, 3 remaining)
   ├─ Agra    → 5 openings   (5 filled, 0 remaining ✅ closed)
   ├─ Mumbai  → 2 openings   (0 filled, 2 remaining)
   └─ Patna   → 1 opening    (1 filled, 0 remaining ✅ closed)
```

---

## 3. Current flow (as-is)

### Post side (job portal)
```
Employer → AddJob.tsx → POST /api/jobs → CreateJobDto
   → jobs.service.create() → jobRepository.create({...dto, slug, status:ACTIVE})
   → jobs table  (location: single string, NO vacancy field)
```

### Consume side (internship)
```
Admin task ──► task_assignments ──► intern works candidate
(filter strings)  (enrollmentId+candidateId+taskId,         │
                   status pending/called/skipped)            ▼
                                            intern_activity_logs
                                              joiningStatus = 'joined'  ◄── hire event
                                              candidateId → training_candidate.currentCity
```

**Key facts found during investigation**
- `jobs.location` is a single free-text string. No vacancy count anywhere
  (not in entity, DTO, AddJob form, or sourcing `job_roles`).
- The `Joined` event already exists: `intern_activity_logs.joiningStatus === 'joined'`,
  already counted by the week-stats endpoint.
- `batch_tasks` stores filter strings only — **no link to a job post**.
- A candidate's city is knowable via `training_candidate.currentCity`.

---

## 4. The 3 missing links

| # | Missing link | Today | Needed |
|---|---|---|---|
| 1 | Task → Job Post | `batch_tasks` stores filter strings | add `batch_tasks.jobId` |
| 2 | Joined → vacancy | `activity_logs.log()` just saves a row | derive fill-rate from joined logs |
| 3 | City-string alignment | portal `location` free text vs candidate `currentCity` | both city strings must match exactly |

Link #3 is the make-or-break and is **not a code problem** — it's a data-entry rule
(see §7).

---

## 5. Proposed changes (surgical, in order)

### Change 1 — `jobs.vacancies` (post side)
- **Entity** `job.entity.ts`: ADD nullable `vacancies jsonb`.
  Keep `location` string **untouched** so all ~10 existing readers keep working.
  ```ts
  // [{ city: 'Delhi', openings: 6 }, { city: 'Agra', openings: 5 }]
  @Column({ type: 'jsonb', nullable: true })
  vacancies?: { city: string; openings: number }[];
  ```
- **DTO** `job.dto.ts`: ADD optional `vacancies?: VacancyDto[]` to Create + Update.
  `create()` already spreads `...dto`, so it flows through automatically.
- **`formatJobResponse`**: include `vacancies`.
- **`AddJob.tsx`**: add a repeatable "city → openings" row below the location field.
  Optional — empty `vacancies` = exact old behaviour, zero breakage.

> Note: `openings` is stored. `filled` is **never** stored (see Change 3).

### Change 2 — `batch_tasks.jobId` (task ↔ job)
- ADD nullable `batch_tasks.jobId` (FK to `jobs`).
- Task wizard: pick a Job Post → the **City step auto-fills from `job.vacancies`**
  (real open positions), replacing the candidate-count source.

### Change 3 — derived fill-rate (NO mutable counter)
Do **not** store/increment a `filled` field — it drifts on edits/back-outs (double-count bug).
Derive it live:
```sql
filled(job, city) = COUNT(intern_activity_logs
                          WHERE joiningStatus = 'joined'
                          AND task.jobId = job.id
                          AND candidate.currentCity = city)
remaining = openings - filled
```
Self-correcting: any status change just recomputes. No drift.

### Change 4 — admin "Open Positions" view
- A fill-rate dashboard per job/city (openings / filled / remaining).
- A city auto-closes visually when `remaining === 0`.

---

## 6. Data model (after)

```
jobs
  id, title, location (string, unchanged),
  vacancies jsonb  [{ city, openings }]          ◄── NEW

batch_tasks
  id, batchId, title, week, target,
  jobId  ───────────────────────────────────────► jobs.id   ◄── NEW

intern_activity_logs   (unchanged)
  joiningStatus = 'joined'
  candidateId ──► training_candidates.currentCity
```

No mutable `filled` column anywhere — fill-rate is always a live COUNT.

---

## 7. The alignment rule (link #3)

For a vacancy to be fillable, the **city on the job post must match
`training_candidates.currentCity` exactly**, and the job's company/profile must match
candidates that exist in the pool. Two ways to guarantee it (decision pending):

- **Option A — dropdowns from candidate data.** When posting a vacancy, company / profile /
  city are dropdowns populated from `training_candidates` (values already exposed by
  `/training-data/admin/companies|profiles|cities`). Guarantees every vacancy maps to real
  callable candidates.
- **Option B — clients post freely.** Recruitment clients post jobs with their own city
  strings; we accept drift and reconcile later. Higher risk of "vacancy with 0 callable
  candidates."

Recommendation: **Option A** for the internship sourcing path.

---

## 8. Risks / guardrails

- Keep `jobs.location` — do not repurpose. ~10 readers depend on it.
- `synchronize:true` (dev) auto-adds the new columns. **Prod needs a migration** — confirm
  before deploy.
- Dup-check `(title, location)` is unaffected by adding `vacancies`.
- Never store `filled` — always derive (§5 Change 3).

---

## 9. Worked example

See the chat / README example: Spinny TeleSales across Delhi/Agra/Mumbai/Patna,
2 interns, candidates marked Joined, fill-rate recomputed live.
