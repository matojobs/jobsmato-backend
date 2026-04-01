import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add date_of_birth to sourcing.candidates for recruiter portal candidate age / DOB.
 * Frontend can show age (computed from DOB) or date_of_birth in dashboard, list, export, modals.
 */
export class AddDateOfBirthToSourcingCandidates1700000000027 implements MigrationInterface {
  name = 'AddDateOfBirthToSourcingCandidates1700000000027';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE sourcing.candidates ADD COLUMN IF NOT EXISTS date_of_birth DATE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE sourcing.candidates DROP COLUMN IF EXISTS date_of_birth`,
    );
  }
}
