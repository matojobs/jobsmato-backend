import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';

export enum BatchTaskStatus {
  UPCOMING = 'upcoming',
  ACTIVE = 'active',
  COMPLETED = 'completed',
}

@Entity('batch_tasks')
export class BatchTask {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  batchId: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: 1 })
  weekNumber: number;

  @Column({ default: 30 })
  targetCallCount: number;

  @Column({ type: 'date', nullable: true })
  dueDate: string;

  @Column({ type: 'enum', enum: BatchTaskStatus, default: BatchTaskStatus.ACTIVE })
  status: BatchTaskStatus;

  /**
   * Job post this task sources candidates for. When set, the wizard's City
   * step and fill-rate come from job.vacancies. Nullable for legacy tasks.
   */
  @Column({ nullable: true })
  jobId: number;

  // Optional filter: only assign candidates from this source
  @Column({ nullable: true })
  candidateSource: string;

  // Optional filter: only assign candidates from this city
  @Column({ nullable: true })
  candidateCity: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne('Batch', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'batchId' })
  batch: any;

  @OneToMany('TaskAssignment', 'task')
  assignments: any[];
}
