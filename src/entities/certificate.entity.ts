import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn,
  ManyToOne, JoinColumn, Index,
} from 'typeorm';

export enum CertificateType {
  INTERNSHIP_COMPLETION = 'internship_completion',
  PERFORMANCE = 'performance',
  PARTICIPATION = 'participation',
}

@Entity('certificates')
export class Certificate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: number;

  @Column()
  enrollmentId: string;

  @Column({ type: 'enum', enum: CertificateType, default: CertificateType.INTERNSHIP_COMPLETION })
  certType: CertificateType;

  @Column({ unique: true })
  @Index()
  certNumber: string;

  @Column({ nullable: true })
  pdfUrl: string;

  @Column({ nullable: true })
  qrCode: string;

  @Column({ type: 'date', nullable: true })
  issuedDate: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  finalScore: number;

  @Column({ nullable: true })
  finalGrade: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne('InternshipEnrollment', 'certificates')
  @JoinColumn({ name: 'enrollmentId' })
  enrollment: any;

  @ManyToOne('User')
  @JoinColumn({ name: 'userId' })
  user: any;
}
