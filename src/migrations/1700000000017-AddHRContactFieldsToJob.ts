import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHRContactFieldsToJob1700000000017 implements MigrationInterface {
  name = 'AddHRContactFieldsToJob1700000000017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add HR contact fields to jobs table
    await queryRunner.query(`
      ALTER TABLE "jobs"
      ADD COLUMN IF NOT EXISTS "hrName" character varying;
    `);

    await queryRunner.query(`
      ALTER TABLE "jobs"
      ADD COLUMN IF NOT EXISTS "hrContact" character varying;
    `);

    await queryRunner.query(`
      ALTER TABLE "jobs"
      ADD COLUMN IF NOT EXISTS "hrWhatsapp" character varying;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop HR contact fields
    await queryRunner.query(`
      ALTER TABLE "jobs"
      DROP COLUMN IF EXISTS "hrWhatsapp";
    `);

    await queryRunner.query(`
      ALTER TABLE "jobs"
      DROP COLUMN IF EXISTS "hrContact";
    `);

    await queryRunner.query(`
      ALTER TABLE "jobs"
      DROP COLUMN IF EXISTS "hrName";
    `);
  }
}

