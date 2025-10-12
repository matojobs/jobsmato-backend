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

export enum NotificationType {
  JOB_APPLICATION = 'job_application',
  JOB_ALERT = 'job_alert',
  APPLICATION_STATUS_UPDATE = 'application_status_update',
  NEW_JOB_MATCH = 'new_job_match',
  COMPANY_MESSAGE = 'company_message',
  SYSTEM_ANNOUNCEMENT = 'system_announcement',
}

@Entity('notifications')
export class Notification {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'New job application received' })
  @Column()
  title: string;

  @ApiProperty({ example: 'John Doe applied for Senior Developer position' })
  @Column({ type: 'text' })
  message: string;

  @ApiProperty({ example: NotificationType.JOB_APPLICATION, enum: NotificationType })
  @Column({
    type: 'enum',
    enum: NotificationType,
  })
  type: NotificationType;

  @ApiProperty({ example: false })
  @Column({ default: false })
  isRead: boolean;

  @ApiProperty({ example: 'https://example.com/action', required: false })
  @Column({ nullable: true })
  actionUrl: string;

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

  @ManyToOne('User', 'notifications')
  @JoinColumn({ name: 'userId' })
  user: any;
}
