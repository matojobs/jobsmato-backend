import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany,
} from 'typeorm';

export enum InternshipDomain {
  HR = 'hr',
  SALES = 'sales',
  TECH = 'tech',
  DIGITAL_MARKETING = 'digital_marketing',
}

export enum BatchType {
  FREE = 'free',
  PAID = 'paid',
}

export enum BatchStatus {
  UPCOMING = 'upcoming',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  COMING_SOON = 'coming_soon',
}

@Entity('batches')
export class Batch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: InternshipDomain })
  domain: InternshipDomain;

  @Column({ type: 'enum', enum: BatchType, default: BatchType.PAID })
  batchType: BatchType;

  @Column({ type: 'enum', enum: BatchStatus, default: BatchStatus.UPCOMING })
  status: BatchStatus;

  @Column({ type: 'date' })
  startDate: string;

  @Column({ type: 'date', nullable: true })
  endDate: string;

  @Column({ default: 50 })
  totalSeats: number;

  @Column({ default: 0 })
  enrolledCount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  priceInr: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany('InternshipEnrollment', 'batch')
  enrollments: any[];
}
