import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Recruiter-editable candidate location + resume/CV tracking on the sourcing application.
 *
 * - sourcing.candidates.location  → free-text city the recruiter can edit.
 * - sourcing.applications.resume_status         → 'Received' | 'Pending' | 'Not Reachable' (captured after Interested).
 * - sourcing.applications.resume_link           → link to the received CV (Drive/WhatsApp/etc).
 * - sourcing.applications.resume_followup_date  → date to chase the CV when status is Pending.
 */
export class AddLocationAndResumeTracking1700000000052 implements MigrationInterface {
  name = 'AddLocationAndResumeTracking1700000000052';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sourcing.candidates
        ADD COLUMN IF NOT EXISTS location varchar(255)
    `);
    await queryRunner.query(`
      ALTER TABLE sourcing.applications
        ADD COLUMN IF NOT EXISTS resume_status varchar(20),
        ADD COLUMN IF NOT EXISTS resume_link text,
        ADD COLUMN IF NOT EXISTS resume_followup_date date
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sourcing.applications
        DROP COLUMN IF EXISTS resume_status,
        DROP COLUMN IF EXISTS resume_link,
        DROP COLUMN IF EXISTS resume_followup_date
    `);
    await queryRunner.query(`
      ALTER TABLE sourcing.candidates
        DROP COLUMN IF EXISTS location
    `);
  }
}
