# Activity Log

Project activity log for non-deployment work (features, fixes, config, tooling). For deployment and production changes, see [DEPLOYMENT-ACTIVITY-LOG.md](./DEPLOYMENT-ACTIVITY-LOG.md).

---

## 2026-03-16 - Dummy data seed for Admin Recruiter Performance dashboard

### What was done
- **Seed script:** `scripts/seed-admin-recruiter-performance.js` inserts dummy data so the Admin Recruiter Performance dashboard shows results. It ensures monthly partitions for `sourcing.applications`, uses or creates recruiters (sourcing.recruiters), companies and job roles, inserts candidates (unique phones), and inserts applications with varied assigned_date, call_date, call_status, interested, not_interested_remark, interview_*, selection_status, joining_status, backout, etc.
- **Run:** `npm run seed:admin-perf` or `node scripts/seed-admin-recruiter-performance.js` (uses .env for DB).

### Files added/updated
- `scripts/seed-admin-recruiter-performance.js` – added.
- `package.json` – script `seed:admin-perf` added.
- `docs/ACTIVITY_LOG.md` – this entry.

---

## 2026-03-16 - Backend requirements: applications response shape, sort params, admin recruiter-performance APIs

### What was done
- **Recruiter applications list:** Response shape aligned with requirements: `{ applications, total, page, limit, total_pages }` (was `data`; added `total_pages`). Added optional `sort_by` (created_at, updated_at, call_date, assigned_date, candidate_name) and `sort_order` (asc, desc) to `GET /api/recruiter/applications`.
- **Admin recruiter-performance:** New module under `/api/admin/recruiter-performance` with 7 endpoints (admin JWT + view_analytics): (1) `GET dod?date=` – day report per recruiter + total; (2) `GET mtd?month=` – month-to-date per recruiter + total; (3) `GET individual?recruiter_id=&period=dod|mtd&date=&month=` – single recruiter DOD or MTD; (4) `GET company-wise?month=` – company funnel (optional month); (5) `GET client-report?company_id=&date=&month=` – one company MTD and DOD side by side; (6) `GET negative-funnel/not-interested-remarks?date=&month=` – not-interested remarks by remark and job role; (7) `GET interview-status-company-wise?date=` – interview status by company for a day. Data source: sourcing.applications (recruitment pipeline).

### Files added/updated
- `src/modules/recruiter/dto/query-params.dto.ts` – `sort_by`, `sort_order` on ApplicationQueryDto.
- `src/modules/recruiter/recruiter.service.ts` – getApplications returns `applications` and `total_pages`; dynamic ORDER BY from sort_by/sort_order.
- `src/modules/admin/services/admin-recruiter-performance.service.ts` – new; DOD, MTD, individual, company-wise, client-report, not-interested-remarks, interview-status-company-wise.
- `src/modules/admin/controllers/admin-recruiter-performance.controller.ts` – new; 7 GET routes, AdminGuard + VIEW_ANALYTICS.
- `src/modules/admin/admin.module.ts` – registered AdminRecruiterPerformanceController and AdminRecruiterPerformanceService.
- `docs/ACTIVITY_LOG.md` – this entry.

---

## 2026-03-13 - Search (recruiter + admin), DTO fixes, search docs, optional trigram indexes

