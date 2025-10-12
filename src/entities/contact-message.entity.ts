import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum InquiryType {
  GENERAL = 'general',
  SUPPORT = 'support',
  BILLING = 'billing',
  PARTNERSHIP = 'partnership',
  FEEDBACK = 'feedback',
}

export enum MessageStatus {
  NEW = 'new',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

@Entity('contact_messages')
export class ContactMessage {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'John Doe' })
  @Column()
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  @Column()
  @Index()
  email: string;

  @ApiProperty({ example: 'General Inquiry' })
  @Column()
  subject: string;

  @ApiProperty({ example: 'I have a question about...' })
  @Column({ type: 'text' })
  message: string;

  @ApiProperty({ example: InquiryType.GENERAL, enum: InquiryType })
  @Column({
    type: 'enum',
    enum: InquiryType,
    default: InquiryType.GENERAL,
  })
  inquiryType: InquiryType;

  @ApiProperty({ example: MessageStatus.NEW, enum: MessageStatus })
  @Column({
    type: 'enum',
    enum: MessageStatus,
    default: MessageStatus.NEW,
  })
  status: MessageStatus;

  @ApiProperty({ example: '2023-12-01T00:00:00.000Z' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ example: '2023-12-01T00:00:00.000Z' })
  @UpdateDateColumn()
  updatedAt: Date;
}
