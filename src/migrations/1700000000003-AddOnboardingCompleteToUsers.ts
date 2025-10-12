import { MigrationInterface, QueryRunner, TableColumn, Index } from 'typeorm';

export class AddOnboardingCompleteToUsers1700000000003 implements MigrationInterface {
  name = 'AddOnboardingCompleteToUsers1700000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the onboardingComplete column to users table
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'onboardingComplete',
        type: 'boolean',
        default: false,
        isNullable: false,
      }),
    );

    // Add index for better query performance
    await queryRunner.query(`CREATE INDEX "IDX_users_onboarding_complete" ON "users" ("onboardingComplete")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the index
    await queryRunner.query(`DROP INDEX "IDX_users_onboarding_complete"`);
    
    // Remove the onboardingComplete column
    await queryRunner.dropColumn('users', 'onboardingComplete');
  }
}
