import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 5 — invoicing foundation.
 *
 * A "Joined" candidate is a billable event. This adds the per-company fee model
 * and the billing ledger (lines → invoices → credit notes). Billing lines are
 * generated from joined sourcing applications.
 */
export class BillingFoundation1700000000049 implements MigrationInterface {
  name = 'BillingFoundation1700000000049';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Per-company fee model ────────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE companies
        ADD COLUMN IF NOT EXISTS fee_type       text,        -- 'flat' | 'percent_ctc'
        ADD COLUMN IF NOT EXISTS fee_value      numeric,     -- flat amount or % of CTC
        ADD COLUMN IF NOT EXISTS guarantee_days integer      -- clawback window for backout
    `);

    // ── Billing lines (one per joined candidate) ─────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sourcing.billing_lines (
        id            BIGSERIAL PRIMARY KEY,
        application_id BIGINT NOT NULL,
        company_id    INTEGER,
        recruiter_id  INTEGER,
        candidate_id  BIGINT,
        join_date     DATE,
        ctc           NUMERIC,
        fee_type      TEXT,
        fee_value     NUMERIC,
        amount        NUMERIC NOT NULL DEFAULT 0,
        status        TEXT NOT NULL DEFAULT 'queued',  -- queued|invoiced|paid|closed|declined|credited
        invoice_id    BIGINT,
        created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT billing_lines_application_unique UNIQUE (application_id)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_billing_lines_status ON sourcing.billing_lines (status);
      CREATE INDEX IF NOT EXISTS idx_billing_lines_company ON sourcing.billing_lines (company_id);
      CREATE INDEX IF NOT EXISTS idx_billing_lines_recruiter ON sourcing.billing_lines (recruiter_id);
    `);

    // ── Invoices ─────────────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sourcing.invoices (
        id           BIGSERIAL PRIMARY KEY,
        company_id   INTEGER,
        number       TEXT,
        period_month TEXT,
        status       TEXT NOT NULL DEFAULT 'raised',  -- raised|payment_pending|payment_received|closed|declined
        subtotal     NUMERIC NOT NULL DEFAULT 0,
        tax          NUMERIC NOT NULL DEFAULT 0,
        total        NUMERIC NOT NULL DEFAULT 0,
        raised_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        paid_at      TIMESTAMP
      )
    `);

    // ── Credit notes (backout clawback) ──────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sourcing.credit_notes (
        id              BIGSERIAL PRIMARY KEY,
        invoice_id      BIGINT,
        billing_line_id BIGINT,
        reason          TEXT,
        amount          NUMERIC NOT NULL DEFAULT 0,
        created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS sourcing.credit_notes`);
    await queryRunner.query(`DROP TABLE IF EXISTS sourcing.invoices`);
    await queryRunner.query(`DROP TABLE IF EXISTS sourcing.billing_lines`);
    await queryRunner.query(`
      ALTER TABLE companies
        DROP COLUMN IF EXISTS guarantee_days,
        DROP COLUMN IF EXISTS fee_value,
        DROP COLUMN IF EXISTS fee_type
    `);
  }
}
