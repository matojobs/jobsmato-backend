import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../entities/user.entity';
import { CouponsService } from './coupons.service';
import { CouponType } from '../../entities/coupon.entity';

@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  // ── Public routes (no auth required) ──────────────────────────────────────

  /** Validate coupon and get discount amount — public, no JWT needed */
  @Post('validate')
  validateCoupon(
    @Body('code') code: string,
    @Body('email') email: string,
    @Body('baseAmount') baseAmount: number,
  ) {
    return this.couponsService.validateCoupon(code, email, baseAmount);
  }

  // ── Admin routes ───────────────────────────────────────────────────────────

  /** Admin: Create percentage discount coupon */
  @Post('admin/percentage')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  createPercentageCoupon(
    @Body() data: {
      code: string;
      description: string;
      discountValue: number;
      expiresAt?: string;
      maxUses?: number;
      notes?: string;
    },
  ) {
    return this.couponsService.createPercentageCoupon(data);
  }

  /** Admin: Create ₹100 scholarship coupon for specific email */
  @Post('admin/scholarship')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  createScholarshipCoupon(
    @Body() data: { email: string; notes?: string },
  ) {
    return this.couponsService.createScholarshipCoupon(data);
  }

  /** Admin: List all coupons */
  @Get('admin/list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  listCoupons(
    @Query('isActive') isActive?: string,
    @Query('type') type?: CouponType,
  ) {
    const active = isActive === undefined ? undefined : isActive === 'true';
    return this.couponsService.listAll({ isActive: active, type });
  }

  /** Admin: Get single coupon */
  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getCoupon(@Param('id') id: string) {
    return this.couponsService.getOne(id);
  }

  /** Admin: Update coupon */
  @Patch('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  updateCoupon(@Param('id') id: string, @Body() data: any) {
    return this.couponsService.update(id, data);
  }

  /** Admin: Delete coupon */
  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  deleteCoupon(@Param('id') id: string) {
    return this.couponsService.delete(id);
  }

  /** Internal: Mark coupon as used (called after successful payment) */
  @Post('internal/use/:couponId')
  useCoupon(@Param('couponId') couponId: string) {
    return this.couponsService.useCoupon(couponId);
  }
}

