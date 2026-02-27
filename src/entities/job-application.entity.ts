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

  /** Filled by recruiter on Pending Applications page; until set, application stays "pending" for recruiter. */
  @ApiProperty({ example: '2024-01-15', required: false })
  @Column({ name: 'recruiter_call_date', type: 'date', nullable: true })
  recruiterCallDate?: Date | null;

  @ApiProperty({ example: 'reached', required: false })
  @Column({ name: 'recruiter_call_status', type: 'varchar', nullable: true })
  recruiterCallStatus?: string | null;

  @ApiProperty({ example: true, required: false })
  @Column({ name: 'recruiter_interested', type: 'boolean', nullable: true })
  recruiterInterested?: boolean | null;

  /** Recruiter Edit Candidate fields (job portal applications). */
  @Column({ type: 'varchar', nullable: true })
  portal?: string | null;

  @Column({ name: 'assigned_date', type: 'date', nullable: true })
  assignedDate?: Date | null;

  @Column({ name: 'recruiter_notes', type: 'text', nullable: true })
  recruiterNotes?: string | null;

  @Column({ name: 'not_interested_remark', type: 'text', nullable: true })
  notInterestedRemark?: string | null;

  @Column({ name: 'interview_scheduled', type: 'boolean', nullable: true })
  interviewScheduled?: boolean | null;

  @Column({ name: 'interview_date', type: 'date', nullable: true })
  interviewDate?: Date | null;

  @Column({ name: 'turnup', type: 'boolean', nullable: true })
  turnup?: boolean | null;

  @Column({ name: 'interview_status', type: 'varchar', nullable: true })
  interviewStatus?: string | null;

  @Column({ name: 'selection_status', type: 'varchar', nullable: true })
  selectionStatus?: string | null;

  @Column({ name: 'joining_status', type: 'varchar', nullable: true })
  joiningStatus?: string | null;

  @Column({ name: 'joining_date', type: 'date', nullable: true })
  joiningDate?: Date | null;

  @Column({ name: 'backout_date', type: 'date', nullable: true })
  backoutDate?: Date | null;

  @Column({ name: 'backout_reason', type: 'text', nullable: true })
  backoutReason?: string | null;

  @Column({ name: 'hiring_manager_feedback', type: 'text', nullable: true })
  hiringManagerFeedback?: string | null;

  @Column({ name: 'followup_date', type: 'date', nullable: true })
  followupDate?: Date | null;

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
