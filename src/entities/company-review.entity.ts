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

@Entity('company_reviews')
export class CompanyReview {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 4.5 })
  @Column({ type: 'decimal', precision: 2, scale: 1 })
  rating: number;

  @ApiProperty({ example: 'Great company to work for!' })
  @Column({ type: 'text' })
  review: string;

  @ApiProperty({ example: 'Work-life balance', required: false })
  @Column({ nullable: true })
  pros: string;

  @ApiProperty({ example: 'Long hours sometimes', required: false })
  @Column({ nullable: true })
  cons: string;

  @ApiProperty({ example: 'Software Engineer' })
  @Column()
  jobTitle: string;

  @ApiProperty({ example: '2020-01-01' })
  @Column({ type: 'date' })
  employmentStartDate: Date;

  @ApiProperty({ example: '2023-12-01', required: false })
  @Column({ type: 'date', nullable: true })
  employmentEndDate: Date;

  @ApiProperty({ example: true })
  @Column({ default: false })
  isCurrentEmployee: boolean;

  @ApiProperty({ example: true })
  @Column({ default: false })
  isApproved: boolean;

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

  @ManyToOne('User', 'companyReviews')
  @JoinColumn({ name: 'userId' })
  user: any;

  @ApiProperty({ example: 1 })
  @Column()
  @Index()
  companyId: number;

  @ManyToOne('Company', 'reviews')
  @JoinColumn({ name: 'companyId' })
  company: any;
}
