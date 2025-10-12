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

@Entity('admin_actions_log')
export class AdminActionLog {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 1 })
  @Column()
  adminId: number;

  @ApiProperty({ example: 'create', enum: ['create', 'update', 'delete', 'approve', 'reject', 'suspend', 'activate'] })
  @Column({ length: 50 })
  @Index()
  actionType: string;

  @ApiProperty({ example: 'user', enum: ['user', 'job', 'company', 'application', 'system'] })
  @Column({ length: 50 })
  targetType: string;

  @ApiProperty({ example: 123, required: false })
  @Column({ nullable: true })
  targetId: number;

  @ApiProperty({ example: 'Created new user account', required: false })
  @Column({ type: 'text', nullable: true })
  description: string;

  @ApiProperty({ example: { oldValue: 'inactive', newValue: 'active' }, required: false })
  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @ApiProperty({ example: '192.168.1.1', required: false })
  @Column({ type: 'inet', nullable: true })
  ipAddress: string;

  @ApiProperty({ example: 'Mozilla/5.0...', required: false })
  @Column({ type: 'text', nullable: true })
  userAgent: string;

  @ApiProperty({ example: '2023-12-01T00:00:00.000Z' })
  @CreateDateColumn()
  @Index()
  createdAt: Date;

  // Relations
  @ManyToOne('User', 'adminActions')
  @JoinColumn({ name: 'adminId' })
  admin: any;
}
