import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLinkedInToTrainingCandidates1700000000045 implements MigrationInterface {
  name = 'AddLinkedInToTrainingCandidates1700000000045';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "training_candidates"
      ADD COLUMN IF NOT EXISTS "linkedIn" character varying
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "training_candidates"
      DROP COLUMN IF EXISTS "linkedIn"
    `);
  }
}
