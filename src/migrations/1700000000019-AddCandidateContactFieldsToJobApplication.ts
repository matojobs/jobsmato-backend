import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCandidateContactFieldsToJobApplication1700000000019 implements MigrationInterface {
  name = 'AddCandidateContactFieldsToJobApplication1700000000019';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "job_applications"
      ADD COLUMN IF NOT EXISTS "candidateName" character varying;
    `);
    await queryRunner.query(`
      ALTER TABLE "job_applications"
      ADD COLUMN IF NOT EXISTS "candidateEmail" character varying;
    `);
    await queryRunner.query(`
      ALTER TABLE "job_applications"
      ADD COLUMN IF NOT EXISTS "candidatePhone" character varying;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "job_applications"
      DROP COLUMN IF EXISTS "candidatePhone";
    `);
    await queryRunner.query(`
      ALTER TABLE "job_applications"
      DROP COLUMN IF EXISTS "candidateEmail";
    `);
    await queryRunner.query(`
      ALTER TABLE "job_applications"
      DROP COLUMN IF EXISTS "candidateName";
    `);
  }
}

