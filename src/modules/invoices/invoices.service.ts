import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface CandidateEntry {
  application_id: number;
  candidate_name: string;
  joining_date: string;
  position: string;
  billing_amount: number;
  billing_type: 'flat_fee' | 'percentage';
  locking_days: number;
}

// ── Billing Rules ─────────────────────────────────────────────────────────────
@Injectable()
export class InvoicesService {
  constructor(private dataSource: DataSource) {}

  // ═══════════════════════════════════════════════════════════
  //  BILLING RULES (Company / Profile presets)
  // ═══════════════════════════════════════════════════════════

  async getBillingRules(companyName?: string) {
    const rows = await this.dataSource.query(
      `SELECT * FROM sourcing.billing_rules
       WHERE is_active = TRUE
       ${companyName ? `AND company_name ILIKE $1` : ''}
       ORDER BY company_name, job_profile`,
      companyName ? [`%${companyName}%`] : [],
    );
    return rows;
  }

  async getBillingRule(companyName: string, jobProfile?: string) {
    // Profile-specific rule takes priority over company-wide rule
    const rows = await this.dataSource.query(
      `SELECT * FROM sourcing.billing_rules
       WHERE is_active = TRUE AND company_name ILIKE $1
       ORDER BY CASE WHEN job_profile = $2 THEN 0 ELSE 1 END, job_profile NULLS LAST
       LIMIT 1`,
      [companyName, jobProfile || null],
    );
    return rows[0] || null;
  }

  async createBillingRule(data: {
    company_name: string;
    job_profile?: string;
    billing_type: 'flat_fee' | 'percentage';
    billing_value: number;
    default_locking_days: number;
    replacement_window_days?: number;
    notes?: string;
  }) {
    const [row] = await this.dataSource.query(
      `INSERT INTO sourcing.billing_rules
         (company_name, job_profile, billing_type, billing_value,
          default_locking_days, replacement_window_days, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT ON CONSTRAINT idx_billing_rules_company_profile
       DO UPDATE SET
         billing_type = EXCLUDED.billing_type,
         billing_value = EXCLUDED.billing_value,
         default_locking_days = EXCLUDED.default_locking_days,
         replacement_window_days = EXCLUDED.replacement_window_days,
         notes = EXCLUDED.notes,
         updated_at = NOW()
       RETURNING *`,
      [
        data.company_name,
        data.job_profile || null,
        data.billing_type,
        data.billing_value,
        data.default_locking_days,
        data.replacement_window_days || 30,
        data.notes || null,
      ],
    );
    return row;
  }