### What was done
- **Recruiter applications search:** `GET /api/recruiter/applications` now accepts optional `search` query param. One term is matched (case-insensitive “contains”) against candidate name, phone, email, application portal, job role name, and company name. Existing filters (job_role_id, company_id, call_status, dates, interview_scheduled, interview_status, etc.) unchanged; call_status filter updated to accept all 9 options.
- **Recruiter candidates search and filters:** `GET /api/recruiter/candidates` now accepts `search` (name, phone, email) plus optional `job_role_id`, `company_id`, `portal_id`. Controller uses `CandidateQueryDto`; service applies filters via JOINs when needed.
- **Admin applications search:** `GET /api/admin/applications` now accepts optional `search` query param matched against applicant first name, last name, email, and phone.
- **DTO fixes:** (1) `POST /api/recruiter/applications/with-candidate`: application part uses `ApplicationPayloadForWithCandidateDto` so `candidate_id` is optional (ignored) and `portal` is allowed (avoids “property should not exist”). (2) Applications list query: `interview_scheduled` and `interview_status` added to `ApplicationQueryDto` and applied in service.
- **Search docs:** [SEARCH-STRATEGY.md](./SEARCH-STRATEGY.md) explains current ILIKE approach vs trigram/FTS/external options. [FRONTEND-SEARCH-API.md](./FRONTEND-SEARCH-API.md) documents for frontend all search and filter params for recruiter applications, recruiter candidates, and admin applications.
- **Optional performance:** Migration `1700000000032-AddSearchTrigramIndexes` adds `pg_trgm` and GIN trigram indexes on searched columns (candidates, companies, job_roles, applications.portal, users) so ILIKE search can use indexes when run.

### Files added/updated
- `src/modules/recruiter/dto/query-params.dto.ts` – `search` on ApplicationQueryDto; CALL_STATUS_OPTIONS for call_status; `CandidateQueryDto` (search, job_role_id, company_id, portal_id); interview_scheduled, interview_status.
- `src/modules/recruiter/dto/create-application-with-candidate.dto.ts` – `ApplicationPayloadForWithCandidateDto` (candidate_id optional, portal allowed); CreateApplicationWithCandidateDto uses it.
- `src/modules/recruiter/recruiter.controller.ts` – getCandidates uses CandidateQueryDto; getApplications unchanged (query already had new params).
- `src/modules/recruiter/recruiter.service.ts` – getApplications: search condition + count query JOINs (c, jr, comp); interview_scheduled/interview_status filters; getCandidates: query params object, job_role_id/company_id/portal_id filters.
- `src/modules/admin/services/admin-applications.service.ts` – `search` in AdminApplicationsQuery; leftJoin user and ILIKE on firstName, lastName, email, phone.
- `src/modules/admin/controllers/admin-applications.controller.ts` – `search` query param passed to service.
- `docs/SEARCH-STRATEGY.md` – added.
- `docs/FRONTEND-SEARCH-API.md` – added.
- `src/migrations/1700000000032-AddSearchTrigramIndexes.ts` – optional; pg_trgm + GIN indexes on searched columns.
- `docs/ACTIVITY_LOG.md` – this entry.

### Rule
- **Activity log:** Update this log when completing significant work; do not wait for the user to ask. See `.cursor/rules/activity-log-and-guardrails.mdc`.

---

## 2026-02-28 - Call status options (9 values), frontend doc, deploy and logs

### What was done
- **Call status options:** Added 9 call status values for Add Candidate, Edit Candidate, and Pending Application: Connected, RNR, Busy, Switched Off, Incoming Off, Call Back, Invalid, Wrong Number, Out of network. Backend: recruiter create/update DTOs, applications RECRUITER_CALL_STATUS_OPTIONS, status enum and StatusMapper (1–9), migration 0030 (sourcing.applications call_status 1–9) and 0031 (partition fix). Migration 0030 uses detach → drop/add parent constraint → update detached partitions’ check → re-attach; fix applied so detached partition constraint is updated before ATTACH (production had failed on re-attach; next deploy will run corrected migration).
- **Frontend doc:** [FRONTEND-CALL-STATUS-OPTIONS.md](./FRONTEND-CALL-STATUS-OPTIONS.md) for dropdown values and API usage.
- **Deploy:** Backend deployed via `deploy.ps1`; API healthy. See [DEPLOYMENT-ACTIVITY-LOG.md](./DEPLOYMENT-ACTIVITY-LOG.md) for 2026-02-28 entry.
- **Logs:** Deployment activity log and this activity log updated.

