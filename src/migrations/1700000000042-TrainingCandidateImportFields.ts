import { MigrationInterface, QueryRunner } from 'typeorm';

export class TrainingCandidateImportFields1700000000042 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE training_candidates
        -- historical sourcing context (from old HRMS call-log import)
        ADD COLUMN IF NOT EXISTS "sourcedForRole"            VARCHAR,
        ADD COLUMN IF NOT EXISTS "sourcedForCompany"         VARCHAR,
        ADD COLUMN IF NOT EXISTS "portal"                    VARCHAR,
        ADD COLUMN IF NOT EXISTS "lastRecruiter"             VARCHAR,
        ADD COLUMN IF NOT EXISTS "lastCallDate"              DATE,
        ADD COLUMN IF NOT EXISTS "lastCallStatus"            VARCHAR,
        ADD COLUMN IF NOT EXISTS "lastInterested"            VARCHAR,
        ADD COLUMN IF NOT EXISTS "lastNotInterestedRemark"   TEXT,
        ADD COLUMN IF NOT EXISTS "lastInterviewStatus"       VARCHAR,
        ADD COLUMN IF NOT EXISTS "lastSelectionStatus"       VARCHAR,
        ADD COLUMN IF NOT EXISTS "lastJoiningStatus"         VARCHAR,
        -- assignment / workflow (Option B parallel pool)
        ADD COLUMN IF NOT EXISTS "assignedToEnrollmentId"    VARCHAR,
        ADD COLUMN IF NOT EXISTS "assignedAt"                TIMESTAMP,
        ADD COLUMN IF NOT EXISTS "assignedByUserId"          INTEGER,
        ADD COLUMN IF NOT EXISTS "resetAt"                   TIMESTAMP,
        ADD COLUMN IF NOT EXISTS "convertedUserId"           INTEGER,
        ADD COLUMN IF NOT EXISTS "convertedByInternId"       INTEGER,
        ADD COLUMN IF NOT EXISTS "batchTag"                  VARCHAR;
    `);

    // Indexes for the hot query paths (assignment + filtering)
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_tc_status"            ON training_candidates ("status");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_tc_assigned_enroll"   ON training_candidates ("assignedToEnrollmentId");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_tc_batch_tag"         ON training_candidates ("batchTag");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_tc_sourced_role"      ON training_candidates ("sourcedForRole");`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_tc_city"              ON training_candidates ("currentCity");`);
    // Unique phone — prevents duplicate imports (partial: only where phone present)
    await queryRunner.query(`CREATE UNIQUE INDEX IF NOT EXISTS "uq_tc_phone" ON training_candidates ("phone") WHERE "phone" IS NOT NULL;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_tc_phone";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tc_city";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tc_sourced_role";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tc_batch_tag";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tc_assigned_enroll";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_tc_status";`);
    await queryRunner.query(`
      ALTER TABLE training_candidates
        DROP COLUMN IF EXISTS "sourcedForRole",
        DROP COLUMN IF EXISTS "sourcedForCompany",
        DROP COLUMN IF EXISTS "portal",
        DROP COLUMN IF EXISTS "lastRecruiter",
        DROP COLUMN IF EXISTS "lastCallDate",
        DROP COLUMN IF EXISTS "lastCallStatus",
        DROP COLUMN IF EXISTS "lastInterested",
        DROP COLUMN IF EXISTS "lastNotInterestedRemark",
        DROP COLUMN IF EXISTS "lastInterviewStatus",
        DROP COLUMN IF EXISTS "lastSelectionStatus",
        DROP COLUMN IF EXISTS "lastJoiningStatus",
        DROP COLUMN IF EXISTS "assignedToEnrollmentId",
        DROP COLUMN IF EXISTS "assignedAt",
        DROP COLUMN IF EXISTS "assignedByUserId",
        DROP COLUMN IF EXISTS "resetAt",
        DROP COLUMN IF EXISTS "convertedUserId",
        DROP COLUMN IF EXISTS "convertedByInternId",
        DROP COLUMN IF EXISTS "batchTag";
    `);
  }
}
