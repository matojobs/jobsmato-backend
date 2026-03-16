import {
  Injectable,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { CreateJobRoleDto } from './dto/create-job-role.dto';
import { ApplicationQueryDto, CandidateQueryDto } from './dto/query-params.dto';
import { StatusMapper } from './mappers/status.mapper';
import {
  ApplicationResponse,
  CandidateResponse,
  RecruiterResponse,
  JobRoleResponse,
  CompanyResponse,
} from './interfaces/application-response.interface';
import {
  DashboardStatsResponse,
  PipelineResponse,
  RecruiterPerformanceResponse,
  TodayProgressResponse,
} from './interfaces/dashboard.interface';
import { CompaniesService } from '../companies/companies.service';
import { ApplicationsService } from '../applications/applications.service';
import { CreateApplicationWithCandidateDto } from './dto/create-application-with-candidate.dto';

@Injectable()
export class RecruiterService {
  constructor(
    private dataSource: DataSource,
    private companiesService: CompaniesService,
    private applicationsService: ApplicationsService,
  ) { }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Get recruiter ID from user email.
   * If no sourcing.recruiters row exists, auto-creates one for users with role recruiter (so recruiter portal works after login).
   */
  async getRecruiterIdByEmail(email: string): Promise<number> {
    let result = await this.dataSource.query(
      `SELECT id FROM sourcing.recruiters WHERE email = $1 AND is_active = true LIMIT 1`,
      [email],
    );
    if (result.length > 0) return result[0].id;

    const userRow = await this.dataSource.query(
      `SELECT id, "firstName", "lastName" FROM users WHERE email = $1 AND role = 'recruiter' LIMIT 1`,
      [email],
    );
    if (userRow.length === 0) {
      throw new NotFoundException(
        `Recruiter not found for email ${email}. Please ensure your email matches a recruiter record.`,
      );
    }
    const name = [userRow[0].firstName, userRow[0].lastName].filter(Boolean).join(' ').trim() || email;
    result = await this.dataSource.query(
      `INSERT INTO sourcing.recruiters (name, email, phone, is_active, created_at, updated_at)
       VALUES ($1, $2, NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (email) DO UPDATE SET is_active = true, name = EXCLUDED.name, updated_at = CURRENT_TIMESTAMP
       RETURNING id`,
      [name, email],
    );
    return result[0].id;
  }

  // ============================================
  // MASTER DATA ENDPOINTS
  // ============================================

  /**
   * Get all recruiters
   */
  async getRecruiters(): Promise<RecruiterResponse[]> {
    const result = await this.dataSource.query(
      `SELECT id, name, email, phone, is_active 
       FROM sourcing.recruiters 
       WHERE is_active = true 
       ORDER BY name ASC`,
    );
    return result.map((r: any) => ({
      id: r.id,
      name: r.name,
      email: r.email || null,
      phone: r.phone || null,
      is_active: r.is_active,
    }));
  }

  /**
   * Get all companies with job roles count
   */
  async getCompanies(): Promise<CompanyResponse[]> {
    const result = await this.dataSource.query(
      `SELECT 
        c.id, 
        c.name, 
        c.slug, 
        c.description, 
        c.website, 
        c.industry,
        COUNT(jr.id) as job_roles_count
       FROM companies c
       LEFT JOIN sourcing.job_roles jr ON jr.company_id = c.id AND jr.is_active = true
       GROUP BY c.id, c.name, c.slug, c.description, c.website, c.industry
       ORDER BY c.name ASC`,
    );
    return result.map((c: any) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description || null,
      website: c.website || null,
      industry: c.industry || null,
      job_roles_count: parseInt(c.job_roles_count) || 0,
    }));
  }

  /**
   * Sync job roles from main app jobs table into sourcing.job_roles for this company,
   * so companies with job postings show those titles as job roles for recruiters.
   */
  private async syncJobRolesFromJobsForCompany(companyId: number): Promise<void> {
    try {
      const col = await this.dataSource.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = 'jobs' AND column_name IN ('companyId', 'company_id')
         LIMIT 1`,
      );
      const companyCol = col[0]?.column_name;
      if (!companyCol) return;

      const quoted = `"${companyCol}"`;
      await this.dataSource.query(
        `INSERT INTO sourcing.job_roles (company_id, role_name, is_active, created_at, updated_at)
         SELECT DISTINCT j.${quoted}, NULLIF(TRIM(j.title), ''), true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
         FROM jobs j
         WHERE j.${quoted} = $1 AND j.title IS NOT NULL AND TRIM(j.title) <> ''
         ON CONFLICT (company_id, role_name) DO NOTHING`,
        [companyId],
      );
    } catch {
      // Ignore (e.g. jobs table missing or schema mismatch)
    }
  }

  /**
   * Get company by ID with job roles
   */
  async getCompanyById(id: number): Promise<CompanyResponse> {
    const companyResult = await this.dataSource.query(
      `SELECT id, name, slug, description, website, industry 
       FROM companies 
       WHERE id = $1`,
      [id],
    );

    if (companyResult.length === 0) {
      throw new NotFoundException(`Company with ID ${id} not found`);
    }

    const company = companyResult[0];

    await this.syncJobRolesFromJobsForCompany(id);

    // Get job roles for this company
    const jobRolesResult = await this.dataSource.query(
      `SELECT id, company_id, role_name, department, is_active
       FROM sourcing.job_roles
       WHERE company_id = $1 AND is_active = true
       ORDER BY role_name ASC`,
      [id],
    );

    return {
      id: company.id,
      name: company.name,
      slug: company.slug,
      description: company.description || null,
      website: company.website || null,
      industry: company.industry || null,
      job_roles: jobRolesResult.map((jr: any) => ({
        id: jr.id,
        company_id: jr.company_id,
        role_name: jr.role_name,
        department: jr.department || null,
        is_active: jr.is_active,
      })),
      job_roles_count: jobRolesResult.length,
    };
  }

  /**
   * Get job role by ID with company details
   */
  async getJobRoleById(id: number): Promise<JobRoleResponse> {
    const result = await this.dataSource.query(
      `SELECT 
        jr.id, 
        jr.company_id, 
        jr.role_name, 
        jr.department, 
        jr.is_active,
        c.id as company_id_full,
        c.name as company_name,
        c.slug as company_slug,
        c.description as company_description,
        c.website as company_website,
        c.industry as company_industry
      FROM sourcing.job_roles jr
      INNER JOIN companies c ON c.id = jr.company_id
      WHERE jr.id = $1 AND jr.is_active = true`,
      [id],
    );

    if (result.length === 0) {
      throw new NotFoundException(`Job role with ID ${id} not found`);
    }

    const jr = result[0];
    return {
      id: jr.id,
      company_id: jr.company_id,
      role_name: jr.role_name,
      department: jr.department || null,
      is_active: jr.is_active,
      company: {
        id: jr.company_id_full,
        name: jr.company_name,
        slug: jr.company_slug,
        description: jr.company_description || null,
        website: jr.company_website || null,
        industry: jr.company_industry || null,
      },
    };
  }

  /**
   * Get all job roles with company details
   */
  async getJobRoles(companyId?: number): Promise<JobRoleResponse[]> {
    let query = `
      SELECT 
        jr.id, 
        jr.company_id, 
        jr.role_name, 
        jr.department, 
        jr.is_active,
        c.id as company_id_full,
        c.name as company_name,
        c.slug as company_slug,
        c.description as company_description,
        c.website as company_website,
        c.industry as company_industry
      FROM sourcing.job_roles jr
      INNER JOIN companies c ON c.id = jr.company_id
      WHERE jr.is_active = true
    `;
    const params: any[] = [];

    if (companyId) {
      query += ` AND jr.company_id = $1`;
      params.push(companyId);
    }

    query += ` ORDER BY c.name ASC, jr.role_name ASC`;

    const result = await this.dataSource.query(query, params);
    return result.map((jr: any) => ({
      id: jr.id,
      company_id: jr.company_id,
      role_name: jr.role_name,
      department: jr.department || null,
      is_active: jr.is_active,
      company: {
        id: jr.company_id_full,
        name: jr.company_name,
        slug: jr.company_slug,
        description: jr.company_description || null,
        website: jr.company_website || null,
        industry: jr.company_industry || null,
      },
    }));
  }

  /**
   * Create job role
   */
  async createJobRole(dto: CreateJobRoleDto): Promise<JobRoleResponse> {
    // Check if company exists
    const company = await this.dataSource.query(
      `SELECT id FROM companies WHERE id = $1`,
      [dto.company_id],
    );
    if (company.length === 0) {
      throw new NotFoundException(`Company with ID ${dto.company_id} not found`);
    }

    // Check for duplicate
    const existing = await this.dataSource.query(
      `SELECT id FROM sourcing.job_roles 
       WHERE company_id = $1 AND role_name = $2`,
      [dto.company_id, dto.role_name],
    );
    if (existing.length > 0) {
      throw new BadRequestException(
        `Job role "${dto.role_name}" already exists for this company`,
      );
    }

    const result = await this.dataSource.query(
      `INSERT INTO sourcing.job_roles (company_id, role_name, department, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, company_id, role_name, department, is_active`,
      [dto.company_id, dto.role_name, dto.department || null],
    );

    return {
      id: result[0].id,
      company_id: result[0].company_id,
      role_name: result[0].role_name,
      department: result[0].department || null,
      is_active: result[0].is_active,
    };
  }

  /**
   * Get candidates. When recruiterId is provided (recruiter portal), only return candidates
   * that have at least one application assigned to that recruiter.
   * Optional search (name/phone/email) and filters: job_role_id, company_id, portal_id.
   */
  async getCandidates(
    queryParams: CandidateQueryDto,
    recruiterId?: number,
  ): Promise<CandidateResponse[]> {
    const params: any[] = [];
    let paramIndex = 1;

    let query = `
      SELECT DISTINCT c.id, c.name, c.phone, c.email, c.portal_id, c.date_of_birth
      FROM sourcing.candidates c
    `;

    if (recruiterId != null) {
      query += `
      INNER JOIN sourcing.applications a ON a.candidate_id = c.id AND a.recruiter_id = $${paramIndex}
      `;
      params.push(recruiterId);
      paramIndex++;
    } else if (queryParams.job_role_id != null || queryParams.company_id != null) {
      query += `
      INNER JOIN sourcing.applications a ON a.candidate_id = c.id
      `;
    }

    if (queryParams.company_id != null) {
      query += `
      INNER JOIN sourcing.job_roles jr ON jr.id = a.job_role_id
      `;
    }

    query += ` WHERE 1=1`;

    if (queryParams.job_role_id != null) {
      query += ` AND a.job_role_id = $${paramIndex}`;
      params.push(queryParams.job_role_id);
      paramIndex++;
    }
    if (queryParams.company_id != null) {
      query += ` AND jr.company_id = $${paramIndex}`;
      params.push(queryParams.company_id);
      paramIndex++;
    }
    if (queryParams.portal_id != null) {
      query += ` AND c.portal_id = $${paramIndex}`;
      params.push(queryParams.portal_id);
      paramIndex++;
    }

    const search = queryParams.search?.trim();
    if (search) {
      query += ` AND (c.name ILIKE $${paramIndex} OR c.phone ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY c.name ASC LIMIT 100`;

    const result = await this.dataSource.query(query, params);
    return result.map((c: any) => ({
      id: c.id,
      candidate_name: c.name,
      phone: c.phone || '',
      email: c.email || null,
      qualification: null,
      work_exp_years: null,
      portal_id: c.portal_id || null,
      age: this.computeAgeFromDateOfBirth(c.date_of_birth) ?? null,
      date_of_birth: this.formatDateOfBirth(c.date_of_birth) ?? null,
    }));
  }

  /**
   * Create candidate
   */
  async createCandidate(dto: CreateCandidateDto, recruiterId: number): Promise<CandidateResponse> {
    // Check for duplicate by phone hash
    const phoneHash = await this.dataSource.query(
      `SELECT sourcing.hash_phone($1) as hash`,
      [dto.phone],
    );
    const hash = phoneHash[0].hash;

    const existing = await this.dataSource.query(
      `SELECT id FROM sourcing.candidates WHERE phone_hash = $1`,
      [hash],
    );

    if (existing.length > 0) {
      throw new BadRequestException('Candidate with this phone number already exists');
    }

    let dateOfBirth: string | null = dto.date_of_birth ?? null;
    if (!dateOfBirth && dto.age != null) {
      const y = new Date().getFullYear() - Math.floor(dto.age);
      dateOfBirth = `${y}-01-01`;
    }

    const result = await this.dataSource.query(
      `INSERT INTO sourcing.candidates (name, phone, email, portal_id, date_of_birth, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5::date, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING id, name, phone, email, portal_id, date_of_birth`,
      [dto.candidate_name, dto.phone, dto.email || null, dto.portal_id || null, dateOfBirth],
    );

    const row = result[0];
    const dob = row?.date_of_birth;
    return {
      id: row.id,
      candidate_name: row.name,
      phone: row.phone || '',
      email: row.email || null,
      qualification: dto.qualification || null,
      work_exp_years: dto.work_exp_years || null,
      portal_id: row.portal_id || null,
      age: this.computeAgeFromDateOfBirth(dob) ?? null,
      date_of_birth: this.formatDateOfBirth(dob) ?? null,
    };
  }

  /**
   * Job roles this recruiter has sourced candidates for (Sourcing page).
   * Returns distinct job roles with application count.
   */
  async getSourcedJobRoles(recruiterId: number): Promise<{
    jobRoleId: number;
    jobRoleName: string;
    department: string | null;
    companyId: number;
    companyName: string;
    applicationCount: number;
  }[]> {
    const result = await this.dataSource.query(
      `SELECT 
        jr.id as "jobRoleId",
        jr.role_name as "jobRoleName",
        jr.department,
        jr.company_id as "companyId",
        c.name as "companyName",
        COUNT(a.id)::int as "applicationCount"
       FROM sourcing.applications a
       INNER JOIN sourcing.job_roles jr ON jr.id = a.job_role_id
       LEFT JOIN companies c ON c.id = jr.company_id
       WHERE a.recruiter_id = $1
       GROUP BY jr.id, jr.role_name, jr.department, jr.company_id, c.name
       ORDER BY jr.role_name ASC`,
      [recruiterId],
    );
    return result;
  }

  // ============================================
  // APPLICATIONS CRUD
  // ============================================

  /**
   * Get applications with filters and pagination.
   * When userId is provided, includes job portal applications (where recruiter filled call) merged with sourcing.
   */
  async getApplications(
    query: ApplicationQueryDto,
    recruiterId: number,
    userId?: number,
  ): Promise<{ applications: ApplicationResponse[]; total: number; page: number; limit: number; total_pages: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    // Recruiter filter (enforce isolation)
    whereClause += ` AND a.recruiter_id = $${paramIndex}`;
    params.push(recruiterId);
    paramIndex++;

    if (query.job_role_id) {
      whereClause += ` AND a.job_role_id = $${paramIndex}`;
      params.push(query.job_role_id);
      paramIndex++;
    }

    if (query.company_id) {
      whereClause += ` AND jr.company_id = $${paramIndex}`;
      params.push(query.company_id);
      paramIndex++;
    }

    if (query.call_status) {
      const callStatusInt = StatusMapper.callStatusToInt(query.call_status);
      if (callStatusInt !== null) {
        whereClause += ` AND a.call_status = $${paramIndex}`;
        params.push(callStatusInt);
        paramIndex++;
      }
    }

    if (query.interested_status) {
      const interestedInt = StatusMapper.interestedStatusToInt(query.interested_status);
      if (interestedInt !== null) {
        whereClause += ` AND a.interested = $${paramIndex}`;
        params.push(interestedInt);
        paramIndex++;
      }
    }

    if (query.selection_status) {
      const selectionInt = StatusMapper.selectionStatusToInt(query.selection_status);
      if (selectionInt !== null) {
        whereClause += ` AND a.selection_status = $${paramIndex}`;
        params.push(selectionInt);
        paramIndex++;
      }
    }

    if (query.joining_status) {
      const joiningInt = StatusMapper.joiningStatusToInt(query.joining_status);
      if (joiningInt !== null) {
        whereClause += ` AND a.joining_status = $${paramIndex}`;
        params.push(joiningInt);
        paramIndex++;
      }
    }

    if (query.start_date) {
      whereClause += ` AND a.assigned_date >= $${paramIndex}`;
      params.push(query.start_date);
      paramIndex++;
    }

    if (query.end_date) {
      whereClause += ` AND a.assigned_date <= $${paramIndex}`;
      params.push(query.end_date);
      paramIndex++;
    }

    if (query.interview_scheduled !== undefined) {
      whereClause += ` AND a.interview_scheduled = $${paramIndex}`;
      params.push(query.interview_scheduled);
      paramIndex++;
    }

    if (query.interview_status) {
      whereClause += ` AND a.interview_status = $${paramIndex}`;
      params.push(query.interview_status);
      paramIndex++;
    }

    const searchTerm = query.search?.trim();
    if (searchTerm) {
      whereClause += ` AND (
        c.name ILIKE $${paramIndex}
        OR c.phone ILIKE $${paramIndex}
        OR c.email ILIKE $${paramIndex}
        OR a.portal ILIKE $${paramIndex}
        OR jr.role_name ILIKE $${paramIndex}
        OR comp.name ILIKE $${paramIndex}
      )`;
      params.push(`%${searchTerm}%`);
      paramIndex++;
    }

    // Count total sourcing (JOINs match data query so search/filters apply)
    const countQuery = `
      SELECT COUNT(*) as total
      FROM sourcing.applications a
      INNER JOIN sourcing.candidates c ON c.id = a.candidate_id
      LEFT JOIN sourcing.job_roles jr ON jr.id = a.job_role_id
      LEFT JOIN companies comp ON comp.id = jr.company_id
      ${whereClause}
    `;
    const countResult = await this.dataSource.query(countQuery, params);
    let totalSourcing = parseInt(countResult[0].total);

    const mergeWithJobPortal = userId != null;
    const paramsData = [...params];
    const dataLimit = mergeWithJobPortal ? 2000 : limit;
    const dataOffset = mergeWithJobPortal ? 0 : offset;

    const sortBy = query.sort_by || 'created_at';
    const sortOrder = (query.sort_order || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const orderByColumn =
      sortBy === 'candidate_name' ? 'c.name' : `a.${sortBy}`;
    const orderByClause = `ORDER BY ${orderByColumn} ${sortOrder}, a.id DESC`;

    // Get sourcing data (with or without limit for merge)
    const dataQuery = `
      SELECT 
        a.id,
        a.candidate_id,
        a.recruiter_id,
        a.job_role_id,
        a.portal,
        a.assigned_date,
        a.call_date,
        a.call_status,
        a.interested,
        a.not_interested_remark,
        a.interview_scheduled,
        a.interview_date,
        a.turnup,
        a.interview_status,
        a.selection_status,
        a.joining_status,
        a.joining_date,
        a.backout_date,
        a.backout_reason,
        a.hiring_manager_feedback,
        a.followup_date,
        a.notes,
        a.created_at,
        a.updated_at,
        c.id as candidate_id_full,
        c.name as candidate_name,
        c.phone as candidate_phone,
        c.email as candidate_email,
        c.date_of_birth as candidate_date_of_birth,
        r.id as recruiter_id_full,
        r.name as recruiter_name,
        r.email as recruiter_email,
        r.phone as recruiter_phone,
        jr.id as job_role_id_full,
        jr.role_name,
        jr.department,
        jr.company_id,
        comp.id as company_id_full,
        comp.name as company_name,
        comp.slug as company_slug,
        comp.description as company_description,
        comp.website as company_website,
        comp.industry as company_industry
      FROM sourcing.applications a
      INNER JOIN sourcing.candidates c ON c.id = a.candidate_id
      INNER JOIN sourcing.recruiters r ON r.id = a.recruiter_id
      INNER JOIN sourcing.job_roles jr ON jr.id = a.job_role_id
      LEFT JOIN companies comp ON comp.id = jr.company_id
      ${whereClause}
      ${orderByClause}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    paramsData.push(dataLimit, dataOffset);

    const result = await this.dataSource.query(dataQuery, paramsData);
    let sourcingRows: ApplicationResponse[] = result.map((row: any) => ({
      ...this.mapApplicationRow(row),
      source: 'sourcing' as const,
    }));

    let total = totalSourcing;
    let data: ApplicationResponse[] = sourcingRows;

    if (mergeWithJobPortal && userId != null) {
      const jobPortalList = await this.applicationsService.getRecruiterWorkJobApplications(userId);
      const recruiterRow = await this.dataSource.query(
        `SELECT id, name, email, phone FROM sourcing.recruiters WHERE id = $1 LIMIT 1`,
        [recruiterId],
      );
      const recruiter = recruiterRow[0]
        ? {
          id: recruiterRow[0].id,
          name: recruiterRow[0].name,
          email: recruiterRow[0].email || null,
          phone: recruiterRow[0].phone || null,
          is_active: true,
        }
        : { id: recruiterId, name: '', email: null, phone: null, is_active: true };

      const jobPortalMapped: ApplicationResponse[] = jobPortalList.map((app: any) =>
        this.mapJobPortalApplicationToResponse(app, recruiterId, recruiter),
      );
      total = totalSourcing + jobPortalMapped.length;
      const combined = [...sourcingRows, ...jobPortalMapped].sort((a, b) => {
        const dateA = a.call_date || a.assigned_date || a.created_at;
        const dateB = b.call_date || b.assigned_date || b.created_at;
        if (dateA !== dateB) return dateB.localeCompare(dateA);
        return (b.created_at || '').localeCompare(a.created_at || '');
      });
      data = combined.slice(offset, offset + limit);
    } else {
      data = sourcingRows;
    }

    const total_pages = limit > 0 ? Math.ceil(total / limit) : 0;
    return { applications: data, total, page, limit, total_pages };
  }

  /**
   * Map job portal application (ApplicationResponseDto shape) to ApplicationResponse for recruiter list.
   */
  private mapJobPortalApplicationToResponse(
    app: any,
    recruiterId: number,
    recruiter: { id: number; name: string; email: string | null; phone: string | null; is_active: boolean },
  ): ApplicationResponse {
    const u = app.user || {};
    const job = app.job || {};
    const company = job.company || {};
    const candidateName = [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || u.email || 'Candidate';
    const assignedDate =
      (app.assignedDate ? String(app.assignedDate).split('T')[0] : null) ??
      (app.appliedAt ? String(app.appliedAt).split('T')[0] : '') ??
      '';
    const callDate = app.recruiterCallDate ? String(app.recruiterCallDate).split('T')[0] : null;
    let interestedStatus: string | null = null;
    if (app.recruiterInterested === true) interestedStatus = 'Yes';
    else if (app.recruiterInterested === false) interestedStatus = 'No';
    const rawCallStatus = app.recruiterCallStatus ?? null;
    const callStatus =
      rawCallStatus && String(rawCallStatus).toLowerCase().trim() === 'call connected' ? 'Connected' : rawCallStatus;

    return {
      id: app.id,
      candidate_id: u.id || 0,
      recruiter_id: recruiterId,
      job_role_id: job.id || 0,
      portal: app.portal ?? null,
      assigned_date: assignedDate,
      call_date: callDate,
      call_status: callStatus,
      interested_status: interestedStatus,
      not_interested_remark: app.notInterestedRemark ?? null,
      interview_scheduled: app.interviewScheduled ?? undefined,
      interview_date: app.interviewDate ?? null,
      turnup: app.turnup ?? null,
      interview_status: app.interviewStatus ?? null,
      selection_status: app.selectionStatus ?? null,
      joining_status: app.joiningStatus ?? null,
      joining_date: app.joiningDate ?? null,
      backout_date: app.backoutDate ?? null,
      backout_reason: app.backoutReason ?? null,
      hiring_manager_feedback: app.hiringManagerFeedback ?? null,
      followup_date: app.followupDate ?? null,
      notes: app.recruiterNotes ?? null,
      created_at: app.createdAt || new Date().toISOString(),
      updated_at: app.updatedAt || new Date().toISOString(),
      source: 'job_portal',
      candidate: {
        id: u.id,
        candidate_name: candidateName,
        phone: u.phone || '',
        email: u.email || null,
        qualification: null,
        work_exp_years: null,
        portal_id: null,
        age: this.computeAgeFromDateOfBirth(u.dateOfBirth) ?? null,
        date_of_birth: this.formatDateOfBirth(u.dateOfBirth) ?? null,
      },
      recruiter,
      job_role: {
        id: job.id,
        company_id: company.id || 0,
        role_name: job.title || 'Job',
        department: null,
        is_active: true,
      },
      company: company.id
        ? {
          id: company.id,
          name: company.name || '',
          slug: (company.slug as string) || '',
          description: company.description ?? null,
          website: company.website ?? null,
          industry: company.industry ?? null,
        }
        : undefined,
    };
  }

  /**
   * Get single application by ID (sourcing first, then job portal if not found).
   * So GET /api/recruiter/applications/1 works for both sourcing and job-portal application ids.
   */
  async getApplicationById(id: number, recruiterId: number, userId?: number): Promise<ApplicationResponse> {
    const result = await this.dataSource.query(
      `
      SELECT 
        a.id,
        a.candidate_id,
        a.recruiter_id,
        a.job_role_id,
        a.portal,
        a.assigned_date,
        a.call_date,
        a.call_status,
        a.interested,
        a.not_interested_remark,
        a.interview_scheduled,
        a.interview_date,
        a.turnup,
        a.interview_status,
        a.selection_status,
        a.joining_status,
        a.joining_date,
        a.backout_date,
        a.backout_reason,
        a.hiring_manager_feedback,
        a.followup_date,
        a.notes,
        a.created_at,
        a.updated_at,
        c.id as candidate_id_full,
        c.name as candidate_name,
        c.phone as candidate_phone,
        c.email as candidate_email,
        c.date_of_birth as candidate_date_of_birth,
        r.id as recruiter_id_full,
        r.name as recruiter_name,
        r.email as recruiter_email,
        r.phone as recruiter_phone,
        jr.id as job_role_id_full,
        jr.role_name,
        jr.department,
        jr.company_id,
        comp.id as company_id_full,
        comp.name as company_name,
        comp.slug as company_slug,
        comp.description as company_description,
        comp.website as company_website,
        comp.industry as company_industry
      FROM sourcing.applications a
      INNER JOIN sourcing.candidates c ON c.id = a.candidate_id
      INNER JOIN sourcing.recruiters r ON r.id = a.recruiter_id
      INNER JOIN sourcing.job_roles jr ON jr.id = a.job_role_id
      LEFT JOIN companies comp ON comp.id = jr.company_id
      WHERE a.id = $1 AND a.recruiter_id = $2
    `,
      [id, recruiterId],
    );

    if (result.length > 0) {
      return { ...this.mapApplicationRow(result[0]), source: 'sourcing' };
    }

    // Not a sourcing application: try job portal (same id space as job_applications)
    if (userId != null) {
      try {
        const jobPortalApp = await this.applicationsService.findOne(id, userId);
        const recruiterRow = await this.dataSource.query(
          `SELECT id, name, email, phone FROM sourcing.recruiters WHERE id = $1 LIMIT 1`,
          [recruiterId],
        );
        const recruiter = recruiterRow[0]
          ? {
            id: recruiterRow[0].id,
            name: recruiterRow[0].name,
            email: recruiterRow[0].email || null,
            phone: recruiterRow[0].phone || null,
            is_active: true,
          }
          : { id: recruiterId, name: '', email: null, phone: null, is_active: true };
        return this.mapJobPortalApplicationToResponse(jobPortalApp, recruiterId, recruiter);
      } catch {
        // findOne throws NotFound or Forbidden; fall through to 404 below
      }
    }

    throw new NotFoundException(`Application with ID ${id} not found`);
  }

  /**
   * Create application
   */
  async createApplication(
    dto: CreateApplicationDto,
    recruiterId: number,
  ): Promise<ApplicationResponse> {
    // Check for duplicate: (candidate_id, job_role_id, assigned_date)
    const duplicate = await this.dataSource.query(
      `SELECT id FROM sourcing.applications 
       WHERE candidate_id = $1 AND job_role_id = $2 AND assigned_date = $3`,
      [dto.candidate_id, dto.job_role_id, dto.assigned_date],
    );

    if (duplicate.length > 0) {
      throw new BadRequestException(
        'Application already exists for this candidate, job role, and assigned date',
      );
    }

    // Validate candidate exists
    const candidate = await this.dataSource.query(
      `SELECT id FROM sourcing.candidates WHERE id = $1`,
      [dto.candidate_id],
    );
    if (candidate.length === 0) {
      throw new NotFoundException(`Candidate with ID ${dto.candidate_id} not found`);
    }

    // Validate job role exists
    const jobRole = await this.dataSource.query(
      `SELECT id FROM sourcing.job_roles WHERE id = $1 AND is_active = true`,
      [dto.job_role_id],
    );
    if (jobRole.length === 0) {
      throw new NotFoundException(`Job role with ID ${dto.job_role_id} not found`);
    }

    // Ensure partition exists
    const assignedDate = new Date(dto.assigned_date);
    const partitionDate = new Date(assignedDate.getFullYear(), assignedDate.getMonth(), 1);
    await this.dataSource.query(
      `SELECT sourcing.create_monthly_partition('applications', $1::DATE)`,
      [partitionDate],
    );

    // Map status strings to integers
    const callStatusInt = dto.call_status ? StatusMapper.callStatusToInt(dto.call_status) : null;
    const interestedInt = dto.interested_status
      ? StatusMapper.interestedStatusToInt(dto.interested_status)
      : null;
    const selectionInt = dto.selection_status
      ? StatusMapper.selectionStatusToInt(dto.selection_status)
      : null;
    const joiningInt = dto.joining_status
      ? StatusMapper.joiningStatusToInt(dto.joining_status)
      : null;

    const result = await this.dataSource.query(
      `INSERT INTO sourcing.applications (
        candidate_id, recruiter_id, job_role_id, assigned_date, call_date,
        call_status, interested, selection_status, joining_status, notes,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, candidate_id, recruiter_id, job_role_id, assigned_date, call_date,
                call_status, interested, selection_status, joining_status, notes,
                created_at, updated_at`,
      [
        dto.candidate_id,
        recruiterId,
        dto.job_role_id,
        dto.assigned_date,
        dto.call_date || null,
        callStatusInt,
        interestedInt,
        selectionInt,
        joiningInt,
        dto.notes || null,
      ],
    );

    return this.getApplicationById(result[0].id, recruiterId);
  }

  /**
   * Create candidate + application in a single transactional API.
   * - Throws if candidate phone already exists (same as createCandidate).
   * - Throws if duplicate application for (candidate, job_role, assigned_date).
   * - All operations are wrapped in a transaction so either both records are created or none.
   */
  async createApplicationWithCandidate(
    payload: CreateApplicationWithCandidateDto,
    recruiterId: number,
  ): Promise<ApplicationResponse> {
    const { candidate: candidateDto, application: applicationDto } = payload;

    // Run create-candidate + create-application in a single transaction
    const appId = await this.dataSource.transaction(async (manager) => {
      // 1) Candidate duplicate check by phone hash
      const phoneHash = await manager.query(
        `SELECT sourcing.hash_phone($1) as hash`,
        [candidateDto.phone],
      );
      const hash = phoneHash[0].hash;

      const existing = await manager.query(
        `SELECT id FROM sourcing.candidates WHERE phone_hash = $1`,
        [hash],
      );
      if (existing.length > 0) {
        throw new BadRequestException('Candidate with this phone number already exists');
      }

      // 2) Insert candidate (reuse age/date_of_birth logic)
      let dateOfBirth: string | null = candidateDto.date_of_birth ?? null;
      if (!dateOfBirth && candidateDto.age != null) {
        const y = new Date().getFullYear() - Math.floor(candidateDto.age);
        dateOfBirth = `${y}-01-01`;
      }

      const candidateInsert = await manager.query(
        `INSERT INTO sourcing.candidates (name, phone, email, portal_id, date_of_birth, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5::date, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING id`,
        [
          candidateDto.candidate_name,
          candidateDto.phone,
          candidateDto.email || null,
          candidateDto.portal_id || null,
          dateOfBirth,
        ],
      );
      const candidateId = candidateInsert[0].id;

      // 3) Validate job role exists
      const jobRole = await manager.query(
        `SELECT id FROM sourcing.job_roles WHERE id = $1 AND is_active = true`,
        [applicationDto.job_role_id],
      );
      if (jobRole.length === 0) {
        throw new NotFoundException(`Job role with ID ${applicationDto.job_role_id} not found`);
      }

      // 4) Ensure partition exists for assigned_date
      const assignedDate = new Date(applicationDto.assigned_date);
      const partitionDate = new Date(assignedDate.getFullYear(), assignedDate.getMonth(), 1);
      await manager.query(
        `SELECT sourcing.create_monthly_partition('applications', $1::DATE)`,
        [partitionDate],
      );

      // 5) Duplicate application check (using new candidateId)
      const duplicate = await manager.query(
        `SELECT id FROM sourcing.applications 
         WHERE candidate_id = $1 AND job_role_id = $2 AND assigned_date = $3`,
        [candidateId, applicationDto.job_role_id, applicationDto.assigned_date],
      );
      if (duplicate.length > 0) {
        throw new BadRequestException(
          'Application already exists for this candidate, job role, and assigned date',
        );
      }

      // 6) Map status strings to integers
      const callStatusInt = applicationDto.call_status
        ? StatusMapper.callStatusToInt(applicationDto.call_status)
        : null;
      const interestedInt = applicationDto.interested_status
        ? StatusMapper.interestedStatusToInt(applicationDto.interested_status)
        : null;
      const selectionInt = applicationDto.selection_status
        ? StatusMapper.selectionStatusToInt(applicationDto.selection_status)
        : null;
      const joiningInt = applicationDto.joining_status
        ? StatusMapper.joiningStatusToInt(applicationDto.joining_status)
        : null;

      // 7) Insert application
      const appInsert = await manager.query(
        `INSERT INTO sourcing.applications (
          candidate_id, recruiter_id, job_role_id, assigned_date, call_date,
          call_status, interested, selection_status, joining_status, notes,
          created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id`,
        [
          candidateId,
          recruiterId,
          applicationDto.job_role_id,
          applicationDto.assigned_date,
          applicationDto.call_date || null,
          callStatusInt,
          interestedInt,
          selectionInt,
          joiningInt,
          applicationDto.notes || null,
        ],
      );

      return appInsert[0].id as number;
    });

    // Load and return full application with nested candidate using existing helper
    return this.getApplicationById(appId, recruiterId);
  }

  /**
   * Update application (sourcing first; if not found, try job portal application).
   */
  async updateApplication(
    id: number,
    dto: UpdateApplicationDto,
    recruiterId: number,
    userId?: number,
  ): Promise<ApplicationResponse> {
    // Check application exists and belongs to recruiter (sourcing)
    const existing = await this.dataSource.query(
      `SELECT id FROM sourcing.applications WHERE id = $1 AND recruiter_id = $2`,
      [id, recruiterId],
    );

    if (existing.length === 0) {
      // Not a sourcing application: try updating job portal application (full Edit Candidate payload)
      if (userId != null) {
        try {
          const updated = await this.applicationsService.updateRecruiterApplication(id, userId, {
            portal: dto.portal,
            assigned_date: dto.assigned_date,
            call_date: dto.call_date,
            call_status: dto.call_status,
            interested_status: dto.interested_status,
            not_interested_remark: dto.not_interested_remark,
            interview_scheduled: dto.interview_scheduled,
            interview_date: dto.interview_date,
            turnup: dto.turnup,
            interview_status: dto.interview_status,
            selection_status: dto.selection_status,
            joining_status: dto.joining_status,
            joining_date: dto.joining_date,
            backout_date: dto.backout_date,
            backout_reason: dto.backout_reason,
            hiring_manager_feedback: dto.hiring_manager_feedback,
            followup_date: dto.followup_date,
            notes: dto.notes,
          });
          const recruiterRow = await this.dataSource.query(
            `SELECT id, name, email, phone FROM sourcing.recruiters WHERE id = $1 LIMIT 1`,
            [recruiterId],
          );
          const recruiter = recruiterRow[0]
            ? { id: recruiterRow[0].id, name: recruiterRow[0].name, email: recruiterRow[0].email || null, phone: recruiterRow[0].phone || null, is_active: true }
            : { id: recruiterId, name: '', email: null, phone: null, is_active: true };
          return this.mapJobPortalApplicationToResponse(updated, recruiterId, recruiter);
        } catch {
          // updateRecruiterApplication throws NotFound or Forbidden; fall through to 404
        }
      }
      throw new NotFoundException(`Application with ID ${id} not found`);
    }

    // Build update query dynamically (sourcing)
    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (dto.portal !== undefined) {
      updates.push(`portal = $${paramIndex}`);
      params.push(dto.portal ?? null);
      paramIndex++;
    }
    if (dto.assigned_date !== undefined) {
      updates.push(`assigned_date = $${paramIndex}`);
      params.push(dto.assigned_date || null);
      paramIndex++;
    }
    if (dto.call_date !== undefined) {
      updates.push(`call_date = $${paramIndex}`);
      params.push(dto.call_date || null);
      paramIndex++;
    }

    if (dto.call_status !== undefined) {
      const callStatusInt = StatusMapper.callStatusToInt(dto.call_status);
      updates.push(`call_status = $${paramIndex}`);
      params.push(callStatusInt);
      paramIndex++;
    }

    if (dto.interested_status !== undefined) {
      const interestedInt = StatusMapper.interestedStatusToInt(dto.interested_status);
      updates.push(`interested = $${paramIndex}`);
      params.push(interestedInt);
      paramIndex++;
    }
    if (dto.not_interested_remark !== undefined) {
      updates.push(`not_interested_remark = $${paramIndex}`);
      params.push(dto.not_interested_remark ?? null);
      paramIndex++;
    }
    if (dto.interview_scheduled !== undefined) {
      updates.push(`interview_scheduled = $${paramIndex}`);
      params.push(dto.interview_scheduled);
      paramIndex++;
    }
    if (dto.turnup !== undefined) {
      updates.push(`turnup = $${paramIndex}`);
      params.push(dto.turnup);
      paramIndex++;
    }

    if (dto.selection_status !== undefined) {
      const selectionInt = StatusMapper.selectionStatusToInt(dto.selection_status);
      updates.push(`selection_status = $${paramIndex}`);
      params.push(selectionInt);
      paramIndex++;
    }

    if (dto.joining_status !== undefined) {
      const joiningInt = StatusMapper.joiningStatusToInt(dto.joining_status);
      updates.push(`joining_status = $${paramIndex}`);
      params.push(joiningInt);
      paramIndex++;
    }

    if (dto.interview_date !== undefined) {
      updates.push(`interview_date = $${paramIndex}`);
      params.push(dto.interview_date || null);
      paramIndex++;
    }

    if (dto.interview_status !== undefined) {
      updates.push(`interview_status = $${paramIndex}`);
      params.push(dto.interview_status || null);
      paramIndex++;
    }

    if (dto.joining_date !== undefined) {
      updates.push(`joining_date = $${paramIndex}`);
      params.push(dto.joining_date || null);
      paramIndex++;
    }
    if (dto.backout_date !== undefined) {
      updates.push(`backout_date = $${paramIndex}`);
      params.push(dto.backout_date || null);
      paramIndex++;
    }
    if (dto.backout_reason !== undefined) {
      updates.push(`backout_reason = $${paramIndex}`);
      params.push(dto.backout_reason ?? null);
      paramIndex++;
    }
    if (dto.hiring_manager_feedback !== undefined) {
      updates.push(`hiring_manager_feedback = $${paramIndex}`);
      params.push(dto.hiring_manager_feedback ?? null);
      paramIndex++;
    }
    if (dto.followup_date !== undefined) {
      updates.push(`followup_date = $${paramIndex}`);
      params.push(dto.followup_date || null);
      paramIndex++;
    }

    if (dto.notes !== undefined) {
      updates.push(`notes = $${paramIndex}`);
      params.push(dto.notes || null);
      paramIndex++;
    }

    if (updates.length === 0) {
      return this.getApplicationById(id, recruiterId);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    params.push(id, recruiterId);

    await this.dataSource.query(
      `UPDATE sourcing.applications 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex} AND recruiter_id = $${paramIndex + 1}`,
      params,
    );

    return this.getApplicationById(id, recruiterId);
  }

  /**
   * Delete application
   */
  async deleteApplication(id: number, recruiterId: number): Promise<void> {
    const result = await this.dataSource.query(
      `DELETE FROM sourcing.applications WHERE id = $1 AND recruiter_id = $2 RETURNING id`,
      [id, recruiterId],
    );

    if (result.length === 0) {
      throw new NotFoundException(`Application with ID ${id} not found`);
    }
  }

  // ============================================
  // DASHBOARD ENDPOINTS
  // ============================================

  /**
   * Get dashboard stats (sourcing + job portal applications where recruiter filled call details).
   * userId is used to include job_applications for jobs the recruiter has access to.
   */
  async getDashboardStats(recruiterId: number, userId?: number): Promise<DashboardStatsResponse> {
    // Sourcing stats
    const stats = await this.dataSource.query(
      `
      SELECT 
        COUNT(DISTINCT a.id) as total_applications,
        COUNT(DISTINCT a.candidate_id) as total_candidates,
        COUNT(*) FILTER (WHERE a.call_date IS NOT NULL) as total_calls,
        COUNT(*) FILTER (WHERE a.call_status = 3) as connected_calls,
        COUNT(*) FILTER (WHERE a.interested = 1) as interested_count,
        COUNT(*) FILTER (WHERE a.selection_status = 1) as selected_count,
        COUNT(*) FILTER (WHERE a.joining_status = 1) as joined_count
      FROM sourcing.applications a
      WHERE a.recruiter_id = $1
    `,
      [recruiterId],
    );

    const row = stats[0];
    let totalApplications = parseInt(row.total_applications) || 0;
    let totalCandidates = parseInt(row.total_candidates) || 0;
    let totalCalls = parseInt(row.total_calls) || 0;
    let connectedCalls = parseInt(row.connected_calls) || 0;
    let interestedCount = parseInt(row.interested_count) || 0;
    const selectedCount = parseInt(row.selected_count) || 0;
    const joinedCount = parseInt(row.joined_count) || 0;

    // Add job portal applications (recruiter filled call) so they show in recruiter dashboard
    if (userId != null) {
      const companyIds = await this.companiesService.getCompanyIdsForUser(userId);
      if (companyIds.length > 0) {
        const jobPortal = await this.dataSource.query(
          `
          SELECT 
            COUNT(*)::int as cnt,
            COUNT(DISTINCT ja."userId")::int as candidates,
            COUNT(*) FILTER (WHERE LOWER(TRIM(ja.recruiter_call_status)) IN ('call connected', 'connected'))::int as connected,
            COUNT(*) FILTER (WHERE ja.recruiter_interested = true)::int as interested
          FROM job_applications ja
          INNER JOIN jobs j ON j.id = ja."jobId"
          WHERE j."companyId" = ANY($1::int[])
            AND ja.recruiter_call_date IS NOT NULL
          `,
          [companyIds],
        );
        const j = jobPortal[0];
        totalApplications += j?.cnt || 0;
        totalCandidates += j?.candidates || 0;
        totalCalls += j?.cnt || 0;
        connectedCalls += j?.connected || 0;
        interestedCount += j?.interested || 0;
      }
    }

    const conversionRate =
      interestedCount > 0 ? ((joinedCount / interestedCount) * 100).toFixed(2) : '0.00';

    const avgCalls = await this.dataSource.query(
      `
      SELECT 
        COUNT(*)::NUMERIC
          / NULLIF(GREATEST((CURRENT_DATE::DATE - MIN(call_date)::DATE)::INT, 1), 0) as avg_calls
      FROM sourcing.applications
      WHERE recruiter_id = $1 
        AND call_date >= CURRENT_DATE - INTERVAL '30 days'
        AND call_date IS NOT NULL
    `,
      [recruiterId],
    );

    return {
      total_applications: totalApplications,
      total_candidates: totalCandidates,
      total_calls: totalCalls,
      connected_calls: connectedCalls,
      interested_count: interestedCount,
      selected_count: selectedCount,
      joined_count: joinedCount,
      conversion_rate: parseFloat(conversionRate),
      avg_calls_per_day: parseFloat(avgCalls[0]?.avg_calls || '0'),
    };
  }

  /**
   * Get pipeline breakdown (sourcing + job portal applications where recruiter filled call).
   * userId is used to include job_applications for jobs the recruiter has access to.
   */
  async getPipeline(recruiterId: number, userId?: number): Promise<PipelineResponse[]> {
    const pipeline = await this.dataSource.query(
      `
      SELECT
        s.stage,
        s.stage_order,
        COUNT(*) as count
      FROM (
        SELECT
          CASE
            WHEN a.call_status IS NULL THEN 'Not Called'
            WHEN a.call_status = 1 THEN 'Busy'
            WHEN a.call_status = 2 THEN 'RNR'
            WHEN a.call_status = 3 AND a.interested IS NULL THEN 'Connected'
            WHEN a.interested = 1 AND a.selection_status IS NULL THEN 'Interested'
            WHEN a.selection_status = 1 AND a.joining_status IS NULL THEN 'Selected'
            WHEN a.joining_status = 1 THEN 'Joined'
            WHEN a.joining_status = 2 THEN 'Not Joined'
            WHEN a.joining_status = 4 THEN 'Backed Out'
            ELSE 'Pending'
          END as stage,
          CASE
            WHEN a.call_status IS NULL THEN 1
            WHEN a.call_status = 1 THEN 2
            WHEN a.call_status = 2 THEN 3
            WHEN a.call_status = 3 AND a.interested IS NULL THEN 4
            WHEN a.interested = 1 AND a.selection_status IS NULL THEN 5
            WHEN a.selection_status = 1 AND a.joining_status IS NULL THEN 6
            WHEN a.joining_status = 1 THEN 7
            WHEN a.joining_status = 2 THEN 8
            WHEN a.joining_status = 4 THEN 9
            ELSE 10
          END as stage_order
        FROM sourcing.applications a
        WHERE a.recruiter_id = $1
      ) s
      GROUP BY s.stage, s.stage_order
      ORDER BY s.stage_order ASC
    `,
      [recruiterId],
    );

    const stageCounts = new Map<string, number>();
    const stageOrder = new Map<string, number>();
    pipeline.forEach((p: any) => {
      stageCounts.set(p.stage, (stageCounts.get(p.stage) || 0) + parseInt(p.count));
      stageOrder.set(p.stage, parseInt(p.stage_order));
    });

    // Add job portal applications (recruiter filled call) to pipeline
    if (userId != null) {
      const companyIds = await this.companiesService.getCompanyIdsForUser(userId);
      if (companyIds.length > 0) {
        const jobPortalStages = await this.dataSource.query(
          `
          SELECT
            CASE
              WHEN LOWER(TRIM(ja.recruiter_call_status)) = 'busy' THEN 'Busy'
              WHEN LOWER(TRIM(ja.recruiter_call_status)) = 'rnr' THEN 'RNR'
              WHEN LOWER(TRIM(ja.recruiter_call_status)) IN ('call connected', 'connected') AND ja.recruiter_interested = true THEN 'Interested'
              WHEN LOWER(TRIM(ja.recruiter_call_status)) IN ('call connected', 'connected') AND (ja.recruiter_interested = false OR ja.recruiter_interested IS NULL) THEN 'Connected'
              WHEN LOWER(TRIM(ja.recruiter_call_status)) = 'switch off' THEN 'Pending'
              WHEN LOWER(TRIM(ja.recruiter_call_status)) = 'wrong number' THEN 'Pending'
              ELSE 'Pending'
            END as stage
          FROM job_applications ja
          INNER JOIN jobs j ON j.id = ja."jobId"
          WHERE j."companyId" = ANY($1::int[])
            AND ja.recruiter_call_date IS NOT NULL
          `,
          [companyIds],
        );
        const orderForStage: Record<string, number> = {
          'Not Called': 1, Busy: 2, RNR: 3, Connected: 4, Interested: 5,
          Selected: 6, Joined: 7, 'Not Joined': 8, 'Backed Out': 9, Pending: 10,
        };
        jobPortalStages.forEach((r: any) => {
          const stage = r.stage || 'Pending';
          stageCounts.set(stage, (stageCounts.get(stage) || 0) + 1);
          if (!stageOrder.has(stage)) stageOrder.set(stage, orderForStage[stage] ?? 10);
        });
      }
    }

    const total = [...stageCounts.values()].reduce((a, b) => a + b, 0);
    const sorted = [...stageCounts.entries()].sort((a, b) => (stageOrder.get(a[0]) ?? 10) - (stageOrder.get(b[0]) ?? 10));
    return sorted.map(([stage, count]) => ({
      stage,
      count,
      percentage: total > 0 ? parseFloat(((count / total) * 100).toFixed(2)) : 0,
    }));
  }

  /**
   * Get recruiter today progress: pipeline stage counts for the current day only (Flow Tracking widget).
   * Returns array of { stage, count } for: sourced, call done, connected, interested, not interested,
   * interview scheduled, interview done, selected, joined.
   */
  async getTodayProgress(recruiterId: number, userId?: number): Promise<TodayProgressResponse[]> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD server date

    const row = await this.dataSource.query(
      `
      SELECT
        COUNT(*) FILTER (WHERE a.assigned_date = $2::date OR (a.created_at AT TIME ZONE 'UTC')::date = $2::date) AS sourced,
        COUNT(*) FILTER (WHERE a.call_date = $2::date) AS call_done,
        COUNT(*) FILTER (WHERE a.call_date = $2::date AND a.call_status = 3) AS connected,
        COUNT(*) FILTER (WHERE a.interested = 1 AND (a.call_date = $2::date OR (a.updated_at AT TIME ZONE 'UTC')::date = $2::date)) AS interested,
        COUNT(*) FILTER (WHERE a.interested = 2 AND (a.call_date = $2::date OR (a.updated_at AT TIME ZONE 'UTC')::date = $2::date)) AS not_interested,
        COUNT(*) FILTER (WHERE a.interview_date = $2::date) AS interview_scheduled,
        COUNT(*) FILTER (WHERE a.interview_date = $2::date AND (a.turnup = true OR (a.interview_status IS NOT NULL AND TRIM(a.interview_status) <> ''))) AS interview_done,
        COUNT(*) FILTER (WHERE a.selection_status = 1 AND (a.updated_at AT TIME ZONE 'UTC')::date = $2::date) AS selected,
        COUNT(*) FILTER (WHERE a.joining_status = 1 AND a.joining_date = $2::date) AS joined
      FROM sourcing.applications a
      WHERE a.recruiter_id = $1
        AND (
          a.assigned_date = $2::date
          OR a.call_date = $2::date
          OR a.joining_date = $2::date
          OR a.interview_date = $2::date
          OR (a.created_at AT TIME ZONE 'UTC')::date = $2::date
          OR (a.updated_at AT TIME ZONE 'UTC')::date = $2::date
        )
      `,
      [recruiterId, today],
    );

    const r = row[0] || {};
    const stages: TodayProgressResponse[] = [
      { stage: 'sourced', count: parseInt(r.sourced, 10) || 0 },
      { stage: 'call done', count: parseInt(r.call_done, 10) || 0 },
      { stage: 'connected', count: parseInt(r.connected, 10) || 0 },
      { stage: 'interested', count: parseInt(r.interested, 10) || 0 },
      { stage: 'not interested', count: parseInt(r.not_interested, 10) || 0 },
      { stage: 'interview scheduled', count: parseInt(r.interview_scheduled, 10) || 0 },
      { stage: 'interview done', count: parseInt(r.interview_done, 10) || 0 },
      { stage: 'selected', count: parseInt(r.selected, 10) || 0 },
      { stage: 'joined', count: parseInt(r.joined, 10) || 0 },
    ];

    // Add job portal applications for today (recruiter filled call today)
    if (userId != null) {
      const companyIds = await this.companiesService.getCompanyIdsForUser(userId);
      if (companyIds.length > 0) {
        const jp = await this.dataSource.query(
          `
          SELECT
            COUNT(*) FILTER (WHERE ja.recruiter_call_date = $2::date) AS call_done,
            COUNT(*) FILTER (WHERE ja.recruiter_call_date = $2::date AND LOWER(TRIM(ja.recruiter_call_status)) IN ('call connected', 'connected')) AS connected,
            COUNT(*) FILTER (WHERE ja.recruiter_call_date = $2::date AND ja.recruiter_interested = true) AS interested,
            COUNT(*) FILTER (WHERE ja.recruiter_call_date = $2::date AND (ja.recruiter_interested = false OR ja.recruiter_interested IS NULL)) AS not_interested
          FROM job_applications ja
          INNER JOIN jobs j ON j.id = ja."jobId"
          WHERE j."companyId" = ANY($1::int[])
            AND ja.recruiter_call_date IS NOT NULL
            AND ja.recruiter_call_date = $2::date
          `,
          [companyIds, today],
        );
        const j = jp[0];
        if (j) {
          stages[1].count += parseInt(j.call_done, 10) || 0;
          stages[2].count += parseInt(j.connected, 10) || 0;
          stages[3].count += parseInt(j.interested, 10) || 0;
          stages[4].count += parseInt(j.not_interested, 10) || 0;
        }
      }
    }

    return stages;
  }

  /**
   * Get recruiter performance report
   */
  async getRecruiterPerformance(
    recruiterId: number,
    startDate?: string,
    endDate?: string,
  ): Promise<RecruiterPerformanceResponse> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const end = endDate || new Date().toISOString().split('T')[0];

    // Use materialized view if available, otherwise query applications
    const performance = await this.dataSource.query(
      `
      SELECT 
        r.id as recruiter_id,
        r.name as recruiter_name,
        COUNT(DISTINCT a.id) as total_applications,
        COUNT(*) FILTER (WHERE a.call_date IS NOT NULL) as total_calls,
        COUNT(*) FILTER (WHERE a.call_status = 3) as connected_calls,
        COUNT(*) FILTER (WHERE a.interested = 1) as interested_count,
        COUNT(*) FILTER (WHERE a.selection_status = 1) as selected_count,
        COUNT(*) FILTER (WHERE a.joining_status = 1) as joined_count
      FROM sourcing.applications a
      INNER JOIN sourcing.recruiters r ON r.id = a.recruiter_id
      WHERE a.recruiter_id = $1
        AND a.assigned_date >= $2
        AND a.assigned_date <= $3
      GROUP BY r.id, r.name
    `,
      [recruiterId, start, end],
    );

    if (performance.length === 0) {
      throw new NotFoundException(`No performance data found for recruiter ${recruiterId}`);
    }

    const row = performance[0];
    const interestedCount = parseInt(row.interested_count) || 0;
    const joinedCount = parseInt(row.joined_count) || 0;
    const conversionRate =
      interestedCount > 0 ? ((joinedCount / interestedCount) * 100).toFixed(2) : '0.00';

    // Calculate avg calls per day
    const daysDiff = Math.ceil(
      (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24),
    );
    const avgCallsPerDay =
      daysDiff > 0 ? (parseInt(row.total_calls) || 0) / daysDiff : 0;

    return {
      recruiter_id: row.recruiter_id,
      recruiter_name: row.recruiter_name,
      total_applications: parseInt(row.total_applications) || 0,
      total_calls: parseInt(row.total_calls) || 0,
      connected_calls: parseInt(row.connected_calls) || 0,
      interested_count: interestedCount,
      selected_count: parseInt(row.selected_count) || 0,
      joined_count: joinedCount,
      conversion_rate: parseFloat(conversionRate),
      avg_calls_per_day: parseFloat(avgCallsPerDay.toFixed(2)),
      period_start: start,
      period_end: end,
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Map sourcing call_status to job portal callStatus (for PATCH fallback).
   */
  private mapSourcingCallStatusToJobPortal(callStatus: string | null | undefined): string | null {
    if (callStatus == null || callStatus === '') return null;
    const s = callStatus.trim();
    if (s === 'Connected' || s.toLowerCase() === 'call connected') return 'Connected'; // legacy DB: 'call connected' → Connected
    if (s === 'Busy' || s === 'RNR' || s === 'Wrong Number' || s === 'Switch off') return s;
    return s;
  }

  /**
   * Compute age in full years from date_of_birth (Date or YYYY-MM-DD string). Returns null if invalid/missing.
   */
  private computeAgeFromDateOfBirth(dob: Date | string | null | undefined): number | null {
    if (dob == null) return null;
    const d = typeof dob === 'string' ? new Date(dob) : dob;
    if (isNaN(d.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
    return age >= 0 ? age : null;
  }

  /**
   * Format date_of_birth to YYYY-MM-DD string for response.
   */
  private formatDateOfBirth(dob: Date | string | null | undefined): string | null {
    if (dob == null) return null;
    const d = typeof dob === 'string' ? new Date(dob) : dob;
    if (isNaN(d.getTime())) return null;
    return typeof dob === 'string' && dob.match(/^\d{4}-\d{2}-\d{2}/) ? dob.split('T')[0] : d.toISOString().split('T')[0];
  }

  /**
   * Map database row to ApplicationResponse
   */
  private mapApplicationRow(row: any): ApplicationResponse {
    return {
      id: row.id,
      candidate_id: row.candidate_id,
      recruiter_id: row.recruiter_id,
      job_role_id: row.job_role_id,
      portal: row.portal ?? null,
      assigned_date: row.assigned_date ? (row.assigned_date.toISOString?.().split('T')[0] ?? String(row.assigned_date)) : '',
      call_date: row.call_date ? row.call_date.toISOString?.().split('T')[0] ?? String(row.call_date) : null,
      call_status: StatusMapper.callStatusToString(row.call_status),
      interested_status: StatusMapper.interestedStatusToString(row.interested),
      not_interested_remark: row.not_interested_remark ?? null,
      interview_scheduled: row.interview_scheduled ?? undefined,
      interview_date: row.interview_date ? row.interview_date.toISOString?.().split('T')[0] ?? String(row.interview_date) : null,
      turnup: row.turnup ?? null,
      interview_status: row.interview_status ?? null,
      selection_status: StatusMapper.selectionStatusToString(row.selection_status),
      joining_status: StatusMapper.joiningStatusToString(row.joining_status),
      joining_date: row.joining_date ? row.joining_date.toISOString?.().split('T')[0] ?? String(row.joining_date) : null,
      backout_date: row.backout_date ? row.backout_date.toISOString?.().split('T')[0] ?? String(row.backout_date) : null,
      backout_reason: row.backout_reason ?? null,
      hiring_manager_feedback: row.hiring_manager_feedback ?? null,
      followup_date: row.followup_date ? row.followup_date.toISOString?.().split('T')[0] ?? String(row.followup_date) : null,
      notes: row.notes ?? null,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
      candidate: {
        id: row.candidate_id_full,
        candidate_name: row.candidate_name,
        phone: row.candidate_phone || '',
        email: row.candidate_email || null,
        qualification: null,
        work_exp_years: null,
        portal_id: null,
        age: this.computeAgeFromDateOfBirth(row.candidate_date_of_birth) ?? null,
        date_of_birth: this.formatDateOfBirth(row.candidate_date_of_birth) ?? null,
      },
      recruiter: {
        id: row.recruiter_id_full,
        name: row.recruiter_name,
        email: row.recruiter_email || null,
        phone: row.recruiter_phone || null,
        is_active: true,
      },
      job_role: {
        id: row.job_role_id_full,
        company_id: row.company_id,
        role_name: row.role_name,
        department: row.department || null,
        is_active: true,
      },
      company: row.company_id_full
        ? {
          id: row.company_id_full,
          name: row.company_name,
          slug: row.company_slug,
          description: row.company_description || null,
          website: row.company_website || null,
          industry: row.company_industry || null,
        }
        : undefined,
    };
  }
}
