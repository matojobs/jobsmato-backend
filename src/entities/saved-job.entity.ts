import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('saved_jobs')
@Unique(['userId', 'jobId'])
export class SavedJob {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: '2023-12-01T00:00:00.000Z' })
  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ApiProperty({ example: 1 })
  @Column()
  @Index()
  userId: number;

  @ManyToOne('User', 'savedJobs')
  @JoinColumn({ name: 'userId' })
  user: any;

  @ApiProperty({ example: 1 })
  @Column()
  @Index()
  jobId: number;

  @ManyToOne('Job', 'savedJobs')
  @JoinColumn({ name: 'jobId' })
  job: any;
}
