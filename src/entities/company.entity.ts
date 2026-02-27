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
import { ApiProperty } from '@nestjs/swagger';

export enum CompanySize {
  STARTUP = 'startup',
  SMALL = 'small',
  MEDIUM = 'medium',
  LARGE = 'large',
  ENTERPRISE = 'enterprise',
}

@Entity('companies')
export class Company {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Tech Corp Inc.' })
  @Column()
  name: string;

  @ApiProperty({ example: 'tech-corp-inc' })
  @Column({ unique: true })
  @Index()
  slug: string;

  @ApiProperty({ example: 'Leading technology company...', required: false })
  @Column({ type: 'text', nullable: true })
  description: string;

  @ApiProperty({ example: 'https://techcorp.com', required: false })
  @Column({ nullable: true })
  website: string;

  @ApiProperty({ example: 'https://example.com/logo.png', required: false })
  @Column({ nullable: true })
  logo: string;

  @ApiProperty({ example: 'Technology', required: false })
  @Column({ nullable: true })
  industry: string;

  @ApiProperty({ example: CompanySize.MEDIUM, enum: CompanySize, required: false })
  @Column({
    type: 'enum',
    enum: CompanySize,
    nullable: true,
  })
  size: CompanySize;

  @ApiProperty({ example: 'San Francisco, CA', required: false })
  @Column({ nullable: true })
  location: string;

  @ApiProperty({ example: 2015, required: false })
  @Column({ nullable: true })
  foundedYear: number;

  @ApiProperty({ example: true })
  @Column({ default: false })
  isVerified: boolean;

  @ApiProperty({ example: 'Admin notes about this company', required: false })
  @Column({ type: 'text', nullable: true })
  adminNotes: string;

  @ApiProperty({ example: 'pending', enum: ['pending', 'approved', 'rejected', 'suspended'] })
  @Column({ default: 'pending' })
  adminStatus: string;

  @ApiProperty({ example: '2023-12-01T00:00:00.000Z', required: false })
  @Column({ type: 'timestamp', nullable: true })
  adminReviewedAt: Date;

  @ApiProperty({ example: 1, required: false })
  @Column({ nullable: true })
  adminReviewedBy: number;

  @ApiProperty({ example: false })
  @Column({ default: false })
  adminVerified: boolean;

  @ApiProperty({ example: '2023-12-01T00:00:00.000Z' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ example: '2023-12-01T00:00:00.000Z' })
  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ApiProperty({ example: 1 })
  @Column()
  userId: number;

  @OneToOne('User', 'company')
  @JoinColumn({ name: 'userId' })
  user: any;

  @ManyToOne('User', 'adminReviewedCompanies')
  @JoinColumn({ name: 'adminReviewedBy' })
  adminReviewer: any;

  @OneToMany('Job', 'company')
  jobs: any[];

  @OneToMany('CompanyReview', 'company')
  reviews: any[];

  /** Members with access (owner/admin/member). Owner is also in userId above. */
  @OneToMany('CompanyMember', 'company')
  companyMembers: any[];
}
