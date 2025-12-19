import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeLastNameNullable1700000000016 implements MigrationInterface {
  name = 'MakeLastNameNullable1700000000016';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Make lastName column nullable to support Google OAuth users without last names
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "lastName" DROP NOT NULL;
    `);

    // Update existing NULL values to empty string (optional, for consistency)
    await queryRunner.query(`
      UPDATE "users"
      SET "lastName" = ''
      WHERE "lastName" IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Update empty strings back to NULL before making NOT NULL
    await queryRunner.query(`
      UPDATE "users"
      SET "lastName" = NULL
      WHERE "lastName" = '';
    `);

    // Revert lastName column to NOT NULL
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "lastName" SET NOT NULL;
    `);
  }
}

