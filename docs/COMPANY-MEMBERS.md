# Company Members (Multiple Users per Company)

One company can have **multiple users** with access. This is implemented via a join table `company_members` and backward‑compatible with the existing **primary owner** on `companies.userId`.

## Model

- **`companies.userId`** – Primary owner (unchanged). One user can still be the “main” owner.
- **`company_members`** – Join table: `(companyId, userId, role)` with roles: `owner`, `admin`, `member`.
- Every existing company has its primary owner backfilled into `company_members` with role `owner`.

**Access rule:** A user can manage a company if they are the primary owner (`companies.userId`) **or** they have a row in `company_members` for that company.

## API

- **`GET /api/companies/:id/members`** – List members (auth: employer/admin, must have access to the company).
- **`POST /api/companies/:id/members`** – Add a member (auth: owner or admin only). Body: `{ "userId"?: number, "email"?: string, "role": "admin" | "member" }`. Provide either `userId` or `email`.

Only the primary owner can assign the `owner` role; only owners and admins can add members.

## Behaviour changes

- **Companies:** Update/delete allowed if the user has access (primary owner or member).
- **Jobs:** Create uses the first company the user has access to. Update/delete/getMyJobs use all companies the user can access.
- **Applications:** View/update application status allowed if the user has access to the job’s company.

## Migration

- **File:** `src/migrations/1700000000022-CreateCompanyMembersTable.ts` (creates `company_members` and backfills owners).
- **Run all pending migrations:** `npm run build && node scripts/run-migrations.js` (from repo root; uses your DB config).
- If your DB already has all previous migrations applied and you only need this one, run the SQL from the migration file manually, or run the single migration (e.g. by temporarily moving other migration files aside). In **development** with `synchronize: true`, TypeORM may create the `company_members` table from the entity; for production, run the migration.
