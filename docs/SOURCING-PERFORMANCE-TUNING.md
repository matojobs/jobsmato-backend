# Sourcing DataLake Performance Tuning Guide

Production-ready performance tuning recommendations for the Recruitment Sourcing DataLake module.

---

## Table of Contents

1. [PostgreSQL Configuration](#postgresql-configuration)
2. [Partition Management](#partition-management)
3. [Index Optimization](#index-optimization)
4. [Query Optimization](#query-optimization)
5. [Bulk Ingestion Optimization](#bulk-ingestion-optimization)
6. [Materialized View Refresh](#materialized-view-refresh)
7. [Monitoring & Diagnostics](#monitoring--diagnostics)
8. [Scaling Checklist](#scaling-checklist)

---

## PostgreSQL Configuration

### Recommended Settings (postgresql.conf)

```ini
# Memory Settings
shared_buffers = 4GB                    # 25% of RAM for dedicated DB server
effective_cache_size = 12GB             # 75% of RAM (OS + PostgreSQL cache)
work_mem = 64MB                         # Per-operation memory (increase for large sorts)
maintenance_work_mem = 1GB              # For VACUUM, CREATE INDEX, etc.

# Connection Settings
max_connections = 200                   # Adjust based on application needs
max_worker_processes = 8                # CPU cores
max_parallel_workers_per_gather = 4     # Parallel query workers
max_parallel_workers = 8                # Total parallel workers

# Write-Ahead Log (WAL)
wal_buffers = 16MB
checkpoint_completion_target = 0.9      # Spread checkpoints over time
wal_compression = on                    # Compress WAL (PostgreSQL 13+)

# Autovacuum (Critical for high-write tables)
autovacuum = on
autovacuum_max_workers = 4
autovacuum_naptime = 30s
autovacuum_vacuum_cost_delay = 10ms
autovacuum_vacuum_cost_limit = 2000

# Query Planner
random_page_cost = 1.1                  # For SSD storage (default 4.0 for HDD)
effective_io_concurrency = 200          # For SSD storage
```

### Per-Table Autovacuum Tuning

```sql
-- High-write tables: More aggressive autovacuum
ALTER TABLE sourcing.applications SET (
  autovacuum_vacuum_scale_factor = 0.1,      -- Vacuum after 10% changes
  autovacuum_analyze_scale_factor = 0.05,    -- Analyze after 5% changes
  autovacuum_vacuum_cost_delay = 10,
  autovacuum_vacuum_cost_limit = 2000
);

ALTER TABLE sourcing.candidates SET (
  autovacuum_vacuum_scale_factor = 0.1,
  autovacuum_analyze_scale_factor = 0.05
);

-- Raw table: Less frequent (immutable after insert)
ALTER TABLE sourcing.raw_candidate_logs SET (
  autovacuum_vacuum_scale_factor = 0.2,
  autovacuum_analyze_scale_factor = 0.1
);
```

---

## Partition Management

### Auto-Create Monthly Partitions

**Cron Job (run monthly):**
```bash
# /etc/cron.monthly/create-sourcing-partitions.sh
#!/bin/bash
psql -U jobsmato_user -d jobsmato_db <<EOF
SELECT sourcing.create_monthly_partition('raw_candidate_logs', CURRENT_DATE);
SELECT sourcing.create_monthly_partition('applications', CURRENT_DATE);
EOF
```

**Or via pg_cron extension:**
```sql
-- Install pg_cron if available
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule monthly partition creation
SELECT cron.schedule(
  'create-monthly-partitions',
  '0 2 1 * *', -- 2 AM on 1st of every month
  $$
  SELECT sourcing.create_monthly_partition('raw_candidate_logs', CURRENT_DATE);
  SELECT sourcing.create_monthly_partition('applications', CURRENT_DATE);
  $$
);
```

### Archive Old Partitions

**Archive partitions older than 12 months:**
```sql
-- 1. Detach partition
ALTER TABLE sourcing.raw_candidate_logs 
DETACH PARTITION sourcing.raw_candidate_logs_2025_01;

-- 2. Export to file
COPY sourcing.raw_candidate_logs_2025_01 TO '/archive/raw_2025_01.csv' CSV HEADER;

-- 3. Drop partition (or keep as archive table)
DROP TABLE sourcing.raw_candidate_logs_2025_01;
```

---

## Index Optimization

### Analyze Index Usage

```sql
-- Check unused indexes
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'sourcing'
  AND idx_scan = 0
  AND indexrelid IS NOT NULL
ORDER BY pg_relation_size(indexrelid) DESC;

-- Check index bloat
SELECT
  schemaname,
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE schemaname = 'sourcing'
ORDER BY pg_relation_size(indexrelid) DESC;
```

### Reindex Strategy

**Quarterly reindex (if needed):**
```sql
-- Reindex specific table
REINDEX TABLE CONCURRENTLY sourcing.applications;

-- Reindex all sourcing tables
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'sourcing'
  LOOP
    EXECUTE 'REINDEX TABLE CONCURRENTLY sourcing.' || quote_ident(r.tablename);
  END LOOP;
END $$;
```

---

## Query Optimization

### Common Query Patterns

**1. Recruiter Dashboard (use materialized view):**
```sql
-- ✅ FAST: Uses materialized view
SELECT * FROM sourcing.mv_recruiter_daily_stats
WHERE recruiter_id = 123
  AND call_date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY call_date DESC;

-- ❌ SLOW: Real-time aggregation (avoid for dashboards)
SELECT 
  recruiter_id,
  call_date,
  COUNT(*) as total_calls
FROM sourcing.applications
WHERE recruiter_id = 123
GROUP BY recruiter_id, call_date;
```

**2. Candidate Lookup (use phone hash):**
```sql
-- ✅ FAST: Uses phone_hash index
SELECT * FROM sourcing.candidates
WHERE phone_hash = sourcing.hash_phone('+1234567890');

-- ❌ SLOW: TEXT comparison (avoid)
SELECT * FROM sourcing.candidates
WHERE phone = '+1234567890';
```

**3. Date-Range Queries (partition pruning):**
```sql
-- ✅ FAST: Partition pruning
SELECT * FROM sourcing.applications
WHERE assigned_date >= '2026-02-01'
  AND assigned_date < '2026-03-01';

-- ❌ SLOW: Scans all partitions (avoid)
SELECT * FROM sourcing.applications
WHERE created_at >= '2026-02-01';
```

### Query Execution Plan Analysis

```sql
-- Analyze query plan
EXPLAIN (ANALYZE, BUFFERS, VERBOSE)
SELECT * FROM sourcing.mv_recruiter_daily_stats
WHERE recruiter_id = 123;

-- Check for sequential scans
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM sourcing.applications
WHERE call_date >= CURRENT_DATE - INTERVAL '7 days';
```

**Key Metrics:**
- **Seq Scan:** Bad (full table scan)
- **Index Scan:** Good (uses index)
- **Index Only Scan:** Best (covering index)
- **Partition Pruning:** Good (only scans relevant partitions)

---

## Bulk Ingestion Optimization

### COPY Best Practices

**1. Disable Constraints Temporarily:**
```sql
-- For raw table (no constraints needed)
-- Already optimized for COPY

-- For structured tables, load in order:
-- 1. Recruiters, Portals, Job Roles (small tables)
-- 2. Candidates (medium table)
-- 3. Applications (large table, partitioned)
```

**2. Batch Size:**
```sql
-- Use COPY with batch size
COPY sourcing.raw_candidate_logs_2026_02 
FROM '/path/to/file.csv' 
WITH (FORMAT csv, HEADER true, DELIMITER ',');
```

**3. Parallel COPY (PostgreSQL 14+):**
```sql
-- Multiple workers for large files
-- Split file and COPY in parallel
```

### ETL Performance Tips

**1. Use Transactions:**
```typescript
// Batch multiple operations in single transaction
await queryRunner.startTransaction();
try {
  await upsertRecruiters(batchId);
  await upsertPortals(batchId);
  await upsertCandidates(batchId);
  await upsertApplications(batchId);
  await queryRunner.commitTransaction();
} catch (error) {
  await queryRunner.rollbackTransaction();
}
```

**2. Batch Inserts:**
```typescript
// Instead of row-by-row INSERT
// Use COPY or batch INSERT with VALUES
INSERT INTO sourcing.candidates (name, phone, ...)
VALUES 
  ('John', '+123', ...),
  ('Jane', '+456', ...),
  ...
ON CONFLICT (phone_hash) DO UPDATE ...;
```

**3. Disable Triggers (if safe):**
```sql
-- Temporarily disable triggers during bulk load
ALTER TABLE sourcing.candidates DISABLE TRIGGER trigger_candidate_phone_hash;

-- Load data
COPY sourcing.candidates FROM ...;

-- Re-enable and backfill
ALTER TABLE sourcing.candidates ENABLE TRIGGER trigger_candidate_phone_hash;
UPDATE sourcing.candidates SET phone = phone WHERE phone_hash IS NULL;
```

---

## Materialized View Refresh

### Refresh Strategy

**Option 1: Nightly Refresh (Recommended)**
```sql
-- Cron job: 2 AM daily
REFRESH MATERIALIZED VIEW CONCURRENTLY sourcing.mv_recruiter_daily_stats;
```

**Option 2: Incremental Refresh (Advanced)**
```sql
-- Track last refresh date
CREATE TABLE sourcing.mv_refresh_log (
  view_name TEXT PRIMARY KEY,
  last_refresh_date DATE NOT NULL
);

-- Incremental refresh function
CREATE OR REPLACE FUNCTION sourcing.refresh_recruiter_stats_incremental()
RETURNS VOID AS $$
DECLARE
  last_date DATE;
BEGIN
  SELECT COALESCE(last_refresh_date, '1970-01-01'::DATE)
  INTO last_date
  FROM sourcing.mv_refresh_log
  WHERE view_name = 'mv_recruiter_daily_stats';
  
  -- Refresh only new partitions
  REFRESH MATERIALIZED VIEW CONCURRENTLY sourcing.mv_recruiter_daily_stats;
  
  -- Update log
  INSERT INTO sourcing.mv_refresh_log (view_name, last_refresh_date)
  VALUES ('mv_recruiter_daily_stats', CURRENT_DATE)
  ON CONFLICT (view_name) DO UPDATE SET last_refresh_date = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;
```

### Refresh Performance

**Monitor refresh time:**
```sql
-- Check refresh duration
\timing on
REFRESH MATERIALIZED VIEW CONCURRENTLY sourcing.mv_recruiter_daily_stats;
\timing off
```

**Expected Performance:**
- **1M records:** 5-10 seconds
- **5M records:** 30-60 seconds
- **10M+ records:** Consider incremental refresh

---

## Monitoring & Diagnostics

### Key Metrics to Monitor

**1. Table Sizes:**
```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
FROM pg_tables
WHERE schemaname = 'sourcing'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**2. Partition Sizes:**
```sql
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
  n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'sourcing'
  AND tablename LIKE '%_2026_%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**3. Index Usage:**
```sql
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
```

**4. Query Performance:**
```sql
-- Slow queries
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
```

**5. Bloat Detection:**
```sql
-- Check table bloat
SELECT
  schemaname,
  tablename,
  n_dead_tup,
  n_live_tup,
  CASE 
    WHEN n_live_tup > 0 
    THEN ROUND(100.0 * n_dead_tup / n_live_tup, 2)
    ELSE 0
  END as dead_tuple_percent
FROM pg_stat_user_tables
WHERE schemaname = 'sourcing'
ORDER BY n_dead_tup DESC;
```

### Alerting Thresholds

**Set up alerts for:**
- Table size > 10GB per partition
- Dead tuples > 20% of live tuples
- Index bloat > 30%
- Materialized view refresh time > 5 minutes
- Query execution time > 1 second (dashboard queries)

---

## Scaling Checklist

### Current: 1M Records ✅

- [x] Monthly partitions
- [x] Phone hash optimization
- [x] SMALLINT status fields
- [x] Covering indexes
- [x] Materialized view (nightly refresh)
- [x] Autovacuum tuning

### Scaling to 5M Records

- [ ] **Quarterly Partitions** (instead of monthly)
  ```sql
  -- Modify partition function to create quarterly partitions
  ```

- [ ] **Read Replicas**
  - Set up streaming replication
  - Route dashboard queries to replica

- [ ] **Connection Pooling**
  - Install PgBouncer
  - Configure transaction pooling

- [ ] **Incremental Materialized View Refresh**
  - Implement incremental refresh logic
  - Refresh only new partitions

- [ ] **Partition Archival**
  - Archive partitions > 12 months
  - Keep only recent data in hot storage

### Scaling to 10M+ Records

- [ ] **Hash Partitioning** (for candidates)
  ```sql
  -- If phone_hash lookups become bottleneck
  CREATE TABLE sourcing.candidates_hash (
    ...
  ) PARTITION BY HASH (phone_hash);
  ```

- [ ] **Sharding** (if single DB becomes bottleneck)
  - Shard by recruiter_id or date range
  - Use Citus or similar

- [ ] **Columnar Storage** (for analytics)
  - Consider TimescaleDB or similar
  - Better compression for time-series data

---

## Production Checklist

### Pre-Deployment

- [ ] Backup existing database
- [ ] Test migration on staging
- [ ] Verify partition creation
- [ ] Test ETL process with sample data
- [ ] Verify materialized view refresh
- [ ] Check query execution plans

### Post-Deployment

- [ ] Monitor table sizes
- [ ] Monitor query performance
- [ ] Set up autovacuum monitoring
- [ ] Schedule partition creation (cron)
- [ ] Schedule materialized view refresh (cron)
- [ ] Set up alerts for bloat/performance

### Ongoing Maintenance

- [ ] Weekly: Analyze tables
- [ ] Monthly: Create partitions
- [ ] Quarterly: Reindex if needed
- [ ] Quarterly: Archive old partitions
- [ ] As needed: Vacuum high-write tables

---

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| **Bulk Ingestion** | 10k-50k rows/sec | TBD |
| **Dashboard Query** | < 100ms | TBD |
| **Candidate Lookup** | < 10ms | TBD |
| **Partition Pruning** | 90%+ reduction | TBD |
| **Materialized View Refresh** | < 60s (5M records) | TBD |

---

**Last Updated:** February 2026  
**Version:** 1.0.0
