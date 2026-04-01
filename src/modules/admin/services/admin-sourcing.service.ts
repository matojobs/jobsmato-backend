import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { StatusMapper } from '../../recruiter/mappers/status.mapper';

export interface AdminSourcingQuery {
  page?: number;
  limit?: number;
  recruiter_id?: number;
  company_id?: number;
  call_status?: string;
  selection_status?: string;
  joining_status?: string;
  interview_status?: string;
  search?: string;
}

@Injectable()
export class AdminSourcingService {
  constructor(private readonly dataSource: DataSource) {}

  async getSourcingApplications(query: AdminSourcingQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
    const offset = (page - 1) * limit;

    let where = 'WHERE 1=1';
    const params: any[] = [];
    let idx = 1;

    if (query.recruiter_id) {
      where += ` AND a.recruiter_id = $${idx++}`;
      params.push(query.recruiter_id);
    }

    if (query.company_id) {
      where += ` AND jr.company_id = $${idx++}`;
      params.push(query.company_id);
    }

    if (query.call_status) {
      const callInt = StatusMapper.callStatusToInt(query.call_status);
      if (callInt !== null) {
        where += ` AND a.call_status = $${idx++}`;
        params.push(callInt);
      }
    }

    if (query.selection_status) {
      const selInt = StatusMapper.selectionStatusToInt(query.selection_status);
      if (selInt !== null) {
        where += ` AND a.selection_status = $${idx++}`;
        params.push(selInt);
      }
    }

    if (query.joining_status) {
      const joinInt = StatusMapper.joiningStatusToInt(query.joining_status);
      if (joinInt !== null) {
        where += ` AND a.joining_status = $${idx++}`;
        params.push(joinInt);
      }
    }

    if (query.interview_status) {
      where += ` AND a.interview_status = $${idx++}`;
      params.push(query.interview_status);
    }

    if (query.search?.trim()) {
      where += ` AND (
        cand.name ILIKE $${idx}
        OR cand.phone ILIKE $${idx}
        OR r.name ILIKE $${idx}
        OR jr.role_name ILIKE $${idx}
        OR comp.name ILIKE $${idx}
      )`;
      params.push(`%${query.search.trim()}%`);
      idx++;
    }

    const countSql = `
      SELECT COUNT(*) AS total
      FROM sourcing.applications a
      INNER JOIN sourcing.candidates cand ON cand.id = a.candidate_id
      INNER JOIN sourcing.recruiters r ON r.id = a.recruiter_id
      LEFT JOIN sourcing.job_roles jr ON jr.id = a.job_role_id
      LEFT JOIN companies comp ON comp.id = jr.company_id
      ${where}
    `;
    const countResult = await this.dataSource.query(countSql, params);
    const total = parseInt(countResult[0]?.total ?? '0', 10);

    const dataSql = `
      SELECT
        a.id,
        a.assigned_date,
        a.call_date,
        a.call_status,
        a.interested AS interested_int,
        a.interview_scheduled,
        a.interview_date,
        a.interview_status,
        a.selection_status,
        a.joining_status,
        a.joining_date,
        a.created_at,
        cand.id   AS candidate_id,
        cand.name AS candidate_name,
        cand.phone AS candidate_phone,
        r.id   AS recruiter_id,
        r.name AS recruiter_name,
        jr.id        AS job_role_id,
        jr.role_name,
        comp.id   AS company_id,
        comp.name AS company_name
      FROM sourcing.applications a
      INNER JOIN sourcing.candidates cand ON cand.id = a.candidate_id
      INNER JOIN sourcing.recruiters r ON r.id = a.recruiter_id
      LEFT JOIN sourcing.job_roles jr ON jr.id = a.job_role_id
      LEFT JOIN companies comp ON comp.id = jr.company_id
      ${where}
      ORDER BY a.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `;
    const rows = await this.dataSource.query(dataSql, [...params, limit, offset]);

    const applications = rows.map((row: any) => ({
      id: String(row.id),
      assigned_date: row.assigned_date
        ? (row.assigned_date.toISOString?.().split('T')[0] ?? String(row.assigned_date))
        : null,
      call_date: row.call_date
        ? (row.call_date.toISOString?.().split('T')[0] ?? String(row.call_date))
        : null,
      call_status: StatusMapper.callStatusToString(row.call_status),
      interested_status: StatusMapper.interestedStatusToString(row.interested_int),
      interview_scheduled: row.interview_scheduled ?? false,
      interview_date: row.interview_date
        ? (row.interview_date.toISOString?.().split('T')[0] ?? String(row.interview_date))
        : null,
      interview_status: row.interview_status ?? null,
      selection_status: StatusMapper.selectionStatusToString(row.selection_status),
      joining_status: StatusMapper.joiningStatusToString(row.joining_status),
      joining_date: row.joining_date
        ? (row.joining_date.toISOString?.().split('T')[0] ?? String(row.joining_date))
        : null,
      candidate: {
        id: String(row.candidate_id),
        candidate_name: row.candidate_name,
        phone: row.candidate_phone ?? null,
      },
      recruiter: {
        id: row.recruiter_id,
        name: row.recruiter_name,
      },
      job_role: {
        id: row.job_role_id,
        role_name: row.role_name ?? '—',
        company: {
          id: row.company_id,
          name: row.company_name ?? '—',
        },
      },
    }));

    return {
      applications,
      total,
      page,
      limit,
      total_pages: Math.ceil(total / limit) || 1,
    };
  }
}
