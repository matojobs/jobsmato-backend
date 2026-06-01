import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export enum CouponType {
  PERCENTAGE = 'percentage',
  SCHOLARSHIP = 'scholarship', // ₹100 fixed for specific email
}

@Entity('coupons')
@Index('idx_coupon_code', ['code'], { unique: true })
@Index('idx_coupon_email', ['email'])
export class Coupon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column({ type: 'enum', enum: CouponType })
  type: CouponType;

  @Column({ type: 'varchar', length: 255 })
  description: string; // Coupon name/description

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  discountValue: number; // Percentage (0-100) or fixed amount

  @Column({ nullable: true })
  email: string; // For scholarship coupons

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'date', nullable: true })
  expiresAt: string;

  @Column({ default: 0 })
  maxUses: number; // 0 = unlimited

  @Column({ default: 0 })
  timesUsed: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
