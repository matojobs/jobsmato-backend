import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';

@Entity('weekly_evaluations')
export class WeeklyEvaluation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  enrollmentId: string;

  @Column()
  mentorId: number;

  @Column()
  weekNumber: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  score: number;

  @Column({ nullable: true })
  grade: string;

  @Column({ type: 'text', nullable: true })
  feedback: string;

  @Column({ type: 'jsonb', nullable: true })
  metrics: Record<string, number>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne('InternshipEnrollment', 'evaluations')
  @JoinColumn({ name: 'enrollmentId' })
  enrollment: any;

  @ManyToOne('User')
  @JoinColumn({ name: 'mentorId' })
  mentor: any;
}
