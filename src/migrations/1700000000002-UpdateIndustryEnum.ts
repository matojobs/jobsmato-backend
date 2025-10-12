import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateIndustryEnum1700000000002 implements MigrationInterface {
  name = 'UpdateIndustryEnum1700000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Add new industry column with updated enum
    await queryRunner.query(`
      ALTER TABLE jobs ADD COLUMN industry_new VARCHAR(100);
    `);

    // Step 2: Migrate existing data (map old values to new values)
    await queryRunner.query(`
      UPDATE jobs SET industry_new = 
        CASE 
          WHEN industry = 'Technology' THEN 'Information Technology (IT) & Software'
          WHEN industry = 'Finance' THEN 'Banking & Financial Services'
          WHEN industry = 'Healthcare' THEN 'Healthcare & Pharmaceuticals'
          WHEN industry = 'Education' THEN 'Education & EdTech'
          WHEN industry = 'Manufacturing' THEN 'Manufacturing & Production'
          WHEN industry = 'Retail' THEN 'E-commerce & Retail'
          WHEN industry = 'Real Estate' THEN 'Real Estate & Construction'
          WHEN industry = 'Consulting' THEN 'Other'
          WHEN industry = 'Media' THEN 'Media, Advertising & PR'
          WHEN industry = 'Transportation' THEN 'Logistics & Supply Chain'
          WHEN industry = 'Energy' THEN 'Energy & Utilities'
          WHEN industry = 'Government' THEN 'Other'
          WHEN industry = 'Non-Profit' THEN 'Other'
          WHEN industry = 'NBFC' THEN 'Banking & Financial Services'
          WHEN industry = 'Banking' THEN 'Banking & Financial Services'
          WHEN industry = 'Insurance' THEN 'Banking & Financial Services'
          WHEN industry = 'E-commerce' THEN 'E-commerce & Retail'
          WHEN industry = 'Telecommunications' THEN 'Telecom & Internet Services'
          WHEN industry = 'Automotive' THEN 'Automobile & Mobility'
          WHEN industry = 'Pharmaceuticals' THEN 'Healthcare & Pharmaceuticals'
          WHEN industry = 'Other' THEN 'Other'
          ELSE 'Other'
        END;
    `);

    // Step 3: Drop old column and rename new column
    await queryRunner.query(`ALTER TABLE jobs DROP COLUMN industry;`);
    await queryRunner.query(`ALTER TABLE jobs RENAME COLUMN industry_new TO industry;`);

    // Step 4: Add index for performance
    await queryRunner.query(`CREATE INDEX idx_jobs_industry ON jobs(industry);`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback migration
    await queryRunner.query(`DROP INDEX IF EXISTS idx_jobs_industry;`);
    
    // Add back old industry column
    await queryRunner.query(`
      ALTER TABLE jobs ADD COLUMN industry_old VARCHAR(50);
    `);

    // Migrate data back to old format
    await queryRunner.query(`
      UPDATE jobs SET industry_old = 
        CASE 
          WHEN industry = 'Information Technology (IT) & Software' THEN 'Technology'
          WHEN industry = 'Banking & Financial Services' THEN 'Finance'
          WHEN industry = 'Healthcare & Pharmaceuticals' THEN 'Healthcare'
          WHEN industry = 'Education & EdTech' THEN 'Education'
          WHEN industry = 'Manufacturing & Production' THEN 'Manufacturing'
          WHEN industry = 'E-commerce & Retail' THEN 'Retail'
          WHEN industry = 'Real Estate & Construction' THEN 'Real Estate'
          WHEN industry = 'Media, Advertising & PR' THEN 'Media'
          WHEN industry = 'Logistics & Supply Chain' THEN 'Transportation'
          WHEN industry = 'Energy & Utilities' THEN 'Energy'
          WHEN industry = 'Telecom & Internet Services' THEN 'Telecommunications'
          WHEN industry = 'Automobile & Mobility' THEN 'Automotive'
          ELSE 'Other'
        END;
    `);

    // Drop new column and rename old column
    await queryRunner.query(`ALTER TABLE jobs DROP COLUMN industry;`);
    await queryRunner.query(`ALTER TABLE jobs RENAME COLUMN industry_old TO industry;`);
  }
}
