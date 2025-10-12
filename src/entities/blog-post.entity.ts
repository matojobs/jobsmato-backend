import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('blog_posts')
export class BlogPost {
  @ApiProperty({ example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: '10 Essential Skills Every Developer Should Master' })
  @Column()
  title: string;

  @ApiProperty({ example: '10-essential-skills-every-developer-should-master' })
  @Column({ unique: true })
  @Index()
  slug: string;

  @ApiProperty({ example: 'Discover the most in-demand technical skills...' })
  @Column({ type: 'text' })
  excerpt: string;

  @ApiProperty({ example: 'Full article content here...' })
  @Column({ type: 'text' })
  content: string;

  @ApiProperty({ example: 'Technology' })
  @Column()
  category: string;

  @ApiProperty({ example: ['Programming', 'Career', 'Skills'] })
  @Column('text', { array: true, default: [] })
  tags: string[];

  @ApiProperty({ example: 'https://example.com/featured-image.jpg', required: false })
  @Column({ nullable: true })
  featuredImage: string;

  @ApiProperty({ example: 1250 })
  @Column({ default: 0 })
  views: number;

  @ApiProperty({ example: 23 })
  @Column({ default: 0 })
  commentsCount: number;

  @ApiProperty({ example: 8 })
  @Column({ default: 0 })
  readTime: number; // in minutes

  @ApiProperty({ example: true })
  @Column({ default: false })
  isPublished: boolean;

  @ApiProperty({ example: true })
  @Column({ default: false })
  isFeatured: boolean;

  @ApiProperty({ example: '2023-12-01T00:00:00.000Z' })
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty({ example: '2023-12-01T00:00:00.000Z' })
  @UpdateDateColumn()
  updatedAt: Date;

  @ApiProperty({ example: '2023-12-01T00:00:00.000Z' })
  @Column({ type: 'timestamp', nullable: true })
  publishedAt: Date;

  // Relations
  @ApiProperty({ example: 1 })
  @Column()
  authorId: number;

  @ManyToOne('User', 'blogPosts')
  @JoinColumn({ name: 'authorId' })
  author: any;

  @OneToMany('BlogComment', 'post')
  comments: any[];
}