  async updateBillingRule(id: string, data: Partial<{
    billing_type: string; billing_value: number;
    default_locking_days: number; replacement_window_days: number;
    notes: string; is_active: boolean;
  }>) {
    const sets: string[] = ['updated_at = NOW()'];
    const params: any[] = [];
    let idx = 1;
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) { sets.push(`${k} = $${idx++}`); params.push(v); }
    }
    params.push(id);
    await this.dataSource.query(
      `UPDATE sourcing.billing_rules SET ${sets.join(',')} WHERE id = $${idx}`,
      params,
    );
    const rows = await this.dataSource.query(
      `SELECT * FROM sourcing.billing_rules WHERE id = $1`, [id],
    );
    return rows[0];
  }

  // ═══════════════════════════════════════════════════════════
  //  JOINING CONFIRMATION (sets locking period per candidate)
  // ═══════════════════════════════════════════════════════════

  async confirmJoining(applicationId: number, data: {
    joining_date: string;
    locking_period_days: number;
    billing_amount?: number;
    billing_type?: string;
    billing_rule_id?: string;
  }) {
    const lockingEnd = new Date(data.joining_date);
    lockingEnd.setDate(lockingEnd.getDate() + data.locking_period_days);
    const locking_end_date = lockingEnd.toISOString().split('T')[0];

    await this.dataSource.query(
      `UPDATE sourcing.applications SET
         joining_status   = 1,
         joining_date     = $1,
         locking_period_days  = $2,
         locking_end_date     = $3,
         billing_amount       = $4,
         billing_type         = $5,
         billing_rule_id      = $6,
         candidate_active_status = 'active',
         pipeline_stage       = 'joined',
         updated_at           = NOW()
       WHERE id = $7`,
      [
        data.joining_date,
        data.locking_period_days,
        locking_end_date,
        data.billing_amount || null,
        data.billing_type || null,
        data.billing_rule_id || null,
        applicationId,
      ],
    );
    return { applicationId, locking_end_date, locking_period_days: data.locking_period_days };
  }

  // ═══════════════════════════════════════════════════════════
  //  ACTIVE STATUS UPDATE (recruiter marks candidate active/left)
  // ═══════════════════════════════════════════════════════════

  async updateActiveStatus(applicationId: number, status: 'active' | 'left') {
    await this.dataSource.query(
      `UPDATE sourcing.applications
       SET candidate_active_status = $1, updated_at = NOW()
       WHERE id = $2`,
      [status, applicationId],
    );

    // If still active AND locking period has ended → advance to billing_eligible
    if (status === 'active') {
      await this.dataSource.query(
        `UPDATE sourcing.applications
         SET pipeline_stage = 'billing_eligible', updated_at = NOW()
         WHERE id = $1
           AND candidate_active_status = 'active'
           AND locking_end_date IS NOT NULL
           AND locking_end_date <= CURRENT_DATE
           AND pipeline_stage IN ('joined','aging_45','aging_60','aging_90')`,
        [applicationId],
      );
    }

    const rows = await this.dataSource.query(
      `SELECT id, pipeline_stage, candidate_active_status, locking_end_date
       FROM sourcing.applications WHERE id = $1`, [applicationId],
    );
    return rows[0];
  }

  // ═══════════════════════════════════════════════════════════
  //  DROPOUT FLOW
  // ═══════════════════════════════════════════════════════════

  async recordDropout(applicationId: number, data: {
    dropout_reason: string;
    dropout_date: string;
    notes?: string;
  }) {
    await this.dataSource.query(
      `UPDATE sourcing.applications SET
         candidate_active_status = 'left',
         dropout_reason = $1,
         dropout_date   = $2,
         pipeline_stage = 'talent_pool',
         updated_at     = NOW()
       WHERE id = $3`,
      [data.dropout_reason, data.dropout_date, applicationId],
    );
    return { applicationId, dropout_reason: data.dropout_reason };
  }

  async setReplacementEligibility(applicationId: number, data: {
    eligible: boolean;
    replacement_window_days?: number;
  }) {
    let replacementDeadline: string | null = null;
    if (data.eligible) {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + (data.replacement_window_days || 30));
      replacementDeadline = deadline.toISOString().split('T')[0];
    }

    await this.dataSource.query(
      `UPDATE sourcing.applications SET
         replacement_eligible      = $1,
         replacement_window_days   = $2,
         replacement_deadline      = $3,
         updated_at                = NOW()
       WHERE id = $4`,
      [data.eligible, data.replacement_window_days || null, replacementDeadline, applicationId],
    );
    return { applicationId, eligible: data.eligible, replacement_deadline: replacementDeadline };
  }

  async linkReplacement(originalApplicationId: number, newApplicationId: number, billingRule: 'free_replacement' | 'partial_charge' | 'full_billing_reset') {
    await this.dataSource.query(
      `UPDATE sourcing.applications SET
         original_application_id = $1,
         billing_type = $2,
         updated_at = NOW()
       WHERE id = $3`,
      [originalApplicationId, billingRule, newApplicationId],
    );
    return { originalApplicationId, newApplicationId, billingRule };
  }

  // ═══════════════════════════════════════════════════════════
  //  BILLING QUEUE (admin view of billing_eligible candidates)
  // ═══════════════════════════════════════════════════════════

  async getBillingQueue(filters: { company_name?: string; month?: number; year?: number }) {
    const params: any[] = [];
    let idx = 1;
    const conditions = [`a.pipeline_stage = 'billing_eligible'`];

    if (filters.company_name) {
      conditions.push(`jr.company_name ILIKE $${idx++}`);
      params.push(`%${filters.company_name}%`);
    }
    if (filters.month) {
      conditions.push(`EXTRACT(MONTH FROM a.joining_date) = $${idx++}`);
      params.push(filters.month);
    }
    if (filters.year) {
      conditions.push(`EXTRACT(YEAR FROM a.joining_date) = $${idx++}`);
      params.push(filters.year);
    }

    const rows = await this.dataSource.query(`
      SELECT
        a.id            AS application_id,
        a.joining_date,
        a.locking_end_date,
        a.locking_period_days,
        a.billing_amount,
        a.billing_type,
        a.candidate_active_status,
        c.name          AS candidate_name,
        c.phone         AS candidate_phone,
        jr.title        AS position,
        jr.company_name,
        r.name          AS recruiter_name
      FROM sourcing.applications a
      JOIN sourcing.candidates   c  ON c.id  = a.candidate_id
      JOIN sourcing.job_roles    jr ON jr.id = a.job_role_id
      LEFT JOIN sourcing.recruiters r ON r.id = a.recruiter_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY jr.company_name, a.joining_date
    `, params);

    return rows;
  }

  // ═══════════════════════════════════════════════════════════
  //  INVOICE CRUD
  // ═══════════════════════════════════════════════════════════

  private async nextInvoiceNumber(year: number, month: number, type: 'invoice' | 'credit_note' = 'invoice') {
    const prefix = type === 'credit_note'
      ? `CN-${year}-${String(month).padStart(2, '0')}`
      : `INV-${year}-${String(month).padStart(2, '0')}`;
    const rows = await this.dataSource.query(
      `SELECT COUNT(*) AS cnt FROM sourcing.invoices WHERE year=$1 AND month=$2 AND invoice_type=$3`,
      [year, month, type],
    );
    const seq = parseInt(rows[0].cnt, 10) + 1;
    return `${prefix}-${String(seq).padStart(3, '0')}`;
  }

  async createInvoice(data: {
    company_name: string;
    job_role_id?: number;
    month: number;
    year: number;
    candidate_entries: CandidateEntry[];
    total_amount: number;
    due_date?: string;
    notes?: string;
    invoice_type?: 'invoice' | 'credit_note';
    original_invoice_id?: string;
  }, raisedById: number) {
    const type = data.invoice_type || 'invoice';
    const invoiceNumber = await this.nextInvoiceNumber(data.year, data.month, type);

    const [row] = await this.dataSource.query(
      `INSERT INTO sourcing.invoices
         (invoice_number, company_name, job_role_id, month, year, status,
          candidate_entries, total_amount, due_date, notes,
          invoice_type, original_invoice_id, raised_by_id)
       VALUES ($1,$2,$3,$4,$5,'draft',$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        invoiceNumber, data.company_name, data.job_role_id || null,
        data.month, data.year,
        JSON.stringify(data.candidate_entries), data.total_amount,
        data.due_date || null, data.notes || null,
        type, data.original_invoice_id || null, raisedById,
      ],
    );

    // Mark included applications as invoice_raised
    if (data.candidate_entries.length > 0) {
      const ids = data.candidate_entries.map(e => e.application_id);
      await this.dataSource.query(
        `UPDATE sourcing.applications SET pipeline_stage = 'invoice_raised', updated_at = NOW()
         WHERE id = ANY($1)`,
        [ids],
      );
    }
    return row;
  }

  async listInvoices(filters: {
    status?: string; company_name?: string;
    month?: number; year?: number;
    invoice_type?: string; page?: number;
  }) {
    const page = filters.page || 1;
    const take = 20;
    const offset = (page - 1) * take;
    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    let idx = 1;

    if (filters.status) { conditions.push(`status = $${idx++}`); params.push(filters.status); }
    if (filters.company_name) { conditions.push(`company_name ILIKE $${idx++}`); params.push(`%${filters.company_name}%`); }
    if (filters.month) { conditions.push(`month = $${idx++}`); params.push(filters.month); }
    if (filters.year) { conditions.push(`year = $${idx++}`); params.push(filters.year); }
    if (filters.invoice_type) { conditions.push(`invoice_type = $${idx++}`); params.push(filters.invoice_type); }

    const where = conditions.join(' AND ');
    const [rows, countRows] = await Promise.all([
      this.dataSource.query(
        `SELECT i.*,
           COALESCE((SELECT SUM(amount) FROM sourcing.invoice_payments WHERE invoice_id = i.id), 0) AS amount_paid
         FROM sourcing.invoices i WHERE ${where}
         ORDER BY i.created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, take, offset],
      ),
      this.dataSource.query(
        `SELECT COUNT(*) AS total FROM sourcing.invoices WHERE ${where}`, params,
      ),
    ]);
    return { invoices: rows, total: parseInt(countRows[0].total, 10), page, totalPages: Math.ceil(parseInt(countRows[0].total, 10) / take) };
  }

  async getInvoice(id: string) {
    const [rows, payments, creditNotes] = await Promise.all([
      this.dataSource.query(`SELECT * FROM sourcing.invoices WHERE id = $1`, [id]),
      this.dataSource.query(`SELECT * FROM sourcing.invoice_payments WHERE invoice_id = $1 ORDER BY payment_date`, [id]),
      this.dataSource.query(`SELECT * FROM sourcing.invoices WHERE original_invoice_id = $1 AND invoice_type = 'credit_note'`, [id]),
    ]);
    if (!rows.length) throw new NotFoundException('Invoice not found');
    return { ...rows[0], payments, credit_notes: creditNotes };
  }

  async updateInvoice(id: string, data: Partial<{
    status: string; due_date: string; notes: string;
    decline_reason: string; candidate_entries: any[];
    total_amount: number;
  }>) {
    const inv = await this.getInvoice(id);
    if (inv.status === 'payment_received' || inv.status === 'closed') {
      throw new BadRequestException('Cannot edit a closed invoice');
    }
    const sets: string[] = ['updated_at = NOW()'];
    const params: any[] = [];
    let idx = 1;

    const fields: Record<string, any> = {
      status: data.status,
      due_date: data.due_date,
      notes: data.notes,
      decline_reason: data.decline_reason,
      candidate_entries: data.candidate_entries ? JSON.stringify(data.candidate_entries) : undefined,
      total_amount: data.total_amount,
    };
    for (const [k, v] of Object.entries(fields)) {
      if (v !== undefined) { sets.push(`${k} = $${idx++}`); params.push(v); }
    }

    // If marking payment_received, also close pipeline on candidates
    if (data.status === 'payment_received') {
      params.push(id);
      await this.dataSource.query(
        `UPDATE sourcing.applications
         SET pipeline_stage = 'payment_received', updated_at = NOW()
         WHERE id = ANY(
           SELECT (e->>'application_id')::int
           FROM sourcing.invoices, jsonb_array_elements(candidate_entries) e
           WHERE id = $${idx}
         )`, params,
      );
    }

    if (data.status === 'closed') {
      // Also advance candidates to closed_won
      await this.dataSource.query(
        `UPDATE sourcing.applications
         SET pipeline_stage = 'closed_won', updated_at = NOW()
         WHERE id = ANY(
           SELECT (e->>'application_id')::int
           FROM sourcing.invoices, jsonb_array_elements(candidate_entries) e
           WHERE id = $1
         )`, [id],
      );
    }

    params.push(id);
    await this.dataSource.query(
      `UPDATE sourcing.invoices SET ${sets.join(',')} WHERE id = $${idx}`, params,
    );
    return this.getInvoice(id);
  }

  async cancelInvoice(id: string) {
    const inv = await this.getInvoice(id);
    if (inv.status === 'payment_received' || inv.status === 'closed') {
      throw new BadRequestException('Cannot cancel a paid/closed invoice');
    }
    await this.dataSource.query(
      `UPDATE sourcing.invoices SET status = 'declined', updated_at = NOW() WHERE id = $1`, [id],
    );
    // Revert candidates back to billing_eligible
    await this.dataSource.query(
      `UPDATE sourcing.applications
       SET pipeline_stage = 'billing_eligible', updated_at = NOW()
       WHERE id = ANY(
         SELECT (e->>'application_id')::int
         FROM sourcing.invoices, jsonb_array_elements(candidate_entries) e
         WHERE id = $1
       )`, [id],
    );
    return { cancelled: true };
  }

  // Create credit note for an invoice (when dropout after invoice raised)
  async createCreditNote(originalInvoiceId: string, data: {
    reason: string;
    amount: number;
    application_ids?: number[];
    notes?: string;
  }, raisedById: number) {
    const original = await this.getInvoice(originalInvoiceId);
    const cn = await this.createInvoice({
      company_name: original.company_name,
      month: original.month,
      year: original.year,
      candidate_entries: [],
      total_amount: -Math.abs(data.amount), // negative = credit
      notes: data.notes || `Credit note for invoice ${original.invoice_number}. Reason: ${data.reason}`,
      invoice_type: 'credit_note',
      original_invoice_id: originalInvoiceId,
    }, raisedById);
    return cn;
  }

  // ═══════════════════════════════════════════════════════════
  //  PAYMENTS (multiple per invoice)
  // ═══════════════════════════════════════════════════════════

  async addPayment(invoiceId: string, data: {
    amount: number;
    payment_date: string;
    payment_reference?: string;
    payment_mode?: string;
    notes?: string;
  }, recordedById: number) {
    const inv = await this.getInvoice(invoiceId);
    if (inv.status === 'declined' || inv.status === 'closed') {
      throw new BadRequestException('Cannot add payment to a declined/closed invoice');
    }

    const [payment] = await this.dataSource.query(
      `INSERT INTO sourcing.invoice_payments
         (invoice_id, amount, payment_date, payment_reference, payment_mode, notes, recorded_by_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [invoiceId, data.amount, data.payment_date, data.payment_reference || null,
       data.payment_mode || null, data.notes || null, recordedById],
    );

    // Check if fully paid
    const [totals] = await this.dataSource.query(
      `SELECT COALESCE(SUM(amount),0) AS total_paid FROM sourcing.invoice_payments WHERE invoice_id = $1`,
      [invoiceId],
    );
    const totalPaid = parseFloat(totals.total_paid);
    const newStatus = totalPaid >= parseFloat(inv.total_amount) ? 'payment_received' : 'payment_pending';

    await this.dataSource.query(
      `UPDATE sourcing.invoices SET status = $1, updated_at = NOW() WHERE id = $2`,
      [newStatus, invoiceId],
    );

    return { payment, total_paid: totalPaid, status: newStatus };
  }

  async deletePayment(paymentId: string) {
    await this.dataSource.query(
      `DELETE FROM sourcing.invoice_payments WHERE id = $1`, [paymentId],
    );
    return { deleted: true };
  }

  // ═══════════════════════════════════════════════════════════
  //  FINANCIAL DASHBOARD
  // ═══════════════════════════════════════════════════════════

  async dashboard(year?: number) {
    const y = year || new Date().getFullYear();
    const [summary, monthly, recentInvoices, billingQueue] = await Promise.all([
      this.dataSource.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'draft')            AS drafts,
          COUNT(*) FILTER (WHERE status = 'raised')           AS raised,
          COUNT(*) FILTER (WHERE status = 'payment_pending')  AS payment_pending,
          COUNT(*) FILTER (WHERE status = 'payment_received') AS payment_received,
          COUNT(*) FILTER (WHERE status = 'closed')           AS closed,
          COUNT(*) FILTER (WHERE status = 'declined')         AS declined,
          COUNT(*) FILTER (WHERE invoice_type = 'credit_note') AS credit_notes,
          COALESCE(SUM(total_amount) FILTER (WHERE status IN ('payment_received','closed') AND invoice_type = 'invoice'), 0) AS total_collected,
          COALESCE(SUM(total_amount) FILTER (WHERE status IN ('raised','payment_pending') AND invoice_type = 'invoice'), 0) AS total_pending
        FROM sourcing.invoices WHERE year = $1
      `, [y]),
      this.dataSource.query(`
        SELECT month,
          COUNT(*) FILTER (WHERE invoice_type = 'invoice') AS invoices,
          COALESCE(SUM(total_amount) FILTER (WHERE status IN ('payment_received','closed') AND invoice_type='invoice'), 0) AS collected,
          COALESCE(SUM(total_amount) FILTER (WHERE status IN ('raised','payment_pending') AND invoice_type='invoice'), 0) AS pending
        FROM sourcing.invoices WHERE year = $1
        GROUP BY month ORDER BY month
      `, [y]),
      this.dataSource.query(`SELECT * FROM sourcing.invoices ORDER BY created_at DESC LIMIT 5`),
      this.dataSource.query(`
        SELECT COUNT(*) AS eligible_count
        FROM sourcing.applications
        WHERE pipeline_stage = 'billing_eligible'
      `),
    ]);

    return {
      year: y,
      summary: summary[0],
      monthly,
      recentInvoices,
      billingQueueCount: parseInt(billingQueue[0].eligible_count, 10),
    };
  }

  // Billing candidates for invoice builder
  // ═══════════════════════════════════════════════════════════
  //  BILLING CRITERIA ENGINE
  // ═══════════════════════════════════════════════════════════

  /** Get all criteria for a billing rule */
  async getCriteria(billingRuleId: string) {
    return this.dataSource.query(
      `SELECT * FROM sourcing.billing_criteria
       WHERE billing_rule_id = $1 ORDER BY sort_order, created_at`,
      [billingRuleId],
    );
  }

  /** Add a criterion to a billing rule */
  async addCriteria(billingRuleId: string, data: {
    criteria_type: string;
    label: string;
    description?: string;
    operator?: string;
    value_text?: string;
    is_required?: boolean;
    sort_order?: number;
  }) {
    const [row] = await this.dataSource.query(
      `INSERT INTO sourcing.billing_criteria
         (billing_rule_id, criteria_type, label, description,
          operator, value_text, is_required, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        billingRuleId, data.criteria_type, data.label,
        data.description || null, data.operator || null,
        data.value_text || null, data.is_required !== false, data.sort_order || 0,
      ],
    );
    return row;
  }

  /** Update a criterion */
  async updateCriteria(criteriaId: string, data: Partial<{
    label: string; description: string; operator: string;
    value_text: string; is_required: boolean; sort_order: number;
  }>) {
    const sets: string[] = [];
    const params: any[] = [];
    let idx = 1;
    for (const [k, v] of Object.entries(data)) {
      if (v !== undefined) { sets.push(`${k} = $${idx++}`); params.push(v); }
    }
    if (!sets.length) return;
    params.push(criteriaId);
    await this.dataSource.query(
      `UPDATE sourcing.billing_criteria SET ${sets.join(',')} WHERE id = $${idx}`, params,
    );
    const rows = await this.dataSource.query(
      `SELECT * FROM sourcing.billing_criteria WHERE id = $1`, [criteriaId],
    );
    return rows[0];
  }

  /** Delete a criterion */
  async deleteCriteria(criteriaId: string) {
    await this.dataSource.query(
      `DELETE FROM sourcing.billing_criteria WHERE id = $1`, [criteriaId],
    );
    return { deleted: true };
  }

  /**
   * Get criteria checklist for a specific candidate application.
   * Merges criteria definitions with current status.
   * Auto-evaluates system criteria on the fly.
   */
  async getApplicationCriteriaStatus(applicationId: number) {
    // Get the application + its billing rule
    const apps = await this.dataSource.query(`
      SELECT a.*, jr.company_name, jr.title AS position,
             c.name AS candidate_name
      FROM sourcing.applications a
      JOIN sourcing.job_roles jr ON jr.id = a.job_role_id
      JOIN sourcing.candidates c ON c.id  = a.candidate_id
      WHERE a.id = $1
    `, [applicationId]);
    if (!apps.length) throw new NotFoundException('Application not found');
    const app = apps[0];

    if (!app.billing_rule_id) {
      return { application: app, criteria: [], allMet: false, message: 'No billing rule assigned' };
    }

    // Get criteria + current status
    const criteria = await this.dataSource.query(`
      SELECT bc.*,
             acs.is_met, acs.met_at, acs.notes, acs.verified_by_id, acs.id AS status_id
      FROM sourcing.billing_criteria bc
      LEFT JOIN sourcing.application_criteria_status acs
        ON acs.criteria_id = bc.id AND acs.application_id = $1
      WHERE bc.billing_rule_id = $2
      ORDER BY bc.sort_order, bc.created_at
    `, [applicationId, app.billing_rule_id]);

    const today = new Date();
    const joiningDate = app.joining_date ? new Date(app.joining_date) : null;
    const daysSinceJoining = joiningDate
      ? Math.floor((today.getTime() - joiningDate.getTime()) / 86400000)
      : 0;

    // Auto-evaluate system criteria
    const evaluated = await Promise.all(criteria.map(async (c: any) => {
      let autoMet: boolean | null = null;

      if (c.criteria_type === 'min_tenure_days') {
        const required = parseInt(c.value_text || '60', 10);
        autoMet = daysSinceJoining >= required;
      } else if (c.criteria_type === 'active_status') {
        autoMet = app.candidate_active_status === 'active';
      } else if (c.criteria_type === 'aging_milestone') {
        const milestoneOrder = ['aging_45','aging_60','aging_90'];
        const required = c.value_text || 'aging_60';
        const currentIdx = milestoneOrder.indexOf(app.pipeline_stage);
        const requiredIdx = milestoneOrder.indexOf(required);
        autoMet = currentIdx >= requiredIdx && currentIdx >= 0;
      }

      // If auto-evaluated and result differs from stored → update DB
      if (autoMet !== null && autoMet !== c.is_met) {
        await this.dataSource.query(`
          INSERT INTO sourcing.application_criteria_status
            (application_id, criteria_id, is_met, met_at)
          VALUES ($1,$2,$3,$4)
          ON CONFLICT (application_id, criteria_id)
          DO UPDATE SET is_met = $3, met_at = CASE WHEN $3 THEN NOW() ELSE NULL END,
                        updated_at = NOW()
        `, [applicationId, c.id, autoMet, autoMet ? new Date() : null]);
        c.is_met = autoMet;
        c.met_at = autoMet ? new Date() : null;
      }

      return {
        ...c,
        is_auto: ['min_tenure_days','active_status','aging_milestone'].includes(c.criteria_type),
        is_met: c.is_met ?? false,
        days_since_joining: daysSinceJoining,
      };
    }));

    const required = evaluated.filter(c => c.is_required);
    const allRequiredMet = required.length > 0 && required.every(c => c.is_met);

    // Auto-advance to billing_eligible if all required criteria met
    if (allRequiredMet && !['billing_eligible','admin_approval','invoice_raised',
        'payment_pending','payment_received','closed_won'].includes(app.pipeline_stage)) {
      await this.dataSource.query(
        `UPDATE sourcing.applications SET pipeline_stage = 'billing_eligible', updated_at = NOW() WHERE id = $1`,
        [applicationId],
      );
    }

    return {
      application: app,
      criteria: evaluated,
      allRequiredMet,
      requiredCount: required.length,
      metCount: required.filter(c => c.is_met).length,
    };
  }

  /**
   * Admin manually marks a manual criterion as met/unmet for a candidate.
   */
  async updateCriteriaStatus(applicationId: number, criteriaId: string, data: {
    is_met: boolean;
    notes?: string;
    verified_by_id?: number;
  }) {
    await this.dataSource.query(`
      INSERT INTO sourcing.application_criteria_status
        (application_id, criteria_id, is_met, met_at, notes, verified_by_id)
      VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (application_id, criteria_id)
      DO UPDATE SET
        is_met         = $3,
        met_at         = CASE WHEN $3 THEN NOW() ELSE NULL END,
        notes          = COALESCE($5, application_criteria_status.notes),
        verified_by_id = COALESCE($6, application_criteria_status.verified_by_id),
        updated_at     = NOW()
    `, [
      applicationId, criteriaId, data.is_met,
      data.is_met ? new Date() : null,
      data.notes || null, data.verified_by_id || null,
    ]);

    // Re-evaluate eligibility after each update
    return this.getApplicationCriteriaStatus(applicationId);
  }

  /**
   * Evaluate billing eligibility for ALL joined candidates (called by cron + on-demand).
   * Returns count of candidates newly advanced to billing_eligible.
   */
  async evaluateAllEligibility() {
    const apps = await this.dataSource.query(`
      SELECT a.id FROM sourcing.applications a
      WHERE a.pipeline_stage IN ('joined','aging_45','aging_60','aging_90')
        AND a.billing_rule_id IS NOT NULL
        AND a.joining_date IS NOT NULL
    `);

    let advanced = 0;
    for (const { id } of apps) {
      const result = await this.getApplicationCriteriaStatus(id);
      if (result.allRequiredMet) advanced++;
    }
    return { evaluated: apps.length, advanced };
  }

  async getBillingCandidates(month: number, year: number, companyName?: string) {
    const rows = await this.dataSource.query(`
      SELECT
        a.id AS application_id, a.joining_date, a.locking_end_date,
        a.locking_period_days, a.billing_amount, a.billing_type,
        a.pipeline_stage, a.candidate_active_status,
        c.name AS candidate_name, c.phone AS candidate_phone,
        jr.title AS position, jr.company_name
      FROM sourcing.applications a
      JOIN sourcing.candidates   c  ON c.id  = a.candidate_id
      JOIN sourcing.job_roles    jr ON jr.id = a.job_role_id
      WHERE a.pipeline_stage IN ('billing_eligible','admin_approval')
        AND EXTRACT(MONTH FROM a.joining_date) = $1
        AND EXTRACT(YEAR  FROM a.joining_date) = $2
        ${companyName ? `AND jr.company_name ILIKE $3` : ''}
      ORDER BY jr.company_name, a.joining_date
    `, companyName ? [month, year, `%${companyName}%`] : [month, year]);
    return rows;
  }
}
