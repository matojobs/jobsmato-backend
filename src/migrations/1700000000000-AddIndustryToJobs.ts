import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddIndustryToJobs1700000000000 implements MigrationInterface {
  name = 'AddIndustryToJobs1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add industry column to jobs table
    await queryRunner.addColumn(
      'jobs',
      new TableColumn({
        name: 'industry',
        type: 'enum',
        enum: [
          'Technology',
          'Finance',
          'Healthcare',
          'Education',
          'Manufacturing',
          'Retail',
          'Real Estate',
          'Consulting',
          'Media',
          'Transportation',
          'Energy',
          'Government',
          'Non-Profit',
          'NBFC',
          'Banking',
          'Insurance',
          'E-commerce',
          'Telecommunications',
          'Automotive',
          'Pharmaceuticals',
          'Other',
        ],
        isNullable: true,
      }),
    );

    // Add index for better performance
    await queryRunner.query(`CREATE INDEX "IDX_jobs_industry" ON "jobs" ("industry")`);

    // Update existing jobs with default industry based on category
    await queryRunner.query(`
      UPDATE jobs 
      SET industry = 'Technology' 
      WHERE category = 'Technology' AND industry IS NULL
    `);

    await queryRunner.query(`
      UPDATE jobs 
      SET industry = 'Finance' 
      WHERE category = 'Finance' AND industry IS NULL
    `);

    await queryRunner.query(`
      UPDATE jobs 
      SET industry = 'Healthcare' 
      WHERE category = 'Healthcare' AND industry IS NULL
    `);

    await queryRunner.query(`
      UPDATE jobs 
      SET industry = 'Education' 
      WHERE category = 'Education' AND industry IS NULL
    `);

    await queryRunner.query(`
      UPDATE jobs 
      SET industry = 'Other' 
      WHERE industry IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`DROP INDEX "IDX_jobs_industry"`);

    // Drop column
    await queryRunner.dropColumn('jobs', 'industry');
  }
}
