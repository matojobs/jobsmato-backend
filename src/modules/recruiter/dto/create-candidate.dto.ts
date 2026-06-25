import { IsString, IsNumber, IsOptional, IsEmail, IsDateString, Matches } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { normalizeIndianPhone } from '../../../common/utils/phone.util';

/**
 * DTO for creating candidate
 * Field names match frontend spec EXACTLY (snake_case)
 */
export class CreateCandidateDto {
  @ApiProperty({ description: 'Candidate name', example: 'John Doe' })
  @IsString()
  candidate_name: string;

  @ApiProperty({ description: 'Phone number (normalized to a 10-digit Indian mobile)', example: '9876543210' })
  @IsString()
  // Clean common dirty inputs (+91 / 0 prefix, spaces) before validation; keep
  // the raw digits if it can't be safely recovered so @Matches reports the error.
  @Transform(({ value }) => normalizeIndianPhone(value) ?? (value == null ? value : String(value).replace(/[^0-9]/g, '')))
  @Matches(/^[6-9]\d{9}$/, { message: 'phone must be a valid 10-digit Indian mobile number (starting 6-9)' })
  phone: string;

  @ApiPropertyOptional({ description: 'Email', example: 'john@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Qualification', example: 'B.Tech' })
  @IsOptional()
  @IsString()
  qualification?: string;

  @ApiPropertyOptional({ description: 'Candidate location / city', example: 'Ahmedabad' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Work experience in years', example: 5 })
  @IsOptional()
  @IsNumber()
  work_exp_years?: number;

  @ApiPropertyOptional({ description: 'Portal ID', example: 1 })
  @IsOptional()
  @IsNumber()
  portal_id?: number;

  @ApiPropertyOptional({ description: 'Age in full years', example: 28 })
  @IsOptional()
  @IsNumber()
  age?: number;

  @ApiPropertyOptional({ description: 'Date of birth (YYYY-MM-DD)', example: '1996-05-15' })
  @IsOptional()
  @IsString()
  @IsDateString()
  date_of_birth?: string;
}
