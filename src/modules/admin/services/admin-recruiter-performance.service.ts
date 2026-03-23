import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

/** Day-over-day report row: one per recruiter + total */
export interface RecruiterPerformanceDodRow {
  recruiter_id: number | null;
  recruiter_name: string;
  assigned: number;
  attempt: number;
  connected: number;
  interested: number;
  not_relevant: number;
  not_interested: number;
  interview_sched: number;
  sched_next_day: number;
  today_selection: number;
  rejected: number;
  today_joining: number;
  interview_done: number;
  interview_pending: number;
}

/** Month-to-date report row */
export interface RecruiterPerformanceMtdRow {
  recruiter_id: number | null;
  recruiter_name: string;
  assigned: number;
  attempt: number;
  connected: number;
  interested: number;
  interview_sched: number;
  sched_next_day: number;
  selection: number;
  total_joining: number;
  yet_to_join: number;
  backout: number;
  hold: number;
}

/** Company-wise funnel row */
export interface RecruiterPerformanceCompanyWiseRow {
  company_id: number;
  company_name: string;
  current_openings: number;
  total_screened: number;
  interview_scheduled: number;
  interview_done: number;
  interview_pending: number;
  rejected: number;
  selected: number;
  joined: number;
  hold: number;
  yet_to_join: number;
  backout: number;
}

/** Client report: one company, MTD and DOD side by side */
export interface RecruiterPerformanceClientReport {
  company_id: number;
  company_name: string;
  mtd: {
    interview_scheduled: number;
    turnup: number;
    interview_done: number;
    rejected_status: number;
    selection_status: number;
    joined: number;
    yet_to_join: number;
    backout: number;
  };
  dod: {
    interview_scheduled: number;
    turnup: number;
    interview_done: number;
    rejected_status: number;
    selection_status: number;
    joined: number;
    yet_to_join: number;
    backout: number;
  };
}

/** Not-interested remark with by_job_role and total */
export interface NotInterestedRemarkItem {
  remark: string;
  total: number;
  by_job_role: { job_role_id: number; job_role_name: string; count: number }[];
}

export interface NegativeFunnelNotInterestedResponse {
  remarks: NotInterestedRemarkItem[];
  totals_by_job_role: { job_role_id: number; job_role_name: string; count: number }[];
  grand_total: number;
}

/** Interview status by company for a day */
export interface InterviewStatusCompanyWiseRow {
  company_id: number;
  company_name: string;
  int_sched: number;
  int_done: number;
  inter_pending: number;
  selected: number;
  joined: number;
  on_hold: number;
  yet_to_join: number;
  backout: number;
}

@Injectable()
export class AdminRecruiterPerformanceService {
  constructor(private readonly dataSource: DataSource) {}

  private toDate(dateStr: string | undefined): string {
    if (dateStr) return dateStr;
    return new Date().toISOString().split('T')[0];
  }

