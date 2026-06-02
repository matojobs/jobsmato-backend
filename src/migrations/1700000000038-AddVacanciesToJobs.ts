import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddVacanciesToJobs1700000000038 implements MigrationInterface {
  name = 'AddVacanciesToJobs1700000000038';

  async up(qr: QueryRunner): Promise<void> {
    await qr.query(`
      ALTER TABLE jobs
        ADD COLUMN IF NOT EXISTS vacancies JSONB NULL
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`ALTER TABLE jobs DROP COLUMN IF EXISTS vacancies`);
  }
}
