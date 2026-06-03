import { Controller, Post, Get, Body, Query, UseGuards, Request } from '@nestjs/common';
import { CandidateSignupService } from './candidate-signup.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConfigService } from '@nestjs/config';

@Controller('candidate-signup')
export class CandidateSignupController {
  constructor(
    private readonly signupService: CandidateSignupService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Intern generates a signup link for an interested candidate.
   * POST /candidate-signup/generate-link
   * Body: { candidateId, enrollmentId? }
   * Auth: JWT (any logged-in user)
   */
  @UseGuards(JwtAuthGuard)
  @Post('generate-link')
  generateLink(
    @Body('candidateId') candidateId: number,
    @Body('enrollmentId') enrollmentId: string | null,
  ) {
    const frontendUrl = this.configService.get('INTERNSHIP_FRONTEND_URL', 'https://internship.jobsmato.com');
    return this.signupService.generateLink(candidateId, enrollmentId ?? null, frontendUrl);
  }

  /**
   * Public — join page fetches pre-filled candidate data using token.
   * GET /candidate-signup/join-info?token=XYZ
   */
  @Get('join-info')
  getJoinInfo(@Query('token') token: string) {
    return this.signupService.getJoinInfo(token);
  }

  /**
   * Public — candidate submits the join form.
   * POST /candidate-signup/register
   */
  @Post('register')
  register(@Body() dto: {
    token: string;
    email: string;
    password: string;
    firstName: string;
    lastName?: string;
    phone?: string;
    city?: string;
    consentGiven: boolean;
  }) {
    return this.signupService.registerFromToken(dto);
  }

  /**
   * Intern gets their personal referral link.
   * GET /candidate-signup/referral-link?enrollmentId=X
   * Auth: JWT
   */
  @UseGuards(JwtAuthGuard)
  @Get('referral-link')
  getReferralLink(@Query('enrollmentId') enrollmentId: string) {
    const frontendUrl = this.configService.get('INTERNSHIP_FRONTEND_URL', 'https://internship.jobsmato.com');
    return this.signupService.getReferralLink(enrollmentId, frontendUrl);
  }

  /**
   * Public — someone signs up via an intern's referral link (no pre-existing candidate token).
   * POST /candidate-signup/ref-register
   */
  @Post('ref-register')
  refRegister(@Body() dto: {
    ref: string;
    firstName: string;
    lastName?: string;
    email: string;
    password: string;
    phone: string;
    city?: string;
    role?: string;
    consentGiven: boolean;
  }) {
    return this.signupService.registerFromRef(dto);
  }
}
