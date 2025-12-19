import { MigrationInterface, QueryRunner } from 'typeorm';

export class ConvertExperienceTypeToNumber1700000000012 implements MigrationInterface {
  name = 'ConvertExperienceTypeToNumber1700000000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Add new integer column for experienceType
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN IF NOT EXISTS "experienceType_new" integer;
    `);

    // Step 2: Migrate existing data
    // Map 'fresher' -> 0, 'experienced' -> 1
    await queryRunner.query(`
      UPDATE "users" 
      SET "experienceType_new" = 
        CASE 
          WHEN "experienceType" = 'fresher' THEN 0
          WHEN "experienceType" = 'experienced' THEN 1
          ELSE NULL
        END;
    `);

    // Step 3: Drop the old column constraint and column
    await queryRunner.query(`
      ALTER TABLE "users" 
      DROP CONSTRAINT IF EXISTS "users_experienceType_check";
    `);
    
    await queryRunner.query(`
      ALTER TABLE "users" 
      DROP COLUMN IF EXISTS "experienceType";
    `);

    // Step 4: Rename new column to original name
    await queryRunner.query(`
      ALTER TABLE "users" 
      RENAME COLUMN "experienceType_new" TO "experienceType";
    `);

    // Step 5: Add check constraint to ensure values are non-negative
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD CONSTRAINT "users_experienceType_check" 
      CHECK ("experienceType" IS NULL OR "experienceType" >= 0);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Add back old varchar column
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN IF NOT EXISTS "experienceType_old" character varying;
    `);

    // Step 2: Migrate data back
    // Map 0 -> 'fresher', 1-4 -> 'experienced'
    await queryRunner.query(`
      UPDATE "users" 
      SET "experienceType_old" = 
        CASE 
          WHEN "experienceType" = 0 THEN 'fresher'
          WHEN "experienceType" >= 1 AND "experienceType" <= 4 THEN 'experienced'
          ELSE NULL
        END;
    `);

    // Step 3: Drop new column and constraint
    await queryRunner.query(`
      ALTER TABLE "users" 
      DROP CONSTRAINT IF EXISTS "users_experienceType_check";
    `);
    
    await queryRunner.query(`
      ALTER TABLE "users" 
      DROP COLUMN IF EXISTS "experienceType";
    `);

    // Step 4: Rename old column back
    await queryRunner.query(`
      ALTER TABLE "users" 
      RENAME COLUMN "experienceType_old" TO "experienceType";
    `);

    // Step 5: Add back original check constraint
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD CONSTRAINT "users_experienceType_check" 
      CHECK ("experienceType" IS NULL OR "experienceType" IN ('fresher', 'experienced'));
    `);
  }
}

