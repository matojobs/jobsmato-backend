import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Capture the negative funnel at every drop-off stage. We already store
 * not_interested_remark and backout_reason; this adds the two missing ones:
 * why an interviewee did not attend, and why they were rejected.
 */
export class NegativeFunnelReasons1700000000050 implements MigrationInterface {
  name = 'NegativeFunnelReasons1700000000050';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sourcing.applications
        ADD COLUMN IF NOT EXISTS not_attended_reason text,
        ADD COLUMN IF NOT EXISTS rejection_reason    text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sourcing.applications
        DROP COLUMN IF EXISTS rejection_reason,
        DROP COLUMN IF EXISTS not_attended_reason
    `);
  }
}
