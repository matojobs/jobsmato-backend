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

  // Candidate lock — set when any intern marks interested; prevents reassignment
  @Column({ nullable: true })
  lockedByEnrollmentId: string;

  @Column({ type: 'timestamp', nullable: true })
  lockedAt: Date;

  // ── Historical sourcing context (from old HRMS call-log import) ───────────
  // Preserves "who was this person called for, by whom, and what happened"
  @Column({ nullable: true })
  sourcedForRole: string;          // Job Role they were sourced for

  @Column({ nullable: true })
  sourcedForCompany: string;       // Client company (Company Acc)

  @Column({ nullable: true })
  portal: string;                  // Where the lead came from (Naukri, WorkIndia…)

  @Column({ nullable: true })
  lastRecruiter: string;           // Who called them last

  @Column({ type: 'date', nullable: true })
  lastCallDate: string;

  @Column({ nullable: true })
  lastCallStatus: string;          // Connected / RNR / Busy / …

  @Column({ nullable: true })
  lastInterested: string;          // Interested / Not Interested / …

  @Column({ type: 'text', nullable: true })
  lastNotInterestedRemark: string;

  @Column({ nullable: true })
  lastInterviewStatus: string;

  @Column({ nullable: true })
  lastSelectionStatus: string;

  @Column({ nullable: true })
  lastJoiningStatus: string;

  // ── Assignment / workflow (Option B parallel pool) ───────────────────────
  @Index()
  @Column({ nullable: true })
  assignedToEnrollmentId: string;  // intern this candidate is assigned to

  @Column({ type: 'timestamp', nullable: true })
  assignedAt: Date;

  @Column({ type: 'int', nullable: true })
  assignedByUserId: number;        // admin who assigned

  @Column({ type: 'timestamp', nullable: true })
  resetAt: Date;                   // when auto-reset returned it to the pool

  @Column({ type: 'int', nullable: true })
  convertedUserId: number;         // jobsmato.com user created on signup

  @Column({ type: 'int', nullable: true })
  convertedByInternId: number;     // intern credited for the conversion

  @Index()
  @Column({ nullable: true })
  batchTag: string;                // import slice tag, e.g. "import_2026_06"

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
