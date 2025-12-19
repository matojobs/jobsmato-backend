import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateLanguagesToJSONB1700000000014 implements MigrationInterface {
  name = 'UpdateLanguagesToJSONB1700000000014';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Add new JSONB column for languages with proficiency
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN IF NOT EXISTS "languages_new" jsonb DEFAULT '[]'::jsonb;
    `);

    // Step 2: Migrate existing data from text array to JSONB array
    // Convert ['English', 'Hindi'] to [{'language': 'English'}, {'language': 'Hindi'}]
    await queryRunner.query(`
      UPDATE "users" 
      SET "languages_new" = (
        SELECT jsonb_agg(jsonb_build_object('language', lang))
        FROM unnest("languages") AS lang
        WHERE lang IS NOT NULL
      )
      WHERE "languages" IS NOT NULL AND array_length("languages", 1) > 0;
    `);

    // Set empty array for users with null or empty languages
    await queryRunner.query(`
      UPDATE "users" 
      SET "languages_new" = '[]'::jsonb
      WHERE "languages_new" IS NULL;
    `);

    // Step 3: Drop old column
    await queryRunner.query(`
      ALTER TABLE "users" 
      DROP COLUMN IF EXISTS "languages";
    `);

    // Step 4: Rename new column to original name
    await queryRunner.query(`
      ALTER TABLE "users" 
      RENAME COLUMN "languages_new" TO "languages";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Add back old text array column
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN IF NOT EXISTS "languages_old" text[] DEFAULT '{}';
    `);

    // Step 2: Migrate data back from JSONB to text array
    // Extract language names from JSONB array
    await queryRunner.query(`
      UPDATE "users" 
      SET "languages_old" = (
        SELECT array_agg(lang->>'language')
        FROM jsonb_array_elements("languages") AS lang
        WHERE lang->>'language' IS NOT NULL
      )
      WHERE "languages" IS NOT NULL AND jsonb_array_length("languages") > 0;
    `);

    // Set empty array for users with null or empty languages
    await queryRunner.query(`
      UPDATE "users" 
      SET "languages_old" = '{}'
      WHERE "languages_old" IS NULL;
    `);

    // Step 3: Drop new column
    await queryRunner.query(`
      ALTER TABLE "users" 
      DROP COLUMN IF EXISTS "languages";
    `);

    // Step 4: Rename old column back
    await queryRunner.query(`
      ALTER TABLE "users" 
      RENAME COLUMN "languages_old" TO "languages";
    `);
  }
}

