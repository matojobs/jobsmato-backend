import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddLanguagesAndIndustryToUser1700000000013 implements MigrationInterface {
  name = 'AddLanguagesAndIndustryToUser1700000000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add languages column (array of strings)
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN IF NOT EXISTS "languages" text[] DEFAULT '{}';
    `);

    // Add industry column (enum - same as jobs table)
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN IF NOT EXISTS "industry" character varying;
    `);

    // Add check constraint for industry enum values
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD CONSTRAINT "users_industry_check" 
      CHECK (
        "industry" IS NULL OR 
        "industry" IN (
          'Information Technology (IT) & Software',
          'Logistics & Supply Chain',
          'E-commerce & Retail',
          'Banking & Financial Services',
          'SaaS & Technology Services',
          'Healthcare & Pharmaceuticals',
          'Hospitality & Travel',
          'Real Estate & Construction',
          'Education & EdTech',
          'Media, Advertising & PR',
          'Automobile & Mobility',
          'Electric Mobility',
          'Telecom & Internet Services',
          'FMCG (Fast-Moving Consumer Goods)',
          'Consumer Electronics',
          'Manufacturing & Production',
          'Energy & Utilities',
          'Renewable Energy Storage',
          'Agriculture & AgroTech',
          'Startups & Entrepreneurship',
          'Other'
        )
      );
    `);

    // Add index for industry column for better query performance
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_industry" ON "users" ("industry");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_users_industry";
    `);

    // Drop constraint
    await queryRunner.query(`
      ALTER TABLE "users" 
      DROP CONSTRAINT IF EXISTS "users_industry_check";
    `);

    // Drop columns
    await queryRunner.query(`
      ALTER TABLE "users" 
      DROP COLUMN IF EXISTS "languages",
      DROP COLUMN IF EXISTS "industry";
    `);
  }
}

