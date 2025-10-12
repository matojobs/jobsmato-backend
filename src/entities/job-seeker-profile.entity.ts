import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { JobType } from './job.entity';

@Entity('job_seeker_profiles')
export class JobSeekerProfile {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'https://example.com/resume.pdf', required: false })
  @Column({ nullable: true })
  resume: string;

  @ApiProperty({ example: 'I am passionate about...', required: false })
  @Column({ type: 'text', nullable: true })
  coverLetter: string;

  @ApiProperty({ example: ['React', 'Node.js', 'TypeScript'] })
  @Column('text', { array: true, default: [] })
  skills: string[];

  @ApiProperty({ example: '5 years of software development experience', required: false })
  @Column({ type: 'text', nullable: true })
  experience: string;

  @ApiProperty({ example: 'Bachelor of Computer Science, Stanford University', required: false })
  @Column({ type: 'text', nullable: true })
  education: string;

  @ApiProperty({ example: ['AWS Certified Developer', 'Google Cloud Professional'] })
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

  @ApiProperty({ example: [JobType.FULL_TIME, JobType.CONTRACT] })
  @Column('enum', { enum: JobType, array: true, default: [] })
  preferredJobTypes: JobType[];

  @ApiProperty({ example: ['San Francisco, CA', 'Remote'] })
  @Column('text', { array: true, default: [] })
  preferredLocations: string[];

  @ApiProperty({ example: true })
  @Column({ default: true })
  isOpenToWork: boolean;

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

  @OneToOne('User', 'jobSeekerProfile')
  @JoinColumn({ name: 'userId' })
  user: any;
}
