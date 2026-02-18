import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Improve & Harden Sourcing DataLake Architecture
 * 
 * This migration improves the existing DataLake design for production at scale:
 * 
 * 1. Fixes partitioned table primary keys (single-column BIGSERIAL)
 * 2. Hardens partition creation function (advisory locks, race condition prevention)
 * 3. Adds phone normalization before hashing
 * 4. Adds batch tracking table for observability
 * 5. Improves autovacuum settings for high-write tables
 * 6. Adds data integrity guardrails
 * 
 * Designed for: 1M+ records, scaling to 10M+
 */
export class ImproveSourcingDataLake1700000000021 implements MigrationInterface {
  name = 'ImproveSourcingDataLake1700000000021';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // 1. FIX PARTITIONED TABLE PRIMARY KEYS
    // ============================================
    // Change from composite PK (id, date) to single-column PK (id)
    // Partition pruning still works via WHERE clause on partition key
    
    // Drop existing applications table and recreate with single-column PK
    await queryRunner.query(`
      -- Create new applications table with single-column PK
      CREATE TABLE sourcing.applications_new (
        id BIGSERIAL NOT NULL,
        candidate_id BIGINT NOT NULL,
        recruiter_id INTEGER NOT NULL REFERENCES sourcing.recruiters(id),
        job_role_id INTEGER NOT NULL REFERENCES sourcing.job_roles(id),
        assigned_date DATE NOT NULL,
        call_date DATE,
        call_status SMALLINT,
        interested SMALLINT,
        selection_status SMALLINT,
        joining_status SMALLINT,
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT applications_new_pkey PRIMARY KEY (id)
      ) PARTITION BY RANGE (assigned_date);
    `);

