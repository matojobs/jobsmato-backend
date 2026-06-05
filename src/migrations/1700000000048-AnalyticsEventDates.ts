import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 1 — Analytics foundation.
 *
 * Adds explicit event-date columns so every funnel stage is anchored to the day
 * the event actually happened (not updated_at), backfills them from existing
 * data, adds supporting indexes, and creates the canonical
 * `sourcing.v_application_facts` view that all analytics endpoints read from.
 *
 * `sourcing.applications` is partitioned by RANGE(assigned_date); ADD COLUMN on
 * the parent propagates to every partition automatically.
 */
export class AnalyticsEventDates1700000000048 implements MigrationInterface {
  name = 'AnalyticsEventDates1700000000048';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. New event-date columns (all nullable, backfilled below) ───────────
    await queryRunner.query(`
      ALTER TABLE sourcing.applications
        ADD COLUMN IF NOT EXISTS connected_date  date,
        ADD COLUMN IF NOT EXISTS interested_date date,
        ADD COLUMN IF NOT EXISTS selection_date  date,
        ADD COLUMN IF NOT EXISTS rejection_date  date
    `);

    // Real headcount per role (fixes the mislabeled "Active Roles" metric)
    await queryRunner.query(`
      ALTER TABLE sourcing.job_roles
        ADD COLUMN IF NOT EXISTS target_openings integer
    `);

    // ── 2. Backfill from existing rows (set-once semantics) ──────────────────
    // connected_date: day they were first connected → use call_date
    await queryRunner.query(`
      UPDATE sourcing.applications
      SET connected_date = call_date
      WHERE connected_date IS NULL AND call_status = 3 AND call_date IS NOT NULL
    `);

    // interested_date: day interest captured → use call_date
    await queryRunner.query(`
      UPDATE sourcing.applications
      SET interested_date = call_date
      WHERE interested_date IS NULL AND interested IS NOT NULL AND call_date IS NOT NULL
    `);

    // selection_date: day select/reject decision recorded.
    // Best available proxy historically is updated_at (IST), falling back to
    // interview_date when updated_at predates the interview.
    await queryRunner.query(`
      UPDATE sourcing.applications
      SET selection_date = GREATEST(
            COALESCE(interview_date, (updated_at AT TIME ZONE 'Asia/Kolkata')::date),
            (updated_at AT TIME ZONE 'Asia/Kolkata')::date
          )
      WHERE selection_date IS NULL AND selection_status IS NOT NULL
    `);

    // rejection_date: rejected via interview_status or selection_status=2
    await queryRunner.query(`
      UPDATE sourcing.applications
      SET rejection_date = COALESCE(interview_date, (updated_at AT TIME ZONE 'Asia/Kolkata')::date)
      WHERE rejection_date IS NULL
        AND (interview_status = 'Rejected' OR selection_status = 2)
    `);

    // ── 3. Indexes for the new anchors ───────────────────────────────────────
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_applications_recruiter_selection_date
        ON sourcing.applications (recruiter_id, selection_date)
        WHERE selection_date IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_applications_recruiter_joining_date
        ON sourcing.applications (recruiter_id, joining_date)
        WHERE joining_date IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_applications_portal_joining_date
        ON sourcing.applications (portal, joining_date)
        WHERE joining_date IS NOT NULL
    `);

    // ── 4. Canonical fact view — single source of truth for all analytics ────
    await queryRunner.query(`
      CREATE OR REPLACE VIEW sourcing.v_application_facts AS
      SELECT
        a.id                AS application_id,
        a.recruiter_id      AS recruiter_id,
        r.name              AS recruiter_name,
        jr.company_id       AS company_id,
        comp.name           AS company_name,
        a.job_role_id       AS job_role_id,
        jr.role_name        AS role_name,
        a.portal            AS portal,
        -- event dates
        a.assigned_date,
        a.call_date,
        a.connected_date,
        a.interested_date,
        a.interview_date,
        a.selection_date,
        a.rejection_date,
        a.joining_date,
        a.backout_date,
        -- raw status
        a.call_status,
        a.interested,
        a.interview_scheduled,
        a.interview_status,
        a.selection_status,
        a.joining_status,
        -- canonical boolean flags (one definition each)
        (a.call_date IS NOT NULL)                                              AS is_attempt,
        (a.call_status = 3)                                                    AS is_connected,
        (a.interested = 1)                                                     AS is_interested,
        (a.interested = 2)                                                     AS is_not_interested,
        (a.interview_date IS NOT NULL)                                         AS is_interview_sched,
        (a.interview_status IN ('Done','Not Attended','Rejected'))             AS is_interview_done,
        (a.selection_status = 1)                                               AS is_selected,
        (a.interview_status = 'Rejected' OR a.selection_status = 2)            AS is_rejected,
        (a.joining_status = 1)                                                 AS is_joined,
        (a.joining_status = 4)                                                 AS is_backout,
        (a.selection_status = 1 AND (a.joining_status IS NULL OR a.joining_status = 3)) AS is_yet_to_join,
        -- placeholder for Phase 5 invoicing (sourcing.candidates has no CTC yet)
        NULL::numeric                                                          AS ctc
      FROM sourcing.applications a
      INNER JOIN sourcing.recruiters r ON r.id = a.recruiter_id
      INNER JOIN sourcing.job_roles  jr ON jr.id = a.job_role_id
      LEFT  JOIN companies          comp ON comp.id = jr.company_id
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP VIEW IF EXISTS sourcing.v_application_facts`);
    await queryRunner.query(`DROP INDEX IF EXISTS sourcing.idx_applications_portal_joining_date`);
    await queryRunner.query(`DROP INDEX IF EXISTS sourcing.idx_applications_recruiter_joining_date`);
    await queryRunner.query(`DROP INDEX IF EXISTS sourcing.idx_applications_recruiter_selection_date`);
    await queryRunner.query(`ALTER TABLE sourcing.job_roles DROP COLUMN IF EXISTS target_openings`);
    await queryRunner.query(`
      ALTER TABLE sourcing.applications
        DROP COLUMN IF EXISTS rejection_date,
        DROP COLUMN IF EXISTS selection_date,
        DROP COLUMN IF EXISTS interested_date,
        DROP COLUMN IF EXISTS connected_date
    `);
  }
}
