import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Migration: Add full pipeline stage tracking + aging columns to sourcing.applications
 * and create sourcing.invoices table for billing management.
 *
 * New pipeline (replaces old call_status/interview_status/joining_status combo):
 * lead → contacted → interested → screened → qualified → submitted →
 * shortlisted → interview_r1 → interview_r2 → final_round → selected →
 * offer_released → offer_accepted → joined → aging_45 → aging_60 → aging_90 →
 * billing_eligible → admin_approval → invoice_raised → payment_pending →
 * payment_received → closed_won
 */
export class AddPipelineStageAndInvoices1700000000035 implements MigrationInterface {
  name = 'AddPipelineStageAndInvoices1700000000035';

  async up(qr: QueryRunner): Promise<void> {
    // 1. Add pipeline_stage to sourcing.applications
    await qr.query(`
      ALTER TABLE sourcing.applications
        ADD COLUMN IF NOT EXISTS pipeline_stage VARCHAR(50) DEFAULT 'lead',
        ADD COLUMN IF NOT EXISTS aging_45_at DATE,
        ADD COLUMN IF NOT EXISTS aging_60_at DATE,
        ADD COLUMN IF NOT EXISTS aging_90_at DATE,
        ADD COLUMN IF NOT EXISTS aging_notified_45 BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS aging_notified_60 BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS aging_notified_90 BOOLEAN DEFAULT FALSE
    `);

    // 2. Back-fill pipeline_stage from existing integer status fields
    // joining_status: 1=Joined, 2=Not Joined, 3=Pending, 4=Backed Out
    // selection_status: 1=Selected, 2=Not Selected, 3=Pending
    // interview_status: stored as strings 'Done','Scheduled','Not Attended','Rejected'
    // interested: 1=Yes, 2=No, 3=Call Back
    // call_status: 3=Connected, others=no answer
    await qr.query(`
      UPDATE sourcing.applications SET pipeline_stage =
        CASE
          WHEN joining_status = 1 THEN 'joined'
          WHEN joining_status = 4 THEN 'offer_accepted'
          WHEN selection_status = 1 THEN 'offer_released'
          WHEN interview_status = 'Done' THEN 'final_round'
          WHEN interview_status = 'Scheduled' THEN 'interview_r1'
          WHEN interested = 1 THEN 'interested'
          WHEN interested = 2 THEN 'contacted'
          WHEN call_status = 3 THEN 'contacted'
          ELSE 'lead'
        END
      WHERE pipeline_stage IS NULL OR pipeline_stage = 'lead'
    `);

    // 3. Create invoices table in sourcing schema
    await qr.query(`
      CREATE TABLE IF NOT EXISTS sourcing.invoices (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_number VARCHAR(50) UNIQUE NOT NULL,
        company_name  VARCHAR(255) NOT NULL,
        job_role_id   INTEGER REFERENCES sourcing.job_roles(id) ON DELETE SET NULL,
        month         SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
        year          SMALLINT NOT NULL,
        status        VARCHAR(30) NOT NULL DEFAULT 'draft'
                        CHECK (status IN ('draft','raised','payment_pending','payment_received','cancelled')),
        candidate_entries JSONB NOT NULL DEFAULT '[]',
        total_amount  DECIMAL(12,2) NOT NULL DEFAULT 0,
        due_date      DATE,
        payment_date  DATE,
        payment_reference VARCHAR(255),
        notes         TEXT,
        raised_by_id  INTEGER,
        created_at    TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await qr.query(`
      CREATE INDEX IF NOT EXISTS idx_invoices_company ON sourcing.invoices (company_name);
      CREATE INDEX IF NOT EXISTS idx_invoices_status  ON sourcing.invoices (status);
      CREATE INDEX IF NOT EXISTS idx_invoices_year_month ON sourcing.invoices (year, month);
    `);

    // 4. Index on pipeline_stage for fast filtering
    await qr.query(`
      CREATE INDEX IF NOT EXISTS idx_apps_pipeline_stage
        ON sourcing.applications (pipeline_stage)
    `);
  }

  async down(qr: QueryRunner): Promise<void> {
    await qr.query(`DROP TABLE IF EXISTS sourcing.invoices`);
    await qr.query(`ALTER TABLE sourcing.applications
      DROP COLUMN IF EXISTS pipeline_stage,
      DROP COLUMN IF EXISTS aging_45_at,
      DROP COLUMN IF EXISTS aging_60_at,
      DROP COLUMN IF EXISTS aging_90_at,
      DROP COLUMN IF EXISTS aging_notified_45,
      DROP COLUMN IF EXISTS aging_notified_60,
      DROP COLUMN IF EXISTS aging_notified_90
    `);
  }
}
