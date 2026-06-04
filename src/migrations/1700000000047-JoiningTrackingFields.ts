import { MigrationInterface, QueryRunner } from 'typeorm';

export class JoiningTrackingFields1700000000047 implements MigrationInterface {
  name = 'JoiningTrackingFields1700000000047';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "intern_activity_logs"
        ADD COLUMN IF NOT EXISTS "expectedJoiningDate" date,
        ADD COLUMN IF NOT EXISTS "backoutDate"         date,
        ADD COLUMN IF NOT EXISTS "backoutReason"       text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "intern_activity_logs"
        DROP COLUMN IF EXISTS "expectedJoiningDate",
        DROP COLUMN IF EXISTS "backoutDate",
        DROP COLUMN IF EXISTS "backoutReason"
    `);
  }
}
