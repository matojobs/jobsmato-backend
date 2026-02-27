/**
 * Dashboard Response Interfaces
 * Matches frontend contract EXACTLY (snake_case)
 */
export interface DashboardStatsResponse {
  total_applications: number;
  total_candidates: number;
  total_calls: number;
  connected_calls: number;
  interested_count: number;
  selected_count: number;
  joined_count: number;
  conversion_rate: number;
  avg_calls_per_day: number;
}

export interface PipelineResponse {
  stage: string;
  count: number;
  percentage: number;
}

export interface RecruiterPerformanceResponse {
  recruiter_id: number;
  recruiter_name: string;
  total_applications: number;
  total_calls: number;
  connected_calls: number;
  interested_count: number;
  selected_count: number;
  joined_count: number;
  conversion_rate: number;
  avg_calls_per_day: number;
  period_start: string;
  period_end: string;
}

/** Today-only stage counts for Flow Tracking widget (array of { stage, count }) */
export interface TodayProgressResponse {
  stage: string;
  count: number;
}
