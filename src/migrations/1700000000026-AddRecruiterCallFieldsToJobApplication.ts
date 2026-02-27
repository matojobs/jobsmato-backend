import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add recruiter call fields to job_applications for Pending Applications (recruiter portal).
 * Until recruiter fills these, the application is "pending" for recruiter workflow.
 */
export class AddRecruiterCallFieldsToJobApplication1700000000026 implements MigrationInterface {
  name = 'AddRecruiterCallFieldsToJobApplication1700000000026';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "job_applications"
      ADD COLUMN IF NOT EXISTS "recruiter_call_date" DATE
    `);
    await queryRunner.query(`
      ALTER TABLE "job_applications"
      ADD COLUMN IF NOT EXISTS "recruiter_call_status" character varying
    `);
    await queryRunner.query(`
      ALTER TABLE "job_applications"
      ADD COLUMN IF NOT EXISTS "recruiter_interested" boolean
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "job_applications" DROP COLUMN IF EXISTS "recruiter_interested"`);
    await queryRunner.query(`ALTER TABLE "job_applications" DROP COLUMN IF EXISTS "recruiter_call_status"`);
    await queryRunner.query(`ALTER TABLE "job_applications" DROP COLUMN IF EXISTS "recruiter_call_date"`);
  }
}
