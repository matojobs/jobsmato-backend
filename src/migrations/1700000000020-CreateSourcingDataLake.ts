import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Create Recruitment Sourcing DataLake Module
 * 
 * Creates a 3-layer DataLake architecture in a separate 'sourcing' schema:
 * - Layer A: Raw partitioned tables (immutable, bulk ingestion)
 * - Layer B: Structured normalized tables (optimized for queries)
 * - Layer C: Materialized views (analytics aggregations)
 * 
 * Performance optimizations:
 * - Monthly partitioning on date columns
 * - Phone hashing for fast lookups
 * - SMALLINT status enums
 * - Covering indexes
 * - Partial indexes
 * - No FKs on high-volume tables (performance trade-off)
 * 
 * Designed for: 1M+ records initially, scaling to 5M+
 */
export class CreateSourcingDataLake1700000000020 implements MigrationInterface {
  name = 'CreateSourcingDataLake1700000000020';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ============================================
    // CREATE SCHEMA
    // ============================================
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS sourcing;`);

    // ============================================
    // LAYER A: RAW TABLES (Partitioned, Immutable)
    // ============================================

    // Create parent table for raw candidate logs
    await queryRunner.query(`
      CREATE TABLE sourcing.raw_candidate_logs (
        id BIGSERIAL NOT NULL,
        batch_id VARCHAR(100) NOT NULL,
        imported_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        
        -- Store all sheet columns as-is (flexible schema)
        -- Add columns as needed based on your sheet structure
        candidate_name TEXT,
        candidate_phone TEXT,
        candidate_email TEXT,
        portal_name TEXT,
        job_role TEXT,
        recruiter_name TEXT,
        assigned_date DATE,
        call_date DATE,
        call_status TEXT,
        interested TEXT,
        selection_status TEXT,
        joining_status TEXT,
        notes TEXT,
        raw_data JSONB, -- Store entire row as JSONB for flexibility
        
        CONSTRAINT raw_candidate_logs_pkey PRIMARY KEY (id, imported_at)
      ) PARTITION BY RANGE (imported_at);
    `);

    // Create first partition (current month)
    const currentMonth = new Date();
    const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    const partitionName = `raw_candidate_logs_${currentMonth.getFullYear()}_${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
    
    await queryRunner.query(`
      CREATE TABLE sourcing.${partitionName} PARTITION OF sourcing.raw_candidate_logs
      FOR VALUES FROM ('${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-01')
                     TO ('${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01');
    `);

    // Indexes for raw table
    await queryRunner.query(`
      CREATE INDEX idx_raw_candidate_logs_batch_id ON sourcing.raw_candidate_logs (batch_id);
    `);
    await queryRunner.query(`
      CREATE INDEX idx_raw_candidate_logs_imported_at ON sourcing.raw_candidate_logs (imported_at);
    `);

    // ============================================
    // LAYER B: STRUCTURED TABLES (Normalized)
    // ============================================

    // Recruiters table
    await queryRunner.query(`
      CREATE TABLE sourcing.recruiters (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(email)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_recruiters_name ON sourcing.recruiters (name);
      CREATE INDEX idx_recruiters_active ON sourcing.recruiters (is_active);
    `);

    // Portals table
    await queryRunner.query(`
      CREATE TABLE sourcing.portals (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Job Roles table (FK to companies)
    await queryRunner.query(`
      CREATE TABLE sourcing.job_roles (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
        role_name VARCHAR(255) NOT NULL,
        department VARCHAR(255),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(company_id, role_name)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_job_roles_company ON sourcing.job_roles (company_id);
      CREATE INDEX idx_job_roles_active ON sourcing.job_roles (is_active);
    `);

    // Candidates table (optimized with phone hash)
    await queryRunner.query(`
      CREATE TABLE sourcing.candidates (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        phone_hash BIGINT, -- Hashed phone for fast lookups (explained below)
        email VARCHAR(255),
        portal_id INTEGER REFERENCES sourcing.portals(id),
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT candidates_phone_hash_unique UNIQUE (phone_hash)
      );
    `);

    // Phone hash index (critical for performance)
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_candidates_phone_hash ON sourcing.candidates (phone_hash) 
      WHERE phone_hash IS NOT NULL;
    `);
    
    await queryRunner.query(`
      CREATE INDEX idx_candidates_created_at ON sourcing.candidates (created_at);
      CREATE INDEX idx_candidates_portal ON sourcing.candidates (portal_id);
    `);

    // Function to generate phone hash (used in triggers/application code)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION sourcing.hash_phone(phone_text TEXT)
      RETURNS BIGINT AS $$
      BEGIN
        -- Remove all non-digit characters and hash
        -- Using PostgreSQL's hashtext but converting to BIGINT
        RETURN abs(hashtext(regexp_replace(COALESCE(phone_text, ''), '[^0-9]', '', 'g')))::BIGINT;
      END;
      $$ LANGUAGE plpgsql IMMUTABLE;
    `);

    // Trigger to auto-populate phone_hash
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION sourcing.update_candidate_phone_hash()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.phone_hash = sourcing.hash_phone(NEW.phone);
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    await queryRunner.query(`
      CREATE TRIGGER trigger_candidate_phone_hash
      BEFORE INSERT OR UPDATE OF phone ON sourcing.candidates
      FOR EACH ROW
      EXECUTE FUNCTION sourcing.update_candidate_phone_hash();
    `);

    // Applications table (partitioned by assigned_date)
    await queryRunner.query(`
      CREATE TABLE sourcing.applications (
        id BIGSERIAL NOT NULL,
        candidate_id BIGINT NOT NULL, -- No FK for performance (see notes)
        recruiter_id INTEGER NOT NULL REFERENCES sourcing.recruiters(id),
        job_role_id INTEGER NOT NULL REFERENCES sourcing.job_roles(id),
        assigned_date DATE NOT NULL,
        call_date DATE,
        
        -- Status fields as SMALLINT (1-4 range)
        call_status SMALLINT, -- 1=Busy, 2=RNR, 3=Connected, 4=Wrong Number
        interested SMALLINT, -- 1=Yes, 2=No, 3=Call Back Later
        selection_status SMALLINT, -- 1=Selected, 2=Not Selected
        joining_status SMALLINT, -- 1=Joined, 2=Not Joined, 3=Pending
        
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT applications_pkey PRIMARY KEY (id, assigned_date)
      ) PARTITION BY RANGE (assigned_date);
    `);

    // Create first partition for applications
    const appPartitionName = `applications_${currentMonth.getFullYear()}_${String(currentMonth.getMonth() + 1).padStart(2, '0')}`;
    await queryRunner.query(`
      CREATE TABLE sourcing.${appPartitionName} PARTITION OF sourcing.applications
      FOR VALUES FROM ('${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-01')
                     TO ('${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}-01');
    `);

    // Covering indexes for applications (all frequently queried columns)
    await queryRunner.query(`
      CREATE INDEX idx_applications_recruiter_call_date 
      ON sourcing.applications (recruiter_id, call_date) 
      INCLUDE (call_status, interested, selection_status, joining_status);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_applications_candidate ON sourcing.applications (candidate_id);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_applications_job_role ON sourcing.applications (job_role_id);
    `);

    // Partial indexes for joining_status (most common filter)
    await queryRunner.query(`
      CREATE INDEX idx_applications_joining_status 
      ON sourcing.applications (joining_status, assigned_date) 
      WHERE joining_status IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX idx_applications_interested 
      ON sourcing.applications (interested, call_date) 
      WHERE interested = 1; -- Only interested candidates
    `);

    // Call logs table (optional, for detailed call tracking)
    await queryRunner.query(`
      CREATE TABLE sourcing.call_logs (
        id BIGSERIAL PRIMARY KEY,
        application_id BIGINT NOT NULL, -- No FK for performance
        recruiter_id INTEGER NOT NULL REFERENCES sourcing.recruiters(id),
        call_date TIMESTAMP NOT NULL,
        call_duration_seconds INTEGER,
        call_status SMALLINT NOT NULL,
        notes TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        
        CONSTRAINT call_logs_application_date_unique UNIQUE (application_id, call_date)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_call_logs_recruiter_date ON sourcing.call_logs (recruiter_id, call_date);
      CREATE INDEX idx_call_logs_application ON sourcing.call_logs (application_id);
    `);

    // ============================================
    // LAYER C: ANALYTICS (Materialized Views)
    // ============================================

    // Materialized view for recruiter daily stats
    await queryRunner.query(`
      CREATE MATERIALIZED VIEW sourcing.mv_recruiter_daily_stats AS
      SELECT 
        a.recruiter_id,
        a.call_date,
        COUNT(*) as total_calls,
        COUNT(*) FILTER (WHERE a.interested = 1) as interested_count,
        COUNT(*) FILTER (WHERE a.selection_status = 1) as selected_count,
        COUNT(*) FILTER (WHERE a.joining_status = 1) as joined_count,
        COUNT(*) FILTER (WHERE a.call_status = 3) as connected_calls,
        COUNT(*) FILTER (WHERE a.call_status = 4) as wrong_number_count
      FROM sourcing.applications a
      WHERE a.call_date IS NOT NULL
      GROUP BY a.recruiter_id, a.call_date;
    `);

    // Index on materialized view
    await queryRunner.query(`
      CREATE UNIQUE INDEX idx_mv_recruiter_daily_stats_unique 
      ON sourcing.mv_recruiter_daily_stats (recruiter_id, call_date);
    `);

    await queryRunner.query(`
      CREATE INDEX idx_mv_recruiter_daily_stats_date 
      ON sourcing.mv_recruiter_daily_stats (call_date);
    `);

    // ============================================
    // HELPER FUNCTIONS
    // ============================================

    // Function to create monthly partitions automatically
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION sourcing.create_monthly_partition(
        table_name TEXT,
        partition_date DATE
      )
      RETURNS VOID AS $$
      DECLARE
        start_date DATE;
        end_date DATE;
        partition_name TEXT;
      BEGIN
        start_date := date_trunc('month', partition_date);
        end_date := start_date + INTERVAL '1 month';
        partition_name := table_name || '_' || to_char(start_date, 'YYYY_MM');
        
        -- Check if partition already exists
        IF NOT EXISTS (
          SELECT 1 FROM pg_class WHERE relname = partition_name
        ) THEN
          EXECUTE format(
            'CREATE TABLE sourcing.%I PARTITION OF sourcing.%I FOR VALUES FROM (%L) TO (%L)',
            partition_name,
            table_name,
            start_date,
            end_date
          );
        END IF;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Function to refresh materialized view
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION sourcing.refresh_recruiter_stats()
      RETURNS VOID AS $$
      BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY sourcing.mv_recruiter_daily_stats;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Status mapping functions (for ETL)
    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION sourcing.map_call_status(status_text TEXT)
      RETURNS SMALLINT AS $$
      BEGIN
        RETURN CASE UPPER(TRIM(COALESCE(status_text, '')))
          WHEN 'BUSY' THEN 1
          WHEN 'RNR' THEN 2
          WHEN 'CONNECTED' THEN 3
          WHEN 'WRONG NUMBER' THEN 4
          ELSE NULL
        END;
      END;
      $$ LANGUAGE plpgsql IMMUTABLE;
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION sourcing.map_interested(status_text TEXT)
      RETURNS SMALLINT AS $$
      BEGIN
        RETURN CASE UPPER(TRIM(COALESCE(status_text, '')))
          WHEN 'YES' THEN 1
          WHEN 'NO' THEN 2
          WHEN 'CALL BACK LATER' THEN 3
          ELSE NULL
        END;
      END;
      $$ LANGUAGE plpgsql IMMUTABLE;
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION sourcing.map_selection_status(status_text TEXT)
      RETURNS SMALLINT AS $$
      BEGIN
        RETURN CASE UPPER(TRIM(COALESCE(status_text, '')))
          WHEN 'SELECTED' THEN 1
          WHEN 'NOT SELECTED' THEN 2
          ELSE NULL
        END;
      END;
      $$ LANGUAGE plpgsql IMMUTABLE;
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION sourcing.map_joining_status(status_text TEXT)
      RETURNS SMALLINT AS $$
      BEGIN
        RETURN CASE UPPER(TRIM(COALESCE(status_text, '')))
          WHEN 'JOINED' THEN 1
          WHEN 'NOT JOINED' THEN 2
          WHEN 'PENDING' THEN 3
          ELSE NULL
        END;
      END;
      $$ LANGUAGE plpgsql IMMUTABLE;
    `);

    // ============================================
    // GRANTS (if using role-based access)
    // ============================================
    // Uncomment and adjust based on your user roles
    // await queryRunner.query(`GRANT USAGE ON SCHEMA sourcing TO jobsmato_user;`);
    // await queryRunner.query(`GRANT ALL ON ALL TABLES IN SCHEMA sourcing TO jobsmato_user;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop materialized view
    await queryRunner.query(`DROP MATERIALIZED VIEW IF EXISTS sourcing.mv_recruiter_daily_stats;`);

    // Drop functions
    await queryRunner.query(`DROP FUNCTION IF EXISTS sourcing.refresh_recruiter_stats();`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS sourcing.create_monthly_partition(TEXT, DATE);`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS sourcing.map_joining_status(TEXT);`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS sourcing.map_selection_status(TEXT);`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS sourcing.map_interested(TEXT);`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS sourcing.map_call_status(TEXT);`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS sourcing.update_candidate_phone_hash();`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS sourcing.hash_phone(TEXT);`);

    // Drop tables (partitions will be dropped automatically)
    await queryRunner.query(`DROP TABLE IF EXISTS sourcing.call_logs CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS sourcing.applications CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS sourcing.candidates CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS sourcing.job_roles CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS sourcing.portals CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS sourcing.recruiters CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS sourcing.raw_candidate_logs CASCADE;`);

    // Drop schema
    await queryRunner.query(`DROP SCHEMA IF EXISTS sourcing CASCADE;`);
  }
}
