import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested, IsString, IsNumber, IsDateString, IsOptional, IsIn } from 'class-validator';

import { CreateCandidateDto } from './create-candidate.dto';
import { CALL_STATUS_OPTIONS } from '../enums/status.enum';

/**
 * Application payload for POST /recruiter/applications/with-candidate.
 * Same as CreateApplicationDto except: candidate_id is optional (ignored; backend uses new candidate),
 * and portal is allowed (ignored for sourcing; avoids "property should not exist" when frontend sends it).
 */
export class ApplicationPayloadForWithCandidateDto {
  @ApiPropertyOptional({ description: 'Ignored; backend uses the newly created candidate ID', example: 0 })
  @IsOptional()
  @IsNumber()
  candidate_id?: number;

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

  @ApiPropertyOptional({ description: 'Source portal (e.g. Naukri, LinkedIn); accepted but not stored for sourcing' })
  @IsOptional()
  @IsString()
  portal?: string;
}

/**
 * Combined DTO for creating a candidate and sourcing application in one API.
 *
 * - `candidate` uses the existing CreateCandidateDto (snake_case fields).
 * - `application` uses ApplicationPayloadForWithCandidateDto: candidate_id and portal are optional/ignored.
 */
export class CreateApplicationWithCandidateDto {
  @ApiProperty({ type: CreateCandidateDto })
  @ValidateNested()
  @Type(() => CreateCandidateDto)
  candidate: CreateCandidateDto;

  @ApiProperty({
    type: ApplicationPayloadForWithCandidateDto,
    description:
      'Application payload. candidate_id and portal are optional and ignored; backend uses the newly created candidate.',
  })
  @ValidateNested()
  @Type(() => ApplicationPayloadForWithCandidateDto)
  application: ApplicationPayloadForWithCandidateDto;
}

