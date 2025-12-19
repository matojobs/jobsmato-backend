import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGoogleIdToUser1700000000011 implements MigrationInterface {
  name = 'AddGoogleIdToUser1700000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add googleId column
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN IF NOT EXISTS "googleId" character varying;
    `);

    // Make password nullable (for OAuth users who don't have passwords)
    await queryRunner.query(`
      ALTER TABLE "users" 
      ALTER COLUMN "password" DROP NOT NULL;
    `);

    // Create unique index on googleId
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_users_googleId" 
      ON "users" ("googleId") 
      WHERE "googleId" IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_users_googleId";
    `);

    // Make password NOT NULL again (if needed)
    // Note: This might fail if there are users with NULL passwords
    await queryRunner.query(`
      ALTER TABLE "users" 
      ALTER COLUMN "password" SET NOT NULL;
    `);

    // Drop googleId column
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "googleId";
    `);
  }
}

