import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Extend the joining_status CHECK constraint to include value 4 (Backed Out).
 * Previously the constraint was BETWEEN 1 AND 3, which blocked saving Backed Out.
 */
export class AllowBackedOutJoiningStatus1700000000033 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop old constraint (1–3 only)
    await queryRunner.query(`
      ALTER TABLE sourcing.applications
      DROP CONSTRAINT IF EXISTS applications_joining_status_check;
    `);

    // Add updated constraint (1–4: Joined, Not Joined, Pending, Backed Out)
    await queryRunner.query(`
      ALTER TABLE sourcing.applications
      ADD CONSTRAINT applications_joining_status_check
      CHECK (joining_status IS NULL OR joining_status BETWEEN 1 AND 4);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sourcing.applications
      DROP CONSTRAINT IF EXISTS applications_joining_status_check;
    `);

    await queryRunner.query(`
      ALTER TABLE sourcing.applications
      ADD CONSTRAINT applications_joining_status_check
      CHECK (joining_status IS NULL OR joining_status BETWEEN 1 AND 3);
    `);
  }
}
