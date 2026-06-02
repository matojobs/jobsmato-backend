import { MigrationInterface, QueryRunner } from 'typeorm';

export class JdAndCandidateLock1700000000041 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // JD file path on job posts
    await queryRunner.query(`
      ALTER TABLE jobs ADD COLUMN IF NOT EXISTS "jdPath" VARCHAR;
    `);

    // Candidate lock — prevent reassignment once interested
    await queryRunner.query(`
      ALTER TABLE training_candidates
        ADD COLUMN IF NOT EXISTS "lockedByEnrollmentId" VARCHAR,
        ADD COLUMN IF NOT EXISTS "lockedAt"             TIMESTAMP;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE jobs DROP COLUMN IF EXISTS "jdPath";`);
    await queryRunner.query(`
      ALTER TABLE training_candidates
        DROP COLUMN IF EXISTS "lockedByEnrollmentId",
        DROP COLUMN IF EXISTS "lockedAt";
    `);
  }
}
