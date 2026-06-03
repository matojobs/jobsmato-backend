import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';
import { TrainingCandidate } from './training-candidate.entity';

@Entity('candidate_signup_tokens')
export class CandidateSignupToken {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  token: string;

  @Column({ name: 'candidate_id' })
  candidateId: number;

  @ManyToOne(() => TrainingCandidate, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'candidate_id' })
  candidate: TrainingCandidate;

  @Column({ name: 'enrollment_id', nullable: true, type: 'uuid' })
  enrollmentId: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'used_at', nullable: true, type: 'timestamptz' })
  usedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
