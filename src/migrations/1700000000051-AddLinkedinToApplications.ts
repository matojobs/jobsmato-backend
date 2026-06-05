import { MigrationInterface, QueryRunner } from 'typeorm';

/** Optional LinkedIn profile URL captured on the sourcing application. */
export class AddLinkedinToApplications1700000000051 implements MigrationInterface {
  name = 'AddLinkedinToApplications1700000000051';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sourcing.applications
        ADD COLUMN IF NOT EXISTS linkedin text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE sourcing.applications
        DROP COLUMN IF EXISTS linkedin
    `);
  }
}
