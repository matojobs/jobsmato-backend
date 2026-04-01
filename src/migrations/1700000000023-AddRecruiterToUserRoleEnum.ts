import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Add 'recruiter' to users_role_enum so admin can create recruiter users.
 * Fixes: "invalid input value for enum users_role_enum: \"recruiter\""
 */
export class AddRecruiterToUserRoleEnum1700000000023 implements MigrationInterface {
  name = 'AddRecruiterToUserRoleEnum1700000000023';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum e
          JOIN pg_type t ON e.enumtypid = t.oid
          WHERE t.typname = 'users_role_enum' AND e.enumlabel = 'recruiter'
        ) THEN
          ALTER TYPE "users_role_enum" ADD VALUE 'recruiter';
        END IF;
      END
      $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing an enum value easily.
    // If you need to rollback, you would need to recreate the type and column.
    // Leaving down() no-op for safety.
  }
}
