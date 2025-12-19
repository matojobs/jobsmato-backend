import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber, IsEmail } from 'class-validator';
import { ApplicationStatus } from '../../../entities/job-application.entity';

export class CreateApplicationDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  jobId: number;

  @ApiProperty({ example: 'John Doe', description: 'Full Name (required)', required: true })
  @IsString()
  candidateName: string;

  @ApiProperty({ example: 'john@example.com', description: 'Email Address (required)', required: true })
  @IsEmail()
  candidateEmail: string;

  @ApiProperty({ example: '+1234567890', description: 'Phone Number (optional)', required: false })
  @IsOptional()
  @IsString()
  candidatePhone?: string;

  @ApiProperty({ example: 'https://example.com/resume.pdf', required: false })
  @IsOptional()
  @IsString()
  resume?: string;

  @ApiProperty({ example: 'I am very interested in this position...', required: false })
  @IsOptional()
  @IsString()
  coverLetter?: string;
}

export class UpdateApplicationStatusDto {
  @ApiProperty({ example: ApplicationStatus.REVIEWING, enum: ApplicationStatus })
  @IsEnum(ApplicationStatus)
  status: ApplicationStatus;
}

export class ApplicationResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 1 })
  jobId: number;

  @ApiProperty({ example: 1 })
  userId: number;

  @ApiProperty({ example: ApplicationStatus.PENDING, enum: ApplicationStatus })
  status: ApplicationStatus;

  @ApiProperty({ example: 'I am very interested in this position...', required: false })
  coverLetter?: string;

  @ApiProperty({ example: 'https://example.com/resume.pdf', required: false })
  resume?: string;

  @ApiProperty({ 
    example: '2023-12-01T00:00:00.000Z',
    description: 'Date and time when the candidate applied for the job (ISO 8601 format)'
  })
  appliedAt: string;

  @ApiProperty({ example: '2023-12-01T00:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2023-12-01T00:00:00.000Z' })
  updatedAt: string;

  @ApiProperty({ example: '$80,000 - $120,000', required: false })
  expectedSalary?: string;

  @ApiProperty({
    description: 'Candidate/user information including contact details (phone, location, etc.)',
    example: {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '+1234567890',
      location: 'New York, NY',
      avatar: 'https://example.com/avatar.jpg'
    }
  })
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    avatar?: string | null;
    location?: string;
    profile?: {
      headline?: string;
      summary?: string;
      experience?: string;
      education?: string;
      skills?: string[];
      location?: string;
      phone?: string;
      portfolio?: string;
      linkedin?: string;
      github?: string;
      resume?: string;
      createdAt: string;
      updatedAt: string;
    };
  };

  @ApiProperty()
  job: {
    id: number;
    title: string;
    hrName?: string;
    hrContact?: string;
    hrWhatsapp?: string;
    company: {
      id: number;
      name: string;
      logo?: string | null;
    };
  };
}
