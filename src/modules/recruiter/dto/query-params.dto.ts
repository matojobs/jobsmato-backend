import { IsOptional, IsNumber, IsString, IsDateString, IsIn, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

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

  @ApiPropertyOptional({ description: 'Call status filter', enum: ['Busy', 'RNR', 'Connected', 'Wrong Number'] })
  @IsOptional()
  @IsIn(['Busy', 'RNR', 'Connected', 'Wrong Number'])
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
}
