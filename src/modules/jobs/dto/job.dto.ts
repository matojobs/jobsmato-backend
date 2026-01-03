import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsDateString,
  IsArray,
  IsInt,
  Min,
  Max,
  IsNotEmpty,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { JobType, JobStatus, Experience, Industry } from '../../../entities/job.entity';

export class CreateJobDto {
  @ApiProperty({ example: 'Senior Software Engineer' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'We are looking for a senior software engineer...' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 'Bachelor\'s degree in Computer Science...' })
  @IsString()
  @IsNotEmpty()
  requirements: string;

  @ApiProperty({ example: 'Competitive salary, health insurance...', required: false })
  @IsOptional()
  @IsString()
  benefits?: string;

  @ApiProperty({ example: '$80,000 - $120,000', required: false })
  @IsOptional()
  @IsString()
  salary?: string;

  @ApiProperty({ example: 'San Francisco, CA' })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({ example: JobType.FULL_TIME, enum: JobType })
  @IsEnum(JobType)
  type: JobType;

  @ApiProperty({ example: 'Technology' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ example: Industry.INFORMATION_TECHNOLOGY, enum: Industry, required: false })
  @IsOptional()
  @IsEnum(Industry)
  industry?: Industry;

  @ApiProperty({ example: 3, description: 'Experience level (non-negative integer)', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  experience?: number;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isRemote?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  isUrgent?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiProperty({ example: '2023-12-31T23:59:59.000Z', required: false })
  @IsOptional()
  @IsDateString()
  applicationDeadline?: string;

  @ApiProperty({ example: 'John Doe', description: 'HR/Recruiter name', required: false })
  @IsOptional()
  @IsString()
  hrName?: string;

  @ApiProperty({ example: '+1234567890', description: 'HR contact number or email', required: false })
  @IsOptional()
  @IsString()
  hrContact?: string;

  @ApiProperty({ example: '+1234567890', description: 'HR WhatsApp number', required: false })
  @IsOptional()
  @IsString()
  hrWhatsapp?: string;
}

export class UpdateJobDto {
  @ApiProperty({ example: 'Senior Software Engineer', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ example: 'We are looking for a senior software engineer...', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'Bachelor\'s degree in Computer Science...', required: false })
  @IsOptional()
  @IsString()
  requirements?: string;

  @ApiProperty({ example: 'Competitive salary, health insurance...', required: false })
  @IsOptional()
  @IsString()
  benefits?: string;

  @ApiProperty({ example: '$80,000 - $120,000', required: false })
  @IsOptional()
  @IsString()
  salary?: string;

  @ApiProperty({ example: 'San Francisco, CA', required: false })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ example: JobType.FULL_TIME, enum: JobType, required: false })
  @IsOptional()
  @IsEnum(JobType)
  type?: JobType;

  @ApiProperty({ example: 'Technology', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ example: Industry.INFORMATION_TECHNOLOGY, enum: Industry, required: false })
  @IsOptional()
  @IsEnum(Industry)
  industry?: Industry;

  @ApiProperty({ example: 3, description: 'Experience level (non-negative integer)', required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  experience?: number;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isRemote?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  isUrgent?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  // Alias for isFeatured (backward compatibility with frontend)
  @ApiProperty({ example: false, required: false, description: 'Alias for isFeatured' })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiProperty({ example: JobStatus.ACTIVE, enum: JobStatus, required: false })
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @ApiProperty({ example: '2023-12-31T23:59:59.000Z', required: false })
  @IsOptional()
  @IsDateString()
  applicationDeadline?: string;

  @ApiProperty({ example: 'John Doe', description: 'HR/Recruiter name', required: false })
  @IsOptional()
  @IsString()
  hrName?: string;

  @ApiProperty({ example: '+1234567890', description: 'HR contact number or email', required: false })
  @IsOptional()
  @IsString()
  hrContact?: string;

  @ApiProperty({ example: '+1234567890', description: 'HR WhatsApp number', required: false })
  @IsOptional()
  @IsString()
  hrWhatsapp?: string;
}

export class JobSearchDto {
  @ApiProperty({ example: 'software engineer', required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ example: 'San Francisco, CA', required: false })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ example: JobType.FULL_TIME, enum: JobType, required: false })
  @IsOptional()
  @IsEnum(JobType)
  type?: JobType;

  @ApiProperty({ example: 'Technology', required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ example: Industry.INFORMATION_TECHNOLOGY, enum: Industry, required: false })
  @IsOptional()
  @IsEnum(Industry)
  industry?: Industry;

  @ApiProperty({ example: 3, description: 'Experience level (non-negative integer)', required: false })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(0)
  experience?: number;

  @ApiProperty({ example: 50000, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minSalary?: number;

  @ApiProperty({ example: 150000, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxSalary?: number;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isRemote?: boolean;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @ApiProperty({ example: 'active', enum: ['active', 'paused', 'closed', 'draft'], required: false, description: 'Filter by job status' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ example: 1, required: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    const num = parseInt(value, 10);
    return isNaN(num) ? value : num;
  })
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiProperty({ example: 10, required: false })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    const num = parseInt(value, 10);
    return isNaN(num) ? value : num;
  })
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiProperty({ example: 'createdAt', required: false })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiProperty({ example: 'desc', required: false })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';
}

export class JobResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Senior Software Engineer' })
  title: string;

  @ApiProperty({ example: 'senior-software-engineer' })
  slug: string;

  @ApiProperty({ example: 'We are looking for a senior software engineer...' })
  description: string;

  @ApiProperty({ example: 'Bachelor\'s degree in Computer Science...' })
  requirements: string;

  @ApiProperty({ example: 'Competitive salary, health insurance...' })
  benefits: string;

  @ApiProperty({ example: '$80,000 - $120,000' })
  salary: string;

  @ApiProperty({ example: 'San Francisco, CA' })
  location: string;

  @ApiProperty({ example: JobType.FULL_TIME, enum: JobType })
  type: JobType;

  @ApiProperty({ example: 'Technology' })
  category: string;

  @ApiProperty({ example: Industry.INFORMATION_TECHNOLOGY, enum: Industry })
  industry: Industry;

  @ApiProperty({ example: 3, description: 'Experience level: 0=Entry, 1=Junior, 2=Mid, 3=Senior, 4=Executive' })
  experience: number;

  @ApiProperty({ example: true })
  isRemote: boolean;

  @ApiProperty({ example: false })
  isUrgent: boolean;

  @ApiProperty({ example: false })
  isFeatured: boolean;

  @ApiProperty({ example: JobStatus.ACTIVE, enum: JobStatus })
  status: JobStatus;

  @ApiProperty({ example: 150 })
  views: number;

  @ApiProperty({ example: 25 })
  applicationsCount: number;

  @ApiProperty({ example: '2023-12-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2023-12-01T00:00:00.000Z' })
  updatedAt: Date;

  @ApiProperty({ example: '2023-12-01T00:00:00.000Z' })
  postedDate: Date;

  @ApiProperty({ example: '2023-12-31T23:59:59.000Z' })
  applicationDeadline: Date;

  @ApiProperty({ example: 'John Doe', description: 'HR/Recruiter name', required: false })
  hrName?: string;

  @ApiProperty({ example: '+1234567890', description: 'HR contact number or email', required: false })
  hrContact?: string;

  @ApiProperty({ example: '+1234567890', description: 'HR WhatsApp number', required: false })
  hrWhatsapp?: string;

  @ApiProperty()
  company: {
    id: number;
    name: string;
    logo: string;
    location: string;
  };
}
