import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface FunnelFilters {
  from: string; // YYYY-MM-DD inclusive
  to: string; // YYYY-MM-DD inclusive
  recruiterId?: number;
  companyId?: number;
  portal?: string;
  granularity?: 'none' | 'day' | 'month';
}

export interface FunnelTotals {
  sourced: number;
  attempts: number;
  connected: number;
  interested: number;
  not_interested: number;
  interview_sched: number;
  interview_done: number;
  selected: number;
  rejected: number;
  joined: number;
  backout: number;
  yet_to_join: number;
}

export interface FunnelRates {
  connect_rate: number;
  interest_rate: number;
  interview_rate: number;
  select_rate: number;
  join_rate: number;
  sourced_to_join: number;
}

export interface FunnelResponse {
  range: { from: string; to: string };
  totals: FunnelTotals;
  rates: FunnelRates;
  series?: ({ bucket: string } & Partial<FunnelTotals>)[];
}

const EMPTY_TOTALS: FunnelTotals = {
  sourced: 0, attempts: 0, connected: 0, interested: 0, not_interested: 0,
  interview_sched: 0, interview_done: 0, selected: 0, rejected: 0,
  joined: 0, backout: 0, yet_to_join: 0,
};

function pct(n: number, d: number): number {
  if (!d || !isFinite(d)) return 0;
  return Math.round((n / d) * 100);
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Canonical funnel. Every metric is counted by its OWN event-date anchor
   * inside [from,to]. The same definitions power recruiter and admin views.
   */
  async getFunnel(filters: FunnelFilters): Promise<FunnelResponse> {
    const { from, to } = filters;

    // Optional scope filters (recruiter / company / portal)
    const scope: string[] = [];
    const params: any[] = [from, to];
    let p = 3;
    if (filters.recruiterId != null) { scope.push(`f.recruiter_id = $${p++}`); params.push(filters.recruiterId); }
    if (filters.companyId != null)   { scope.push(`f.company_id   = $${p++}`); params.push(filters.companyId); }
    if (filters.portal)              { scope.push(`f.portal       = $${p++}`); params.push(filters.portal); }
    const scopeSql = scope.length ? `AND ${scope.join(' AND ')}` : '';

    // Broad pre-filter (perf): keep rows with ANY event date in range, plus
    // current-state metrics (yet_to_join) which are not date-bound.
    const inRange = (col: string) => `f.${col} BETWEEN $1::date AND $2::date`;

    const sql = `
      SELECT
        COUNT(*) FILTER (WHERE ${inRange('assigned_date')})                          AS sourced,
        COUNT(*) FILTER (WHERE ${inRange('call_date')})                              AS attempts,
        COUNT(*) FILTER (WHERE f.is_connected     AND ${inRange('connected_date')})  AS connected,
        COUNT(*) FILTER (WHERE f.is_interested    AND ${inRange('interested_date')}) AS interested,
        COUNT(*) FILTER (WHERE f.is_not_interested AND ${inRange('interested_date')}) AS not_interested,
        COUNT(*) FILTER (WHERE f.is_interview_sched AND ${inRange('interview_date')}) AS interview_sched,
        COUNT(*) FILTER (WHERE f.is_interview_done  AND ${inRange('interview_date')}) AS interview_done,
        COUNT(*) FILTER (WHERE f.is_selected  AND ${inRange('selection_date')})       AS selected,
        COUNT(*) FILTER (WHERE f.is_rejected  AND ${inRange('rejection_date')})       AS rejected,
        COUNT(*) FILTER (WHERE f.is_joined    AND ${inRange('joining_date')})         AS joined,
        COUNT(*) FILTER (WHERE f.is_backout   AND ${inRange('backout_date')})         AS backout,
        COUNT(*) FILTER (WHERE f.is_yet_to_join)                                      AS yet_to_join
      FROM sourcing.v_application_facts f
      WHERE 1=1 ${scopeSql}
    `;

    const rows = await this.dataSource.query(sql, params);
    const r = rows[0] || {};
    const totals: FunnelTotals = {
      sourced: +r.sourced || 0,
      attempts: +r.attempts || 0,
      connected: +r.connected || 0,
      interested: +r.interested || 0,
      not_interested: +r.not_interested || 0,
      interview_sched: +r.interview_sched || 0,
      interview_done: +r.interview_done || 0,
      selected: +r.selected || 0,
      rejected: +r.rejected || 0,
      joined: +r.joined || 0,
      backout: +r.backout || 0,
      yet_to_join: +r.yet_to_join || 0,
    };

    const rates: FunnelRates = {
      connect_rate: pct(totals.connected, totals.attempts),
      interest_rate: pct(totals.interested, totals.connected),
      interview_rate: pct(totals.interview_sched, totals.interested),
      select_rate: pct(totals.selected, totals.interview_done),
      join_rate: pct(totals.joined, totals.selected),
      sourced_to_join: pct(totals.joined, totals.sourced),
    };

    const resp: FunnelResponse = { range: { from, to }, totals, rates };

    if (filters.granularity && filters.granularity !== 'none') {
      resp.series = await this.getSeries(filters, scopeSql, params);
    }
    return resp;
  }

  /**
   * Time-series. Each metric is bucketed by its own anchor, then merged.
   * Covers the dashboard "Joins" trend and the per-recruiter joined sparkline.
   */
  private async getSeries(
    filters: FunnelFilters,
    scopeSql: string,
    baseParams: any[],
  ): Promise<({ bucket: string } & Partial<FunnelTotals>)[]> {
    const grain = filters.granularity === 'month' ? 'month' : 'day';
    const trunc = (col: string) =>
      `to_char(date_trunc('${grain}', f.${col}), 'YYYY-MM-DD')`;
    const inRange = (col: string) => `f.${col} BETWEEN $1::date AND $2::date`;

    // One UNION ALL block per metric → (bucket, metric tallies), pivoted via SUM
    const metric = (col: string, anchor: string, flag?: string) => `
      SELECT ${trunc(anchor)} AS bucket,
        ${col === 'sourced' ? 'COUNT(*)' : `COUNT(*) FILTER (WHERE ${flag})`} AS ${col}
        ${['sourced','attempts','connected','interested','interview_sched','selected','joined']
          .filter(m => m !== col).map(m => `, 0 AS ${m}`).join('')}
      FROM sourcing.v_application_facts f
      WHERE ${inRange(anchor)} ${scopeSql}
      GROUP BY 1
    `;

    const unionSql = `
      SELECT bucket,
        SUM(sourced) sourced, SUM(attempts) attempts, SUM(connected) connected,
        SUM(interested) interested, SUM(interview_sched) interview_sched,
        SUM(selected) selected, SUM(joined) joined
      FROM (
        ${metric('sourced', 'assigned_date')}
        UNION ALL ${metric('attempts', 'call_date')}
        UNION ALL ${metric('connected', 'connected_date', 'f.is_connected')}
        UNION ALL ${metric('interested', 'interested_date', 'f.is_interested')}
        UNION ALL ${metric('interview_sched', 'interview_date', 'f.is_interview_sched')}
        UNION ALL ${metric('selected', 'selection_date', 'f.is_selected')}
        UNION ALL ${metric('joined', 'joining_date', 'f.is_joined')}
      ) u
      GROUP BY bucket
      ORDER BY bucket
    `;

    const rows = await this.dataSource.query(unionSql, baseParams);
    return rows.map((r: any) => ({
      bucket: r.bucket,
      sourced: +r.sourced || 0,
      attempts: +r.attempts || 0,
      connected: +r.connected || 0,
      interested: +r.interested || 0,
      interview_sched: +r.interview_sched || 0,
      selected: +r.selected || 0,
      joined: +r.joined || 0,
    }));
  }

  /**
   * Funnel grouped by a dimension (portal or company) for a range.
   * Phase 4 — portal quality & company health. One funnel row per group.
   */
  async getGroupedFunnel(
    dimension: 'portal' | 'company',
    filters: { from: string; to: string },
  ) {
    const { from, to } = filters;
    const groupCol = dimension === 'portal' ? 'f.portal' : 'f.company_name';
    const idCol = dimension === 'portal' ? 'f.portal' : 'f.company_id';
    const inRange = (col: string) => `f.${col} BETWEEN $1::date AND $2::date`;

    const sql = `
      SELECT
        ${idCol} AS group_id,
        ${groupCol} AS group_name,
        COUNT(*) FILTER (WHERE ${inRange('assigned_date')})                           AS sourced,
        COUNT(*) FILTER (WHERE ${inRange('call_date')})                               AS attempts,
        COUNT(*) FILTER (WHERE f.is_connected      AND ${inRange('connected_date')})  AS connected,
        COUNT(*) FILTER (WHERE f.is_interested     AND ${inRange('interested_date')}) AS interested,
        COUNT(*) FILTER (WHERE f.is_interview_sched AND ${inRange('interview_date')}) AS interview_sched,
        COUNT(*) FILTER (WHERE f.is_interview_done  AND ${inRange('interview_date')}) AS interview_done,
        COUNT(*) FILTER (WHERE f.is_selected  AND ${inRange('selection_date')})       AS selected,
        COUNT(*) FILTER (WHERE f.is_joined    AND ${inRange('joining_date')})         AS joined,
        COUNT(*) FILTER (WHERE f.is_backout   AND ${inRange('backout_date')})         AS backout,
        COUNT(*) FILTER (WHERE f.is_yet_to_join)                                      AS yet_to_join
      FROM sourcing.v_application_facts f
      WHERE ${groupCol} IS NOT NULL
      GROUP BY ${idCol}, ${groupCol}
      HAVING COUNT(*) FILTER (WHERE ${inRange('assigned_date')} OR ${inRange('call_date')}
        OR ${inRange('joining_date')} OR ${inRange('interview_date')}) > 0
      ORDER BY joined DESC, sourced DESC
    `;
    const rows = await this.dataSource.query(sql, [from, to]);
    return rows.map((r: any) => {
      const sourced = +r.sourced || 0;
      const attempts = +r.attempts || 0;
      const connected = +r.connected || 0;
      const interested = +r.interested || 0;
      const interviewSched = +r.interview_sched || 0;
      const interviewDone = +r.interview_done || 0;
      const selected = +r.selected || 0;
      const joined = +r.joined || 0;
      return {
        group_id: r.group_id,
        group_name: r.group_name,
        sourced, attempts, connected, interested,
        interview_sched: interviewSched, interview_done: interviewDone,
        selected, joined,
        backout: +r.backout || 0,
        yet_to_join: +r.yet_to_join || 0,
        connect_rate: pct(connected, attempts),
        interest_rate: pct(interested, connected),
        interview_to_select: pct(selected, interviewDone),
        select_to_join: pct(joined, selected),
        sourced_to_join: pct(joined, sourced),
      };
    });
  }

  /** Per-recruiter scorecards for a range (Phase 2 leaderboard). */
  async getRecruiterScorecards(filters: Omit<FunnelFilters, 'recruiterId' | 'granularity'>) {
    const { from, to } = filters;
    const scope: string[] = [];
    const params: any[] = [from, to];
    let p = 3;
    if (filters.companyId != null) { scope.push(`f.company_id = $${p++}`); params.push(filters.companyId); }
    if (filters.portal)            { scope.push(`f.portal     = $${p++}`); params.push(filters.portal); }
    const scopeSql = scope.length ? `AND ${scope.join(' AND ')}` : '';
    const inRange = (col: string) => `f.${col} BETWEEN $1::date AND $2::date`;

    const sql = `
      SELECT
        f.recruiter_id, f.recruiter_name,
        COUNT(*) FILTER (WHERE ${inRange('call_date')})                              AS attempts,
        COUNT(*) FILTER (WHERE f.is_connected  AND ${inRange('connected_date')})     AS connected,
        COUNT(*) FILTER (WHERE f.is_interested AND ${inRange('interested_date')})    AS interested,
        COUNT(*) FILTER (WHERE f.is_interview_sched AND ${inRange('interview_date')}) AS interview_sched,
        COUNT(*) FILTER (WHERE f.is_interview_done  AND ${inRange('interview_date')}) AS interview_done,
        COUNT(*) FILTER (WHERE f.is_selected AND ${inRange('selection_date')})       AS selected,
        COUNT(*) FILTER (WHERE f.is_joined   AND ${inRange('joining_date')})         AS joined,
        COUNT(DISTINCT f.call_date) FILTER (WHERE ${inRange('call_date')})           AS active_days
      FROM sourcing.v_application_facts f
      WHERE 1=1 ${scopeSql}
      GROUP BY f.recruiter_id, f.recruiter_name
      HAVING COUNT(*) FILTER (WHERE ${inRange('call_date')}
        OR ${inRange('assigned_date')} OR ${inRange('joining_date')}) > 0
      ORDER BY joined DESC, selected DESC
    `;
    const rows = await this.dataSource.query(sql, params);
    return rows.map((r: any) => {
      const attempts = +r.attempts || 0;
      const connected = +r.connected || 0;
      const interested = +r.interested || 0;
      const interviewSched = +r.interview_sched || 0;
      const interviewDone = +r.interview_done || 0;
      const selected = +r.selected || 0;
      const joined = +r.joined || 0;
      const activeDays = +r.active_days || 0;
      return {
        recruiter_id: r.recruiter_id,
        recruiter_name: r.recruiter_name,
        attempts, connected, interested, interview_sched: interviewSched,
        interview_done: interviewDone, selected, joined,
        active_days: activeDays,
        connect_rate: pct(connected, attempts),
        interest_rate: pct(interested, connected),
        interview_to_select: pct(selected, interviewDone),
        select_to_join: pct(joined, selected),
        sourced_to_join: 0, // filled by caller if sourced needed
        avg_attempts_per_day: activeDays ? Math.round(attempts / activeDays) : 0,
      };
    });
  }
}

export { EMPTY_TOTALS };
