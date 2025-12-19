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
import { JobType, Industry } from './job.entity';

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

export enum LanguageProficiency {
  EXCELLENT_ENGLISH = 'Excellent English',
  VERY_GOOD_ENGLISH = 'Very Good English',
  GOOD_ENGLISH = 'Good English',
  AVERAGE_ENGLISH = 'Average English',
  BASIC_ENGLISH = 'Basic English',
  MTI_PASSED = 'MTI Passed',
}

export interface LanguageWithProficiency {
  language: string;
  proficiency?: LanguageProficiency;
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
  @Column({ nullable: true })
  password: string;

  @ApiProperty({ example: 'google-oauth-id-123', required: false })
  @Column({ nullable: true, unique: true })
  @Index()
  googleId: string;

  @ApiProperty({ example: 'John' })
  @Column()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @Column({ nullable: true })
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

  // Personal Information
  @ApiProperty({ example: '1990-01-15', required: false })
  @Column({ type: 'date', nullable: true })
  dateOfBirth?: Date;

  @ApiProperty({ example: 'male', enum: ['male', 'female', 'other'], required: false })
  @Column({
    type: 'enum',
    enum: ['male', 'female', 'other'],
    nullable: true,
  })
  gender?: 'male' | 'female' | 'other';

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

  // Job Seeker Profile Fields (nullable - only used for job_seeker role)
  @ApiProperty({ example: 'https://example.com/resume.pdf', required: false })
  @Column({ nullable: true })
  resume: string;

  @ApiProperty({ example: 'I am passionate about...', required: false })
  @Column({ type: 'text', nullable: true })
  coverLetter: string;

  @ApiProperty({ example: ['React', 'Node.js', 'TypeScript'], required: false })
  @Column('text', { array: true, default: [] })
  skills: string[];

  @ApiProperty({ example: ['JavaScript', 'Python', 'Java'], required: false })
  @Column('text', { array: true, default: [] })
  technicalSkills: string[];

  @ApiProperty({ example: ['Communication', 'Leadership', 'Teamwork'], required: false })
  @Column('text', { array: true, default: [] })
  functionalSkills: string[];

  // Professional Details
  @ApiProperty({ example: 'Google Inc.', required: false })
  @Column({ nullable: true })
  currentCompany?: string;

  @ApiProperty({ example: 'Senior Software Engineer', required: false })
  @Column({ nullable: true })
  currentJobTitle?: string;

  @ApiProperty({ example: '500000', required: false })
  @Column({ nullable: true })
  currentCTC?: string;

  @ApiProperty({ example: '5 years of software development experience', required: false })
  @Column({ type: 'text', nullable: true })
  experience: string;

  @ApiProperty({ example: 'Bachelor of Computer Science, Stanford University', required: false })
  @Column({ type: 'text', nullable: true })
  education: string;

  // Education Details
  @ApiProperty({ example: 'Computer Science', required: false })
  @Column({ nullable: true })
  specialization?: string;

  @ApiProperty({ example: 'Stanford University', required: false })
  @Column({ nullable: true })
  university?: string;

  @ApiProperty({ example: '2020', required: false })
  @Column({ nullable: true })
  yearOfPassing?: string;

  @ApiProperty({ example: ['AWS Certified Developer', 'Google Cloud Professional'], required: false })
  @Column('text', { array: true, default: [] })
  certifications: string[];

  @ApiProperty({ example: 'https://johndoe.dev', required: false })
  @Column({ nullable: true })
  portfolio: string;

  @ApiProperty({ example: 'Available immediately', required: false })
  @Column({ nullable: true })
  availability: string;

  @ApiProperty({ example: '$80,000 - $120,000', required: false })
  @Column({ nullable: true })
  salaryExpectation: string;

  @ApiProperty({ example: [JobType.FULL_TIME, JobType.CONTRACT], required: false })
  @Column('enum', { enum: JobType, array: true, default: [] })
  preferredJobTypes: JobType[];

  @ApiProperty({ example: ['San Francisco, CA', 'Remote'], required: false })
  @Column('text', { array: true, nullable: true, default: [] })
  preferredLocations?: string[];

  @ApiProperty({ example: true, required: false })
  @Column({ default: true })
  isOpenToWork: boolean;

  // Experience Type (numeric: 0+)
  @ApiProperty({ 
    example: 0, 
    description: 'Experience level (non-negative integer)', 
    required: false 
  })
  @Column({
    type: 'int',
    nullable: true,
  })
  experienceType?: number;

  // Languages Known with Proficiency
  @ApiProperty({ 
    example: [
      { language: 'English', proficiency: 'Excellent English' },
      { language: 'Hindi', proficiency: 'Very Good English' }
    ], 
    required: false 
  })
  @Column({ type: 'jsonb', nullable: true, default: [] })
  languages: LanguageWithProficiency[];

  // Industry
  @ApiProperty({ example: Industry.INFORMATION_TECHNOLOGY, enum: Industry, required: false })
  @Column({
    type: 'enum',
    enum: Industry,
    nullable: true,
  })
  @Index()
  industry?: Industry;

  // Assets
  @ApiProperty({ example: true, required: false })
  @Column({ default: false })
  hasBike: boolean;

  @ApiProperty({ example: false, required: false })
  @Column({ default: false })
  hasDrivingLicense: boolean;

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
