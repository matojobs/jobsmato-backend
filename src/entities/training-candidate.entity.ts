import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

@Entity('training_candidates')
export class TrainingCandidate {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  @Index()
  name: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  currentCity: string;

  @Column({ nullable: true })
  nativeCity: string;

  @Column({ nullable: true })
  qualification: string;

  @Column({ nullable: true })
  specialization: string;

  @Column({ nullable: true })
  passingYear: string;

  @Column({ nullable: true })
  experience: string;

  @Column({ nullable: true })
  currentCompany: string;

  @Column({ nullable: true })
  currentDesignation: string;

  @Column({ nullable: true })
  currentCTC: string;

  @Column({ nullable: true })
  expectedCTC: string;

  @Column({ nullable: true })
  noticePeriod: string;

  @Column({ nullable: true })
  skills: string;

  @Column({ nullable: true })
  source: string;

  @Column({ nullable: true })
  status: string;

  @Column({ type: 'text', nullable: true })
  remarks: string;

  @Column({ nullable: true })
  language: string;

  @Column({ nullable: true })
  engProficiency: string;

  @Column({ type: 'date', nullable: true })
  dob: string;

  @Column({ nullable: true })
  gender: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
