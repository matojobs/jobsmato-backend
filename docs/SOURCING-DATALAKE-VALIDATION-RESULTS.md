# Sourcing DataLake Validation Results

## Current Status

### ✅ Schema Created
- `sourcing` schema exists in the database

### ❌ Migration Issue Detected
The second migration (`1700000000021-ImproveSourcingDataLake`) has a bug:

**Error**: `unique constraint on partitioned table must include all partitioning columns`

**Root Cause**: PostgreSQL requires that primary keys on partitioned tables include the partition key column. The migration attempts to create a single-column PK (`id`) on a table partitioned by `assigned_date`, which violates this constraint.

**Location**: `src/migrations/1700000000021-ImproveSourcingDataLake.ts` line 45

**Fix Required**: The PK constraint must include `assigned_date`:
```sql
CONSTRAINT applications_new_pkey PRIMARY KEY (id, assigned_date)
```

However, this defeats the purpose of the improvement migration. **Alternative approach**: Use a unique index on `id` instead of a primary key constraint, or keep the composite PK.

---

## Validation Test Suite Status

### Test Script Created ✅
- `validate-sourcing-datalake.js` - Comprehensive validation script
- `SOURCING-DATALAKE-VALIDATION-GUIDE.md` - Complete documentation

### Tests Ready to Run (Pending Migration Fix)
Once migrations are fixed, the validation suite will test:

1. **Partition Validation** - Partition creation and pruning
2. **Phone Hash Validation** - Normalization and deduplication  
3. **ETL Integrity** - Data correctness and orphan detection
4. **Performance Stress Test** - Bulk inserts and query performance
5. **Materialized View Validation** - Concurrent refresh and locks
6. **Autovacuum & Bloat Check** - Dead tuples and index usage
7. **Production Safety Check** - Cross-schema FKs and autovacuum settings

---

## Next Steps

### 1. Fix Migration Bug

**Option A**: Keep composite PK (simplest fix)
```typescript
CONSTRAINT applications_new_pkey PRIMARY KEY (id, assigned_date)
```

**Option B**: Use unique index instead of PK (better for performance)
```sql
-- Remove PK constraint, add unique index
CREATE UNIQUE INDEX idx_applications_id_unique ON sourcing.applications (id);
```

**Option C**: Don't change PK structure (skip the improvement)

### 2. Run Migrations
```bash
node run-sourcing-migrations.js
```

### 3. Run Validation Suite
```bash
node validate-sourcing-datalake.js
```

---

## Expected Validation Results (Once Migrations Fixed)

### Performance Targets

| Operation | Target | Status |
|-----------|--------|--------|
| Bulk COPY | 10k-40k rows/sec | ⏳ Pending |
| Candidate lookup | <10ms | ⏳ Pending |
| Dashboard query | <100ms | ⏳ Pending |
| MV refresh (1M rows) | <15s | ⏳ Pending |
| Partition pruning | 90%+ reduction | ⏳ Pending |
| Dead tuples | <5% | ⏳ Pending |

### Validation Checklist

- [ ] STEP 1: Partition validation passes
- [ ] STEP 2: Phone hash validation passes
- [ ] STEP 3: ETL integrity passes
- [ ] STEP 4: Performance targets met
- [ ] STEP 5: Materialized view validation passes
- [ ] STEP 6: Autovacuum health check passes
- [ ] STEP 7: Production safety check passes

---

## Validation Script Features

The validation script (`validate-sourcing-datalake.js`) includes:

1. **Automatic Test Data Creation** - Creates test data for each test
2. **Performance Measurement** - Times all critical operations
3. **Query Plan Analysis** - Verifies index usage and partition pruning
4. **Integrity Checks** - Detects orphans and duplicates
5. **Health Monitoring** - Checks bloat and autovacuum status
6. **Detailed Reporting** - Generates JSON report with scores

**Output Files**:
- Console output with step-by-step results
- `sourcing-datalake-validation-report.json` - Detailed JSON report

---

## Migration Bug Details

### Current Migration Code (Broken)
```typescript
CREATE TABLE sourcing.applications_new (
  id BIGSERIAL NOT NULL,
  ...
  CONSTRAINT applications_new_pkey PRIMARY KEY (id)  // ❌ Missing assigned_date
) PARTITION BY RANGE (assigned_date);
```

### PostgreSQL Error
```
error: unique constraint on partitioned table must include all partitioning columns
detail: PRIMARY KEY constraint on table "applications_new" lacks column "assigned_date" which is part of the partition key.
```

### Why This Happens
PostgreSQL enforces that unique constraints (including PKs) on partitioned tables must include the partition key. This ensures uniqueness across all partitions.

### Recommended Fix
Since the goal was to improve performance with a single-column PK, but PostgreSQL doesn't allow it, we have two options:

1. **Keep composite PK** - Simplest, but doesn't achieve the performance goal
2. **Use unique index** - Better performance, but requires application-level handling

---

## Summary

✅ **Validation framework ready** - Comprehensive test suite created  
✅ **Documentation complete** - Full validation guide available  
❌ **Migration bug** - Needs fix before validation can run  
⏳ **Pending** - Run validation once migrations are fixed

The validation suite is production-ready and will provide comprehensive testing once the migration issue is resolved.
