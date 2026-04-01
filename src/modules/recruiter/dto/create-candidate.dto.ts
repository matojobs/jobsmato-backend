import { IsString, IsNumber, IsOptional, IsEmail, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating candidate
 * Field names match frontend spec EXACTLY (snake_case)
 */
export class CreateCandidateDto {
  @ApiProperty({ description: 'Candidate name', example: 'John Doe' })
  @IsString()
  candidate_name: string;

  @ApiProperty({ description: 'Phone number', example: '+91 9876543210' })
  @IsString()
  phone: string;

  @ApiPropertyOptional({ description: 'Email', example: 'john@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Qualification', example: 'B.Tech' })
  @IsOptional()
  @IsString()
  qualification?: string;

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
