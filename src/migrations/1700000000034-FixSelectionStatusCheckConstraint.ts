import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * The original constraint (migration 021) only allowed selection_status BETWEEN 1 AND 2.
 * PENDING (3) was added later as a valid value but the constraint was never updated,
 * causing a check constraint violation whenever selection_status = 3 is written.
 *
 * Fix: expand the constraint to BETWEEN 1 AND 3 on the parent table and all existing
 * monthly partitions so that NULL | 1 (SELECTED) | 2 (NOT_SELECTED) | 3 (PENDING)
 * are all accepted.
 */
export class FixSelectionStatusCheckConstraint1700000000034
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop old constraint from parent (cascades to all partitions automatically)
    await queryRunner.query(`
      ALTER TABLE sourcing.applications
      DROP CONSTRAINT IF EXISTS applications_selection_status_check;
    `);

    // Drop from any partitions that inherited/copied the constraint separately
    const partitions: { tablename: string }[] = await queryRunner.query(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'sourcing'
        AND tablename LIKE 'applications_%'
        AND tablename != 'applications';
    `);

    for (const { tablename } of partitions) {
      await queryRunner.query(`
        ALTER TABLE sourcing.${tablename}
        DROP CONSTRAINT IF EXISTS applications_selection_status_check;
      `);
    }

    // Add updated constraint on parent — NULL or 1-3
    await queryRunner.query(`
      ALTER TABLE sourcing.applications
      ADD CONSTRAINT applications_selection_status_check
      CHECK (selection_status IS NULL OR selection_status BETWEEN 1 AND 3);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sourcing.applications
      DROP CONSTRAINT IF EXISTS applications_selection_status_check;
    `);

    await queryRunner.query(`
      ALTER TABLE sourcing.applications
      ADD CONSTRAINT applications_selection_status_check
      CHECK (selection_status IS NULL OR selection_status BETWEEN 1 AND 2);
    `);
  }
}
