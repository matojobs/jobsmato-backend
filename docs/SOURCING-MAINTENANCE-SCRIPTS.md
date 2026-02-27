# Sourcing DataLake Maintenance Scripts

SQL scripts for regular maintenance of the sourcing DataLake module.

---

## Weekly Maintenance Script

**Run:** Every Sunday at 2 AM  
**Purpose:** Update query planner statistics

```sql
-- ============================================
-- WEEKLY: Analyze Tables
-- ============================================
-- Updates query planner statistics
-- Run: Every Sunday 2 AM

ANALYZE sourcing.applications;
ANALYZE sourcing.candidates;
ANALYZE sourcing.recruiters;
ANALYZE sourcing.portals;
ANALYZE sourcing.job_roles;

-- Analyze all partitions
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT schemaname, tablename 
    FROM pg_tables 
    WHERE schemaname = 'sourcing' 
      AND tablename LIKE '%_2026_%'
  LOOP
    EXECUTE format('ANALYZE %I.%I', r.schemaname, r.tablename);
  END LOOP;
END $$;
```

---

## Monthly Maintenance Scripts

### 1. Create Partitions

**Run:** 1st of every month at 2 AM

```sql
-- Create next month's partitions
SELECT sourcing.create_monthly_partition('raw_candidate_logs', CURRENT_DATE + INTERVAL '1 month');
SELECT sourcing.create_monthly_partition('applications', CURRENT_DATE + INTERVAL '1 month');
```

### 2. Check Bloat

**Run:** After partition creation

```sql
-- Check table bloat
SELECT * FROM sourcing.detect_table_bloat()
WHERE dead_tuple_percent > 10
ORDER BY dead_tuple_percent DESC;

-- Check partition sizes
SELECT * FROM sourcing.get_partition_sizes()
ORDER BY size_bytes DESC;
```

### 3. Vacuum Old Partitions

**Run:** After checking bloat

```sql
-- Vacuum partitions older than 3 months
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'sourcing' 
      AND (
        tablename LIKE 'raw_candidate_logs_%' 
        OR tablename LIKE 'applications_%'
      )
      AND tablename < 'raw_candidate_logs_' || to_char(CURRENT_DATE - INTERVAL '3 months', 'YYYY_MM')
  LOOP
    EXECUTE format('VACUUM ANALYZE sourcing.%I', r.tablename);
  END LOOP;
END $$;
```

---

## Quarterly Maintenance

### Reindex (if needed)

**Run:** Only if bloat > 30% or index usage is low

```sql
-- Check index usage first
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
  CASE 
    WHEN idx_scan = 0 THEN 'UNUSED'
    WHEN idx_scan < 100 THEN 'LOW USAGE'
    ELSE 'OK'
  END as usage_status
FROM pg_stat_user_indexes
WHERE schemaname = 'sourcing'
ORDER BY idx_scan ASC, pg_relation_size(indexrelid) DESC;

-- Reindex if needed (CONCURRENTLY to avoid locks)
-- REINDEX TABLE CONCURRENTLY sourcing.applications;
-- REINDEX TABLE CONCURRENTLY sourcing.candidates;
```

---

## Data Integrity Checks

**Run:** Weekly

```sql
-- Check for orphaned applications
SELECT COUNT(*) as orphaned_count
FROM sourcing.detect_orphaned_applications();

-- Detailed orphan report
SELECT * FROM sourcing.detect_orphaned_applications()
LIMIT 100;

-- Check for duplicate normalized phones
SELECT 
  normalized_phone,
  COUNT(*) as duplicate_count,
  array_agg(id) as candidate_ids
FROM sourcing.candidates
WHERE normalized_phone IS NOT NULL
GROUP BY normalized_phone
HAVING COUNT(*) > 1;

-- Check batch status
SELECT 
  batch_id,
  status,
  total_records,
  success_count,
  failure_count,
  started_at,
  completed_at,
  CASE 
    WHEN completed_at IS NOT NULL 
    THEN EXTRACT(EPOCH FROM (completed_at - started_at))::INTEGER
    ELSE NULL
  END as duration_seconds
FROM sourcing.import_batches
ORDER BY started_at DESC
LIMIT 20;
```

---

## Performance Monitoring

```sql
-- Check slow queries (requires pg_stat_statements)
SELECT
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  max_exec_time
FROM pg_stat_statements
WHERE schemaname = 'sourcing'
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'sourcing'
ORDER BY idx_scan DESC;

-- Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size,
  n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'sourcing'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## Partition Cleanup Script

**Run:** Monthly, after backup

```sql
-- Archive partitions older than retention period
DO $$
DECLARE
  retention_months INTEGER := 12; -- Keep 12 months of data
  archive_path TEXT := '/archive/sourcing/';
  partition_date DATE;
  r RECORD;
BEGIN
  partition_date := CURRENT_DATE - (retention_months || ' months')::INTERVAL;
  
  -- Archive raw_candidate_logs partitions
  FOR r IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'sourcing' 
      AND tablename LIKE 'raw_candidate_logs_%'
      AND tablename < 'raw_candidate_logs_' || to_char(partition_date, 'YYYY_MM')
    ORDER BY tablename
  LOOP
    -- Export to CSV
    EXECUTE format(
      'COPY sourcing.%I TO %L WITH (FORMAT csv, HEADER true)',
      r.tablename,
      archive_path || r.tablename || '.csv'
    );
    
    -- Detach partition
    EXECUTE format(
      'ALTER TABLE sourcing.raw_candidate_logs DETACH PARTITION sourcing.%I',
      r.tablename
    );
    
    RAISE NOTICE 'Archived partition: %', r.tablename;
  END LOOP;
  
  -- Archive applications partitions (similar logic)
END $$;
```

---

## Cron Job Setup

```bash
# Add to crontab (crontab -e)

# Weekly analyze (Sunday 2 AM)
0 2 * * 0 psql -U jobsmato_user -d jobsmato_db -f /path/to/weekly-analyze.sql

# Monthly partition creation (1st of month, 2 AM)
0 2 1 * * psql -U jobsmato_user -d jobsmato_db -c "SELECT sourcing.create_monthly_partition('raw_candidate_logs', CURRENT_DATE + INTERVAL '1 month'); SELECT sourcing.create_monthly_partition('applications', CURRENT_DATE + INTERVAL '1 month');"

# Daily materialized view refresh (3 AM)
0 3 * * * psql -U jobsmato_user -d jobsmato_db -c "SELECT sourcing.refresh_recruiter_stats();"
```
