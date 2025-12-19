import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOnboardingFieldsToUser1700000000010 implements MigrationInterface {
  name = 'AddOnboardingFieldsToUser1700000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Personal Information
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN IF NOT EXISTS "dateOfBirth" date,
      ADD COLUMN IF NOT EXISTS "gender" character varying CHECK ("gender" IN ('male', 'female', 'other'));
    `);

    // Professional Details
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "currentCompany" character varying,
      ADD COLUMN IF NOT EXISTS "currentJobTitle" character varying,
      ADD COLUMN IF NOT EXISTS "currentCTC" character varying;
    `);

    // Education Details
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "specialization" character varying,
      ADD COLUMN IF NOT EXISTS "university" character varying,
      ADD COLUMN IF NOT EXISTS "yearOfPassing" character varying;
    `);

    // Skills (separate fields)
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "technicalSkills" text[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS "functionalSkills" text[] DEFAULT '{}';
    `);

    // Experience Type
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "experienceType" character varying CHECK ("experienceType" IN ('fresher', 'experienced'));
    `);

    // Assets
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "hasBike" boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS "hasDrivingLicense" boolean DEFAULT false;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "dateOfBirth",
      DROP COLUMN IF EXISTS "gender",
      DROP COLUMN IF EXISTS "currentCompany",
      DROP COLUMN IF EXISTS "currentJobTitle",
      DROP COLUMN IF EXISTS "currentCTC",
      DROP COLUMN IF EXISTS "specialization",
      DROP COLUMN IF EXISTS "university",
      DROP COLUMN IF EXISTS "yearOfPassing",
      DROP COLUMN IF EXISTS "technicalSkills",
      DROP COLUMN IF EXISTS "functionalSkills",
      DROP COLUMN IF EXISTS "experienceType",
      DROP COLUMN IF EXISTS "hasBike",
      DROP COLUMN IF EXISTS "hasDrivingLicense";
    `);
  }
}

