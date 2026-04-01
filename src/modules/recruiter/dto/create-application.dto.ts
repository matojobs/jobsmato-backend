import { IsString, IsNumber, IsDateString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CALL_STATUS_OPTIONS } from '../enums/status.enum';

/**
 * DTO for creating application
 * Field names match frontend spec EXACTLY (snake_case)
 */
export class CreateApplicationDto {
  @ApiProperty({ description: 'Candidate ID', example: 1 })
  @IsNumber()
  candidate_id: number;

  @ApiProperty({ description: 'Job Role ID', example: 1 })
  @IsNumber()
  job_role_id: number;

  @ApiProperty({ description: 'Assigned date (ISO format)', example: '2026-02-05' })
  @IsDateString()
  assigned_date: string;

  @ApiPropertyOptional({ description: 'Call date (ISO format)', example: '2026-02-05' })
  @IsOptional()
  @IsDateString()
  call_date?: string;

  @ApiPropertyOptional({
    description: 'Call status',
    enum: CALL_STATUS_OPTIONS,
    example: 'Connected',
  })
  @IsOptional()
  @IsIn([...CALL_STATUS_OPTIONS])
  call_status?: string;

  @ApiPropertyOptional({
    description: 'Interested status',
    enum: ['Yes', 'No', 'Call Back Later'],
    example: 'Yes',
  })
  @IsOptional()
  @IsIn(['Yes', 'No', 'Call Back Later'])
  interested_status?: string;

  @ApiPropertyOptional({
    description: 'Selection status',
    enum: ['Selected', 'Not Selected', 'Pending'],
    example: 'Selected',
  })
  @IsOptional()
  @IsIn(['Selected', 'Not Selected', 'Pending'])
  selection_status?: string;

  @ApiPropertyOptional({
    description: 'Joining status',
    enum: ['Joined', 'Not Joined', 'Pending', 'Backed Out'],
    example: 'Pending',
  })
  @IsOptional()
  @IsIn(['Joined', 'Not Joined', 'Pending', 'Backed Out'])
  joining_status?: string;

  @ApiPropertyOptional({ description: 'Notes', example: 'Candidate showed interest' })
  @IsOptional()
  @IsString()
  notes?: string;
}
