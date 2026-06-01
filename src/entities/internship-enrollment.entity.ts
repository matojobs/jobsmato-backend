import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';
import { InternshipDomain } from './batch.entity';

export enum EnrollmentStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  DROPPED = 'dropped',
}

@Entity('internship_enrollments')
export class InternshipEnrollment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: number;

  @Column()
  batchId: string;

  @Column({ type: 'enum', enum: InternshipDomain })
  domain: InternshipDomain;

  @Column({ type: 'enum', enum: EnrollmentStatus, default: EnrollmentStatus.PENDING })
  status: EnrollmentStatus;

  @Column({ nullable: true })
  mentorId: number;

  // Payment
  @Column({ nullable: true })
  paymentId: string;

  @Column({ default: false })
  paymentVerified: boolean;

  // Aptitude test
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  aptitudeScore: number;

  @Column({ default: false })
  aptitudePassed: boolean;

  // Final result
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  finalScore: number;

  @Column({ nullable: true })
  finalGrade: string;

  @Column({ type: 'date', nullable: true })
  completedAt: string;

  @CreateDateColumn()
  enrolledAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne('Batch', 'enrollments')
  @JoinColumn({ name: 'batchId' })
  batch: any;

  @ManyToOne('User')
  @JoinColumn({ name: 'userId' })
  user: any;

  @ManyToOne('User')
  @JoinColumn({ name: 'mentorId' })
  mentor: any;

  @OneToMany('InternActivityLog', 'enrollment')
  activityLogs: any[];

  @OneToMany('WeeklyEvaluation', 'enrollment')
  evaluations: any[];

  @OneToMany('Certificate', 'enrollment')
  certificates: any[];
}
