import { IsOptional, IsNumber, IsString, IsDateString, IsIn, Min, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { CALL_STATUS_OPTIONS } from '../enums/status.enum';

/**
 * Query parameters DTO for filtering applications
 * Field names match frontend spec EXACTLY (snake_case)
 */
export class ApplicationQueryDto {
  @ApiPropertyOptional({ description: 'Page number', example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Page size', example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Recruiter ID filter', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  recruiter_id?: number;

  @ApiPropertyOptional({ description: 'Job Role ID filter', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  job_role_id?: number;

  @ApiPropertyOptional({ description: 'Company ID filter', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  company_id?: number;

  @ApiPropertyOptional({ description: 'Call status filter', enum: CALL_STATUS_OPTIONS })
  @IsOptional()
  @IsIn([...CALL_STATUS_OPTIONS])
  call_status?: string;

  @ApiPropertyOptional({ description: 'Interested status filter', enum: ['Yes', 'No', 'Call Back Later'] })
  @IsOptional()
  @IsIn(['Yes', 'No', 'Call Back Later'])
  interested_status?: string;

  @ApiPropertyOptional({ description: 'Selection status filter', enum: ['Selected', 'Not Selected', 'Pending'] })
  @IsOptional()
  @IsIn(['Selected', 'Not Selected', 'Pending'])
  selection_status?: string;

  @ApiPropertyOptional({ description: 'Joining status filter', enum: ['Joined', 'Not Joined', 'Pending', 'Backed Out'] })
  @IsOptional()
  @IsIn(['Joined', 'Not Joined', 'Pending', 'Backed Out'])
  joining_status?: string;

  @ApiPropertyOptional({ description: 'Start date filter (ISO format)', example: '2026-02-01' })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({ description: 'End date filter (ISO format)', example: '2026-02-28' })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({
    description: 'Which date field to filter on when start_date/end_date are provided',
    enum: ['assigned_date', 'call_date', 'interview_date', 'joining_date', 'followup_date'],
    default: 'assigned_date',
  })
  @IsOptional()
  @IsIn(['assigned_date', 'call_date', 'interview_date', 'joining_date', 'followup_date'])
  date_field?: string;

  @ApiPropertyOptional({ description: 'Filter by interview scheduled', example: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return undefined;
  })
  @IsBoolean()
  interview_scheduled?: boolean;

  @ApiPropertyOptional({ description: 'Filter by interview status', example: 'Done' })
  @IsOptional()
  @IsString()
  interview_status?: string;

  @ApiPropertyOptional({
    description: 'Search by candidate name, phone, email, portal, job role name, or company name',
    example: 'John',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Sort field',
    enum: ['created_at', 'updated_at', 'call_date', 'assigned_date', 'candidate_name'],
    default: 'created_at',
  })
  @IsOptional()
  @IsIn(['created_at', 'updated_at', 'call_date', 'assigned_date', 'candidate_name'])
  sort_by?: string = 'created_at';

  @ApiPropertyOptional({ description: 'Sort order', enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sort_order?: 'asc' | 'desc' = 'desc';
}

/**
 * Query parameters for GET /api/recruiter/candidates
 * Search by name/phone/email (free text) and optional filters by job role, company, portal.
 */
export class CandidateQueryDto {
  @ApiPropertyOptional({ description: 'Search by candidate name, phone, or email', example: 'John' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by job role ID', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  job_role_id?: number;

  @ApiPropertyOptional({ description: 'Filter by company ID', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  company_id?: number;

  @ApiPropertyOptional({ description: 'Filter by portal ID', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  portal_id?: number;
}
