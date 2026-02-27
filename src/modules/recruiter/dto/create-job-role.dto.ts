import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating job role
 * Field names match frontend spec EXACTLY (snake_case)
 */
export class CreateJobRoleDto {
  @ApiProperty({ description: 'Company ID', example: 1 })
  @IsNumber()
  company_id: number;

  @ApiProperty({ description: 'Role name', example: 'Software Engineer' })
  @IsString()
  role_name: string;

  @ApiPropertyOptional({ description: 'Department', example: 'Engineering' })
  @IsOptional()
  @IsString()
  department?: string;
}
