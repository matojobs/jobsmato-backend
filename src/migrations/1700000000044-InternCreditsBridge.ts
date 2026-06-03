import { MigrationInterface, QueryRunner } from 'typeorm';

export class InternCreditsBridge1700000000044 implements MigrationInterface {
  name = 'InternCreditsBridge1700000000044';

  async up(qr: QueryRunner): Promise<void> {
    // Fix convertedByInternId column type: INT → VARCHAR(36) to hold UUID enrollment IDs
    await qr.query(`
      ALTER TABLE training_candidates
        ALTER COLUMN "convertedByInternId" TYPE VARCHAR(36) USING NULL;
    `);

    // HRMS bridge: tag sourcing applications with which intern sourced the candidate
    await qr.query(`
      ALTER TABLE sourcing.applications
        ADD COLUMN IF NOT EXISTS sourced_by_intern_enrollment_id VARCHAR(36);
      CREATE INDEX IF NOT EXISTS idx_sourcing_apps_intern
        ON sourcing.applications(sourced_by_intern_enrollment_id)
        WHERE sourced_by_intern_enrollment_id IS NOT NULL;
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE training_candidates
        ALTER COLUMN "convertedByInternId" TYPE INTEGER USING NULL;
      ALTER TABLE sourcing.applications
        DROP COLUMN IF EXISTS sourced_by_intern_enrollment_id;
    `);
  }
}
