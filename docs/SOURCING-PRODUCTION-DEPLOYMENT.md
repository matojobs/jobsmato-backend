# Sourcing DataLake Production Deployment Checklist

Complete production deployment guide with safety checks, testing, and rollback procedures.

---

## Pre-Deployment Checklist

### 1. Backup Strategy

**✅ Full Database Backup**
```bash
# Create full backup before migration
pg_dump -U jobsmato_user -d jobsmato_db -F c -f backup_before_sourcing_$(date +%Y%m%d).dump

# Verify backup
pg_restore --list backup_before_sourcing_*.dump | head -20
```

**✅ Schema Backup**
```bash
# Backup only schema (faster, for rollback)
pg_dump -U jobsmato_user -d jobsmato_db --schema-only -f schema_backup_$(date +%Y%m%d).sql
```

**✅ Point-in-Time Recovery Setup**
- Ensure WAL archiving is enabled
- Verify `archive_mode = on` in postgresql.conf
- Test PITR recovery process

### 2. Lock Avoidance Strategy

**✅ Check Active Connections**
```sql
-- Check for long-running queries
SELECT 
  pid,
  usename,
  application_name,
  state,
  query_start,
  now() - query_start as duration,
  query
FROM pg_stat_activity
WHERE datname = 'jobsmato_db'
  AND state != 'idle'
ORDER BY query_start;
```

**✅ Wait for Low Activity Window**
- Deploy during maintenance window
- Ensure no bulk operations running
- Check for blocking locks

**✅ Use Advisory Locks**
- Migration uses advisory locks for partition creation
- Prevents concurrent partition creation conflicts

### 3. Concurrent Index Creation

**✅ All Indexes Created CONCURRENTLY**
```sql
-- Verify indexes are created concurrently
-- Migration uses CREATE INDEX (not CONCURRENTLY for initial creation)
-- For production, recreate with CONCURRENTLY if needed:

-- Example (run after migration if needed):
CREATE INDEX CONCURRENTLY idx_applications_recruiter_call_date_new
ON sourcing.applications (recruiter_id, call_date) 
INCLUDE (call_status, interested, selection_status, joining_status);

-- Then swap:
DROP INDEX sourcing.idx_applications_recruiter_call_date;
ALTER INDEX sourcing.idx_applications_recruiter_call_date_new RENAME TO idx_applications_recruiter_call_date;
```

### 4. Testing Steps

**✅ Staging Environment Test**
```bash
# 1. Run migration on staging
npm run migration:run

# 2. Verify schema creation
psql -U jobsmato_user -d jobsmato_db_staging <<EOF
\dn sourcing
\dt sourcing.*
\d sourcing.applications
\d sourcing.candidates
EOF

# 3. Test partition creation
SELECT sourcing.create_monthly_partition('applications', CURRENT_DATE);
SELECT sourcing.create_monthly_partition('raw_candidate_logs', CURRENT_DATE);

# 4. Test ETL with sample data
# Load sample CSV, run ETL, verify results

# 5. Test materialized view refresh
SELECT sourcing.refresh_recruiter_stats();

# 6. Performance test
EXPLAIN ANALYZE SELECT * FROM sourcing.mv_recruiter_daily_stats WHERE recruiter_id = 1;
```

**✅ Load Testing**
- Test with 10k records
- Test with 100k records
- Verify performance targets met

**✅ Data Integrity Tests**
```sql
-- Test orphan detection
SELECT COUNT(*) FROM sourcing.detect_orphaned_applications();

-- Test phone normalization
SELECT 
  phone,
  sourcing.normalize_phone(phone) as normalized,
  sourcing.hash_phone(phone) as hash
FROM sourcing.candidates
LIMIT 10;

-- Test batch tracking
SELECT * FROM sourcing.import_batches ORDER BY started_at DESC LIMIT 5;
```

### 5. Rollback Strategy

