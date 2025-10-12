import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum JobType {
  FULL_TIME = 'full_time',
  PART_TIME = 'part_time',
  CONTRACT = 'contract',
  INTERN = 'intern',
  TEMPORARY = 'temporary',
}

export enum JobStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  CLOSED = 'closed',
}

// Experience levels as numeric values (years of experience)
// 0 = Entry level (0-1 years)
// 1 = Junior level (1-3 years) 
// 2 = Mid level (3-5 years)
// 3 = Senior level (5-8 years)
// 4 = Executive level (8+ years)
export enum Experience {
  ENTRY = 0,
  JUNIOR = 1,
  MID = 2,
  SENIOR = 3,
  EXECUTIVE = 4,
}

export enum Industry {
  INFORMATION_TECHNOLOGY = 'Information Technology (IT) & Software',
  LOGISTICS_SUPPLY_CHAIN = 'Logistics & Supply Chain',
  ECOMMERCE_RETAIL = 'E-commerce & Retail',
  BANKING_FINANCIAL_SERVICES = 'Banking & Financial Services',
  SAAS_TECHNOLOGY_SERVICES = 'SaaS & Technology Services',
  HEALTHCARE_PHARMACEUTICALS = 'Healthcare & Pharmaceuticals',
  HOSPITALITY_TRAVEL = 'Hospitality & Travel',
  REAL_ESTATE_CONSTRUCTION = 'Real Estate & Construction',
  EDUCATION_EDTECH = 'Education & EdTech',
  MEDIA_ADVERTISING_PR = 'Media, Advertising & PR',
  AUTOMOBILE_MOBILITY = 'Automobile & Mobility',
  TELECOM_INTERNET_SERVICES = 'Telecom & Internet Services',
  FMCG = 'FMCG (Fast-Moving Consumer Goods)',
  MANUFACTURING_PRODUCTION = 'Manufacturing & Production',
  ENERGY_UTILITIES = 'Energy & Utilities',
  AGRICULTURE_AGROTECH = 'Agriculture & AgroTech',
  STARTUPS_ENTREPRENEURSHIP = 'Startups & Entrepreneurship',
  OTHER = 'Other',
}

@Entity('jobs')
export class Job {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Senior Software Engineer' })
  @Column()
  title: string;

  @ApiProperty({ example: 'senior-software-engineer' })
  @Column({ unique: true })
  @Index()
  slug: string;

  @ApiProperty({ example: 'We are looking for a senior software engineer...' })
  @Column({ type: 'text' })
  description: string;

  @ApiProperty({ example: 'Bachelor\'s degree in Computer Science...' })
  @Column({ type: 'text' })
  requirements: string;

  @ApiProperty({ example: 'Competitive salary, health insurance...', required: false })
  @Column({ type: 'text', nullable: true })
  benefits: string;

  @ApiProperty({ example: '$80,000 - $120,000', required: false })
  @Column({ nullable: true })
  salary: string;

  @ApiProperty({ example: 'San Francisco, CA' })
  @Column()
  location: string;

  @ApiProperty({ example: JobType.FULL_TIME, enum: JobType })
  @Column({
    type: 'enum',
    enum: JobType,
  })
  type: JobType;

  @ApiProperty({ example: 'Technology' })
  @Column()
  category: string;

  @ApiProperty({ example: Industry.INFORMATION_TECHNOLOGY, enum: Industry, required: false })
  @Column({
    type: 'enum',
    enum: Industry,
    nullable: true,
  })
  @Index()
  industry: Industry;

  @ApiProperty({ example: 3, description: 'Experience level: 0=Entry, 1=Junior, 2=Mid, 3=Senior, 4=Executive', required: false })
  @Column({
    type: 'int',
    nullable: true,
  })
  @Index()
  experience: number;

  @ApiProperty({ example: true })
  @Column({ default: false })
  isRemote: boolean;

  @ApiProperty({ example: false })
  @Column({ default: false })
  isUrgent: boolean;

  @ApiProperty({ example: false })
  @Column({ default: false })
  isFeatured: boolean;

  @ApiProperty({ example: JobStatus.ACTIVE, enum: JobStatus })
  @Column({
    type: 'enum',
    enum: JobStatus,
    default: JobStatus.DRAFT,
  })
  status: JobStatus;

  @ApiProperty({ example: '2023-12-31T23:59:59.000Z', required: false })
  @Column({ type: 'timestamp', nullable: true })
  applicationDeadline: Date;

  @ApiProperty({ example: 150 })
  @Column({ default: 0 })
  views: number;

  @ApiProperty({ example: 25 })
  @Column({ default: 0 })
  applicationsCount: number;

  @ApiProperty({ example: 'Admin notes about this job', required: false })
  @Column({ type: 'text', nullable: true })
  adminNotes: string;

  @ApiProperty({ example: 'approved', enum: ['pending', 'approved', 'rejected', 'suspended'] })
  @Column({ default: 'approved' })
  adminStatus: string;

  @ApiProperty({ example: '2023-12-01T00:00:00.000Z', required: false })
  @Column({ type: 'timestamp', nullable: true })
  adminReviewedAt: Date;

  @ApiProperty({ example: 1, required: false })
  @Column({ nullable: true })
  adminReviewedBy: number;

  @ApiProperty({ example: '2023-12-01T00:00:00.000Z' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ example: '2023-12-01T00:00:00.000Z' })
  @UpdateDateColumn()
  updatedAt: Date;

  @ApiProperty({ example: '2023-12-01T00:00:00.000Z' })
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  postedDate: Date;

  // Relations
  @ApiProperty({ example: 1 })
  @Column()
  companyId: number;

  @ManyToOne('Company', 'jobs')
  @JoinColumn({ name: 'companyId' })
  company: any;

  @ManyToOne('User', 'adminReviewedJobs')
  @JoinColumn({ name: 'adminReviewedBy' })
  adminReviewer: any;

  @OneToMany('JobApplication', 'job')
  applications: any[];

  @OneToMany('SavedJob', 'job')
  savedJobs: any[];

  @OneToMany('JobAlert', 'job')
  jobAlerts: any[];
}
