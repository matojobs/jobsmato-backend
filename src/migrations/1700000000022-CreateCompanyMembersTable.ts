import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCompanyMembersTable1700000000022 implements MigrationInterface {
  name = 'CreateCompanyMembersTable1700000000022';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "company_member_role_enum" AS ENUM ('owner', 'admin', 'member')
    `);
    await queryRunner.query(`
      CREATE TABLE "company_members" (
        "id" SERIAL NOT NULL,
        "companyId" integer NOT NULL,
        "userId" integer NOT NULL,
        "role" "company_member_role_enum" NOT NULL DEFAULT 'member',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_company_members" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_company_members_company_user" UNIQUE ("companyId", "userId"),
        CONSTRAINT "FK_company_members_company" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_company_members_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_company_members_companyId" ON "company_members" ("companyId")
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_company_members_userId" ON "company_members" ("userId")
    `);
    // Backfill: every current company owner is also a member with role 'owner'
    await queryRunner.query(`
      INSERT INTO "company_members" ("companyId", "userId", "role")
      SELECT id, "userId", 'owner' FROM "companies" WHERE "userId" IS NOT NULL
      ON CONFLICT ("companyId", "userId") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_company_members_userId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_company_members_companyId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "company_members"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "company_member_role_enum"`);
  }
}
