import { IsString, IsDateString, IsOptional, IsIn, IsBoolean } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CALL_STATUS_OPTIONS } from '../enums/status.enum';

/**
 * DTO for updating application (Edit Candidate modal).
 * Field names match frontend spec EXACTLY (snake_case). All fields optional for partial update.
 */
export class UpdateApplicationDto {
  @ApiPropertyOptional({ description: 'Source portal (e.g. Naukri, LinkedIn, WorkIndia)' })
  @IsOptional()
  @IsString()
  portal?: string | null;

  @ApiPropertyOptional({ description: 'Date assigned to recruiter (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  assigned_date?: string | null;

  @ApiPropertyOptional({ description: 'Date of call (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  call_date?: string | null;

  @ApiPropertyOptional({
    description: 'Call status. Interested required only when Connected.',
    enum: CALL_STATUS_OPTIONS,
  })
  @IsOptional()
  @IsIn([...CALL_STATUS_OPTIONS])
  call_status?: string | null;

  @ApiPropertyOptional({
    description: 'Interested status',
    enum: ['Yes', 'No', 'Call Back Later'],
  })
  @IsOptional()
  @IsIn(['Yes', 'No', 'Call Back Later'])
  interested_status?: string | null;

  @ApiPropertyOptional({ description: 'Remark when candidate is not interested' })
  @IsOptional()
  @IsString()
  not_interested_remark?: string | null;

  @ApiPropertyOptional({ description: 'Whether an interview is scheduled' })
  @IsOptional()
  @IsBoolean()
  interview_scheduled?: boolean;

  @ApiPropertyOptional({ description: 'Interview date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  interview_date?: string | null;

  @ApiPropertyOptional({ description: 'Whether candidate turned up for interview' })
  @IsOptional()
  @IsBoolean()
  turnup?: boolean | null;

  @ApiPropertyOptional({
    description: 'Interview status',
    enum: ['Scheduled', 'Done', 'Not Attended', 'Rejected'],
  })
  @IsOptional()
  @IsString()
  interview_status?: string | null;

  @ApiPropertyOptional({
    description: 'Selection status',
    enum: ['Selected', 'Not Selected', 'Pending'],
  })
  @IsOptional()
  @IsIn(['Selected', 'Not Selected', 'Pending'])
  selection_status?: string | null;

  @ApiPropertyOptional({
    description: 'Joining status',
    enum: ['Joined', 'Not Joined', 'Pending', 'Backed Out'],
  })
  @IsOptional()
  @IsIn(['Joined', 'Not Joined', 'Pending', 'Backed Out'])
  joining_status?: string | null;

  @ApiPropertyOptional({ description: 'Date of joining (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  joining_date?: string | null;

  @ApiPropertyOptional({ description: 'Expected date of joining (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  expected_joining_date?: string | null;

  @ApiPropertyOptional({ description: 'Date candidate backed out (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  backout_date?: string | null;

  @ApiPropertyOptional({ description: 'Reason for backing out' })
  @IsOptional()
  @IsString()
  backout_reason?: string | null;

  @ApiPropertyOptional({ description: 'Feedback from hiring manager' })
  @IsOptional()
  @IsString()
  hiring_manager_feedback?: string | null;

  @ApiPropertyOptional({ description: 'Next follow-up date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  followup_date?: string | null;

  @ApiPropertyOptional({ description: 'Free-text notes' })
  @IsOptional()
  @IsString()
  notes?: string | null;
}
