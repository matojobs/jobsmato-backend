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

@Entity('blog_comments')
export class BlogComment {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: 'Great article! Very informative.' })
  @Column({ type: 'text' })
  content: string;

  @ApiProperty({ example: 'John Doe' })
  @Column()
  authorName: string;

  @ApiProperty({ example: 'john@example.com' })
  @Column()
  authorEmail: string;

  @ApiProperty({ example: 'https://example.com/avatar.jpg', required: false })
  @Column({ nullable: true })
  authorAvatar: string;

  @ApiProperty({ example: true })
  @Column({ default: false })
  isApproved: boolean;

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
  postId: number;

  @ManyToOne('BlogPost', 'comments')
  @JoinColumn({ name: 'postId' })
  post: any;
}
