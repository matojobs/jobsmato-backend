import { Injectable, BadRequestException, UnauthorizedException, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import Razorpay from 'razorpay';

export interface CreateOrderDto {
  purpose: string;
  amount: number;          // in rupees (we convert to paise internally)
  mrp?: number;
  discountAmount?: number;
  couponCode?: string;
  couponId?: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private razorpay: Razorpay;
  private readonly keyId: string;
  private readonly keySecret: string;

  constructor(private config: ConfigService) {
    this.keyId = this.config.get<string>('RAZORPAY_KEY_ID') || '';
    this.keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET') || '';

    this.razorpay = new Razorpay({
      key_id: this.keyId,
      key_secret: this.keySecret,
    });
  }

  async createOrder(dto: CreateOrderDto, userId?: number) {
    const amountPaise = Math.round(dto.amount * 100);
    if (amountPaise < 100) {
      throw new BadRequestException('Minimum order amount is ₹1 (100 paise)');
    }

    const receipt = `rcpt_${userId ?? 'anon'}_${Date.now()}`;

    try {
      const order = await (this.razorpay.orders.create as any)({
        amount: amountPaise,
        currency: 'INR',
        receipt,
        notes: {
          purpose: dto.purpose,
          userId: String(userId ?? ''),
          couponCode: dto.couponCode ?? '',
          couponId: dto.couponId ?? '',
        },
      });

      this.logger.log(`Razorpay order created: ${order.id} for ₹${dto.amount}`);

      return {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
      };
    } catch (err: any) {
      const rzpError = err?.error ?? err;
      this.logger.error(`Razorpay order creation failed: ${JSON.stringify(rzpError)}`);
      throw new InternalServerErrorException(
        rzpError?.description || rzpError?.message || 'Failed to create payment order',
      );
    }
  }

  verifySignature(orderId: string, paymentId: string, signature: string): boolean {
    const body = `${orderId}|${paymentId}`;
    const expected = crypto
      .createHmac('sha256', this.keySecret)
      .update(body)
      .digest('hex');
    return expected === signature;
  }

  verifyPayment(dto: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = dto;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new BadRequestException('Missing payment verification fields');
    }

    const valid = this.verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!valid) {
      throw new UnauthorizedException('Payment signature mismatch — possible tampering');
    }

    return {
      success: true,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
    };
  }
}
