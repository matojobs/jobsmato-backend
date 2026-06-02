import { Injectable, BadRequestException, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Coupon, CouponType } from '../../entities/coupon.entity';

@Injectable()
export class CouponsService implements OnModuleInit {
  constructor(
    @InjectRepository(Coupon)
    private couponRepo: Repository<Coupon>,
  ) {}

  // Auto-seed the default launch coupon on startup
  async onModuleInit() {
    const exists = await this.couponRepo.findOne({ where: { code: 'WELCOME40' } });
    if (!exists) {
      await this.couponRepo.save(this.couponRepo.create({
        code: 'WELCOME40',
        type: CouponType.PERCENTAGE,
        description: '40% Launch Discount',
        discountValue: 40,
        maxUses: 0,   // unlimited
        isActive: true,
        notes: 'Default launch coupon — auto-applied on payment page',
      }));
    }
  }

  // Admin: Create percentage discount coupon
  async createPercentageCoupon(data: {
    code: string;
    description: string;
    discountValue: number; // 0-100
    expiresAt?: string;
    maxUses?: number;
    notes?: string;
  }) {
    if (data.discountValue < 0 || data.discountValue > 100) {
      throw new BadRequestException('Discount value must be between 0 and 100');
    }

    const existing = await this.couponRepo.findOne({ where: { code: data.code } });
    if (existing) throw new BadRequestException('Coupon code already exists');

    const coupon = this.couponRepo.create({
      code: data.code.toUpperCase(),
      type: CouponType.PERCENTAGE,
      description: data.description,
      discountValue: data.discountValue,
      expiresAt: data.expiresAt,
      maxUses: data.maxUses || 0,
      notes: data.notes,
      isActive: true,
    });
    return this.couponRepo.save(coupon);
  }

  // Admin: Create ₹100 scholarship coupon for specific email
  async createScholarshipCoupon(data: {
    email: string;
    notes?: string;
  }) {
    const code = this.generateScholarshipCode(data.email);

    const existing = await this.couponRepo.findOne({ where: { code } });
    if (existing) throw new BadRequestException('Scholarship coupon already exists for this email');

    const coupon = this.couponRepo.create({
      code,
      type: CouponType.SCHOLARSHIP,
      description: `100% Scholarship for ${data.email}`,
      discountValue: 100, // 100% — covers full amount including tax
      email: data.email,
      maxUses: 1, // One-time use
      notes: data.notes,
      isActive: true,
    });
    return this.couponRepo.save(coupon);
  }

  // Generate unique scholarship code from email
  private generateScholarshipCode(email: string): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const emailHash = email.split('@')[0].substring(0, 6).toUpperCase();
    return `SCH-${emailHash}-${timestamp}`;
  }

  // Validate coupon and return discount info
  async validateCoupon(code: string, userEmail: string, baseAmount: number) {
    const coupon = await this.couponRepo.findOne({ where: { code: code.toUpperCase() } });

    if (!coupon) throw new NotFoundException('Coupon not found');
    if (!coupon.isActive) throw new BadRequestException('Coupon is inactive');
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      throw new BadRequestException('Coupon has expired');
    }
    if (coupon.maxUses > 0 && coupon.timesUsed >= coupon.maxUses) {
      throw new BadRequestException('Coupon usage limit reached');
    }

    // For scholarship coupons, check email match
    if (coupon.type === CouponType.SCHOLARSHIP) {
      if (coupon.email !== userEmail) {
        throw new BadRequestException('This coupon is not valid for your email');
      }
    }

    // Calculate discount
    // Scholarship = 100% off everything including tax → final = 0
    // Percentage = applied on baseAmount passed in
    let discountAmount = 0;
    let finalAmount = 0;

    if (coupon.type === CouponType.SCHOLARSHIP) {
      // Full free — discount covers the entire amount passed in
      discountAmount = baseAmount;
      finalAmount = 0;
    } else if (coupon.type === CouponType.PERCENTAGE) {
      discountAmount = Math.round((baseAmount * coupon.discountValue) / 100);
      finalAmount = Math.max(0, baseAmount - discountAmount);
    }

    return {
      couponId: coupon.id,
      code: coupon.code,
      type: coupon.type,
      description: coupon.description,
      discountAmount,
      discountPercent: coupon.type === CouponType.PERCENTAGE ? coupon.discountValue : 100,
      finalAmount,
      isFullScholarship: coupon.type === CouponType.SCHOLARSHIP,
    };
  }

  // Mark coupon as used
  async useCoupon(couponId: string) {
    const coupon = await this.couponRepo.findOne({ where: { id: couponId } });
    if (!coupon) throw new NotFoundException('Coupon not found');

    coupon.timesUsed += 1;
    return this.couponRepo.save(coupon);
  }

  // Admin: List all coupons
  async listAll(filters?: { isActive?: boolean; type?: CouponType }) {
    const qb = this.couponRepo.createQueryBuilder('c');

    if (filters?.isActive !== undefined) {
      qb.andWhere('c.isActive = :isActive', { isActive: filters.isActive });
    }
    if (filters?.type) {
      qb.andWhere('c.type = :type', { type: filters.type });
    }

    return qb.orderBy('c.createdAt', 'DESC').getMany();
  }

  // Admin: Get single coupon
  async getOne(id: string) {
    const coupon = await this.couponRepo.findOne({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return coupon;
  }

  // Admin: Update coupon
  async update(id: string, data: Partial<Coupon>) {
    const coupon = await this.getOne(id);
    Object.assign(coupon, data);
    return this.couponRepo.save(coupon);
  }

  // Admin: Delete coupon
  async delete(id: string) {
    const coupon = await this.getOne(id);
    await this.couponRepo.remove(coupon);
    return { deleted: true };
  }
}
