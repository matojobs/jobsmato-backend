import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Optional performance upgrade for search.
 *
 * Enables pg_trgm and adds GIN trigram indexes so that ILIKE '%term%' queries
 * can use indexes instead of full table scans. No application code change needed.
 *
 * See docs/SEARCH-STRATEGY.md for when and why to use this.
 */
export class AddSearchTrigramIndexes1700000000032 implements MigrationInterface {
  name = 'AddSearchTrigramIndexes1700000000032';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);

    // Sourcing candidates: recruiter candidate search (name, phone, email)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_candidates_name_trgm
      ON sourcing.candidates USING gin (name gin_trgm_ops);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_candidates_phone_trgm
      ON sourcing.candidates USING gin (phone gin_trgm_ops);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_candidates_email_trgm
      ON sourcing.candidates USING gin (email gin_trgm_ops);
    `);

    // Companies: application search by company name
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_companies_name_trgm
      ON companies USING gin (name gin_trgm_ops);
    `);

    // Sourcing job_roles: application search by role name
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_job_roles_role_name_trgm
      ON sourcing.job_roles USING gin (role_name gin_trgm_ops);
    `);

    // Sourcing applications (partitioned): search by portal
    // Index on parent is applied to existing and future partitions in PG 11+
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_applications_portal_trgm
      ON sourcing.applications USING gin (portal gin_trgm_ops);
    `);

    // Users: admin application search (applicant name, email, phone)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_users_firstname_trgm
      ON users USING gin ("firstName" gin_trgm_ops);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_users_lastname_trgm
      ON users USING gin ("lastName" gin_trgm_ops);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email_trgm
      ON users USING gin (email gin_trgm_ops);
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_users_phone_trgm
      ON users USING gin (phone gin_trgm_ops);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS sourcing.idx_candidates_name_trgm;`);
    await queryRunner.query(`DROP INDEX IF EXISTS sourcing.idx_candidates_phone_trgm;`);
    await queryRunner.query(`DROP INDEX IF EXISTS sourcing.idx_candidates_email_trgm;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_companies_name_trgm;`);
    await queryRunner.query(`DROP INDEX IF EXISTS sourcing.idx_job_roles_role_name_trgm;`);
    await queryRunner.query(`DROP INDEX IF EXISTS sourcing.idx_applications_portal_trgm;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_users_firstname_trgm;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_users_lastname_trgm;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_users_email_trgm;`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_users_phone_trgm;`);
    // Extension left enabled; drop only if nothing else uses it: DROP EXTENSION pg_trgm;
  }
}
