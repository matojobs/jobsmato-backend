import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUrl, IsNumber, IsBoolean, IsEnum } from 'class-validator';
import { CompanySize } from '../../../entities/company.entity';

export class CreateCompanyDto {
  @ApiProperty({ description: 'Company name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Company description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Company website URL' })
  @IsUrl()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({ description: 'Company logo URL' })
  @IsUrl()
  @IsOptional()
  logo?: string;

  @ApiPropertyOptional({ description: 'Company industry' })
  @IsString()
  @IsOptional()
  industry?: string;

  @ApiPropertyOptional({ description: 'Company size', enum: CompanySize })
  @IsEnum(CompanySize)
  @IsOptional()
  size?: CompanySize;

  @ApiPropertyOptional({ description: 'Company location' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ description: 'Year company was founded' })
  @IsNumber()
  @IsOptional()
  foundedYear?: number;

  @ApiPropertyOptional({ description: 'Whether company is verified' })
  @IsBoolean()
  @IsOptional()
  isVerified?: boolean;
}

export class UpdateCompanyDto {
  @ApiPropertyOptional({ description: 'Company name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Company description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Company website URL' })
  @IsUrl()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({ description: 'Company logo URL' })
  @IsUrl()
  @IsOptional()
  logo?: string;

  @ApiPropertyOptional({ description: 'Company industry' })
  @IsString()
  @IsOptional()
  industry?: string;

  @ApiPropertyOptional({ description: 'Company size', enum: CompanySize })
  @IsEnum(CompanySize)
  @IsOptional()
  size?: CompanySize;

  @ApiPropertyOptional({ description: 'Company location' })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiPropertyOptional({ description: 'Year company was founded' })
  @IsNumber()
  @IsOptional()
  foundedYear?: number;

  @ApiPropertyOptional({ description: 'Whether company is verified' })
  @IsBoolean()
  @IsOptional()
  isVerified?: boolean;
}

export class CompanyResponseDto {
  @ApiProperty({ description: 'Company ID' })
  id: number;

  @ApiProperty({ description: 'Company name' })
  name: string;

  @ApiPropertyOptional({ description: 'Company description' })
  description?: string;

  @ApiPropertyOptional({ description: 'Company website URL' })
  website?: string;

  @ApiPropertyOptional({ description: 'Company logo URL' })
  logo?: string;

  @ApiPropertyOptional({ description: 'Company industry' })
  industry?: string;

  @ApiPropertyOptional({ description: 'Company size' })
  size?: string;

  @ApiPropertyOptional({ description: 'Company location' })
  location?: string;

  @ApiPropertyOptional({ description: 'Year company was founded' })
  foundedYear?: number;

  @ApiProperty({ description: 'User ID who owns the company' })
  userId: number;

  @ApiProperty({ description: 'Whether company is verified' })
  isVerified: boolean;

  @ApiProperty({ description: 'Creation timestamp' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  updatedAt: Date;
}
