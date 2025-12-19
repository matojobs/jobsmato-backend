import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum ApplicationStatus {
  PENDING = 'pending',
  REVIEWING = 'reviewing',
  SHORTLISTED = 'shortlisted',
  INTERVIEW = 'interview',
  REJECTED = 'rejected',
  ACCEPTED = 'accepted',
  WITHDRAWN = 'withdrawn',
}

@Entity('job_applications')
export class JobApplication {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'https://example.com/resume.pdf', required: false })
  @Column({ nullable: true })
  resume: string;

  @ApiProperty({ example: 'I am very interested in this position...', required: false })
  @Column({ type: 'text', nullable: true })
  coverLetter: string;

  @ApiProperty({ example: 'John Doe', description: 'Candidate full name for this application', required: false })
  @Column({ name: 'candidatename', nullable: true })
  candidateName?: string;

  @ApiProperty({ example: 'john@example.com', description: 'Candidate email for this application', required: false })
  @Column({ name: 'candidateemail', nullable: true })
  candidateEmail?: string;

  @ApiProperty({ example: '+1234567890', description: 'Candidate phone number for this application', required: false })
  @Column({ name: 'candidatephone', nullable: true })
  candidatePhone?: string;

  @ApiProperty({ example: ApplicationStatus.PENDING, enum: ApplicationStatus })
  @Column({
    type: 'enum',
    enum: ApplicationStatus,
    default: ApplicationStatus.PENDING,
  })
  status: ApplicationStatus;

  @ApiProperty({ example: '2023-12-01T00:00:00.000Z' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ example: '2023-12-01T00:00:00.000Z' })
  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ApiProperty({ example: 1 })
  @Column()
  @Index()
  userId: number;

  @ManyToOne('User', 'applications')
  @JoinColumn({ name: 'userId' })
  user: any;

  @ApiProperty({ example: 1 })
  @Column()
  @Index()
  jobId: number;

  @ManyToOne('Job', 'applications')
  @JoinColumn({ name: 'jobId' })
  job: any;
}
