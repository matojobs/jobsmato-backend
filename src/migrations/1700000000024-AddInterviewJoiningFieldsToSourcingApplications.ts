import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add interview_date, interview_status, joining_date to sourcing.applications
 * for recruiter portal application updates.
 */
export class AddInterviewJoiningFieldsToSourcingApplications1700000000024
  implements MigrationInterface
{
  name = 'AddInterviewJoiningFieldsToSourcingApplications1700000000024';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE sourcing.applications ADD COLUMN IF NOT EXISTS interview_date DATE`,
    );
    await queryRunner.query(
      `ALTER TABLE sourcing.applications ADD COLUMN IF NOT EXISTS interview_status VARCHAR(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE sourcing.applications ADD COLUMN IF NOT EXISTS joining_date DATE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE sourcing.applications DROP COLUMN IF EXISTS interview_date`,
    );
    await queryRunner.query(
      `ALTER TABLE sourcing.applications DROP COLUMN IF EXISTS interview_status`,
    );
    await queryRunner.query(
      `ALTER TABLE sourcing.applications DROP COLUMN IF EXISTS joining_date`,
    );
  }
}
