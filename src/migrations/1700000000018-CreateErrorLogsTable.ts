import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateErrorLogsTable1700000000018 implements MigrationInterface {
  name = 'CreateErrorLogsTable1700000000018';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "error_logs" (
        "id" SERIAL NOT NULL,
        "errorType" character varying(100) NOT NULL,
        "message" text NOT NULL,
        "stack" text,
        "method" character varying(10) NOT NULL,
        "url" text NOT NULL,
        "statusCode" integer NOT NULL,
        "userId" integer,
        "userEmail" character varying,
        "userRole" character varying,
        "ipAddress" character varying,
        "userAgent" text,
        "requestData" jsonb,
        "context" character varying(100),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_error_logs" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_error_logs_errorType" ON "error_logs" ("errorType")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_error_logs_url" ON "error_logs" ("url")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_error_logs_statusCode" ON "error_logs" ("statusCode")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_error_logs_userId" ON "error_logs" ("userId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_error_logs_createdAt" ON "error_logs" ("createdAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_error_logs_createdAt"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_error_logs_userId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_error_logs_statusCode"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_error_logs_url"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_error_logs_errorType"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "error_logs"`);
  }
}