  private toMonth(monthStr: string | undefined): string {
    if (monthStr) {
      if (/^\d{4}-\d{2}$/.test(monthStr)) return monthStr;
      const d = new Date(monthStr);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      return `${y}-${m}`;
    }
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * GET /api/admin/recruiter-performance/dod?date=
   * Day report: one row per recruiter + total row. Date default: today.
   */
  async getDod(date?: string): Promise<{ rows: RecruiterPerformanceDodRow[] }> {
    const d = this.toDate(date);
    const rows = await this.dataSource.query(
      `
      SELECT
        r.id AS recruiter_id,
        r.name AS recruiter_name,
        COUNT(*) FILTER (WHERE a.assigned_date = $1::date) AS assigned,
        COUNT(*) FILTER (WHERE a.call_date = $1::date) AS attempt,
        COUNT(*) FILTER (WHERE a.call_date = $1::date AND a.call_status = 3) AS connected,
        COUNT(*) FILTER (WHERE a.call_date = $1::date AND a.interested = 1) AS interested,
        COUNT(*) FILTER (WHERE a.call_date = $1::date AND a.interested = 2) AS not_relevant,
        COUNT(*) FILTER (WHERE a.call_date = $1::date AND a.interested = 2) AS not_interested,
        COUNT(*) FILTER (WHERE a.interview_date = $1::date) AS interview_sched,
        COUNT(*) FILTER (WHERE a.interview_date = ($1::date + interval '1 day')) AS sched_next_day,
        COUNT(*) FILTER (WHERE a.selection_status = 1 AND (a.updated_at AT TIME ZONE 'UTC')::date = $1::date) AS today_selection,
        COUNT(*) FILTER (WHERE (a.interview_status = 'Rejected' OR a.selection_status = 2) AND ((a.updated_at AT TIME ZONE 'UTC')::date = $1::date OR a.interview_date = $1::date)) AS rejected,
        COUNT(*) FILTER (WHERE a.joining_status = 1 AND a.joining_date = $1::date) AS today_joining,
        COUNT(*) FILTER (WHERE a.interview_date = $1::date AND a.interview_status IN ('Done', 'Not Attended', 'Rejected')) AS interview_done,
        COUNT(*) FILTER (WHERE a.interview_date = $1::date AND a.interview_scheduled = true AND (a.interview_status IS NULL OR a.interview_status = 'Scheduled')) AS interview_pending
      FROM sourcing.applications a
      INNER JOIN sourcing.recruiters r ON r.id = a.recruiter_id
      WHERE a.assigned_date = $1::date OR a.call_date = $1::date OR a.interview_date = $1::date OR a.joining_date = $1::date OR (a.updated_at AT TIME ZONE 'UTC')::date = $1::date
      GROUP BY r.id, r.name
      ORDER BY r.name
      `,
      [d],
    );
    const totalRow = await this.dataSource.query(
      `
      SELECT
        NULL::int AS recruiter_id,
        'Total' AS recruiter_name,
        COUNT(*) FILTER (WHERE a.assigned_date = $1::date) AS assigned,
        COUNT(*) FILTER (WHERE a.call_date = $1::date) AS attempt,
        COUNT(*) FILTER (WHERE a.call_date = $1::date AND a.call_status = 3) AS connected,
        COUNT(*) FILTER (WHERE a.call_date = $1::date AND a.interested = 1) AS interested,
        COUNT(*) FILTER (WHERE a.call_date = $1::date AND a.interested = 2) AS not_relevant,
        COUNT(*) FILTER (WHERE a.call_date = $1::date AND a.interested = 2) AS not_interested,
        COUNT(*) FILTER (WHERE a.interview_date = $1::date) AS interview_sched,
        COUNT(*) FILTER (WHERE a.interview_date = ($1::date + interval '1 day')) AS sched_next_day,
        COUNT(*) FILTER (WHERE a.selection_status = 1 AND (a.updated_at AT TIME ZONE 'UTC')::date = $1::date) AS today_selection,
        COUNT(*) FILTER (WHERE (a.interview_status = 'Rejected' OR a.selection_status = 2) AND ((a.updated_at AT TIME ZONE 'UTC')::date = $1::date OR a.interview_date = $1::date)) AS rejected,
        COUNT(*) FILTER (WHERE a.joining_status = 1 AND a.joining_date = $1::date) AS today_joining,
        COUNT(*) FILTER (WHERE a.interview_date = $1::date AND a.interview_status IN ('Done', 'Not Attended', 'Rejected')) AS interview_done,
        COUNT(*) FILTER (WHERE a.interview_date = $1::date AND a.interview_scheduled = true AND (a.interview_status IS NULL OR a.interview_status = 'Scheduled')) AS interview_pending
      FROM sourcing.applications a
      WHERE a.assigned_date = $1::date OR a.call_date = $1::date OR a.interview_date = $1::date OR a.joining_date = $1::date OR (a.updated_at AT TIME ZONE 'UTC')::date = $1::date
      `,
      [d],
    );
    const mapped = rows.map((r: any) => ({
      recruiter_id: r.recruiter_id,
      recruiter_name: r.recruiter_name,
      assigned: parseInt(r.assigned, 10) || 0,
      attempt: parseInt(r.attempt, 10) || 0,
      connected: parseInt(r.connected, 10) || 0,
      interested: parseInt(r.interested, 10) || 0,
      not_relevant: parseInt(r.not_relevant, 10) || 0,
      not_interested: parseInt(r.not_interested, 10) || 0,
      interview_sched: parseInt(r.interview_sched, 10) || 0,
      sched_next_day: parseInt(r.sched_next_day, 10) || 0,
      today_selection: parseInt(r.today_selection, 10) || 0,
      rejected: parseInt(r.rejected, 10) || 0,
      today_joining: parseInt(r.today_joining, 10) || 0,
      interview_done: parseInt(r.interview_done, 10) || 0,
      interview_pending: parseInt(r.interview_pending, 10) || 0,
    }));
    const tot = totalRow[0];
    if (tot) {
      mapped.push({
        recruiter_id: null,
        recruiter_name: 'Total',
        assigned: parseInt(tot.assigned, 10) || 0,
        attempt: parseInt(tot.attempt, 10) || 0,
        connected: parseInt(tot.connected, 10) || 0,
        interested: parseInt(tot.interested, 10) || 0,
        not_relevant: parseInt(tot.not_relevant, 10) || 0,
        not_interested: parseInt(tot.not_interested, 10) || 0,
        interview_sched: parseInt(tot.interview_sched, 10) || 0,
        sched_next_day: parseInt(tot.sched_next_day, 10) || 0,
        today_selection: parseInt(tot.today_selection, 10) || 0,
        rejected: parseInt(tot.rejected, 10) || 0,
        today_joining: parseInt(tot.today_joining, 10) || 0,
        interview_done: parseInt(tot.interview_done, 10) || 0,
        interview_pending: parseInt(tot.interview_pending, 10) || 0,
      });
    }
    return { rows: mapped };
  }

  /**
   * GET /api/admin/recruiter-performance/mtd?month=
   * Month-to-date: one row per recruiter + total. Month default: current month (YYYY-MM).
   */
  async getMtd(month?: string): Promise<{ rows: RecruiterPerformanceMtdRow[] }> {
    const m = this.toMonth(month);
    const start = `${m}-01`;
    const rows = await this.dataSource.query(
      `
      SELECT
        r.id AS recruiter_id,
        r.name AS recruiter_name,
        COUNT(*) FILTER (WHERE a.assigned_date >= $1::date AND a.assigned_date < $1::date + interval '1 month') AS assigned,
        COUNT(*) FILTER (WHERE a.call_date >= $1::date AND a.call_date < $1::date + interval '1 month') AS attempt,
        COUNT(*) FILTER (WHERE a.call_date >= $1::date AND a.call_date < $1::date + interval '1 month' AND a.call_status = 3) AS connected,
        COUNT(*) FILTER (WHERE a.call_date >= $1::date AND a.call_date < $1::date + interval '1 month' AND a.interested = 1) AS interested,
        COUNT(*) FILTER (WHERE a.interview_date >= $1::date AND a.interview_date < $1::date + interval '1 month') AS interview_sched,
        COUNT(*) FILTER (WHERE a.interview_date >= $1::date + interval '1 day' AND a.interview_date < $1::date + interval '1 month') AS sched_next_day,
        COUNT(*) FILTER (WHERE a.selection_status = 1 AND a.updated_at >= $1::date AND a.updated_at < $1::date + interval '1 month') AS selection,
        COUNT(*) FILTER (WHERE a.joining_status = 1 AND a.joining_date >= $1::date AND a.joining_date < $1::date + interval '1 month') AS total_joining,
        COUNT(*) FILTER (WHERE a.selection_status = 1 AND (a.joining_status IS NULL OR a.joining_status = 3) AND (a.updated_at AT TIME ZONE 'UTC')::date >= $1::date AND (a.updated_at AT TIME ZONE 'UTC')::date < $1::date + interval '1 month') AS yet_to_join,
        COUNT(*) FILTER (WHERE a.joining_status = 4 AND a.backout_date >= $1::date AND a.backout_date < $1::date + interval '1 month') AS backout,
        0 AS hold
      FROM sourcing.applications a
      INNER JOIN sourcing.recruiters r ON r.id = a.recruiter_id
      WHERE (a.assigned_date >= $1::date AND a.assigned_date < $1::date + interval '1 month')
         OR (a.call_date >= $1::date AND a.call_date < $1::date + interval '1 month')
         OR (a.interview_date >= $1::date AND a.interview_date < $1::date + interval '1 month')
         OR (a.joining_date >= $1::date AND a.joining_date < $1::date + interval '1 month')
         OR ((a.updated_at AT TIME ZONE 'UTC')::date >= $1::date AND (a.updated_at AT TIME ZONE 'UTC')::date < $1::date + interval '1 month')
      GROUP BY r.id, r.name
      ORDER BY r.name
      `,
      [start],
    );
    const totalRow = await this.dataSource.query(
      `
      SELECT
        NULL::int AS recruiter_id,
        'Total' AS recruiter_name,
        COUNT(*) FILTER (WHERE a.assigned_date >= $1::date AND a.assigned_date < $1::date + interval '1 month') AS assigned,
        COUNT(*) FILTER (WHERE a.call_date >= $1::date AND a.call_date < $1::date + interval '1 month') AS attempt,
        COUNT(*) FILTER (WHERE a.call_date >= $1::date AND a.call_date < $1::date + interval '1 month' AND a.call_status = 3) AS connected,
        COUNT(*) FILTER (WHERE a.call_date >= $1::date AND a.call_date < $1::date + interval '1 month' AND a.interested = 1) AS interested,
        COUNT(*) FILTER (WHERE a.interview_date >= $1::date AND a.interview_date < $1::date + interval '1 month') AS interview_sched,
        COUNT(*) FILTER (WHERE a.interview_date >= $1::date + interval '1 day' AND a.interview_date < $1::date + interval '1 month') AS sched_next_day,
        COUNT(*) FILTER (WHERE a.selection_status = 1 AND a.updated_at >= $1::date AND a.updated_at < $1::date + interval '1 month') AS selection,
        COUNT(*) FILTER (WHERE a.joining_status = 1 AND a.joining_date >= $1::date AND a.joining_date < $1::date + interval '1 month') AS total_joining,
        COUNT(*) FILTER (WHERE a.selection_status = 1 AND (a.joining_status IS NULL OR a.joining_status = 3) AND (a.updated_at AT TIME ZONE 'UTC')::date >= $1::date AND (a.updated_at AT TIME ZONE 'UTC')::date < $1::date + interval '1 month') AS yet_to_join,
        COUNT(*) FILTER (WHERE a.joining_status = 4 AND a.backout_date >= $1::date AND a.backout_date < $1::date + interval '1 month') AS backout,
        0 AS hold
      FROM sourcing.applications a
      WHERE (a.assigned_date >= $1::date AND a.assigned_date < $1::date + interval '1 month')
         OR (a.call_date >= $1::date AND a.call_date < $1::date + interval '1 month')
         OR (a.interview_date >= $1::date AND a.interview_date < $1::date + interval '1 month')
         OR (a.joining_date >= $1::date AND a.joining_date < $1::date + interval '1 month')
         OR ((a.updated_at AT TIME ZONE 'UTC')::date >= $1::date AND (a.updated_at AT TIME ZONE 'UTC')::date < $1::date + interval '1 month')
      `,
      [start],
    );
    const mapped = rows.map((r: any) => ({
      recruiter_id: r.recruiter_id,
      recruiter_name: r.recruiter_name,
      assigned: parseInt(r.assigned, 10) || 0,
      attempt: parseInt(r.attempt, 10) || 0,
      connected: parseInt(r.connected, 10) || 0,
      interested: parseInt(r.interested, 10) || 0,
      interview_sched: parseInt(r.interview_sched, 10) || 0,
      sched_next_day: parseInt(r.sched_next_day, 10) || 0,
      selection: parseInt(r.selection, 10) || 0,
      total_joining: parseInt(r.total_joining, 10) || 0,
      yet_to_join: parseInt(r.yet_to_join, 10) || 0,
      backout: parseInt(r.backout, 10) || 0,
      hold: parseInt(r.hold, 10) || 0,
    }));
    const tot = totalRow[0];
    if (tot) {
      mapped.push({
        recruiter_id: null,
        recruiter_name: 'Total',
        assigned: parseInt(tot.assigned, 10) || 0,
        attempt: parseInt(tot.attempt, 10) || 0,
        connected: parseInt(tot.connected, 10) || 0,
        interested: parseInt(tot.interested, 10) || 0,
        interview_sched: parseInt(tot.interview_sched, 10) || 0,
        sched_next_day: parseInt(tot.sched_next_day, 10) || 0,
        selection: parseInt(tot.selection, 10) || 0,
        total_joining: parseInt(tot.total_joining, 10) || 0,
        yet_to_join: parseInt(tot.yet_to_join, 10) || 0,
        backout: parseInt(tot.backout, 10) || 0,
        hold: parseInt(tot.hold, 10) || 0,
      });
    }
    return { rows: mapped };
  }

  /**
   * GET /api/admin/recruiter-performance/individual?recruiter_id=&period=dod|mtd&date=&month=
   * Single recruiter: same metrics as DOD or MTD. recruiter_id required.
   */
  async getIndividual(
    recruiterId: number,
    period: 'dod' | 'mtd',
    date?: string,
    month?: string,
  ): Promise<RecruiterPerformanceDodRow | RecruiterPerformanceMtdRow> {
    if (period === 'dod') {
      const { rows } = await this.getDod(date);
      const row = rows.find((r) => r.recruiter_id === recruiterId);
      if (!row) {
        return {
          recruiter_id: recruiterId,
          recruiter_name: '',
          assigned: 0,
          attempt: 0,
          connected: 0,
          interested: 0,
          not_relevant: 0,
          not_interested: 0,
          interview_sched: 0,
          sched_next_day: 0,
          today_selection: 0,
          rejected: 0,
          today_joining: 0,
          interview_done: 0,
          interview_pending: 0,
        };
      }
      return row;
    }
    const { rows } = await this.getMtd(month);
    const row = rows.find((r) => r.recruiter_id === recruiterId);
    if (!row) {
      const nameRow = await this.dataSource.query(
        `SELECT name FROM sourcing.recruiters WHERE id = $1`,
        [recruiterId],
      );
      return {
        recruiter_id: recruiterId,
        recruiter_name: nameRow[0]?.name || '',
        assigned: 0,
        attempt: 0,
        connected: 0,
        interested: 0,
        interview_sched: 0,
        sched_next_day: 0,
        selection: 0,
        total_joining: 0,
        yet_to_join: 0,
        backout: 0,
        hold: 0,
      };
    }
    return row;
  }

  /**
   * GET /api/admin/recruiter-performance/company-wise?month=
   * Company-wise funnel. Optional month for MTD; otherwise all-time.
   */
  async getCompanyWise(month?: string): Promise<{ rows: RecruiterPerformanceCompanyWiseRow[] }> {
    const m = month ? this.toMonth(month) : null;
    const start = m ? `${m}-01` : null;
    const dateCondition = start
      ? `(
         (a.assigned_date >= $1::date AND a.assigned_date < $1::date + interval '1 month')
         OR (a.call_date >= $1::date AND a.call_date < $1::date + interval '1 month')
         OR (a.interview_date >= $1::date AND a.interview_date < $1::date + interval '1 month')
         OR (a.joining_date >= $1::date AND a.joining_date < $1::date + interval '1 month')
         OR ((a.updated_at AT TIME ZONE 'UTC')::date >= $1::date AND (a.updated_at AT TIME ZONE 'UTC')::date < $1::date + interval '1 month')
         )`
      : '1=1';
    const params = start ? [start] : [];
    const rows = await this.dataSource.query(
      `
      SELECT
        jr.company_id AS company_id,
        comp.name AS company_name,
        0 AS current_openings,
        COUNT(DISTINCT a.id) AS total_screened,
        COUNT(*) FILTER (WHERE a.interview_scheduled = true AND a.interview_date IS NOT NULL) AS interview_scheduled,
        COUNT(*) FILTER (WHERE a.interview_status IN ('Done', 'Not Attended', 'Rejected')) AS interview_done,
        COUNT(*) FILTER (WHERE a.interview_scheduled = true AND (a.interview_status IS NULL OR a.interview_status = 'Scheduled')) AS interview_pending,
        COUNT(*) FILTER (WHERE a.interview_status = 'Rejected' OR a.selection_status = 2) AS rejected,
        COUNT(*) FILTER (WHERE a.selection_status = 1) AS selected,
        COUNT(*) FILTER (WHERE a.joining_status = 1) AS joined,
        0 AS hold,
        COUNT(*) FILTER (WHERE a.selection_status = 1 AND (a.joining_status IS NULL OR a.joining_status = 3)) AS yet_to_join,
        COUNT(*) FILTER (WHERE a.joining_status = 4) AS backout
      FROM sourcing.applications a
      INNER JOIN sourcing.job_roles jr ON jr.id = a.job_role_id
      INNER JOIN companies comp ON comp.id = jr.company_id
      WHERE ${dateCondition}
      GROUP BY jr.company_id, comp.name
      ORDER BY comp.name
      `,
      params,
    );
    const mapped = rows.map((r: any) => ({
      company_id: r.company_id,
      company_name: r.company_name,
      current_openings: parseInt(r.current_openings, 10) || 0,
      total_screened: parseInt(r.total_screened, 10) || 0,
      interview_scheduled: parseInt(r.interview_scheduled, 10) || 0,
      interview_done: parseInt(r.interview_done, 10) || 0,
      interview_pending: parseInt(r.interview_pending, 10) || 0,
      rejected: parseInt(r.rejected, 10) || 0,
      selected: parseInt(r.selected, 10) || 0,
      joined: parseInt(r.joined, 10) || 0,
      hold: parseInt(r.hold, 10) || 0,
      yet_to_join: parseInt(r.yet_to_join, 10) || 0,
      backout: parseInt(r.backout, 10) || 0,
    }));
    return { rows: mapped };
  }

  /**
   * GET /api/admin/recruiter-performance/client-report?company_id=&date=&month=
   * One company: MTD and DOD metrics side by side.
   */
  async getClientReport(
    companyId: number,
    date?: string,
    month?: string,
  ): Promise<RecruiterPerformanceClientReport> {
    const d = this.toDate(date);
    const m = this.toMonth(month);
    const start = `${m}-01`;
    const companyRow = await this.dataSource.query(
      `SELECT id, name FROM companies WHERE id = $1`,
      [companyId],
    );
    if (!companyRow.length) {
      return {
        company_id: companyId,
        company_name: '',
        mtd: { interview_scheduled: 0, turnup: 0, interview_done: 0, rejected_status: 0, selection_status: 0, joined: 0, yet_to_join: 0, backout: 0 },
        dod: { interview_scheduled: 0, turnup: 0, interview_done: 0, rejected_status: 0, selection_status: 0, joined: 0, yet_to_join: 0, backout: 0 },
      };
    }
    const [dodRow, mtdRow] = await Promise.all([
      this.dataSource.query(
        `
        SELECT
          COUNT(*) FILTER (WHERE a.interview_date = $1::date) AS interview_scheduled,
          COUNT(*) FILTER (WHERE a.interview_date = $1::date AND a.turnup = true) AS turnup,
          COUNT(*) FILTER (WHERE a.interview_date = $1::date AND a.interview_status IN ('Done', 'Not Attended', 'Rejected')) AS interview_done,
          COUNT(*) FILTER (WHERE (a.interview_status = 'Rejected' OR a.selection_status = 2) AND ((a.updated_at AT TIME ZONE 'UTC')::date = $1::date OR a.interview_date = $1::date)) AS rejected_status,
          COUNT(*) FILTER (WHERE a.selection_status = 1 AND (a.updated_at AT TIME ZONE 'UTC')::date = $1::date) AS selection_status,
          COUNT(*) FILTER (WHERE a.joining_status = 1 AND a.joining_date = $1::date) AS joined,
          COUNT(*) FILTER (WHERE a.selection_status = 1 AND (a.joining_status IS NULL OR a.joining_status = 3)) AS yet_to_join,
          COUNT(*) FILTER (WHERE a.joining_status = 4 AND a.backout_date = $1::date) AS backout
        FROM sourcing.applications a
        INNER JOIN sourcing.job_roles jr ON jr.id = a.job_role_id
        WHERE jr.company_id = $2 AND (a.assigned_date = $1::date OR a.call_date = $1::date OR a.interview_date = $1::date OR a.joining_date = $1::date OR (a.updated_at AT TIME ZONE 'UTC')::date = $1::date)
        `,
        [d, companyId],
      ),
      this.dataSource.query(
        `
        SELECT
          COUNT(*) FILTER (WHERE a.interview_date >= $1::date AND a.interview_date < $1::date + interval '1 month') AS interview_scheduled,
          COUNT(*) FILTER (WHERE a.turnup = true AND a.interview_date >= $1::date AND a.interview_date < $1::date + interval '1 month') AS turnup,
          COUNT(*) FILTER (WHERE a.interview_status IN ('Done', 'Not Attended', 'Rejected') AND a.interview_date >= $1::date AND a.interview_date < $1::date + interval '1 month') AS interview_done,
          COUNT(*) FILTER (WHERE (a.interview_status = 'Rejected' OR a.selection_status = 2) AND (a.updated_at AT TIME ZONE 'UTC')::date >= $1::date AND (a.updated_at AT TIME ZONE 'UTC')::date < $1::date + interval '1 month') AS rejected_status,
          COUNT(*) FILTER (WHERE a.selection_status = 1 AND (a.updated_at AT TIME ZONE 'UTC')::date >= $1::date AND (a.updated_at AT TIME ZONE 'UTC')::date < $1::date + interval '1 month') AS selection_status,
          COUNT(*) FILTER (WHERE a.joining_status = 1 AND a.joining_date >= $1::date AND a.joining_date < $1::date + interval '1 month') AS joined,
          COUNT(*) FILTER (WHERE a.selection_status = 1 AND (a.joining_status IS NULL OR a.joining_status = 3)) AS yet_to_join,
          COUNT(*) FILTER (WHERE a.joining_status = 4 AND a.backout_date >= $1::date AND a.backout_date < $1::date + interval '1 month') AS backout
        FROM sourcing.applications a
        INNER JOIN sourcing.job_roles jr ON jr.id = a.job_role_id
        WHERE jr.company_id = $2 AND ((a.assigned_date >= $1::date AND a.assigned_date < $1::date + interval '1 month') OR (a.call_date >= $1::date AND a.call_date < $1::date + interval '1 month') OR (a.interview_date >= $1::date AND a.interview_date < $1::date + interval '1 month') OR (a.joining_date >= $1::date AND a.joining_date < $1::date + interval '1 month') OR ((a.updated_at AT TIME ZONE 'UTC')::date >= $1::date AND (a.updated_at AT TIME ZONE 'UTC')::date < $1::date + interval '1 month'))
        `,
        [start, companyId],
      ),
    ]);
    const dod = dodRow[0] || {};
    const mtd = mtdRow[0] || {};
    return {
      company_id: companyId,
      company_name: companyRow[0].name,
      mtd: {
        interview_scheduled: parseInt(mtd.interview_scheduled, 10) || 0,
        turnup: parseInt(mtd.turnup, 10) || 0,
        interview_done: parseInt(mtd.interview_done, 10) || 0,
        rejected_status: parseInt(mtd.rejected_status, 10) || 0,
        selection_status: parseInt(mtd.selection_status, 10) || 0,
        joined: parseInt(mtd.joined, 10) || 0,
        yet_to_join: parseInt(mtd.yet_to_join, 10) || 0,
        backout: parseInt(mtd.backout, 10) || 0,
      },
      dod: {
        interview_scheduled: parseInt(dod.interview_scheduled, 10) || 0,
        turnup: parseInt(dod.turnup, 10) || 0,
        interview_done: parseInt(dod.interview_done, 10) || 0,
        rejected_status: parseInt(dod.rejected_status, 10) || 0,
        selection_status: parseInt(dod.selection_status, 10) || 0,
        joined: parseInt(dod.joined, 10) || 0,
        yet_to_join: parseInt(dod.yet_to_join, 10) || 0,
        backout: parseInt(dod.backout, 10) || 0,
      },
    };
  }

  /**
   * GET /api/admin/recruiter-performance/negative-funnel/not-interested-remarks?date=&month=
   * Not interested remarks grouped by remark and job role. date for DOD, month for MTD.
   */
  async getNotInterestedRemarks(
    date?: string,
    month?: string,
  ): Promise<NegativeFunnelNotInterestedResponse> {
    const useMonth = !!month;
    const d = this.toDate(date);
    const m = month ? this.toMonth(month) : null;
    const start = m ? `${m}-01` : null;
    const dateCondition = useMonth && start
      ? `(a.updated_at AT TIME ZONE 'UTC')::date >= $1::date AND (a.updated_at AT TIME ZONE 'UTC')::date < $1::date + interval '1 month'`
      : `(a.updated_at AT TIME ZONE 'UTC')::date = $1::date`;
    const params = useMonth && start ? [start] : [d];
    const byRemark = await this.dataSource.query(
      `
      SELECT
        COALESCE(NULLIF(TRIM(a.not_interested_remark), ''), '(blank)') AS remark,
        COUNT(*) AS total,
        jr.id AS job_role_id,
        jr.role_name AS job_role_name,
        COUNT(*) AS cnt
      FROM sourcing.applications a
      INNER JOIN sourcing.job_roles jr ON jr.id = a.job_role_id
      WHERE a.interested = 2 AND ${dateCondition}
      GROUP BY COALESCE(NULLIF(TRIM(a.not_interested_remark), ''), '(blank)'), jr.id, jr.role_name
      ORDER BY total DESC, remark, jr.role_name
      `,
      params,
    );
    const remarkMap = new Map<string, { total: number; by_job_role: { job_role_id: number; job_role_name: string; count: number }[] }>();
    const jobRoleTotals = new Map<number, { job_role_name: string; count: number }>();
    let grandTotal = 0;
    for (const r of byRemark) {
      const remark = r.remark;
      if (!remarkMap.has(remark)) {
        remarkMap.set(remark, { total: 0, by_job_role: [] });
      }
      const entry = remarkMap.get(remark)!;
      const count = parseInt(r.cnt, 10) || 0;
      entry.total += count;
      entry.by_job_role.push({
        job_role_id: r.job_role_id,
        job_role_name: r.job_role_name || '',
        count,
      });
      const jrId = r.job_role_id;
      if (!jobRoleTotals.has(jrId)) {
        jobRoleTotals.set(jrId, { job_role_name: r.job_role_name || '', count: 0 });
      }
      jobRoleTotals.get(jrId)!.count += count;
      grandTotal += count;
    }
    const remarks: NotInterestedRemarkItem[] = [...remarkMap.entries()].map(([remark, data]) => ({
      remark,
      total: data.total,
      by_job_role: data.by_job_role,
    }));
    const totals_by_job_role = [...jobRoleTotals.entries()].map(([job_role_id, data]) => ({
      job_role_id,
      job_role_name: data.job_role_name,
      count: data.count,
    }));
    return { remarks, totals_by_job_role, grand_total: grandTotal };
  }

  /**
   * GET /api/admin/recruiter-performance/interview-status-company-wise?date=
   * Interview status by company for a day (DOD). Date default: today.
   */
  async getInterviewStatusCompanyWise(date?: string): Promise<{ rows: InterviewStatusCompanyWiseRow[] }> {
    const d = this.toDate(date);
    const rows = await this.dataSource.query(
      `
      SELECT
        jr.company_id AS company_id,
        comp.name AS company_name,
        COUNT(*) FILTER (WHERE a.interview_date = $1::date) AS int_sched,
        COUNT(*) FILTER (WHERE a.interview_date = $1::date AND (a.interview_status = 'Done' OR a.turnup = true)) AS int_done,
        COUNT(*) FILTER (WHERE a.interview_date = $1::date AND a.interview_scheduled = true AND (a.interview_status IS NULL OR a.interview_status = 'Scheduled')) AS inter_pending,
        COUNT(*) FILTER (WHERE a.selection_status = 1) AS selected,
        COUNT(*) FILTER (WHERE a.joining_status = 1) AS joined,
        0 AS on_hold,
        COUNT(*) FILTER (WHERE a.selection_status = 1 AND (a.joining_status IS NULL OR a.joining_status = 3)) AS yet_to_join,
        COUNT(*) FILTER (WHERE a.joining_status = 4) AS backout
      FROM sourcing.applications a
      INNER JOIN sourcing.job_roles jr ON jr.id = a.job_role_id
      INNER JOIN companies comp ON comp.id = jr.company_id
      WHERE a.interview_date = $1::date OR a.assigned_date = $1::date OR a.call_date = $1::date OR a.joining_date = $1::date OR (a.updated_at AT TIME ZONE 'UTC')::date = $1::date
      GROUP BY jr.company_id, comp.name
      ORDER BY comp.name
      `,
      [d],
    );
    const mapped = rows.map((r: any) => ({
      company_id: r.company_id,
      company_name: r.company_name,
      int_sched: parseInt(r.int_sched, 10) || 0,
      int_done: parseInt(r.int_done, 10) || 0,
      inter_pending: parseInt(r.inter_pending, 10) || 0,
      selected: parseInt(r.selected, 10) || 0,
      joined: parseInt(r.joined, 10) || 0,
      on_hold: parseInt(r.on_hold, 10) || 0,
      yet_to_join: parseInt(r.yet_to_join, 10) || 0,
      backout: parseInt(r.backout, 10) || 0,
    }));
    return { rows: mapped };
  }
}
