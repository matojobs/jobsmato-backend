# Sourcing DataLake Validation Test Suite

## Overview

This document provides a comprehensive validation test suite for the Recruitment Sourcing DataLake module. The tests validate correctness, performance, and scalability for production systems handling 1M-5M+ records.

## Prerequisites

1. **Database Setup**: Ensure migrations `1700000000020` and `1700000000021` have been run
2. **Test Data**: The validation script will create test data automatically
3. **Database Access**: User must have CREATE, INSERT, SELECT permissions on `sourcing` schema

## Running the Validation Suite

### Option 1: Node.js Script (Recommended)

```bash
# Set environment variables
export DB_HOST=localhost
export DB_PORT=5432
export DB_USERNAME=jobsmato_user
export DB_PASSWORD=password
export DB_NAME=jobsmato_db

# Run validation
node validate-sourcing-datalake.js
```

### Option 2: Direct SQL (psql)

```bash
psql -h localhost -U jobsmato_user -d jobsmato_db -f validate-sourcing-datalake.sql
```

## Test Steps

### STEP 1: Partition Validation ✅

**Objective**: Verify partition creation and pruning works correctly

**Tests**:
- Check existing partitions
- Create partitions for current and next month
- Insert test data into current month partition
- Verify partition pruning with EXPLAIN ANALYZE
- Confirm no sequential scan across all partitions

**Expected Results**:
- Partitions created successfully
- Query plan shows "Partition Prune" or similar
- Only current partition scanned (not all partitions)

**Performance Target**: 90%+ partition pruning reduction

---

### STEP 2: Phone Hash Validation ✅

**Objective**: Verify phone normalization and deduplication

**Tests**:
- Test phone normalization function with variations:
  - `+91 9876543210`
  - `9876543210`
  - `09876543210`
  - `+919876543210`
- Insert candidates with phone variations
- Verify only one candidate created (deduplication)
- Test phone_hash index usage

**Expected Results**:
- All phone variations produce same hash
- Only one candidate inserted (others deduplicated)
- Index scan used (not sequential scan)

**Performance Target**: Candidate lookup <10ms

---

### STEP 3: ETL Integrity Test ✅

**Objective**: Validate ETL process correctness

**Tests**:
- Insert 1000 rows into raw table
- Run ETL transformation
- Validate:
  - Recruiters inserted correctly
  - Portals inserted correctly
  - Candidates deduplicated
  - No orphaned applications
  - No duplicate applications

**Expected Results**:
- All entities inserted correctly
- Zero orphaned applications
- Zero duplicate applications
- Counts match expected values

**Mismatch Detection Query**:
```sql
-- Orphaned applications
SELECT COUNT(*) FROM sourcing.detect_orphaned_applications();

-- Duplicate applications
SELECT candidate_id, assigned_date, COUNT(*) 
FROM sourcing.applications
GROUP BY candidate_id, assigned_date
HAVING COUNT(*) > 1;
```

---

### STEP 4: Performance Stress Test ✅

**Objective**: Measure performance under load

**Tests**:
- Bulk INSERT: 10,000 rows
- Candidate lookup: Single phone hash lookup
- Dashboard query: Materialized view query
- Recruiter stats: Aggregated query

**Performance Targets**:
- Bulk COPY: 10k-40k rows/sec
- Candidate lookup: <10ms
- Dashboard query: <100ms
- Recruiter stats: <100ms

**Measurement**:
```sql
-- Bulk insert timing
\timing on
INSERT INTO sourcing.raw_candidate_logs (...) SELECT ... FROM generate_series(1, 10000);
\timing off

-- Candidate lookup
EXPLAIN ANALYZE
SELECT * FROM sourcing.candidates
WHERE phone_hash = sourcing.hash_phone('9876543210');
```

---

### STEP 5: Materialized View Validation ✅

**Objective**: Verify MV refresh and concurrency

**Tests**:
- Check UNIQUE index exists
- Test CONCURRENT refresh
- Measure refresh duration
- Verify no locks on applications table

**Expected Results**:
- UNIQUE index exists on `(recruiter_id, call_date)`
- CONCURRENT refresh completes without blocking
- No locks on source tables during refresh

**Performance Target**: MV refresh <15s for 1M rows

**Test Query**:
```sql
-- Check UNIQUE index
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'sourcing'
  AND tablename = 'mv_recruiter_daily_stats'
  AND indexdef LIKE '%UNIQUE%';

-- Concurrent refresh
REFRESH MATERIALIZED VIEW CONCURRENTLY sourcing.mv_recruiter_daily_stats;

-- Check for locks
SELECT locktype, relation::regclass, mode, granted
FROM pg_locks
WHERE relation = 'sourcing.applications'::regclass;
```

---

### STEP 6: Autovacuum & Bloat Check ✅

**Objective**: Monitor table health and index usage

**Tests**:
- Check dead tuples (<5% target)
- Check index usage (identify unused indexes)
- Detect table bloat

**Expected Results**:
- Dead tuples <5% for all tables
- Minimal unused indexes
- No significant bloat detected

