import { MigrationInterface, QueryRunner } from 'typeorm';

export class InternActivityLogExtraFields1700000000046 implements MigrationInterface {
  name = 'InternActivityLogExtraFields1700000000046';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "intern_activity_logs"
        ADD COLUMN IF NOT EXISTS "followupTime"  character varying,
        ADD COLUMN IF NOT EXISTS "experience"    character varying,
        ADD COLUMN IF NOT EXISTS "currentSalary" character varying,
        ADD COLUMN IF NOT EXISTS "workingStatus" character varying
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "intern_activity_logs"
        DROP COLUMN IF EXISTS "followupTime",
        DROP COLUMN IF EXISTS "experience",
        DROP COLUMN IF EXISTS "currentSalary",
        DROP COLUMN IF EXISTS "workingStatus"
    `);
  }
}
