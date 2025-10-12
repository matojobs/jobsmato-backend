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
import { JobType, Experience } from './job.entity';

export enum AlertFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

@Entity('job_alerts')
export class JobAlert {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Software Engineer' })
  @Column()
  keyword: string;

  @ApiProperty({ example: 'San Francisco, CA', required: false })
  @Column({ nullable: true })
  location: string;

  @ApiProperty({ example: 'Technology', required: false })
  @Column({ nullable: true })
  category: string;

  @ApiProperty({ example: [JobType.FULL_TIME, JobType.CONTRACT] })
  @Column('enum', { enum: JobType, array: true, default: [] })
  jobTypes: JobType[];

  @ApiProperty({ example: [2, 3], description: 'Experience levels: 0=Entry, 1=Junior, 2=Mid, 3=Senior, 4=Executive' })
  @Column('int', { array: true, default: [] })
  experienceLevels: number[];

  @ApiProperty({ example: 50000, required: false })
  @Column({ nullable: true })
  minSalary: number;

  @ApiProperty({ example: 150000, required: false })
  @Column({ nullable: true })
  maxSalary: number;

  @ApiProperty({ example: true })
  @Column({ default: true })
  isRemote: boolean;

  @ApiProperty({ example: AlertFrequency.WEEKLY, enum: AlertFrequency })
  @Column({
    type: 'enum',
    enum: AlertFrequency,
    default: AlertFrequency.WEEKLY,
  })
  frequency: AlertFrequency;

  @ApiProperty({ example: true })
  @Column({ default: true })
  isActive: boolean;

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

  @ManyToOne('User', 'jobAlerts')
  @JoinColumn({ name: 'userId' })
  user: any;

  @ApiProperty({ example: 1, required: false })
  @Column({ nullable: true })
  jobId: number;

  @ManyToOne('Job', 'jobAlerts')
  @JoinColumn({ name: 'jobId' })
  job: any;
}
