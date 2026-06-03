import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { CandidateSignupToken } from '../../entities/candidate-signup-token.entity';
import { TrainingCandidate } from '../../entities/training-candidate.entity';

@Injectable()
export class CandidateSignupService {
  constructor(
    @InjectRepository(CandidateSignupToken)
    private tokenRepo: Repository<CandidateSignupToken>,
    @InjectRepository(TrainingCandidate)
    private candidateRepo: Repository<TrainingCandidate>,
    private dataSource: DataSource,
  ) {}

  // ── Generate signup link ─────────────────────────────────────────────────────

  async generateLink(
    candidateId: number,
    enrollmentId: string | null,
    frontendUrl: string,
  ): Promise<{ url: string; token: string; expiresAt: Date }> {
    const candidate = await this.candidateRepo.findOne({ where: { id: candidateId } });
    if (!candidate) throw new NotFoundException('Candidate not found');

    // Reuse unexpired token if one exists
    const existing = await this.tokenRepo.findOne({
      where: { candidateId, usedAt: undefined as any },
      order: { createdAt: 'DESC' },
    });
    if (existing && existing.expiresAt > new Date() && !existing.usedAt) {
      const url = `${frontendUrl}/join?token=${existing.token}`;
      return { url, token: existing.token, expiresAt: existing.expiresAt };
    }

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.tokenRepo.save(this.tokenRepo.create({
      token,
      candidateId,
      enrollmentId,
      expiresAt,
    }));

    const url = `${frontendUrl}/join?token=${token}`;
    return { url, token, expiresAt };
  }

  // ── Get pre-filled candidate data (public) ───────────────────────────────────

  async getJoinInfo(token: string) {
    const record = await this.tokenRepo.findOne({
      where: { token },
      relations: ['candidate'],
    });

    if (!record) throw new NotFoundException('Invalid or expired link');
    if (record.expiresAt < new Date()) throw new BadRequestException('This link has expired. Ask the recruiter for a new link.');
    if (record.usedAt) throw new BadRequestException('This link has already been used. If you need to update your profile, log in to jobsmato.com.');

    const c = record.candidate;
    return {
      tokenValid: true,
      prefill: {
        name: c.name,
        phone: c.phone,
        city: c.currentCity,
        sourcedForRole: c.sourcedForRole,
        qualification: c.qualification,
        experience: c.experience,
      },
    };
  }

  // ── Referral link (intern shares their personal link) ────────────────────────

  async getReferralLink(enrollmentId: string, frontendUrl: string) {
    return {
      url: `${frontendUrl}/join?ref=${enrollmentId}`,
      enrollmentId,
    };
  }

  /** Public — someone signs up via an intern's referral link (no pre-existing candidate) */
  async registerFromRef(dto: {
    ref: string;  // enrollmentId of the referring intern
    firstName: string;
    lastName?: string;
    email: string;
    password: string;
    phone: string;
    city?: string;
    role?: string;
    consentGiven: boolean;
  }) {
    if (!dto.consentGiven) throw new BadRequestException('Please accept the consent to continue.');

    const existingUser = await this.dataSource.query(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      [dto.email],
    );
    if (existingUser.length > 0) {
      throw new ConflictException('An account with this email already exists. Please log in at jobsmato.com.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // 1. Create training_candidate from the referral
      const candidateResult = await qr.manager.query(
        `INSERT INTO training_candidates
           (name, phone, "currentCity", "sourcedForRole", status, "convertedByInternId", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, 'converted', $5, NOW(), NOW())
         RETURNING id`,
        [
          `${dto.firstName} ${dto.lastName || ''}`.trim(),
          dto.phone,
          dto.city || null,
          dto.role || null,
          dto.ref,
        ],
      );
      const candidateId = candidateResult[0].id;

      // 2. Create jobsmato user
      const userResult = await qr.manager.query(
        `INSERT INTO users
           (email, password, "firstName", "lastName", role, phone, location, "createdAt", "updatedAt", "onboardingComplete")
         VALUES ($1, $2, $3, $4, 'job_seeker', $5, $6, NOW(), NOW(), false)
         RETURNING id, email, "firstName"`,
        [dto.email, hashedPassword, dto.firstName, dto.lastName || '', dto.phone, dto.city || null],
      );
      const user = userResult[0];

      // 3. Update training_candidate with converted user ID
      await qr.manager.query(
        `UPDATE training_candidates SET "convertedUserId" = $1 WHERE id = $2`,
        [user.id, candidateId],
      );

      // 4. Create a "used" signup token so this signup counts in intern performance metrics
      await qr.manager.query(
        `INSERT INTO candidate_signup_tokens
           (token, candidate_id, enrollment_id, expires_at, used_at)
         VALUES ($1, $2, $3::uuid, NOW() + INTERVAL '1 day', NOW())`,
        [randomBytes(32).toString('hex'), candidateId, dto.ref],
      );

      await qr.commitTransaction();
      return {
        success: true,
        message: 'Account created! You can now log in to jobsmato.com to browse jobs.',
        userId: user.id,
        email: user.email,
      };
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  // ── Register candidate as a jobsmato user (public) ───────────────────────────

  async registerFromToken(dto: {
    token: string;
    email: string;
    password: string;
    firstName: string;
    lastName?: string;
    phone?: string;
    city?: string;
    consentGiven: boolean;
  }) {
    if (!dto.consentGiven) throw new BadRequestException('Please accept the consent to continue.');

    const record = await this.tokenRepo.findOne({
      where: { token: dto.token },
      relations: ['candidate'],
    });

    if (!record) throw new NotFoundException('Invalid link');
    if (record.expiresAt < new Date()) throw new BadRequestException('This link has expired.');
    if (record.usedAt) throw new BadRequestException('This link has already been used.');

    const candidate = record.candidate;
    const phone = dto.phone || candidate.phone;

    // Check if user already exists
    const existingUser = await this.dataSource.query(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      [dto.email],
    );
    if (existingUser.length > 0) {
      throw new ConflictException('An account with this email already exists. Please log in at jobsmato.com.');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    // Create user + mark token used in a transaction
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // 1. Create user (job_seeker role)
      const userResult = await qr.manager.query(
        `INSERT INTO users (email, password, "firstName", "lastName", role, phone, location, "createdAt", "updatedAt", "onboardingComplete")
         VALUES ($1, $2, $3, $4, 'job_seeker', $5, $6, NOW(), NOW(), false)
         RETURNING id, email, "firstName", "lastName"`,
        [
          dto.email,
          hashedPassword,
          dto.firstName,
          dto.lastName || '',
          phone || null,
          dto.city || candidate.currentCity || null,
        ],
      );
      const user = userResult[0];

      // 2. Mark token as used
      await qr.manager.query(
        `UPDATE candidate_signup_tokens SET used_at = NOW() WHERE id = $1`,
        [record.id],
      );

      // 3. Mark training_candidate as converted
      await qr.manager.query(
        `UPDATE training_candidates
         SET status = 'converted', "convertedUserId" = $1, "convertedByInternId" = $2
         WHERE id = $3`,
        [user.id, record.enrollmentId, candidate.id],
      );

      await qr.commitTransaction();

      return {
        success: true,
        message: 'Account created! You can now log in to jobsmato.com to browse jobs.',
        userId: user.id,
        email: user.email,
      };
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }
}
