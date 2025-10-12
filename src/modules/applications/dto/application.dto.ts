import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { ApplicationStatus } from '../../../entities/job-application.entity';

export class CreateApplicationDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  jobId: number;

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

  @ApiProperty({ example: 'https://example.com/resume.pdf' })
  resume: string;

  @ApiProperty({ example: 'I am very interested in this position...' })
  coverLetter: string;

  @ApiProperty({ example: ApplicationStatus.PENDING, enum: ApplicationStatus })
  status: ApplicationStatus;

  @ApiProperty({ example: '2023-12-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2023-12-01T00:00:00.000Z' })
  updatedAt: Date;

  @ApiProperty()
  user: {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    avatar: string;
  };

  @ApiProperty()
  job: {
    id: number;
    title: string;
    company: {
      id: number;
      name: string;
      logo: string;
    };
  };
}