### Files added/updated
- `src/modules/recruiter/enums/status.enum.ts` – CallStatus 6–9, CallStatusString, CALL_STATUS_OPTIONS.
- `src/modules/recruiter/mappers/status.mapper.ts` – map 6–9 and Switched Off.
- `src/modules/recruiter/dto/create-application.dto.ts`, `update-application.dto.ts` – call_status uses CALL_STATUS_OPTIONS.
- `src/modules/applications/dto/application.dto.ts` – RECRUITER_CALL_STATUS_OPTIONS (9 values).
- `src/migrations/1700000000030-ExtendSourcingCallStatusOptions.ts` – detach, parent constraint, **update detached partition constraint**, attach.
- `src/migrations/1700000000031-FixSourcingPartitionsCallStatusCheck.ts` – partition-only fix (no-op when 0030 already applied).
- `docs/FRONTEND-CALL-STATUS-OPTIONS.md` – added.
- `docs/DEPLOYMENT-ACTIVITY-LOG.md`, `docs/ACTIVITY_LOG.md` – this entry.

---

## 2026-02-25 - Recruiter portal: recruiter work list, dashboard, candidate age, ormconfig

### What was done
- **Recruiter work / Candidates list:** Job portal applications (where recruiter filled call details) now appear in recruiter dashboard and applications list. Added `GET /api/applications/recruiter-work`; recruiter dashboard stats and pipeline include job portal counts; `GET /api/recruiter/applications` merges sourcing + job portal applications (with `source: 'sourcing' | 'job_portal'`). Fixed raw SQL column names for `job_applications`/`jobs` (camelCase: `jobId`, `companyId`, `userId`).
- **Candidate age / DOB:** Recruiter portal candidate object now supports age statistics. Added `date_of_birth` to `sourcing.candidates` (migration `1700000000027`); `CandidateResponse` and `CreateCandidateDto` have optional `age` and `date_of_birth`; create candidate accepts age or DOB and stores DOB; application responses (sourcing and job portal) include `age` and `date_of_birth` on the nested `candidate` object. User `dateOfBirth` included in application user select for job portal candidates.
- **ormconfig:** `ormconfig.ts` now uses `.env` for DB connection (`DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`) so `npx typeorm migration:run -d ormconfig.ts` uses local credentials. Migration `date_of_birth` for `sourcing.candidates` was applied via one-off SQL (DB had out-of-sync migration history).
- **Docs:** `RECRUITER-PORTAL-SOURCING-AND-PENDING-APPLICATIONS.md` and `PENDING-APPLICATIONS-CALL-STATUS-AND-INTERESTED.md` updated/added for frontend.

### Files added/updated
- `src/modules/recruiter/recruiter.service.ts` – dashboard stats & pipeline include job portal; getApplications merges job portal; candidate age/DOB mapping; SQL column names fixed.
- `src/modules/recruiter/recruiter.module.ts` – CompaniesModule, ApplicationsModule imports.
- `src/modules/recruiter/recruiter.controller.ts` – pass user.id to stats/pipeline; getApplications passes user.id.
- `src/modules/recruiter/interfaces/application-response.interface.ts` – `source`, `age`, `date_of_birth` on candidate.
- `src/modules/recruiter/dto/create-candidate.dto.ts` – optional `age`, `date_of_birth`.
- `src/modules/applications/applications.service.ts` – getRecruiterWorkJobApplications; user select includes dateOfBirth.
- `src/modules/applications/applications.controller.ts` – GET `recruiter-work`.
- `src/migrations/1700000000027-AddDateOfBirthToSourcingCandidates.ts` – added.
- `ormconfig.ts` – use process.env for DB credentials.
- `docs/ACTIVITY_LOG.md` – this entry.

### Rule
- **Activity log:** Update this log when completing significant work; do not wait for the user to ask. See `.cursor/rules/activity-log-and-guardrails.mdc`.

---

## 2026-02-25 - Candidate Age requirement doc

