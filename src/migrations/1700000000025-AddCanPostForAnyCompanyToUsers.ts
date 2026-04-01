import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add can_post_for_any_company to users.
 * When true for a recruiter, they can select any company in the job portal and post jobs for any company.
 */
export class AddCanPostForAnyCompanyToUsers1700000000025 implements MigrationInterface {
  name = 'AddCanPostForAnyCompanyToUsers1700000000025';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "can_post_for_any_company" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "can_post_for_any_company"
    `);
  }
}
