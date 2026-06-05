import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Phase 5 — billing. A joined sourcing candidate is a billable event. This
 * service syncs billing lines from joined applications, exposes the queue and a
 * revenue dashboard, and handles backout clawback as credit notes.
 */
@Injectable()
export class BillingService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Create billing lines for joined applications that don't have one yet.
   * Amount = flat fee, or percent_ctc × CTC (CTC not yet captured in sourcing →
   * percent lines start at 0 until CTC is available; flat fees bill immediately).
   * Returns the number of new lines created.
   */
  async syncQueue(): Promise<{ created: number }> {
    const res = await this.dataSource.query(`
      INSERT INTO sourcing.billing_lines
        (application_id, company_id, recruiter_id, candidate_id, join_date,
         ctc, fee_type, fee_value, amount, status)
      SELECT
        a.id, jr.company_id, a.recruiter_id, a.candidate_id, a.joining_date,
        NULL::numeric AS ctc,
        comp.fee_type, comp.fee_value,
        CASE
          WHEN comp.fee_type = 'flat' THEN COALESCE(comp.fee_value, 0)
          ELSE 0
        END AS amount,
        'queued'
      FROM sourcing.applications a
      INNER JOIN sourcing.job_roles jr ON jr.id = a.job_role_id
      LEFT  JOIN companies comp ON comp.id = jr.company_id
      WHERE a.joining_status = 1
        AND a.joining_date IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM sourcing.billing_lines b WHERE b.application_id = a.id)
      ON CONFLICT (application_id) DO NOTHING
      RETURNING id
    `);
    return { created: Array.isArray(res) ? res.length : 0 };
  }

  /**
   * Backout clawback: any joined→backed-out application within the company's
   * guarantee window gets its billing line credited.
   * Returns the number of lines credited.
   */
  async processBackouts(): Promise<{ credited: number }> {
    const rows = await this.dataSource.query(`
      WITH eligible AS (
        SELECT b.id AS line_id, b.amount, b.invoice_id
        FROM sourcing.billing_lines b
        INNER JOIN sourcing.applications a ON a.id = b.application_id
        INNER JOIN sourcing.job_roles jr ON jr.id = a.job_role_id
        LEFT  JOIN companies comp ON comp.id = jr.company_id
        WHERE a.joining_status = 4
          AND b.status <> 'credited'
          AND a.backout_date IS NOT NULL
          AND (comp.guarantee_days IS NULL
               OR a.backout_date <= b.join_date + (comp.guarantee_days || ' days')::interval)
      )
      INSERT INTO sourcing.credit_notes (invoice_id, billing_line_id, reason, amount)
      SELECT invoice_id, line_id, 'Backout within guarantee window', amount FROM eligible
      RETURNING billing_line_id
    `);
    const ids: number[] = (rows || []).map((r: any) => r.billing_line_id);
    if (ids.length) {
      await this.dataSource.query(
        `UPDATE sourcing.billing_lines SET status='credited', updated_at=now() WHERE id = ANY($1)`,
        [ids],
      );
    }
    return { credited: ids.length };
  }

  /** Billing queue (optionally by status / month). */
  async getQueue(status?: string, month?: string) {
    const where: string[] = [];
    const params: any[] = [];
    let p = 1;
    if (status) { where.push(`b.status = $${p++}`); params.push(status); }
    if (month) { where.push(`to_char(b.join_date,'YYYY-MM') = $${p++}`); params.push(month); }
    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    return this.dataSource.query(`
      SELECT
        b.id, b.application_id, b.company_id, comp.name AS company_name,
        b.recruiter_id, r.name AS recruiter_name,
        c.name AS candidate_name, b.join_date, b.amount, b.status, b.invoice_id
      FROM sourcing.billing_lines b
      LEFT JOIN companies comp ON comp.id = b.company_id
      LEFT JOIN sourcing.recruiters r ON r.id = b.recruiter_id
      LEFT JOIN sourcing.candidates c ON c.id = b.candidate_id
      ${whereSql}
      ORDER BY b.join_date DESC NULLS LAST, b.id DESC
      LIMIT 500
    `, params);
  }

  /** Year dashboard: monthly billed/collected + status counts. */
  async getDashboard(year: number) {
    const monthly = await this.dataSource.query(`
      SELECT
        EXTRACT(MONTH FROM b.join_date)::int AS month,
        COUNT(*) AS lines,
        SUM(b.amount) AS billed,
        SUM(b.amount) FILTER (WHERE b.status IN ('paid','closed')) AS collected,
        SUM(b.amount) FILTER (WHERE b.status IN ('queued','invoiced')) AS pending
      FROM sourcing.billing_lines b
      WHERE EXTRACT(YEAR FROM b.join_date) = $1
      GROUP BY 1 ORDER BY 1
    `, [year]);
    const summary = await this.dataSource.query(`
      SELECT
        COUNT(*) FILTER (WHERE status='queued')   AS queued,
        COUNT(*) FILTER (WHERE status='invoiced') AS invoiced,
        COUNT(*) FILTER (WHERE status='paid')     AS paid,
        COUNT(*) FILTER (WHERE status='closed')   AS closed,
        COUNT(*) FILTER (WHERE status='credited') AS credited,
        COALESCE(SUM(amount) FILTER (WHERE status IN ('paid','closed')),0) AS total_collected,
        COALESCE(SUM(amount) FILTER (WHERE status IN ('queued','invoiced')),0) AS total_pending
      FROM sourcing.billing_lines
      WHERE EXTRACT(YEAR FROM join_date) = $1
    `, [year]);
    return { year, monthly, summary: summary[0] || {} };
  }

  /** Revenue contributed per recruiter for a range (feeds the scorecard). */
  async getRevenueByRecruiter(from: string, to: string) {
    return this.dataSource.query(`
      SELECT b.recruiter_id, r.name AS recruiter_name,
        COALESCE(SUM(b.amount) FILTER (WHERE b.status IN ('paid','closed')),0) AS revenue,
        COUNT(*) FILTER (WHERE b.status NOT IN ('credited')) AS billable_joins
      FROM sourcing.billing_lines b
      LEFT JOIN sourcing.recruiters r ON r.id = b.recruiter_id
      WHERE b.join_date BETWEEN $1::date AND $2::date
      GROUP BY b.recruiter_id, r.name
      ORDER BY revenue DESC
    `, [from, to]);
  }
}