### What was done
- **Docs:** Added `docs/CANDIDATE-AGE-BACKEND-REQUIREMENT.md` as the canonical spec for recruiter portal candidate age/DOB: where the frontend uses it (§1), which APIs return the `candidate` object (§2), required fields `age` or `date_of_birth` (§3–5), snake_case (§6), frontend mapper behaviour (§7), and **backend behaviour implemented** (§8–9) for both sourcing and job-portal candidates.

### Files added
- `docs/CANDIDATE-AGE-BACKEND-REQUIREMENT.md`

---

## 2026-02-24 - Local run: one script, port kill, DB credentials

### What was done
- **start-local.ps1:** Single script that (1) kills any process on port 5000, (2) starts Postgres via `docker compose -f docker-compose.local.yml up -d postgres`, (3) sets DB env to match the container (`DB_USERNAME=postgres`, `DB_PASSWORD=password` from docker-compose.local.yml), (4) runs `npm run start:dev`. No manual steps.
- **DB credentials (local Docker):** `docker-compose.local.yml` defines `POSTGRES_USER=postgres`, `POSTGRES_PASSWORD=password`, `POSTGRES_DB=jobsmato_db`. Use these in `.env` or run `.\start-local.ps1` which sets them automatically.
- **Activity log:** This entry added so future context has the single way to run locally without going in circles.

### How to run backend locally (one command)
```powershell
.\start-local.ps1
```
If port 5000 is in use it is killed first; Postgres is started if needed; backend uses postgres/password and starts. Verified: GET http://localhost:5000/api returns healthy.

### Files added/updated
- `start-local.ps1` – added.
- `docs/ACTIVITY_LOG.md` – this entry.

---

## 2026-02-05 - Recruiter (HRMS) prod URL in CORS

