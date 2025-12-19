import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum BulkUploadStatus {
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Entity('bulk_uploads')
export class BulkUpload {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 1 })
  @Column()
  adminId: number;

  @ApiProperty({ example: 'jobs_bulk_upload_20231201.csv' })
  @Column({ length: 255 })
  filename: string;

  @ApiProperty({ example: 1024000, required: false })
  @Column({ nullable: true })
  fileSize: number;

  @ApiProperty({ example: 100, required: false })
  @Column({ nullable: true })
  totalRecords: number;

  @ApiProperty({ example: 95, required: false })
  @Column({ nullable: true })
  successfulRecords: number;

  @ApiProperty({ example: 5, required: false })
  @Column({ nullable: true })
  failedRecords: number;

  @ApiProperty({ example: BulkUploadStatus.PROCESSING, enum: BulkUploadStatus })
  @Column({ length: 20, default: BulkUploadStatus.PROCESSING })
  @Index()
  status: BulkUploadStatus;

  @ApiProperty({ example: [{ row: 5, error: 'Invalid email format' }], required: false })
  @Column({ type: 'jsonb', nullable: true })
  errorLog: any;

  @ApiProperty({ example: '2023-12-01T00:00:00.000Z' })
  @CreateDateColumn()
  @Index()
  createdAt: Date;

  @ApiProperty({ example: '2023-12-01T00:00:00.000Z', required: false })
  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  // Relations
  @ManyToOne('User', 'bulkUploads')
  @JoinColumn({ name: 'adminId' })
  admin: any;
}

