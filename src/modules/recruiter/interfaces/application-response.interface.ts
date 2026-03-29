/**
 * Application Response Interface
 * Matches frontend contract EXACTLY (snake_case). Used by GET list, GET :id, PATCH :id response.
 */
export interface ApplicationResponse {
  id: number;
  candidate_id: number;
  recruiter_id: number;
  job_role_id: number;
  portal?: string | null;
  assigned_date: string;
  call_date?: string | null;
  call_status?: string | null;
  interested_status?: string | null;
  not_interested_remark?: string | null;
  interview_scheduled?: boolean;
  interview_date?: string | null;
  turnup?: boolean | null;
  interview_status?: string | null;
  selection_status?: string | null;
  joining_status?: string | null;
  joining_date?: string | null;
  expected_joining_date?: string | null;
  backout_date?: string | null;
  backout_reason?: string | null;
  hiring_manager_feedback?: string | null;
  followup_date?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  source?: 'sourcing' | 'job_portal';
  candidate?: CandidateResponse;
  recruiter?: RecruiterResponse;
  job_role?: JobRoleResponse;
  company?: CompanyResponse;
}

export interface CandidateResponse {
  id: number;
  candidate_name: string;
  phone: string;
  email?: string | null;
  qualification?: string | null;
  work_exp_years?: number | null;
  portal_id?: number | null;
  /** Age in full years (preferred by frontend). */
  age?: number | null;
  /** Date of birth YYYY-MM-DD (frontend can compute age from this if age not set). */
  date_of_birth?: string | null;
}

export interface RecruiterResponse {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  is_active: boolean;
}

export interface JobRoleResponse {
  id: number;
  company_id: number;
  role_name: string;
  department?: string | null;
  is_active: boolean;
  // Nested company info (optional, included when needed)
  company?: CompanyResponse;
}

export interface CompanyResponse {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  website?: string | null;
  industry?: string | null;
  // Nested job roles (optional, included when needed)
  job_roles?: JobRoleResponse[];
  job_roles_count?: number;
}
