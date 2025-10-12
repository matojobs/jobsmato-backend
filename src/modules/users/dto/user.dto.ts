import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsArray, IsBoolean } from 'class-validator';
import { UserRole } from '../../../entities/user.entity';
import { JobType } from '../../../entities/job.entity';

export class UpdateProfileDto {
  @ApiProperty({ example: 'John', required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ example: 'Doe', required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ example: '+1234567890', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'New York, NY', required: false })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ example: 'Software developer with 5 years experience', required: false })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiProperty({ example: 'https://linkedin.com/in/johndoe', required: false })
  @IsOptional()
  @IsString()
  linkedin?: string;

  @ApiProperty({ example: 'https://github.com/johndoe', required: false })
  @IsOptional()
  @IsString()
  github?: string;

  @ApiProperty({ example: 'https://johndoe.com', required: false })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiProperty({ example: true, description: 'Whether the user has completed the onboarding process', required: false })
  @IsOptional()
  @IsBoolean()
  onboardingComplete?: boolean;
}

export class UpdateJobSeekerProfileDto {
  @ApiProperty({ example: 'https://example.com/resume.pdf', required: false })
  @IsOptional()
  @IsString()
  resume?: string;

  @ApiProperty({ example: 'I am passionate about...', required: false })
  @IsOptional()
  @IsString()
  coverLetter?: string;

  @ApiProperty({ example: ['React', 'Node.js', 'TypeScript'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @ApiProperty({ example: '5 years of software development experience', required: false })
  @IsOptional()
  @IsString()
  experience?: string;

  @ApiProperty({ example: 'Bachelor of Computer Science, Stanford University', required: false })
  @IsOptional()
  @IsString()
  education?: string;

  @ApiProperty({ example: ['AWS Certified Developer', 'Google Cloud Professional'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];

  @ApiProperty({ example: 'https://johndoe.dev', required: false })
  @IsOptional()
  @IsString()
  portfolio?: string;

  @ApiProperty({ example: 'Available immediately', required: false })
  @IsOptional()
  @IsString()
  availability?: string;

  @ApiProperty({ example: '$80,000 - $120,000', required: false })
  @IsOptional()
  @IsString()
  salaryExpectation?: string;

  @ApiProperty({ example: [JobType.FULL_TIME, JobType.CONTRACT], required: false })
  @IsOptional()
  @IsArray()
  @IsEnum(JobType, { each: true })
  preferredJobTypes?: JobType[];

  @ApiProperty({ example: ['San Francisco, CA', 'Remote'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredLocations?: string[];

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isOpenToWork?: boolean;
}

export class CompleteOnboardingDto {
  @ApiProperty({ example: true, description: 'Mark onboarding as complete' })
  @IsBoolean()
  onboardingComplete: boolean;
}
