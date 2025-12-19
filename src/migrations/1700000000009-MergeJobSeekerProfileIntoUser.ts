import { MigrationInterface, QueryRunner } from 'typeorm';

export class MergeJobSeekerProfileIntoUser1700000000009 implements MigrationInterface {
  name = 'MergeJobSeekerProfileIntoUser1700000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Add all JobSeekerProfile columns to users table
    await queryRunner.query(`
      ALTER TABLE "users" 
      ADD COLUMN IF NOT EXISTS "resume" character varying,
      ADD COLUMN IF NOT EXISTS "coverLetter" text,
      ADD COLUMN IF NOT EXISTS "skills" text[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS "experience" text,
      ADD COLUMN IF NOT EXISTS "education" text,
      ADD COLUMN IF NOT EXISTS "certifications" text[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS "portfolio" character varying,
      ADD COLUMN IF NOT EXISTS "availability" character varying,
      ADD COLUMN IF NOT EXISTS "salaryExpectation" character varying,
      ADD COLUMN IF NOT EXISTS "preferredJobTypes" job_type[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS "preferredLocations" text[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS "isOpenToWork" boolean DEFAULT true;
    `);

    // Step 2: Migrate data from job_seeker_profiles to users
    await queryRunner.query(`
      UPDATE "users" u
      SET 
        "resume" = jsp.resume,
        "coverLetter" = jsp."coverLetter",
        "skills" = COALESCE(jsp.skills, '{}'),
        "experience" = jsp.experience,
        "education" = jsp.education,
        "certifications" = COALESCE(jsp.certifications, '{}'),
        "portfolio" = jsp.portfolio,
        "availability" = jsp.availability,
        "salaryExpectation" = jsp."salaryExpectation",
        "preferredJobTypes" = CASE 
          WHEN jsp."preferredJobTypes" IS NOT NULL THEN 
            ARRAY(SELECT unnest(jsp."preferredJobTypes")::text::job_type)
          ELSE '{}'
        END,
        "preferredLocations" = COALESCE(jsp."preferredLocations", '{}'),
        "isOpenToWork" = COALESCE(jsp."isOpenToWork", true)
      FROM "job_seeker_profiles" jsp
      WHERE u.id = jsp."userId";
    `);

    // Step 3: Drop the job_seeker_profiles table
    await queryRunner.query(`DROP TABLE IF EXISTS "job_seeker_profiles" CASCADE;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Recreate job_seeker_profiles table
    await queryRunner.query(`
      CREATE TABLE "job_seeker_profiles" (
        "id" SERIAL NOT NULL,
        "resume" character varying,
        "coverLetter" text,
        "skills" text[] NOT NULL DEFAULT '{}',
        "experience" text,
        "education" text,
        "certifications" text[] NOT NULL DEFAULT '{}',
        "portfolio" character varying,
        "availability" character varying,
        "salaryExpectation" character varying,
        "preferredJobTypes" job_type[] NOT NULL DEFAULT '{}',
        "preferredLocations" text[] NOT NULL DEFAULT '{}',
        "isOpenToWork" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "userId" integer NOT NULL,
        CONSTRAINT "PK_job_seeker_profiles" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_job_seeker_profiles_userId" UNIQUE ("userId"),
        CONSTRAINT "FK_job_seeker_profiles_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    // Migrate data back from users to job_seeker_profiles
    await queryRunner.query(`
      INSERT INTO "job_seeker_profiles" (
        "userId", "resume", "coverLetter", "skills", "experience", "education",
        "certifications", "portfolio", "availability", "salaryExpectation",
        "preferredJobTypes", "preferredLocations", "isOpenToWork"
      )
      SELECT 
        id, "resume", "coverLetter", "skills", "experience", "education",
        "certifications", "portfolio", "availability", "salaryExpectation",
        "preferredJobTypes", "preferredLocations", "isOpenToWork"
      FROM "users"
      WHERE role = 'job_seeker'
      AND ("resume" IS NOT NULL OR "coverLetter" IS NOT NULL OR 
           array_length("skills", 1) > 0 OR "experience" IS NOT NULL);
    `);

    // Remove columns from users table
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "resume",
      DROP COLUMN IF EXISTS "coverLetter",
      DROP COLUMN IF EXISTS "skills",
      DROP COLUMN IF EXISTS "experience",
      DROP COLUMN IF EXISTS "education",
      DROP COLUMN IF EXISTS "certifications",
      DROP COLUMN IF EXISTS "portfolio",
      DROP COLUMN IF EXISTS "availability",
      DROP COLUMN IF EXISTS "salaryExpectation",
      DROP COLUMN IF EXISTS "preferredJobTypes",
      DROP COLUMN IF EXISTS "preferredLocations",
      DROP COLUMN IF EXISTS "isOpenToWork";
    `);
  }
}

