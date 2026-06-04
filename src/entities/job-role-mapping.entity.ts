import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('job_role_mappings')
export class JobRoleMapping {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  jobTitle: string;

  @Column({ type: 'text', array: true, default: () => "'{}'::text[]" })
  trainingRoles: string[];

  @Column({ type: 'varchar', default: 'keyword' })
  matchStrategy: 'keyword' | 'exact' | 'manual';

  @Column({ type: 'int', default: 0 })
  candidateCount: number;

  @Column({ nullable: true })
  createdBy: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne('User')
  @JoinColumn({ name: 'createdBy' })
  creator: User;
}
