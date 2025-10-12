import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class ChangeExperienceLevelToExperience1700000000001 implements MigrationInterface {
  name = 'ChangeExperienceLevelToExperience1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add new experience column
    await queryRunner.addColumn(
      'jobs',
      new TableColumn({
        name: 'experience',
        type: 'int',
        isNullable: true,
      }),
    );

    // Add index for better performance
    await queryRunner.query(`CREATE INDEX "IDX_jobs_experience" ON "jobs" ("experience")`);

    // Migrate existing data from experienceLevel to experience
    // Map string values to numeric values
    await queryRunner.query(`
      UPDATE jobs 
      SET experience = CASE 
        WHEN "experienceLevel" = 'entry_level' THEN 0
        WHEN "experienceLevel" = 'mid_level' THEN 2
        WHEN "experienceLevel" = 'senior_level' THEN 3
        WHEN "experienceLevel" = 'executive' THEN 4
        ELSE 0
      END
      WHERE "experienceLevel" IS NOT NULL;
    `);

    // Set default value for null entries
    await queryRunner.query(`
      UPDATE jobs 
      SET experience = 0 
      WHERE experience IS NULL;
    `);

    // Drop the old column and its index
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_jobs_experienceLevel"`);
    await queryRunner.dropColumn('jobs', 'experienceLevel');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Add back the old experienceLevel column
    await queryRunner.addColumn(
      'jobs',
      new TableColumn({
        name: 'experienceLevel',
        type: 'enum',
        enum: ['entry_level', 'mid_level', 'senior_level', 'executive'],
        isNullable: true,
      }),
    );

    // Add index for the old column
    await queryRunner.query(`CREATE INDEX "IDX_jobs_experienceLevel" ON "jobs" ("experienceLevel")`);

    // Migrate data back from experience to experienceLevel
    await queryRunner.query(`
      UPDATE jobs 
      SET "experienceLevel" = CASE 
        WHEN experience = 0 THEN 'entry_level'
        WHEN experience = 1 THEN 'entry_level'
        WHEN experience = 2 THEN 'mid_level'
        WHEN experience = 3 THEN 'senior_level'
        WHEN experience = 4 THEN 'executive'
        ELSE 'entry_level'
      END
      WHERE experience IS NOT NULL;
    `);

    // Drop the new column and its index
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_jobs_experience"`);
    await queryRunner.dropColumn('jobs', 'experience');
  }
}
