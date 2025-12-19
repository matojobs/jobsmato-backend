import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixPreferredLocationsNullValues1700000000015 implements MigrationInterface {
  name = 'FixPreferredLocationsNullValues1700000000015';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Fix NULL values in preferredLocations column
    await queryRunner.query(`
      UPDATE "users" 
      SET "preferredLocations" = '{}'
      WHERE "preferredLocations" IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No need to rollback - this is a data fix
  }
}

