import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 037: Flexible billing criteria engine.
 *
 * billing_criteria  → admin-defined criteria list per billing rule
 * application_criteria_status → per-candidate tracking of each criterion
 *
 * Criteria types:
 *   AUTO (evaluated by system):
 *     min_tenure_days  — candidate must complete X days since joining
 *     active_status    — recruiter must mark candidate as active
 *     aging_milestone  — must reach aging_45 / aging_60 / aging_90
 *
 *   MANUAL (admin/team lead ticks off):
 *     bgv_completed        — background verification done
 *     probation_completed  — probation period passed
 *     document_submitted   — offer/joining docs submitted
 *     performance_review   — first performance review done
 *     client_confirmation  — client HR confirms retention
 *     custom               — any custom checkpoint
 */
export class BillingCriteriaEngine1700000000037 implements MigrationInterface {
  name = 'BillingCriteriaEngine1700000000037';

  async up(qr: QueryRunner): Promise<void> {
    // ── 1. Criteria definitions (per billing rule) ──────────────────────────
    await qr.query(`
      CREATE TABLE IF NOT EXISTS sourcing.billing_criteria (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        billing_rule_id UUID NOT NULL
                          REFERENCES sourcing.billing_rules(id) ON DELETE CASCADE,
        criteria_type   VARCHAR(50) NOT NULL CHECK (criteria_type IN (
                          'min_tenure_days','active_status','aging_milestone',
                          'bgv_completed','probation_completed','document_submitted',
                          'performance_review','client_confirmation','custom'
                        )),
        label           VARCHAR(255) NOT NULL,   -- display name
        description     TEXT,                    -- helper text for recruiter
        operator        VARCHAR(20),             -- gte | equals | completed
        value_text      VARCHAR(255),            -- '60' | 'active' | 'aging_60'
        is_required     BOOLEAN NOT NULL DEFAULT TRUE,
        sort_order      INTEGER NOT NULL DEFAULT 0,
        created_at      TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await qr.query(`
      CREATE INDEX IF NOT EXISTS idx_billing_criteria_rule
        ON sourcing.billing_criteria (billing_rule_id, sort_order)
    `);

    // ── 2. Per-candidate criteria status ────────────────────────────────────
    await qr.query(`
      CREATE TABLE IF NOT EXISTS sourcing.application_criteria_status (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        application_id  INTEGER NOT NULL,   -- sourcing.applications.id
        criteria_id     UUID NOT NULL
                          REFERENCES sourcing.billing_criteria(id) ON DELETE CASCADE,
        is_met          BOOLEAN NOT NULL DEFAULT FALSE,
        met_at          TIMESTAMP,
        notes           TEXT,
        verified_by_id  INTEGER,
        created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE (application_id, criteria_id)
      )
    `);
    await qr.query(`
      CREATE INDEX IF NOT EXISTS idx_acs_application
        ON sourcing.application_criteria_status (application_id)
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS sourcing.application_criteria_status`);
    await qr.query(`DROP TABLE IF EXISTS sourcing.billing_criteria`);
  }
}
