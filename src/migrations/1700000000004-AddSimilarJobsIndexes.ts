import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSimilarJobsIndexes1700000000004 implements MigrationInterface {
  name = 'AddSimilarJobsIndexes1700000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add indexes for similar jobs performance
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_jobs_category" ON "jobs" ("category")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_jobs_location" ON "jobs" ("location")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_jobs_type" ON "jobs" ("type")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_jobs_industry" ON "jobs" ("industry")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_jobs_experience" ON "jobs" ("experience")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_jobs_status_active" ON "jobs" ("status") WHERE "status" = 'active'`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_jobs_application_deadline" ON "jobs" ("applicationDeadline")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_jobs_is_remote" ON "jobs" ("isRemote")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove indexes in reverse order
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_jobs_is_remote"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_jobs_application_deadline"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_jobs_status_active"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_jobs_experience"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_jobs_industry"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_jobs_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_jobs_location"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_jobs_category"`);
  }
}
