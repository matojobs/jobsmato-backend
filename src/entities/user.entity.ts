import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum UserRole {
  JOB_SEEKER = 'job_seeker',
  EMPLOYER = 'employer',
  ADMIN = 'admin',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification',
}

@Entity('users')
export class User {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'john@example.com' })
  @Column({ unique: true })
  @Index()
  email: string;

  @Exclude()
  @Column()
  password: string;

  @ApiProperty({ example: 'John' })
  @Column()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @Column()
  lastName: string;

  @ApiProperty({ example: UserRole.JOB_SEEKER, enum: UserRole })
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.JOB_SEEKER,
  })
  role: UserRole;

  @ApiProperty({ example: UserStatus.ACTIVE, enum: UserStatus })
  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @ApiProperty({ example: 'https://example.com/avatar.jpg', required: false })
  @Column({ nullable: true })
  avatar: string;

  @ApiProperty({ example: '+1234567890', required: false })
  @Column({ nullable: true })
  phone: string;

  @ApiProperty({ example: 'New York, NY', required: false })
  @Column({ nullable: true })
  location: string;

  @ApiProperty({ example: 'Software developer with 5 years experience', required: false })
  @Column({ type: 'text', nullable: true })
  bio: string;

  @ApiProperty({ example: 'https://linkedin.com/in/johndoe', required: false })
  @Column({ nullable: true })
  linkedin: string;

  @ApiProperty({ example: 'https://github.com/johndoe', required: false })
  @Column({ nullable: true })
  github: string;

  @ApiProperty({ example: 'https://johndoe.com', required: false })
  @Column({ nullable: true })
  website: string;

  @ApiProperty({ example: true })
  @Column({ default: false })
  emailVerified: boolean;

  @ApiProperty({ example: false, description: 'Whether the user has completed the onboarding process' })
  @Column({ default: false })
  onboardingComplete: boolean;

  @ApiProperty({ example: '2023-12-01T00:00:00.000Z', required: false })
  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date;

  @ApiProperty({ example: 5 })
  @Column({ default: 0 })
  loginCount: number;

  @ApiProperty({ example: true })
  @Column({ default: true })
  isActive: boolean;

  @ApiProperty({ example: false })
  @Column({ default: false })
  isVerified: boolean;

  @ApiProperty({ example: 'abc123def456', required: false })
  @Column({ nullable: true })
  verificationToken: string;

  @ApiProperty({ example: '2023-12-01T00:00:00.000Z', required: false })
  @Column({ type: 'timestamp', nullable: true })
  verificationExpiresAt: Date;

  @ApiProperty({ example: '2023-12-01T00:00:00.000Z' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ example: '2023-12-01T00:00:00.000Z' })
  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToOne('Company', 'user', { cascade: true })
  company: any;

  @OneToOne('JobSeekerProfile', 'user', { cascade: true })
  jobSeekerProfile: any;

  @OneToMany('JobApplication', 'user')
  applications: any[];

  @OneToMany('SavedJob', 'user')
  savedJobs: any[];

  @OneToMany('JobAlert', 'user')
  jobAlerts: any[];

  @OneToMany('Notification', 'user')
  notifications: any[];

  @OneToMany('BlogPost', 'author')
  blogPosts: any[];

  @OneToMany('CompanyReview', 'user')
  companyReviews: any[];

  @OneToMany('AdminActionLog', 'admin')
  adminActions: any[];

  @OneToMany('BulkUpload', 'admin')
  bulkUploads: any[];

  @OneToMany('Job', 'adminReviewer')
  adminReviewedJobs: any[];

  @OneToMany('Company', 'adminReviewer')
  adminReviewedCompanies: any[];

  // Virtual properties
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
