import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('job_statistics')
export class JobStatistics {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 1, description: 'ID of the job these statistics belong to' })
  @Column({ unique: true })
  @Index()
  jobId: number;

  @ApiProperty({ example: 150, description: 'Total number of views for this job' })
  @Column({ default: 0 })
  totalViews: number;

  @ApiProperty({ example: 25, description: 'Total number of applications for this job' })
  @Column({ default: 0 })
  totalApplications: number;

  @ApiProperty({ example: 120, description: 'Number of unique views for this job' })
  @Column({ default: 0 })
  uniqueViews: number;

  @ApiProperty({ example: '2023-12-01T00:00:00.000Z', description: 'When the job was last viewed', required: false })
  @Column({ type: 'timestamp', nullable: true })
  lastViewedAt: Date;

  @ApiProperty({ example: '2023-12-01T00:00:00.000Z', description: 'When the job last received an application', required: false })
  @Column({ type: 'timestamp', nullable: true })
  lastApplicationAt: Date;

  @ApiProperty({ example: '2023-12-01T00:00:00.000Z' })
  @UpdateDateColumn()
  updatedAt: Date;
}
