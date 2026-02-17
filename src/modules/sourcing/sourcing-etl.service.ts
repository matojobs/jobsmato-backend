/**
 * Sourcing ETL Service
 * 
 * Transforms raw candidate logs (Layer A) into structured tables (Layer B)
 * 
 * Usage:
 * 1. Load data into sourcing.raw_candidate_logs via COPY
 * 2. Call transformBatch(batchId) to normalize and load into Layer B
 * 3. Refresh materialized view for analytics
 */

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

interface RawCandidateLog {
  id: bigint;
  batch_id: string;
  imported_at: Date;
  candidate_name: string;
  candidate_phone: string;
  candidate_email: string;
  portal_name: string;
  job_role: string;
  recruiter_name: string;
  assigned_date: Date;
  call_date: Date;
  call_status: string;
  interested: string;
  selection_status: string;
  joining_status: string;
  notes: string;
}

@Injectable()
export class SourcingEtlService {
  constructor(
    @InjectRepository(DataSource)
    private dataSource: DataSource,
  ) {}

  /**
   * Transform raw batch into structured tables
   */
  async transformBatch(batchId: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Step 1: Extract and upsert recruiters
      await this.upsertRecruiters(queryRunner, batchId);

      // Step 2: Extract and upsert portals
      await this.upsertPortals(queryRunner, batchId);

      // Step 3: Extract and upsert job roles
      await this.upsertJobRoles(queryRunner, batchId);

      // Step 4: Transform and upsert candidates
      await this.upsertCandidates(queryRunner, batchId);

      // Step 5: Transform and upsert applications
      await this.upsertApplications(queryRunner, batchId);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Extract unique recruiters from raw logs and upsert
   */
  private async upsertRecruiters(queryRunner: any, batchId: string): Promise<void> {
    await queryRunner.query(`
      INSERT INTO sourcing.recruiters (name, email, created_at, updated_at)
      SELECT DISTINCT
        recruiter_name as name,
        NULL as email,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      FROM sourcing.raw_candidate_logs
      WHERE batch_id = $1
        AND recruiter_name IS NOT NULL
      ON CONFLICT (name) DO NOTHING;
    `, [batchId]);
  }

  /**
   * Extract unique portals from raw logs and upsert
   */
  private async upsertPortals(queryRunner: any, batchId: string): Promise<void> {
    await queryRunner.query(`
      INSERT INTO sourcing.portals (name, created_at)
      SELECT DISTINCT
        portal_name as name,
        CURRENT_TIMESTAMP
      FROM sourcing.raw_candidate_logs
      WHERE batch_id = $1
        AND portal_name IS NOT NULL
      ON CONFLICT (name) DO NOTHING;
    `, [batchId]);
  }

  /**
   * Extract job roles and link to companies
   * Note: Requires company_id mapping logic (implement based on your business rules)
   */
  private async upsertJobRoles(queryRunner: any, batchId: string): Promise<void> {
    // Example: Map job_role to company_id
    // You may need to implement fuzzy matching or lookup table
    await queryRunner.query(`
      INSERT INTO sourcing.job_roles (company_id, role_name, created_at, updated_at)
      SELECT DISTINCT
        -- TODO: Implement company_id mapping logic
        -- For now, using a placeholder (you'll need to map job_role to company_id)
        (SELECT id FROM companies LIMIT 1) as company_id,
        job_role as role_name,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      FROM sourcing.raw_candidate_logs
      WHERE batch_id = $1
        AND job_role IS NOT NULL
      ON CONFLICT (company_id, role_name) DO NOTHING;
    `, [batchId]);
  }

  /**
   * Transform candidates with phone hash
   */
  private async upsertCandidates(queryRunner: any, batchId: string): Promise<void> {
    await queryRunner.query(`
      INSERT INTO sourcing.candidates (name, phone, email, portal_id, created_at, updated_at)
      SELECT DISTINCT ON (sourcing.hash_phone(candidate_phone))
        candidate_name as name,
        candidate_phone as phone,
        candidate_email as email,
        (SELECT id FROM sourcing.portals WHERE name = r.portal_name LIMIT 1) as portal_id,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      FROM sourcing.raw_candidate_logs r
      WHERE batch_id = $1
        AND candidate_phone IS NOT NULL
      ON CONFLICT (phone_hash) DO UPDATE SET
        updated_at = CURRENT_TIMESTAMP;
    `, [batchId]);
  }

  /**
   * Transform applications with status mapping
   */
  private async upsertApplications(queryRunner: any, batchId: string): Promise<void> {
    await queryRunner.query(`
      INSERT INTO sourcing.applications (
        candidate_id,
        recruiter_id,
        job_role_id,
        assigned_date,
        call_date,
        call_status,
        interested,
        selection_status,
        joining_status,
        notes,
        created_at,
        updated_at
      )
      SELECT
        c.id as candidate_id,
        r.id as recruiter_id,
        jr.id as job_role_id,
        r.assigned_date,
        r.call_date,
        sourcing.map_call_status(r.call_status) as call_status,
        sourcing.map_interested(r.interested) as interested,
        sourcing.map_selection_status(r.selection_status) as selection_status,
        sourcing.map_joining_status(r.joining_status) as joining_status,
        r.notes,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      FROM sourcing.raw_candidate_logs r
      INNER JOIN sourcing.candidates c ON c.phone_hash = sourcing.hash_phone(r.candidate_phone)
      INNER JOIN sourcing.recruiters rec ON rec.name = r.recruiter_name
      INNER JOIN sourcing.job_roles jr ON jr.role_name = r.job_role
      WHERE r.batch_id = $1
        AND r.candidate_phone IS NOT NULL;
    `, [batchId]);
  }

  /**
   * Refresh materialized view (call after ETL completes)
   */
  async refreshMaterializedView(): Promise<void> {
    await this.dataSource.query(`
      REFRESH MATERIALIZED VIEW CONCURRENTLY sourcing.mv_recruiter_daily_stats;
    `);
  }

  /**
   * Status mapping functions (create these in PostgreSQL)
   * 
   * CREATE OR REPLACE FUNCTION sourcing.map_call_status(status_text TEXT)
   * RETURNS SMALLINT AS $$
   * BEGIN
   *   RETURN CASE UPPER(TRIM(status_text))
   *     WHEN 'BUSY' THEN 1
   *     WHEN 'RNR' THEN 2
   *     WHEN 'CONNECTED' THEN 3
   *     WHEN 'WRONG NUMBER' THEN 4
   *     ELSE NULL
   *   END;
   * END;
   * $$ LANGUAGE plpgsql IMMUTABLE;
   * 
   * CREATE OR REPLACE FUNCTION sourcing.map_interested(status_text TEXT)
   * RETURNS SMALLINT AS $$
   * BEGIN
   *   RETURN CASE UPPER(TRIM(status_text))
   *     WHEN 'YES' THEN 1
   *     WHEN 'NO' THEN 2
   *     WHEN 'CALL BACK LATER' THEN 3
   *     ELSE NULL
   *   END;
   * END;
   * $$ LANGUAGE plpgsql IMMUTABLE;
   * 
   * CREATE OR REPLACE FUNCTION sourcing.map_selection_status(status_text TEXT)
   * RETURNS SMALLINT AS $$
   * BEGIN
   *   RETURN CASE UPPER(TRIM(status_text))
   *     WHEN 'SELECTED' THEN 1
   *     WHEN 'NOT SELECTED' THEN 2
   *     ELSE NULL
   *   END;
   * END;
   * $$ LANGUAGE plpgsql IMMUTABLE;
   * 
   * CREATE OR REPLACE FUNCTION sourcing.map_joining_status(status_text TEXT)
   * RETURNS SMALLINT AS $$
   * BEGIN
   *   RETURN CASE UPPER(TRIM(status_text))
   *     WHEN 'JOINED' THEN 1
   *     WHEN 'NOT JOINED' THEN 2
   *     WHEN 'PENDING' THEN 3
   *     ELSE NULL
   *   END;
   * END;
   * $$ LANGUAGE plpgsql IMMUTABLE;
   */
}
