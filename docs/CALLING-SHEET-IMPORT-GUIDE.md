# Calling Sheet Import – Sourcing Datalake

This guide covers importing **Candidate Sourcing Data February 2026 - Calling sheet.csv** into the sourcing datalake and creating the six recruiters with candidates assigned by the "Recruiter Name" column.

## Recruiters created

| CSV "Recruiter Name" | Email |
|----------------------|--------|
| Madhuri | Madhuri@jobsmato.com |
| Palak | Palak@jobsmato.com |
| Arushi | Arushi@jobsmato.com |
| Rashmi | Rashmi@jobsmato.com |
| Rano | Rano@jobsmato.com |
| Ajay / ajay | ajay@jobsmato.com |

Each gets a **user** (role `recruiter`, default password `ChangeMe@123`) and a row in **sourcing.recruiters** so they can log in to the recruiter portal.

## CSV → Datalake mapping

| CSV column | Datalake use |
|------------|----------------|
| Portal | sourcing.portals (e.g. "Work India") |
| Job Role | sourcing.job_roles (role_name; company_id from first company in DB) |
| Assigned Date | applications.assigned_date (DD/MM/YYYY) |
| Recruiter Name | Mapped to recruiter email → applications.recruiter_id |
| Candidate Name | candidates.name |
| Number | candidates.phone (normalized to 10 digits); used for dedup |
| Call Date | applications.call_date |
| Call Status | applications.call_status (Busy=1, RNR=2, Connected=3, Wrong Number=4) |
| Interested | applications.interested (Not Interested=2, etc.) |
| Not Interested Remark, Notes | applications.notes |
| Email ID | candidates.email |

## Script

**Path:** `scripts/import-calling-sheet-to-datalake.js`

**Prerequisites**

- Node 18+
- `.env` with DB connection (same as app: `PG_HOST`, `PG_USER`, `PG_PASSWORD`, `PG_DATABASE`, or `DATABASE_URL`)
- At least one row in **companies** (used for job_roles.company_id)
- Sourcing schema and migrations applied (sourcing.recruiters, portals, job_roles, candidates, applications, partitions, helpers)

**Usage (from repo root)**

```bash
# 1. Validate CSV and column mapping (no DB)
node scripts/import-calling-sheet-to-datalake.js "Candidate Sourcing Data Feburary 2026 - Calling sheet.csv" --parse-only

# 2. Dry run (DB: create recruiters only, no application inserts; uses DB)
node scripts/import-calling-sheet-to-datalake.js "Candidate Sourcing Data Feburary 2026 - Calling sheet.csv" --dry-run

# 3. Test with first 100 rows
node scripts/import-calling-sheet-to-datalake.js "Candidate Sourcing Data Feburary 2026 - Calling sheet.csv" --limit=100

# 4. Full import (~14k rows)
node scripts/import-calling-sheet-to-datalake.js "Candidate Sourcing Data Feburary 2026 - Calling sheet.csv"
```

**Options**

- `--parse-only` – Print column indices and recruiter names from CSV; no DB connection.
- `--dry-run` – Connect to DB, create recruiters/users if missing, but do not insert candidates or applications.
- `--limit=N` – Process only the first N data rows.

## What the script does

1. **Recruiters**  
   For each of the six emails: if the user does not exist, creates a **users** row (recruiter, default password). If the **sourcing.recruiters** row does not exist, creates it (name + email). So each recruiter can log in and see their data.

2. **Portals**  
   Inserts distinct **Portal** values into **sourcing.portals** (e.g. "Work India").

3. **Job roles**  
   Uses the first **companies.id** and inserts distinct **Job Role** values into **sourcing.job_roles** (company_id, role_name).

4. **Candidates**  
   Deduplicates by normalized phone (10 digits). Inserts into **sourcing.candidates** (name, phone, email from "Email ID"); phone_hash is set by DB trigger.

5. **Applications**  
   For each CSV row: resolves recruiter_id (from "Recruiter Name" → email → sourcing.recruiters), candidate_id (by phone), job_role_id (company + "Job Role"); ensures the monthly partition for **assigned_date** exists; inserts into **sourcing.applications** (assigned_date, call_date, call_status, interested, notes).

6. **Partitions**  
   Calls `sourcing.create_monthly_partition('applications', assigned_date)` for each month present in the data (e.g. Dec 2025, Jan 2026, Feb 2026).

## After import

- Recruiters log in at the recruiter portal with their email and `ChangeMe@123` (they should change password).
- Each recruiter sees only applications where **recruiter_id** matches their **sourcing.recruiters** row (by email).
- If candidate or phone columns look wrong, run `--parse-only` and check the printed column indices; adjust the script’s `col()` usage if your CSV layout differs.
