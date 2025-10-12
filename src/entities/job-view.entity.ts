import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('job_views')
export class JobView {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 1, description: 'ID of the job that was viewed' })
  @Column()
  @Index()
  jobId: number;

  @ApiProperty({ example: 1, description: 'ID of the user who viewed the job (null for anonymous)', required: false })
  @Column({ nullable: true })
  userId: number;

  @ApiProperty({ example: '192.168.1.1', description: 'IP address of the viewer' })
  @Column({ length: 45 })
  ipAddress: string;

  @ApiProperty({ example: 'Mozilla/5.0...', description: 'User agent string', required: false })
  @Column({ type: 'text', nullable: true })
  userAgent: string;

  @ApiProperty({ example: '2023-12-01T00:00:00.000Z', description: 'When the job was viewed' })
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  @Index()
  viewedAt: Date;

  @ApiProperty({ example: '2023-12-01T00:00:00.000Z' })
  @CreateDateColumn()
  createdAt: Date;
}
