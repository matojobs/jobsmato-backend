import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBatchesAndEnrollments1700000000039 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enums
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE internship_domain_enum AS ENUM ('hr','sales','tech','digital_marketing');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE batch_type_enum AS ENUM ('free','paid');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE batch_status_enum AS ENUM ('upcoming','active','completed','cancelled','coming_soon');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE enrollment_status_enum AS ENUM ('pending','active','completed','failed','dropped');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    // batches table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "batches" (
        "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "domain"        internship_domain_enum NOT NULL,
        "batchType"     batch_type_enum NOT NULL DEFAULT 'paid',
        "status"        batch_status_enum NOT NULL DEFAULT 'upcoming',
        "startDate"     DATE NOT NULL,
        "endDate"       DATE,
        "totalSeats"    INTEGER NOT NULL DEFAULT 50,
        "enrolledCount" INTEGER NOT NULL DEFAULT 0,
        "priceInr"      NUMERIC(10,2),
        "description"   TEXT,
        "createdAt"     TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"     TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    // internship_enrollments table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "internship_enrollments" (
        "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId"          INTEGER NOT NULL,
        "batchId"         UUID NOT NULL,
        "domain"          internship_domain_enum NOT NULL,
        "status"          enrollment_status_enum NOT NULL DEFAULT 'pending',
        "mentorId"        INTEGER,
        "paymentId"       VARCHAR,
        "paymentVerified" BOOLEAN NOT NULL DEFAULT false,
        "aptitudeScore"   NUMERIC(5,2),
        "aptitudePassed"  BOOLEAN NOT NULL DEFAULT false,
        "finalScore"      NUMERIC(5,2),
        "finalGrade"      VARCHAR,
        "completedAt"     DATE,
        "enrolledAt"      TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"       TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT fk_enrollment_batch FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE CASCADE,
        CONSTRAINT fk_enrollment_user  FOREIGN KEY ("userId")  REFERENCES "users"("id")   ON DELETE CASCADE
      )
    `);

    // Seed the first HR batch
    await queryRunner.query(`
      INSERT INTO "batches" ("domain","batchType","status","startDate","endDate","totalSeats","priceInr","description")
      VALUES ('hr','paid','active','2026-06-02','2026-08-02',50,4999.00,'HR Internship Program — June 2026 Batch')
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "internship_enrollments"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "batches"`);
    await queryRunner.query(`DROP TYPE IF EXISTS enrollment_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS batch_status_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS batch_type_enum`);
    await queryRunner.query(`DROP TYPE IF EXISTS internship_domain_enum`);
  }
}
