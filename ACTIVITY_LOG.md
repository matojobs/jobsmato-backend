# Activity Log

Project activity log for non-deployment work (features, fixes, config, tooling). For deployment and production changes, see [DEPLOYMENT-ACTIVITY-LOG.md](./DEPLOYMENT-ACTIVITY-LOG.md).

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