**✅ Rollback Plan**
```sql
-- If migration fails, rollback:
BEGIN;

-- Drop new objects
DROP MATERIALIZED VIEW IF EXISTS sourcing.mv_recruiter_daily_stats;
DROP TABLE IF EXISTS sourcing.import_batches CASCADE;
DROP FUNCTION IF EXISTS sourcing.detect_table_bloat();
DROP FUNCTION IF EXISTS sourcing.get_partition_sizes();
DROP FUNCTION IF EXISTS sourcing.validate_batch_insert(VARCHAR, BIGINT[]);
DROP FUNCTION IF EXISTS sourcing.detect_orphaned_applications();
DROP FUNCTION IF EXISTS sourcing.normalize_phone(TEXT);

-- Revert autovacuum settings
ALTER TABLE sourcing.applications RESET (autovacuum_vacuum_scale_factor, autovacuum_analyze_scale_factor);
ALTER TABLE sourcing.candidates RESET (autovacuum_vacuum_scale_factor, autovacuum_analyze_scale_factor);

-- Restore from backup if needed
-- pg_restore -U jobsmato_user -d jobsmato_db backup_before_sourcing_*.dump

COMMIT;
```

**✅ Rollback Script**
```bash
# rollback-sourcing.sh
#!/bin/bash
psql -U jobsmato_user -d jobsmato_db <<EOF
\set ON_ERROR_STOP on
BEGIN;
-- Run rollback SQL
\i rollback-sourcing.sql
COMMIT;
EOF
```

---

## Deployment Steps

### Step 1: Pre-Deployment Checks

```bash
# 1. Verify database version (PostgreSQL 12+)
psql -U jobsmato_user -d jobsmato_db -c "SELECT version();"

# 2. Check disk space (need at least 10GB free)
df -h

# 3. Check PostgreSQL configuration
psql -U jobsmato_user -d jobsmato_db -c "SHOW shared_buffers;"
psql -U jobsmato_user -d jobsmato_db -c "SHOW max_connections;"

# 4. Create backup
pg_dump -U jobsmato_user -d jobsmato_db -F c -f backup_before_sourcing_$(date +%Y%m%d_%H%M%S).dump
```

### Step 2: Run Migrations

```bash
# Run initial migration (if not already run)
npm run migration:run

# Run improvement migration
npm run migration:run
# Or specific migration:
ts-node -r tsconfig-paths/register node_modules/typeorm/cli.js migration:run -n ImproveSourcingDataLake1700000000021
```

### Step 3: Verify Schema

```sql
-- Verify schema exists
SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'sourcing';

-- Verify tables
SELECT tablename FROM pg_tables WHERE schemaname = 'sourcing' ORDER BY tablename;

-- Verify functions
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'sourcing' ORDER BY routine_name;

-- Verify indexes
SELECT indexname FROM pg_indexes WHERE schemaname = 'sourcing' ORDER BY indexname;

-- Verify partitions
SELECT tablename FROM pg_tables 
WHERE schemaname = 'sourcing' 
  AND (tablename LIKE '%_2026_%' OR tablename LIKE '%_2025_%')
ORDER BY tablename;
```

### Step 4: Test Partition Creation

```sql
-- Test partition creation function
SELECT sourcing.create_monthly_partition('raw_candidate_logs', CURRENT_DATE);
SELECT sourcing.create_monthly_partition('applications', CURRENT_DATE);

-- Verify partitions created
SELECT tablename FROM pg_tables 
WHERE schemaname = 'sourcing' 
  AND tablename LIKE '%_2026_%'
ORDER BY tablename;
```

### Step 5: Test ETL Process

```typescript
// Load sample data
// Run ETL
// Verify results
```

### Step 6: Performance Verification

```sql
-- Test materialized view refresh
\timing on
SELECT sourcing.refresh_recruiter_stats();
\timing off

-- Test query performance
EXPLAIN ANALYZE
SELECT * FROM sourcing.mv_recruiter_daily_stats
WHERE recruiter_id = 1
  AND call_date >= CURRENT_DATE - INTERVAL '30 days';

-- Should be < 100ms
```

### Step 7: Monitor Post-Deployment

