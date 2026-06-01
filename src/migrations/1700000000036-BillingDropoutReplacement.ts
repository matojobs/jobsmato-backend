import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration 036: Full billing eligibility, dropout, replacement, and invoice payment tracking.
 *
 * Adds:
 *  - sourcing.billing_rules    → company/profile level billing presets
 *  - sourcing.invoice_payments → multiple payment entries per invoice
 *  - Locking period + dropout + replacement columns on sourcing.applications
 *  - Credit note support on sourcing.invoices (invoice_type, original_invoice_id, decline_reason)
 */
export class BillingDropoutReplacement1700000000036 implements MigrationInterface {
  name = 'BillingDropoutReplacement1700000000036';

  async up(qr: QueryRunner): Promise<void> {
    // ── 1. Billing rules table (company/profile level presets) ──────────────
    await qr.query(`
      CREATE TABLE IF NOT EXISTS sourcing.billing_rules (
        id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        company_name           VARCHAR(255) NOT NULL,
        job_profile            VARCHAR(255),          -- NULL = all profiles at this company
        billing_type           VARCHAR(20) NOT NULL
                                 CHECK (billing_type IN ('flat_fee','percentage')),
        billing_value          DECIMAL(10,2) NOT NULL,  -- flat ₹ or % of CTC
        default_locking_days   INTEGER NOT NULL DEFAULT 60,
        replacement_window_days INTEGER DEFAULT 30,
        notes                  TEXT,
        is_active              BOOLEAN NOT NULL DEFAULT TRUE,
        created_at             TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at             TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
    await qr.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_rules_company_profile
        ON sourcing.billing_rules (company_name, COALESCE(job_profile,'__ALL__'))
    `);

    // ── 2. Locking / dropout / replacement on sourcing.applications ─────────
    await qr.query(`
      ALTER TABLE sourcing.applications
        ADD COLUMN IF NOT EXISTS locking_period_days   INTEGER,
        ADD COLUMN IF NOT EXISTS locking_end_date      DATE,
        ADD COLUMN IF NOT EXISTS candidate_active_status VARCHAR(20) DEFAULT 'unknown'
                                   CHECK (candidate_active_status IN
                                     ('unknown','active','left')),
        ADD COLUMN IF NOT EXISTS dropout_reason        VARCHAR(50)
                                   CHECK (dropout_reason IN
                                     ('resigned','terminated','absconded',
                                      'better_offer','client_issue', 'other')),
        ADD COLUMN IF NOT EXISTS dropout_date          DATE,
        ADD COLUMN IF NOT EXISTS replacement_eligible  BOOLEAN,
        ADD COLUMN IF NOT EXISTS replacement_window_days INTEGER,
        ADD COLUMN IF NOT EXISTS replacement_deadline  DATE,
        ADD COLUMN IF NOT EXISTS original_application_id INTEGER, -- ref to original (no FK - partitioned table)
        ADD COLUMN IF NOT EXISTS billing_rule_id       UUID
                                   REFERENCES sourcing.billing_rules(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS billing_amount        DECIMAL(10,2),
        ADD COLUMN IF NOT EXISTS billing_type          VARCHAR(20)
    `);

    // ── 3. Add credit note + decline support to invoices ────────────────────
    await qr.query(`
      ALTER TABLE sourcing.invoices
        ADD COLUMN IF NOT EXISTS invoice_type        VARCHAR(20) NOT NULL DEFAULT 'invoice'
                                   CHECK (invoice_type IN ('invoice','credit_note')),
        ADD COLUMN IF NOT EXISTS original_invoice_id UUID
                                   REFERENCES sourcing.invoices(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS decline_reason      TEXT
    `);

    // Drop old status check and replace with extended set
    await qr.query(`
      ALTER TABLE sourcing.invoices
        DROP CONSTRAINT IF EXISTS invoices_status_check
    `);
    await qr.query(`
      ALTER TABLE sourcing.invoices
        ADD CONSTRAINT invoices_status_check
          CHECK (status IN
            ('draft','raised','payment_pending','payment_received','closed','declined'))
    `);

    // ── 4. Invoice payments table (multiple per invoice) ────────────────────
    await qr.query(`
      CREATE TABLE IF NOT EXISTS sourcing.invoice_payments (
        id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_id       UUID        NOT NULL
                           REFERENCES sourcing.invoices(id) ON DELETE CASCADE,
        amount           DECIMAL(12,2) NOT NULL,
        payment_date     DATE        NOT NULL,
        payment_reference VARCHAR(255),
        payment_mode     VARCHAR(50),  -- NEFT, RTGS, Cheque, UPI, etc.
        notes            TEXT,
        recorded_by_id   INTEGER,
        created_at       TIMESTAMP   NOT NULL DEFAULT NOW()
      )
    `);
    await qr.query(`
      CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice
        ON sourcing.invoice_payments (invoice_id)
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS sourcing.invoice_payments`);
    await qr.query(`DROP TABLE IF EXISTS sourcing.billing_rules`);
    await qr.query(`
      ALTER TABLE sourcing.applications
        DROP COLUMN IF EXISTS locking_period_days,
        DROP COLUMN IF EXISTS locking_end_date,
        DROP COLUMN IF EXISTS candidate_active_status,
        DROP COLUMN IF EXISTS dropout_reason,
        DROP COLUMN IF EXISTS dropout_date,
        DROP COLUMN IF EXISTS replacement_eligible,
        DROP COLUMN IF EXISTS replacement_window_days,
        DROP COLUMN IF EXISTS replacement_deadline,
        DROP COLUMN IF EXISTS original_application_id,
        DROP COLUMN IF EXISTS billing_rule_id,
        DROP COLUMN IF EXISTS billing_amount,
        DROP COLUMN IF EXISTS billing_type
    `);
    await qr.query(`
      ALTER TABLE sourcing.invoices
        DROP COLUMN IF EXISTS invoice_type,
        DROP COLUMN IF EXISTS original_invoice_id,
        DROP COLUMN IF EXISTS decline_reason
    `);
  }
}
