import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add recruiter Edit Candidate fields to job_applications (job portal applications).
 * Supports PATCH /api/recruiter/applications/:id for job_portal with all doc fields.
 */
export class AddRecruiterEditFieldsToJobApplications1700000000029 implements MigrationInterface {
  name = 'AddRecruiterEditFieldsToJobApplications1700000000029';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "job_applications" ADD COLUMN IF NOT EXISTS "portal" character varying`);
    await queryRunner.query(`ALTER TABLE "job_applications" ADD COLUMN IF NOT EXISTS "assigned_date" DATE`);
    await queryRunner.query(`ALTER TABLE "job_applications" ADD COLUMN IF NOT EXISTS "recruiter_notes" TEXT`);
    await queryRunner.query(`ALTER TABLE "job_applications" ADD COLUMN IF NOT EXISTS "not_interested_remark" TEXT`);
    await queryRunner.query(`ALTER TABLE "job_applications" ADD COLUMN IF NOT EXISTS "interview_scheduled" boolean`);
    await queryRunner.query(`ALTER TABLE "job_applications" ADD COLUMN IF NOT EXISTS "interview_date" DATE`);
    await queryRunner.query(`ALTER TABLE "job_applications" ADD COLUMN IF NOT EXISTS "turnup" boolean`);
    await queryRunner.query(`ALTER TABLE "job_applications" ADD COLUMN IF NOT EXISTS "interview_status" character varying`);
    await queryRunner.query(`ALTER TABLE "job_applications" ADD COLUMN IF NOT EXISTS "selection_status" character varying`);
    await queryRunner.query(`ALTER TABLE "job_applications" ADD COLUMN IF NOT EXISTS "joining_status" character varying`);
    await queryRunner.query(`ALTER TABLE "job_applications" ADD COLUMN IF NOT EXISTS "joining_date" DATE`);
    await queryRunner.query(`ALTER TABLE "job_applications" ADD COLUMN IF NOT EXISTS "backout_date" DATE`);
    await queryRunner.query(`ALTER TABLE "job_applications" ADD COLUMN IF NOT EXISTS "backout_reason" TEXT`);
    await queryRunner.query(`ALTER TABLE "job_applications" ADD COLUMN IF NOT EXISTS "hiring_manager_feedback" TEXT`);
    await queryRunner.query(`ALTER TABLE "job_applications" ADD COLUMN IF NOT EXISTS "followup_date" DATE`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "job_applications" DROP COLUMN IF EXISTS "followup_date"`);
    await queryRunner.query(`ALTER TABLE "job_applications" DROP COLUMN IF EXISTS "hiring_manager_feedback"`);
    await queryRunner.query(`ALTER TABLE "job_applications" DROP COLUMN IF EXISTS "backout_reason"`);
    await queryRunner.query(`ALTER TABLE "job_applications" DROP COLUMN IF EXISTS "backout_date"`);
    await queryRunner.query(`ALTER TABLE "job_applications" DROP COLUMN IF EXISTS "joining_date"`);
    await queryRunner.query(`ALTER TABLE "job_applications" DROP COLUMN IF EXISTS "joining_status"`);
    await queryRunner.query(`ALTER TABLE "job_applications" DROP COLUMN IF EXISTS "selection_status"`);
    await queryRunner.query(`ALTER TABLE "job_applications" DROP COLUMN IF EXISTS "interview_status"`);
    await queryRunner.query(`ALTER TABLE "job_applications" DROP COLUMN IF EXISTS "turnup"`);
    await queryRunner.query(`ALTER TABLE "job_applications" DROP COLUMN IF EXISTS "interview_date"`);
    await queryRunner.query(`ALTER TABLE "job_applications" DROP COLUMN IF EXISTS "interview_scheduled"`);
    await queryRunner.query(`ALTER TABLE "job_applications" DROP COLUMN IF EXISTS "not_interested_remark"`);
    await queryRunner.query(`ALTER TABLE "job_applications" DROP COLUMN IF EXISTS "recruiter_notes"`);
    await queryRunner.query(`ALTER TABLE "job_applications" DROP COLUMN IF EXISTS "assigned_date"`);
    await queryRunner.query(`ALTER TABLE "job_applications" DROP COLUMN IF EXISTS "portal"`);
  }
}
