import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add recruiter Edit Candidate fields to sourcing.applications.
 * Supports PATCH /api/recruiter/applications/:id with all doc fields.
 */
export class AddRecruiterEditFieldsToSourcingApplications1700000000028 implements MigrationInterface {
  name = 'AddRecruiterEditFieldsToSourcingApplications1700000000028';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sourcing.applications ADD COLUMN IF NOT EXISTS portal VARCHAR(255)
    `);
    await queryRunner.query(`
      ALTER TABLE sourcing.applications ADD COLUMN IF NOT EXISTS not_interested_remark TEXT
    `);
    await queryRunner.query(`
      ALTER TABLE sourcing.applications ADD COLUMN IF NOT EXISTS interview_scheduled BOOLEAN
    `);
    await queryRunner.query(`
      ALTER TABLE sourcing.applications ADD COLUMN IF NOT EXISTS turnup BOOLEAN
    `);
    await queryRunner.query(`
      ALTER TABLE sourcing.applications ADD COLUMN IF NOT EXISTS backout_date DATE
    `);
    await queryRunner.query(`
      ALTER TABLE sourcing.applications ADD COLUMN IF NOT EXISTS backout_reason TEXT
    `);
    await queryRunner.query(`
      ALTER TABLE sourcing.applications ADD COLUMN IF NOT EXISTS hiring_manager_feedback TEXT
    `);
    await queryRunner.query(`
      ALTER TABLE sourcing.applications ADD COLUMN IF NOT EXISTS followup_date DATE
    `);
    // Allow call_status 5 = Switch off
    await queryRunner.query(`ALTER TABLE sourcing.applications DROP CONSTRAINT IF EXISTS applications_call_status_check`);
    await queryRunner.query(`
      ALTER TABLE sourcing.applications ADD CONSTRAINT applications_call_status_check
      CHECK (call_status IS NULL OR call_status BETWEEN 1 AND 5)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE sourcing.applications DROP CONSTRAINT IF EXISTS applications_call_status_check`);
    await queryRunner.query(`
      ALTER TABLE sourcing.applications ADD CONSTRAINT applications_call_status_check
      CHECK (call_status IS NULL OR call_status BETWEEN 1 AND 4)
    `);
    await queryRunner.query(`ALTER TABLE sourcing.applications DROP COLUMN IF EXISTS followup_date`);
    await queryRunner.query(`ALTER TABLE sourcing.applications DROP COLUMN IF EXISTS hiring_manager_feedback`);
    await queryRunner.query(`ALTER TABLE sourcing.applications DROP COLUMN IF EXISTS backout_reason`);
    await queryRunner.query(`ALTER TABLE sourcing.applications DROP COLUMN IF EXISTS backout_date`);
    await queryRunner.query(`ALTER TABLE sourcing.applications DROP COLUMN IF EXISTS turnup`);
    await queryRunner.query(`ALTER TABLE sourcing.applications DROP COLUMN IF EXISTS interview_scheduled`);
    await queryRunner.query(`ALTER TABLE sourcing.applications DROP COLUMN IF EXISTS not_interested_remark`);
    await queryRunner.query(`ALTER TABLE sourcing.applications DROP COLUMN IF EXISTS portal`);
  }
}
