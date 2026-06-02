import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOperationsFields1700000000040 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add 'operations' role to users enum
    await queryRunner.query(`
      ALTER TYPE users_role_enum ADD VALUE IF NOT EXISTS 'operations';
    `);

    // Add CV + interview scheduling fields to intern_activity_logs
    await queryRunner.query(`
      ALTER TABLE intern_activity_logs
        ADD COLUMN IF NOT EXISTS "cvUrl"              VARCHAR,
        ADD COLUMN IF NOT EXISTS "interviewDate"      DATE,
        ADD COLUMN IF NOT EXISTS "interviewTime"      VARCHAR,
        ADD COLUMN IF NOT EXISTS "clientName"         VARCHAR,
        ADD COLUMN IF NOT EXISTS "interviewMode"      VARCHAR,
        ADD COLUMN IF NOT EXISTS "interviewLocation"  VARCHAR,
        ADD COLUMN IF NOT EXISTS "clientFeedback"     TEXT,
        ADD COLUMN IF NOT EXISTS "opsNotes"           TEXT;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE intern_activity_logs
        DROP COLUMN IF EXISTS "cvUrl",
        DROP COLUMN IF EXISTS "interviewDate",
        DROP COLUMN IF EXISTS "interviewTime",
        DROP COLUMN IF EXISTS "clientName",
        DROP COLUMN IF EXISTS "interviewMode",
        DROP COLUMN IF EXISTS "interviewLocation",
        DROP COLUMN IF EXISTS "clientFeedback",
        DROP COLUMN IF EXISTS "opsNotes";
    `);
  }
}
