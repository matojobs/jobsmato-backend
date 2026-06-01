import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';

export enum AssignmentStatus {
  PENDING = 'pending',
  CALLED = 'called',
  SKIPPED = 'skipped',
}

@Entity('task_assignments')
@Index(['enrollmentId', 'candidateId'], { unique: true })
export class TaskAssignment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @Index()
  enrollmentId: string;

  @Column()
  @Index()
  candidateId: number;

  @Column({ nullable: true })
  taskId: string;

  @Column({ type: 'enum', enum: AssignmentStatus, default: AssignmentStatus.PENDING })
  status: AssignmentStatus;

  @CreateDateColumn()
  assignedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne('InternshipEnrollment', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'enrollmentId' })
  enrollment: any;

  @ManyToOne('TrainingCandidate', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'candidateId' })
  candidate: any;

  @ManyToOne('BatchTask', { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'taskId' })
  task: any;
}