**Queries**:
```sql
-- Dead tuples
SELECT 
  schemaname,
  tablename,
  n_dead_tup,
  n_live_tup,
  ROUND(100.0 * n_dead_tup / NULLIF(n_live_tup, 0), 2) as dead_tuple_percent
FROM pg_stat_user_tables
WHERE schemaname = 'sourcing'
ORDER BY dead_tuple_percent DESC;

-- Index usage
SELECT 
  indexrelname,
  idx_scan,
  CASE 
    WHEN idx_scan = 0 THEN 'UNUSED'
    WHEN idx_scan < 100 THEN 'LOW USAGE'
    ELSE 'ACTIVE'
  END as usage_status
FROM pg_stat_user_indexes
WHERE schemaname = 'sourcing'
ORDER BY idx_scan ASC;

-- Bloat detection
SELECT * FROM sourcing.detect_table_bloat()
WHERE dead_tuple_percent > 5;
```

---

### STEP 7: Production Safety Check ✅

**Objective**: Verify production-ready configuration

**Tests**:
- Check for cross-schema blocking queries
- Verify no full-table locks
- Check autovacuum settings
- Verify indexes created CONCURRENTLY (where applicable)

**Expected Results**:
- Only expected cross-schema FK: `job_roles.company_id`
- Custom autovacuum settings configured
- No blocking operations detected

**Queries**:
```sql
-- Cross-schema FKs
SELECT 
  tc.table_schema,
  tc.table_name,
  ccu.table_schema AS foreign_table_schema,
  ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'sourcing'
  AND ccu.table_schema != 'sourcing';

-- Autovacuum settings
SELECT 
  schemaname,
  tablename,
  reloptions
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'sourcing'
  AND c.relkind = 'r'
  AND reloptions IS NOT NULL;
```

---

## Performance Targets Summary

| Operation | Target | Measurement |
|-----------|--------|-------------|
| Bulk COPY | 10k-40k rows/sec | INSERT with generate_series |
| Candidate lookup | <10ms | Phone hash index scan |
| Dashboard query | <100ms | Materialized view query |
| MV refresh (1M rows) | <15s | CONCURRENT refresh |
| Partition pruning | 90%+ reduction | EXPLAIN ANALYZE |
| Dead tuples | <5% | pg_stat_user_tables |

---

## Final Report

The validation script generates a JSON report: `sourcing-datalake-validation-report.json`

**Report Includes**:
- Step-by-step results (passed/failed)
- Performance metrics
- Partition summary
- Table statistics
- Production readiness score (1-10)

**Scoring**:
- 10/10: All tests passed, all performance targets met
- 8-9/10: All tests passed, minor performance gaps
- 6-7/10: Most tests passed, some issues detected
- <6/10: Critical issues, not production-ready

---

## Troubleshooting

### Schema doesn't exist
```bash
# Run migrations first
node scripts/run-migrations.js
```

### Permission denied
```sql
-- Grant permissions
GRANT USAGE ON SCHEMA sourcing TO jobsmato_user;
GRANT ALL ON ALL TABLES IN SCHEMA sourcing TO jobsmato_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA sourcing TO jobsmato_user;
```

### Partition creation fails
```sql
-- Check partition function
SELECT sourcing.create_monthly_partition('applications', CURRENT_DATE);
```

### Performance issues
1. Check autovacuum is running: `SELECT * FROM pg_stat_user_tables WHERE schemaname = 'sourcing';`
2. Analyze tables: `ANALYZE sourcing.applications;`
3. Check index usage: `SELECT * FROM pg_stat_user_indexes WHERE schemaname = 'sourcing';`

---

## Maintenance Queries

### Get partition sizes
```sql
SELECT * FROM sourcing.get_partition_sizes()
ORDER BY table_name, partition_name;
```

### Detect bloat
```sql
SELECT * FROM sourcing.detect_table_bloat()
WHERE dead_tuple_percent > 5
ORDER BY dead_tuple_percent DESC;
```

### Detect orphaned applications
```sql
SELECT * FROM sourcing.detect_orphaned_applications();
```

### Refresh materialized view
```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY sourcing.mv_recruiter_daily_stats;
```

---

## Production Readiness Checklist

- [ ] All 7 validation steps passed
- [ ] Performance targets met
- [ ] No orphaned data
- [ ] No duplicate data
- [ ] Partition pruning working
- [ ] Indexes being used
- [ ] Autovacuum configured
- [ ] Materialized view refresh tested
- [ ] Cross-schema dependencies documented
- [ ] Backup strategy in place

---

## Next Steps

After validation passes:

1. **Monitor**: Set up monitoring for partition sizes, bloat, and performance
2. **Automate**: Schedule partition creation (monthly)
3. **Optimize**: Review slow queries and add indexes as needed
4. **Scale**: Plan for 5M+ records (consider additional partitioning strategies)

---

## References

- [PostgreSQL Partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html)
- [Materialized Views](https://www.postgresql.org/docs/current/sql-creatematerializedview.html)
- [Autovacuum Tuning](https://www.postgresql.org/docs/current/runtime-config-autovacuum.html)
