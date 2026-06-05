# Phase 1 — Acceptance Test (run after deploy + migration)

Run these against prod Postgres (`jobsmato_postgres`, db `jobsmato_db`) to confirm
the analytics foundation is correct before building Phases 2–4 on top.

## 1. Migration applied
```sql
-- columns exist
SELECT column_name FROM information_schema.columns
WHERE table_schema='sourcing' AND table_name='applications'
  AND column_name IN ('connected_date','interested_date','selection_date','rejection_date');
-- expect 4 rows

-- view exists
SELECT 1 FROM pg_views WHERE schemaname='sourcing' AND viewname='v_application_facts';
```

## 2. Backfill sanity
```sql
SELECT
  COUNT(*) FILTER (WHERE selection_status=1) AS selected_rows,
  COUNT(*) FILTER (WHERE selection_status=1 AND selection_date IS NOT NULL) AS selected_with_date,
  COUNT(*) FILTER (WHERE joining_status=1) AS joined_rows,
  COUNT(*) FILTER (WHERE joining_status=1 AND joining_date IS NOT NULL) AS joined_with_date
FROM sourcing.applications;
-- selected_with_date should ≈ selected_rows; joined_with_date should ≈ joined_rows
```

## 3. View totals vs raw (one month) — must match
```sql
-- via the view (what the API returns)
SELECT
  COUNT(*) FILTER (WHERE is_joined AND joining_date BETWEEN '2026-05-01' AND '2026-05-31') AS joined_may
FROM sourcing.v_application_facts;

-- raw cross-check
SELECT COUNT(*) FROM sourcing.applications
WHERE joining_status=1 AND joining_date BETWEEN '2026-05-01' AND '2026-05-31';
-- two numbers must be identical
```

## 4. API parity (the core goal)
Pick one recruiter_id R and month M. All three must return the SAME joined count:
```
GET /api/admin/analytics/funnel?from=M-01&to=M-31&recruiter_id=R
GET /api/admin/recruiter-performance/mtd?month=M     (that recruiter's row, total_joining)
GET /api/recruiter/analytics/funnel?from=M-01&to=M-31   (logged in as recruiter R)
```

## 5. IST boundary
Find an application updated ~23:30 IST and confirm its event date lands on the
IST calendar day (not the UTC next-day). Spot check:
```sql
SELECT id, joining_date, updated_at,
       (updated_at AT TIME ZONE 'Asia/Kolkata')::date AS ist_day,
       (updated_at AT TIME ZONE 'UTC')::date          AS utc_day
FROM sourcing.applications
WHERE joining_status=1 ORDER BY updated_at DESC LIMIT 10;
```

If all five pass, Phase 1 is solid — proceed to the frontend cutover (dual-run
old client numbers vs new endpoint for ~1 week, then remove the client engine).
