import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsArray, IsBoolean, IsInt, Min, Max, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole, LanguageProficiency, LanguageWithProficiency } from '../../../entities/user.entity';
import { JobType, Industry } from '../../../entities/job.entity';

export class UpdateProfileDto {
  // Basic User Fields
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

  // Personal Information
  @ApiProperty({ example: '1990-01-15', required: false })
  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @ApiProperty({ example: 'male', enum: ['male', 'female', 'other'], required: false })
  @IsOptional()
  @IsEnum(['male', 'female', 'other'])
  gender?: 'male' | 'female' | 'other';

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

  // Job Seeker Profile Fields (only used when role is job_seeker)
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

  @ApiProperty({ example: ['JavaScript', 'Python', 'Java'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  technicalSkills?: string[];

  @ApiProperty({ example: ['Communication', 'Leadership', 'Teamwork'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  functionalSkills?: string[];

  // Professional Details
  @ApiProperty({ example: 'Google Inc.', required: false })
  @IsOptional()
  @IsString()
  currentCompany?: string;

  @ApiProperty({ example: 'Senior Software Engineer', required: false })
  @IsOptional()
  @IsString()
  currentJobTitle?: string;

  @ApiProperty({ example: '500000', required: false })
  @IsOptional()
  @IsString()
  currentCTC?: string;

  @ApiProperty({ example: '5 years of software development experience', required: false })
  @IsOptional()
  @IsString()
  experience?: string;

  @ApiProperty({ example: 'Bachelor of Computer Science, Stanford University', required: false })
  @IsOptional()
  @IsString()
  education?: string;

  // Education Details
  @ApiProperty({ example: 'Computer Science', required: false })
  @IsOptional()
  @IsString()
  specialization?: string;

  @ApiProperty({ example: 'Stanford University', required: false })
  @IsOptional()
  @IsString()
  university?: string;

  @ApiProperty({ example: '2020', required: false })
  @IsOptional()
  @IsString()
  yearOfPassing?: string;

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

  // Experience Type (numeric: 0+)
  @ApiProperty({ 
    example: 0, 
    description: 'Experience level (non-negative integer)', 
    required: false 
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  experienceType?: number;

  // Languages Known with Proficiency
  @ApiProperty({ 
    example: [
      { language: 'English', proficiency: 'Excellent English' },
      { language: 'Hindi', proficiency: 'Very Good English' }
    ], 
    required: false 
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LanguageWithProficiencyDto)
  languages?: LanguageWithProficiency[];

  // Industry
  @ApiProperty({ example: Industry.INFORMATION_TECHNOLOGY, enum: Industry, required: false })
  @IsOptional()
  @IsEnum(Industry)
  industry?: Industry;

  // Assets
  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  hasBike?: boolean;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  hasDrivingLicense?: boolean;
}

class LanguageWithProficiencyDto {
  @ApiProperty({ example: 'English' })
  @IsString()
  language: string;

  @ApiProperty({ 
    example: LanguageProficiency.EXCELLENT_ENGLISH, 
    enum: LanguageProficiency, 
    required: false 
  })
  @IsOptional()
  @IsEnum(LanguageProficiency)
  proficiency?: LanguageProficiency;
}

export class CompleteOnboardingDto {
  @ApiProperty({ example: true, description: 'Mark onboarding as complete' })
  @IsBoolean()
  onboardingComplete: boolean;
}