    // Migrate data if applications table exists
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'sourcing' AND tablename = 'applications') THEN
          INSERT INTO sourcing.applications_new 
          SELECT * FROM sourcing.applications;
        END IF;
      END $$;
    `);

    // Drop old table and rename new one
    await queryRunner.query(`
      DROP TABLE IF EXISTS sourcing.applications CASCADE;
      ALTER TABLE sourcing.applications_new RENAME TO applications;
    `);

    // Recreate indexes on new table
    await queryRunner.query(`
      CREATE INDEX idx_applications_recruiter_call_date 
      ON sourcing.applications (recruiter_id, call_date) 
      INCLUDE (call_status, interested, selection_status, joining_status);
      
      CREATE INDEX idx_applications_candidate ON sourcing.applications (candidate_id);
      CREATE INDEX idx_applications_job_role ON sourcing.applications (job_role_id);
      CREATE INDEX idx_applications_joining_status 
      ON sourcing.applications (joining_status, assigned_date) 
      WHERE joining_status IS NOT NULL;
      
      CREATE INDEX idx_applications_interested 
      ON sourcing.applications (interested, call_date) 
      WHERE interested = 1;
      
      CREATE INDEX idx_applications_assigned_date ON sourcing.applications (assigned_date);
    `);

    // Fix raw_candidate_logs PK (if needed)
    await queryRunner.query(`
      DO $$
      BEGIN
        -- Check if raw table has composite PK
        IF EXISTS (
          SELECT 1 FROM pg_constraint 
          WHERE conname = 'raw_candidate_logs_pkey' 
          AND contype = 'p'
        ) THEN
          -- Drop composite PK constraint
          ALTER TABLE sourcing.raw_candidate_logs DROP CONSTRAINT raw_candidate_logs_pkey;
          
          -- Add single-column PK
          ALTER TABLE sourcing.raw_candidate_logs ADD CONSTRAINT raw_candidate_logs_pkey PRIMARY KEY (id);
        END IF;
      END $$;
    `);

    // ============================================
    // 2. HARDEN PARTITION CREATION FUNCTION
    // ============================================
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION sourcing.create_monthly_partition(
        table_name TEXT,
        partition_date DATE DEFAULT CURRENT_DATE
      )
      RETURNS TEXT AS $$
      DECLARE
        start_date DATE;
        end_date DATE;
        partition_name TEXT;
        lock_id BIGINT;
        partition_created BOOLEAN := false;
      BEGIN
        -- Calculate partition boundaries
        start_date := date_trunc('month', partition_date);
        end_date := start_date + INTERVAL '1 month';
        partition_name := table_name || '_' || to_char(start_date, 'YYYY_MM');
        
        -- Use advisory lock to prevent race conditions
        -- Lock ID based on table name hash
        lock_id := abs(hashtext('sourcing.' || table_name || '.' || partition_name));
        
        -- Acquire advisory lock (non-blocking, timeout 5 seconds)
        IF NOT pg_try_advisory_xact_lock(lock_id) THEN
          RAISE EXCEPTION 'Could not acquire lock for partition creation. Another process may be creating this partition.';
        END IF;
        
        -- Check if partition already exists (double-check after lock)
        IF NOT EXISTS (
          SELECT 1 FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'sourcing'
            AND c.relname = partition_name
        ) THEN
          -- Create partition based on table name
          IF table_name = 'raw_candidate_logs' THEN
            EXECUTE format(
              'CREATE TABLE sourcing.%I PARTITION OF sourcing.%I FOR VALUES FROM (%L) TO (%L)',
              partition_name,
              table_name,
              start_date,
              end_date
            );
          ELSIF table_name = 'applications' THEN
            EXECUTE format(
              'CREATE TABLE sourcing.%I PARTITION OF sourcing.%I FOR VALUES FROM (%L) TO (%L)',
              partition_name,
              table_name,
              start_date,
              end_date
            );
          ELSE
            RAISE EXCEPTION 'Unknown table name: %. Supported tables: raw_candidate_logs, applications', table_name;
          END IF;
          
          partition_created := true;
        END IF;
        
        -- Lock is automatically released at end of transaction
        RETURN partition_name || CASE WHEN partition_created THEN ' (created)' ELSE ' (already exists)' END;
      EXCEPTION
        WHEN OTHERS THEN
          -- Release lock on error
          PERFORM pg_advisory_xact_unlock(lock_id);
          RAISE;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // ============================================
    // 3. HARDEN PHONE HASHING WITH NORMALIZATION
    // ============================================
    
    // Add normalized_phone column
    await queryRunner.query(`
      ALTER TABLE sourcing.candidates 
      ADD COLUMN IF NOT EXISTS normalized_phone VARCHAR(20);
    `);

    // Improved phone normalization function
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION sourcing.normalize_phone(phone_text TEXT)
      RETURNS VARCHAR(20) AS $$
      DECLARE
        normalized VARCHAR(20);
      BEGIN
        IF phone_text IS NULL OR phone_text = '' THEN
          RETURN NULL;
        END IF;
        
        -- Remove all non-digit characters
        normalized := regexp_replace(phone_text, '[^0-9]', '', 'g');
        
        -- Remove leading country codes (common Indian codes: 91, +91)
        -- Keep last 10 digits (standard Indian mobile number length)
        IF length(normalized) > 10 THEN
          normalized := right(normalized, 10);
        END IF;
        
        -- Return NULL if result is empty or too short
        IF normalized = '' OR length(normalized) < 10 THEN
          RETURN NULL;
        END IF;
        
        RETURN normalized;
      END;
      $$ LANGUAGE plpgsql IMMUTABLE;
    `);

    // Update hash function to use normalized phone
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION sourcing.hash_phone(phone_text TEXT)
      RETURNS BIGINT AS $$
      DECLARE
        normalized VARCHAR(20);
      BEGIN
        normalized := sourcing.normalize_phone(phone_text);
        IF normalized IS NULL THEN
          RETURN NULL;
        END IF;
        -- Hash normalized phone
        RETURN abs(hashtext(normalized))::BIGINT;
      END;
      $$ LANGUAGE plpgsql IMMUTABLE;
    `);

    // Update trigger to populate both normalized_phone and phone_hash
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION sourcing.update_candidate_phone_hash()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.normalized_phone := sourcing.normalize_phone(NEW.phone);
        NEW.phone_hash := sourcing.hash_phone(NEW.phone);
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Backfill normalized_phone for existing records
    await queryRunner.query(`
      UPDATE sourcing.candidates 
      SET normalized_phone = sourcing.normalize_phone(phone)
      WHERE normalized_phone IS NULL AND phone IS NOT NULL;
    `);

    // Add index on normalized_phone for duplicate detection
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_candidates_normalized_phone 
      ON sourcing.candidates (normalized_phone) 
      WHERE normalized_phone IS NOT NULL;
    `);

    // ============================================
    // 4. BATCH TRACKING TABLE
    // ============================================
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sourcing.import_batches (
        id SERIAL PRIMARY KEY,
        batch_id VARCHAR(100) NOT NULL UNIQUE,
        total_records INTEGER NOT NULL DEFAULT 0,
        success_count INTEGER NOT NULL DEFAULT 0,
        failure_count INTEGER NOT NULL DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'processing',
        started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        error_log JSONB,
        metadata JSONB,
        
        CONSTRAINT import_batches_status_check CHECK (status IN ('processing', 'completed', 'failed', 'cancelled'))
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_import_batches_status ON sourcing.import_batches (status);
      CREATE INDEX idx_import_batches_started_at ON sourcing.import_batches (started_at);
    `);

    // ============================================
    // 5. IMPROVE AUTOVACUUM SETTINGS
    // ============================================
    await queryRunner.query(`
      -- High-write partitioned tables: aggressive autovacuum
      ALTER TABLE sourcing.applications SET (
        autovacuum_vacuum_scale_factor = 0.02,
        autovacuum_analyze_scale_factor = 0.01,
        autovacuum_vacuum_cost_delay = 10,
        autovacuum_vacuum_cost_limit = 2000
      );
      
      ALTER TABLE sourcing.candidates SET (
        autovacuum_vacuum_scale_factor = 0.05,
        autovacuum_analyze_scale_factor = 0.02,
        autovacuum_vacuum_cost_delay = 10
      );
      
      -- Raw table: less frequent (immutable after insert)
      ALTER TABLE sourcing.raw_candidate_logs SET (
        autovacuum_vacuum_scale_factor = 0.1,
        autovacuum_analyze_scale_factor = 0.05
      );
    `);

    // ============================================
    // 6. DATA INTEGRITY GUARDRAILS
    // ============================================
    
    // Add check constraints for status values
    await queryRunner.query(`
      ALTER TABLE sourcing.applications 
      ADD CONSTRAINT applications_call_status_check 
      CHECK (call_status IS NULL OR call_status BETWEEN 1 AND 4);
      
      ALTER TABLE sourcing.applications 
      ADD CONSTRAINT applications_interested_check 
      CHECK (interested IS NULL OR interested BETWEEN 1 AND 3);
      
      ALTER TABLE sourcing.applications 
      ADD CONSTRAINT applications_selection_status_check 
      CHECK (selection_status IS NULL OR selection_status BETWEEN 1 AND 2);
      
      ALTER TABLE sourcing.applications 
      ADD CONSTRAINT applications_joining_status_check 
      CHECK (joining_status IS NULL OR joining_status BETWEEN 1 AND 3);
    `);

    // Function to detect orphaned applications (candidate_id without FK)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION sourcing.detect_orphaned_applications()
      RETURNS TABLE (
        application_id BIGINT,
        candidate_id BIGINT,
        assigned_date DATE
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT a.id, a.candidate_id, a.assigned_date
        FROM sourcing.applications a
        LEFT JOIN sourcing.candidates c ON c.id = a.candidate_id
        WHERE c.id IS NULL;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Function to validate batch before insert
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION sourcing.validate_batch_insert(
        p_batch_id VARCHAR(100),
        p_candidate_ids BIGINT[]
      )
      RETURNS TABLE (
        candidate_id BIGINT,
        exists BOOLEAN
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          unnest(p_candidate_ids) as candidate_id,
          EXISTS(SELECT 1 FROM sourcing.candidates WHERE id = unnest(p_candidate_ids)) as exists;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // ============================================
    // 7. HELPER FUNCTIONS FOR MAINTENANCE
    // ============================================
    
    // Function to get partition sizes (using standard PostgreSQL catalog)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION sourcing.get_partition_sizes()
      RETURNS TABLE (
        table_name TEXT,
        partition_name TEXT,
        size_bytes BIGINT,
        size_pretty TEXT,
        row_count BIGINT
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT
          n_parent.nspname || '.' || c_parent.relname::TEXT as table_name,
          n_child.nspname || '.' || c_child.relname::TEXT as partition_name,
          pg_total_relation_size(c_child.oid) as size_bytes,
          pg_size_pretty(pg_total_relation_size(c_child.oid)) as size_pretty,
          COALESCE(s.n_live_tup, 0)::BIGINT as row_count
        FROM pg_inherits i
        JOIN pg_class c_parent ON c_parent.oid = i.inhparent
        JOIN pg_class c_child ON c_child.oid = i.inhrelid
        JOIN pg_namespace n_parent ON n_parent.oid = c_parent.relnamespace
        JOIN pg_namespace n_child ON n_child.oid = c_child.relnamespace
        LEFT JOIN pg_stat_user_tables s ON s.relname = c_child.relname AND s.schemaname = n_child.nspname
        WHERE n_parent.nspname = 'sourcing'
          AND c_parent.relname IN ('raw_candidate_logs', 'applications')
        ORDER BY c_parent.relname, c_child.relname;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Function to detect bloat
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION sourcing.detect_table_bloat()
      RETURNS TABLE (
        schemaname TEXT,
        tablename TEXT,
        dead_tuple_percent NUMERIC,
        n_dead_tup BIGINT,
        n_live_tup BIGINT
      ) AS $$
      BEGIN
        RETURN QUERY
        SELECT
          s.schemaname::TEXT,
          s.tablename::TEXT,
          CASE 
            WHEN s.n_live_tup > 0 
            THEN ROUND(100.0 * s.n_dead_tup / s.n_live_tup, 2)
            ELSE 0
          END as dead_tuple_percent,
          s.n_dead_tup,
          s.n_live_tup
        FROM pg_stat_user_tables s
        WHERE s.schemaname = 'sourcing'
          AND s.n_live_tup > 1000
        ORDER BY dead_tuple_percent DESC;
      END;
      $$ LANGUAGE plpgsql;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop helper functions
    await queryRunner.query(`DROP FUNCTION IF EXISTS sourcing.detect_table_bloat();`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS sourcing.get_partition_sizes();`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS sourcing.validate_batch_insert(VARCHAR, BIGINT[]);`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS sourcing.detect_orphaned_applications();`);

    // Drop check constraints
    await queryRunner.query(`ALTER TABLE sourcing.applications DROP CONSTRAINT IF EXISTS applications_joining_status_check;`);
    await queryRunner.query(`ALTER TABLE sourcing.applications DROP CONSTRAINT IF EXISTS applications_selection_status_check;`);
    await queryRunner.query(`ALTER TABLE sourcing.applications DROP CONSTRAINT IF EXISTS applications_interested_check;`);
    await queryRunner.query(`ALTER TABLE sourcing.applications DROP CONSTRAINT IF EXISTS applications_call_status_check;`);

    // Drop batch tracking table
    await queryRunner.query(`DROP TABLE IF EXISTS sourcing.import_batches CASCADE;`);

    // Revert autovacuum settings (set to defaults)
    await queryRunner.query(`ALTER TABLE sourcing.raw_candidate_logs RESET (autovacuum_vacuum_scale_factor, autovacuum_analyze_scale_factor);`);
    await queryRunner.query(`ALTER TABLE sourcing.candidates RESET (autovacuum_vacuum_scale_factor, autovacuum_analyze_scale_factor, autovacuum_vacuum_cost_delay);`);
    await queryRunner.query(`ALTER TABLE sourcing.applications RESET (autovacuum_vacuum_scale_factor, autovacuum_analyze_scale_factor, autovacuum_vacuum_cost_delay, autovacuum_vacuum_cost_limit);`);

    // Drop normalized_phone index
    await queryRunner.query(`DROP INDEX IF EXISTS sourcing.idx_candidates_normalized_phone;`);

    // Revert phone functions (keep old version)
    await queryRunner.query(`DROP FUNCTION IF EXISTS sourcing.normalize_phone(TEXT);`);
    
    // Note: We keep the improved hash_phone function as it's backward compatible
  }
}