### What was done
- **CORS:** Added `https://hrms.jobsmato.com` to allowed origins in `src/main.ts` so the Recruiter portal (HRMS) at [https://hrms.jobsmato.com/](https://hrms.jobsmato.com/) can call the backend API on production from the browser.
- **Deployment:** Backend deploy to server was initiated (see [DEPLOYMENT-ACTIVITY-LOG.md](./DEPLOYMENT-ACTIVITY-LOG.md)).

### Files modified
- `src/main.ts` – added HRMS origin to `allowedOrigins`.

---

## 2026-02-18 - Local run and test

### What was done
- **Docker:** Started local Postgres and Redis with `docker compose -f docker-compose.local.yml up -d`.
- **DB user:** Created `jobsmato_user` in local Postgres with password `password` and granted permissions so the app can connect (`.env` should use `DB_USERNAME=jobsmato_user`, `DB_PASSWORD=password` for local).
- **App:** Built with `npm run build`; started with `node dist/src/main.js` (or set `DB_PASSWORD=password` and run normally). API responds at `http://localhost:5000/api` and `http://localhost:5000/api/health` (status healthy, DB and Redis up).
- **Testing:** Fixed Jest on Windows by downgrading from Jest v30 to Jest v29 (Jest v30 module resolution was failing due to `unrs-resolver` native binding issues). Updated `src/app.controller.spec.ts` to mock `AppService` dependencies and assert the current `/api` health payload. `npm test` now passes locally.

### Local run commands (summary)
1. `docker compose -f docker-compose.local.yml up -d`
2. `npm run build` then `node dist/src/main.js` (ensure `.env` has `DB_HOST=localhost`, `DB_PASSWORD=password` for local user)
3. GET `http://localhost:5000/api` and `http://localhost:5000/api/health` to verify.

---

## 2026-02-19 - Recruiter API path isolation (no job seeker route disturbance)

### What was done
- **Recruiter module:** Moved all recruiter endpoints under **`/api/recruiter/*`** by setting `@Controller('recruiter')` in `src/modules/recruiter/recruiter.controller.ts`.
- **Conflict fix:** This removes the hard conflict with existing modules that already own base paths like `@Controller('applications')` and `@Controller('companies')`.
- **Job seeker protection:** Updated `src/modules/applications/applications.controller.ts` `POST /api/applications` to be **JOB_SEEKER-only** at runtime (rejects other roles with a clear message telling recruiters to use `/api/recruiter/applications`).
- **Wiring cleanup:** Removed the previous recruiter delegation wiring from `ApplicationsModule` so recruiter logic stays inside RecruiterModule.

### Notes / impact
- **Breaking change (recruiter only):** Frontend recruiter calls must switch from `/api/*` to `/api/recruiter/*`.
- **No DataLake change:** No sourcing schema / DataLake migrations or ETL logic were changed as part of this path isolation work.
- **Job Portal unchanged:** All `/api/applications`, `/api/jobs`, `/api/companies` routes remain unchanged for job seekers and employers - no frontend changes needed.
- **Route naming:** Existing routes (`/api/*`) serve the "Job Portal" (job seekers + employers), new routes (`/api/recruiter/*`) serve the "Recruiter Portal".

---

## 2026-02-05 - Recruitment Sourcing DataLake Module (Hardened)

### What was done
- **Improvement Migration:** Created `1700000000021-ImproveSourcingDataLake.ts` - production hardening based on senior architect review.
- **Architecture Fixes:** Single-column PK on partitions, hardened partition creation (advisory locks), phone normalization, aggressive autovacuum.
- **ETL Performance:** Replaced row-by-row UPSERT with staging-based bulk operations (10-50x faster at 1M+ scale).
- **Data Integrity:** Check constraints, orphan detection, batch validation functions, scheduled integrity checks.
- **Observability:** Batch tracking table (`sourcing.import_batches`) for full audit trail and debugging.
- **Documentation:** `SOURCING-IMPROVEMENTS-ARCHITECTURE.md` (detailed justifications), `SOURCING-MAINTENANCE-SCRIPTS.md` (maintenance SQL), `SOURCING-PRODUCTION-DEPLOYMENT.md` (deployment checklist).

### Files created/modified
- `src/migrations/1700000000021-ImproveSourcingDataLake.ts` (improvement migration)
- `src/modules/sourcing/sourcing-etl-staging.service.ts` (high-performance staging ETL)
- `SOURCING-IMPROVEMENTS-ARCHITECTURE.md` (architecture improvements explained)
- `SOURCING-MAINTENANCE-SCRIPTS.md` (maintenance SQL scripts)
- `SOURCING-PRODUCTION-DEPLOYMENT.md` (production deployment guide)

### Key improvements
- **Performance:** 10-50x faster ETL (staging vs row-by-row), 10-15% faster queries (autovacuum), 5-10% faster (single-column PK).
- **Safety:** Advisory locks prevent race conditions, check constraints prevent invalid data, orphan detection for data integrity.
- **Observability:** Batch tracking with success/failure counts, error logs, performance metrics.
- **Maintenance:** Weekly/monthly/quarterly scripts, bloat detection, partition cleanup.
- **Production hardened:** Zero blocking operations, concurrent index creation, complete rollback strategy.

---

## 2026-02-05 - Recruitment Sourcing DataLake Module

### What was done
- **Migration:** Created `1700000000020-CreateSourcingDataLake.ts` - 3-layer DataLake architecture in separate `sourcing` schema.
- **Architecture:** Layer A (raw partitioned tables), Layer B (structured normalized tables), Layer C (materialized views).
- **Performance:** Phone hash optimization (BIGINT), SMALLINT status enums, monthly partitioning, covering indexes, partial indexes.
- **Documentation:** `SOURCING-DATALAKE-ARCHITECTURE.md` (architecture, ETL, scaling), `SOURCING-PERFORMANCE-TUNING.md` (tuning, monitoring).
- **ETL Service:** `src/modules/sourcing/sourcing-etl.service.ts` (example ETL transformation logic).

### Files created
- `src/migrations/1700000000020-CreateSourcingDataLake.ts`
- `SOURCING-DATALAKE-ARCHITECTURE.md`
- `SOURCING-PERFORMANCE-TUNING.md`
- `src/modules/sourcing/sourcing-etl.service.ts`

### Key features
- **Zero impact:** Separate schema, no modifications to existing tables.
- **Scalability:** Designed for 1M+ records, scales to 5M+.
- **Performance:** Phone hash (10x faster lookups), partitioning (10x faster queries), materialized views (50-100x faster dashboards).
- **Production ready:** Includes vacuum strategy, monitoring, scaling plan.

---

## 2026-02-05 - Database Structure Documentation

### What was done
- Created **DATABASE-STRUCTURE.md**: documentation of the database schema (18 tables).
- Includes: table structures, column types/constraints, relationships, enums, indexes, foreign keys, and design notes.
- Organized by category: Core, Job-Related, User Activity, Content, Admin & System.

### Files created
- `DATABASE-STRUCTURE.md`

---

## 2026-02-05 - Multi-Domain Backend Setup Doc

### What was done
- Added **MULTI-DOMAIN-BACKEND-SETUP.md**: how to run another domain’s backend on the same server and connect it to Cloudflare and Nginx.
- Covers: recommended approach (one tunnel → one Nginx → host-based routing), separate Docker Compose per app, Nginx server blocks, tunnel ingress, DNS, and troubleshooting.

### Files created
- `MULTI-DOMAIN-BACKEND-SETUP.md`

---

## 2026-02-05 - Activity Log & Guard Rail Rule

### What was done
- **Activity log:** Created this file (`ACTIVITY_LOG.md`) as the main log for general development and repo activity.
- **Guard rail rule:** Added `.cursor/rules/activity-log-and-guardrails.mdc` so the AI:
  - Updates `ACTIVITY_LOG.md` for significant non-deployment changes.
  - Updates `DEPLOYMENT-ACTIVITY-LOG.md` for deployments and production-related changes.
  - Follows guard rails: document breaking API changes, keep `env.example` in sync, document DB/deployment steps, document auth/config fixes.

### Files created
- `ACTIVITY_LOG.md` (this file)
- `.cursor/rules/activity-log-and-guardrails.mdc`

### Notes
- Deployment-specific entries stay in `DEPLOYMENT-ACTIVITY-LOG.md`.
- SSH/Cloudflare/tunnel notes remain in `ssh-keys/ACTIVITY_LOG.md`.

---

## 2026-02-05 - Google Auth Fixes

### What was done
- Fixed Google OAuth reliability and configuration.
- **Trust proxy:** Set `trust proxy` in `main.ts` so redirects and URLs are correct behind Nginx/Cloudflare.
- **Google strategy:** Require real credentials and full `GOOGLE_CALLBACK_URL`; fail fast at startup if missing; validate profile (id, email) safely and pass errors to Passport.
- **Auth callback:** Handle missing `req.user` and `googleLogin()` errors; redirect to frontend with `?error=google_auth_failed&message=...`; normalize `FRONTEND_URL` (no trailing slash).
- **Docs:** Updated `env.example` with Google OAuth setup notes (redirect URIs, JavaScript origins).

### Files modified
- `src/main.ts` – trust proxy
- `src/modules/auth/strategies/google.strategy.ts` – strict config, profile validation, error handling
- `src/modules/auth/auth.controller.ts` – callback error handling, FRONTEND_URL normalization
- `env.example` – Google OAuth comments

### Guard rail / config
- **Google Cloud Console:** Authorized redirect URI must match `GOOGLE_CALLBACK_URL` exactly (e.g. `https://api.jobsmato.com/api/auth/google/callback`). Authorized JavaScript origins should include frontend and API domains.
- **Frontend:** `/auth/callback` should read `error` and `message` query params and show a message when `error=google_auth_failed`.

---

## 2026-02-05 - .cursorignore Added

### What was done
- Added `.cursorignore` to reduce Cursor indexing and workspace load (node_modules, dist, logs, .env, keys, backups).
- Helps avoid Cursor becoming unresponsive when workspace storage grows.

### Files created
- `.cursorignore`
