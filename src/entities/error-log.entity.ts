import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('error_logs')
export class ErrorLog {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'HttpException' })
  @Column({ length: 100 })
  @Index()
  errorType: string;

  @ApiProperty({ example: 'User not found' })
  @Column({ type: 'text' })
  message: string;

  @ApiProperty({ example: 'Error stack trace...', required: false })
  @Column({ type: 'text', nullable: true })
  stack?: string;

  @ApiProperty({ example: 'GET' })
  @Column({ length: 10 })
  method: string;

  @ApiProperty({ example: '/api/users/123' })
  @Column({ type: 'text' })
  @Index()
  url: string;

  @ApiProperty({ example: 404 })
  @Column()
  @Index()
  statusCode: number;

  @ApiProperty({ example: 1, required: false })
  @Column({ nullable: true })
  @Index()
  userId?: number;

  @ApiProperty({ example: 'user@example.com', required: false })
  @Column({ nullable: true })
  userEmail?: string;

  @ApiProperty({ example: 'job_seeker', required: false })
  @Column({ nullable: true })
  userRole?: string;

  @ApiProperty({ example: '192.168.1.1', required: false })
  @Column({ nullable: true })
  ipAddress?: string;

  @ApiProperty({ example: 'Mozilla/5.0...', required: false })
  @Column({ type: 'text', nullable: true })
  userAgent?: string;

  @ApiProperty({ example: { query: {}, params: {} }, required: false })
  @Column({ type: 'jsonb', nullable: true })
  requestData?: any;

  @ApiProperty({ example: 'UsersService' })
  @Column({ length: 100, nullable: true })
  context?: string;

  @ApiProperty({ example: '2023-12-01T00:00:00.000Z' })
  @CreateDateColumn()
  @Index()
  createdAt: Date;
}

