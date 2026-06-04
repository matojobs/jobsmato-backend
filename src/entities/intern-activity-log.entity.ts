import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, JoinColumn,
} from 'typeorm';

/**
 * Pipeline stages matching the HR intern KRA flow.
 * lead_assigned → called → connected → interested/not_interested
 * → profile_match/mismatch → submitted → shortlisted/client_rejected
 * → interview → selected/interview_failed → offer → joined / talent_pool
 */
export enum PipelineStage {
  // ── Pre-screening ─────────────────────────────────────────────
  LEAD              = 'lead',
  CONTACTED         = 'contacted',
  INTERESTED        = 'interested',
  SCREENED          = 'screened',
  QUALIFIED         = 'qualified',
  // ── Submission ────────────────────────────────────────────────
  SUBMITTED         = 'submitted',
  SHORTLISTED       = 'shortlisted',
  // ── Interviews ────────────────────────────────────────────────
  INTERVIEW_R1      = 'interview_r1',
  INTERVIEW_R2      = 'interview_r2',
  FINAL_ROUND       = 'final_round',
  // ── Offer ─────────────────────────────────────────────────────
  SELECTED          = 'selected',
  OFFER_RELEASED    = 'offer_released',
  OFFER_ACCEPTED    = 'offer_accepted',
  // ── Joining & Aging ───────────────────────────────────────────
  JOINED            = 'joined',
  AGING_45          = 'aging_45',
  AGING_60          = 'aging_60',
  AGING_90          = 'aging_90',
  // ── Billing ───────────────────────────────────────────────────
  BILLING_ELIGIBLE  = 'billing_eligible',
  ADMIN_APPROVAL    = 'admin_approval',
  INVOICE_RAISED    = 'invoice_raised',
  PAYMENT_PENDING   = 'payment_pending',
  PAYMENT_RECEIVED  = 'payment_received',
  CLOSED_WON        = 'closed_won',
  // ── Talent Pool (drop-offs at any stage) ──────────────────────
  NO_RESPONSE       = 'no_response',
  FOLLOW_UP         = 'follow_up',
  NOT_INTERESTED    = 'not_interested',
  PROFILE_MISMATCH  = 'profile_mismatch',
  CLIENT_REJECTED   = 'client_rejected',
  INTERVIEW_FAILED  = 'interview_failed',
  OFFER_DECLINED    = 'offer_declined',
  TALENT_POOL       = 'talent_pool',
  WRONG_NUMBER      = 'wrong_number',
}

@Entity('intern_activity_logs')
export class InternActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  enrollmentId: string;

  @Column()
  userId: number;

  @Column({ nullable: true })
  taskId: string;

  @Column()
  candidateId: number;

  @Column({ type: 'date', nullable: true })
  callDate: string;

  @Column({ nullable: true })
  callStatus: string;

  @Column({ nullable: true })
  interestStatus: string;

  @Column({ type: 'text', nullable: true })
  notInterestedRemark: string;

  @Column({ default: false })
  interviewScheduled: boolean;

  @Column({ nullable: true })
  turnupStatus: string;

  @Column({ nullable: true })
  interviewStatus: string;

  @Column({ nullable: true })
  selectionStatus: string;

  @Column({ nullable: true })
  joiningStatus: string;

  @Column({ type: 'date', nullable: true })
  joiningDate: string;

  @Column({ type: 'date', nullable: true })
  expectedJoiningDate: string;   // set by intern after selection — when candidate says they'll join

  @Column({ type: 'date', nullable: true })
  backoutDate: string;           // when candidate backed out after accepting

  @Column({ type: 'text', nullable: true })
  backoutReason: string;         // why candidate backed out

  @Column({ type: 'date', nullable: true })
  followupDate: string;

  @Column({ nullable: true })
  followupTime: string;   // e.g. "14:30" (HH:MM from time picker)

  @Column({ type: 'text', nullable: true })
  notes: string;

  // ── Call data collected during the conversation ─────────────────────────
  @Column({ nullable: true })
  experience: string;      // work experience (text, e.g. "2 years")

  @Column({ nullable: true })
  currentSalary: string;   // current CTC if employed

  @Column({ nullable: true })
  workingStatus: string;   // 'working' | 'fresher'

  // ── Pipeline stage (single source of truth for funnel position) ──
  @Column({ type: 'varchar', nullable: true, default: PipelineStage.LEAD })
  pipelineStage: PipelineStage;

  // ── Talent pool data (collected when not interested / mismatch / rejected) ──
  @Column({ type: 'text', nullable: true })
  declineReason: string;

  @Column({ type: 'text', nullable: true })
  preferredRoles: string;

  @Column({ nullable: true })
  preferredLocation: string;

  @Column({ nullable: true })
  availabilityTimeline: string;  // e.g. "Immediate", "1 month", "3 months"

  @Column({ nullable: true })
  missingSkills: string;

  @Column({ nullable: true })
  upskillInterests: string;

  @Column({ nullable: true })
  expectedSalary: string;

  // ── Client review / offer stage ──
  @Column({ type: 'text', nullable: true })
  clientRejectionReason: string;

  @Column({ type: 'text', nullable: true })
  interviewFeedback: string;

  @Column({ nullable: true })
  offerStatus: string;           // accepted / declined

  @Column({ default: 1 })
  weekNumber: number;

  // ── CV & Operations fields ────────────────────────────────────────────────
  @Column({ nullable: true })
  cvUrl: string;

  @Column({ type: 'date', nullable: true })
  interviewDate: string;

  @Column({ nullable: true })
  interviewTime: string;

  @Column({ nullable: true })
  clientName: string;

  @Column({ nullable: true })
  interviewMode: string;   // Online / Offline / Telephonic

  @Column({ nullable: true })
  interviewLocation: string;

  @Column({ type: 'text', nullable: true })
  clientFeedback: string;

  @Column({ type: 'text', nullable: true })
  opsNotes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne('InternshipEnrollment', 'activityLogs')
  @JoinColumn({ name: 'enrollmentId' })
  enrollment: any;

  @ManyToOne('TrainingCandidate')
  @JoinColumn({ name: 'candidateId' })
  candidate: any;
}