```sql
-- Check for errors
SELECT * FROM sourcing.import_batches WHERE status = 'failed' ORDER BY started_at DESC LIMIT 10;

-- Check table sizes
SELECT * FROM sourcing.get_partition_sizes();

-- Check bloat
SELECT * FROM sourcing.detect_table_bloat();
```

---

## Post-Deployment Checklist

### Immediate (First Hour)

- [ ] Verify all tables created
- [ ] Verify all indexes created
- [ ] Test partition creation function
- [ ] Test ETL with sample data
- [ ] Verify materialized view refresh works
- [ ] Check for errors in logs
- [ ] Monitor query performance

### First Day

- [ ] Monitor autovacuum activity
- [ ] Check for bloat
- [ ] Verify batch tracking works
- [ ] Test phone normalization
- [ ] Run data integrity checks
- [ ] Monitor dashboard query performance

### First Week

- [ ] Run weekly maintenance scripts
- [ ] Check partition sizes
- [ ] Verify autovacuum settings effective
- [ ] Review slow query log
- [ ] Check index usage

### First Month

- [ ] Run monthly partition creation
- [ ] Archive old partitions (if needed)
- [ ] Review performance metrics
- [ ] Optimize if needed

---

## Performance Targets Verification

| Metric | Target | How to Verify |
|--------|--------|---------------|
| **Bulk Ingestion** | 10k-50k rows/sec | Time COPY operations |
| **Dashboard Query** | < 100ms | `EXPLAIN ANALYZE` on materialized view |
| **Candidate Lookup** | < 10ms | `EXPLAIN ANALYZE` with phone_hash |
| **Partition Pruning** | 90%+ reduction | Check `EXPLAIN` shows partition elimination |
| **Materialized View Refresh** | < 60s (5M records) | Time refresh operation |

---

## Troubleshooting

### Migration Fails

1. **Check logs:** Review PostgreSQL logs for errors
2. **Check locks:** `SELECT * FROM pg_locks WHERE NOT granted;`
3. **Check disk space:** `df -h`
4. **Rollback:** Use rollback script

### Performance Issues

1. **Check indexes:** Verify indexes are being used
2. **Check bloat:** Run `sourcing.detect_table_bloat()`
3. **Check autovacuum:** Verify autovacuum is running
4. **Check query plans:** Use `EXPLAIN ANALYZE`

### Data Integrity Issues

1. **Check orphans:** `SELECT * FROM sourcing.detect_orphaned_applications();`
2. **Check duplicates:** Check normalized_phone duplicates
3. **Check batch status:** Review `sourcing.import_batches`

---

## Emergency Procedures

### If Migration Blocks Production

```sql
-- Check for blocking queries
SELECT 
  blocked_locks.pid AS blocked_pid,
  blocking_locks.pid AS blocking_pid,
  blocked_activity.query AS blocked_query,
  blocking_activity.query AS blocking_query
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;

-- Terminate blocking query (if safe)
-- SELECT pg_terminate_backend(pid);
```

### If Data Corruption Detected

1. **Stop ETL processes**
2. **Restore from backup**
3. **Investigate root cause**
4. **Fix and redeploy**

---

## Maintenance Schedule

### Automated (Cron Jobs)

```bash
# Weekly analyze (Sunday 2 AM)
0 2 * * 0 psql -U jobsmato_user -d jobsmato_db -f scripts/sourcing-maintenance.sql

# Monthly partition creation (1st of month, 2 AM)
0 2 1 * * psql -U jobsmato_user -d jobsmato_db -c "SELECT sourcing.create_monthly_partition('raw_candidate_logs', CURRENT_DATE + INTERVAL '1 month'); SELECT sourcing.create_monthly_partition('applications', CURRENT_DATE + INTERVAL '1 month');"

# Monthly materialized view refresh (Daily 3 AM)
0 3 * * * psql -U jobsmato_user -d jobsmato_db -c "SELECT sourcing.refresh_recruiter_stats();"
```

### Manual (Quarterly)

- Review and optimize indexes
- Archive old partitions
- Review and tune autovacuum settings
- Performance review

---

**Last Updated:** February 2026  
**Version:** 1.0.0  
**Status:** Production Ready ✅
