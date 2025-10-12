import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { User, UserRole } from '../../entities/user.entity';
import { Company } from '../../entities/company.entity';
import { JobSeekerProfile } from '../../entities/job-seeker-profile.entity';
import { PasswordResetToken } from '../../entities/password-reset-token.entity';
import { EmailService } from '../email/email.service';
import {
  RegisterDto,
  LoginDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  ChangePasswordDto,
  AuthResponseDto,
} from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Company)
    private companyRepository: Repository<Company>,
    @InjectRepository(JobSeekerProfile)
    private jobSeekerProfileRepository: Repository<JobSeekerProfile>,
    @InjectRepository(PasswordResetToken)
    private passwordResetTokenRepository: Repository<PasswordResetToken>,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, password, firstName, lastName, role, phone, location } = registerDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role,
      phone,
      location,
    });

    const savedUser = await this.userRepository.save(user);

    // Create profile based on role
    if (role === UserRole.EMPLOYER) {
      const company = this.companyRepository.create({
        userId: savedUser.id,
        name: `${firstName} ${lastName}'s Company`,
        slug: `${firstName.toLowerCase()}-${lastName.toLowerCase()}-company`,
      });
      await this.companyRepository.save(company);
    } else if (role === UserRole.JOB_SEEKER) {
      const profile = this.jobSeekerProfileRepository.create({
        userId: savedUser.id,
        skills: [],
        certifications: [],
        preferredJobTypes: [],
        preferredLocations: [],
      });
      await this.jobSeekerProfileRepository.save(profile);
    }

    // Generate tokens
    const tokens = await this.generateTokens(savedUser);

    // Send welcome email (don't await to avoid blocking registration)
    this.emailService.sendWelcomeEmail(savedUser.email, savedUser.fullName).catch(error => {
      console.error('Failed to send welcome email:', error);
    });

    return {
      ...tokens,
      userId: savedUser.id,
      email: savedUser.email,
      fullName: savedUser.fullName,
      role: savedUser.role,
      onboardingComplete: savedUser.onboardingComplete,
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    const user = await this.validateUserCredentials(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return {
      ...tokens,
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      onboardingComplete: user.onboardingComplete,
    };
  }

  async validateUserCredentials(email: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async validateUser(userId: number): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id: userId },
      relations: ['company', 'jobSeekerProfile'],
    });
  }

  async refreshToken(userId: number): Promise<{ accessToken: string }> {
    const user = await this.validateUser(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return { accessToken };
  }

  async changePassword(userId: number, changePasswordDto: ChangePasswordDto): Promise<void> {
    const { currentPassword, newPassword } = changePasswordDto;

    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 12);
    await this.userRepository.update(userId, { password: hashedNewPassword });
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<void> {
    const { email } = forgotPasswordDto;

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      // Don't reveal if user exists or not for security
      return;
    }

    // Generate a secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Set expiration time (1 hour from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Invalidate any existing reset tokens for this user
    await this.passwordResetTokenRepository.update(
      { userId: user.id, used: false },
      { used: true }
    );

    // Create new reset token
    const passwordResetToken = this.passwordResetTokenRepository.create({
      token: resetToken,
      userId: user.id,
      expiresAt,
    });

    await this.passwordResetTokenRepository.save(passwordResetToken);

    // Send password reset email
    await this.emailService.sendPasswordResetEmail(
      user.email,
      resetToken
    );
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const { token, password } = resetPasswordDto;

    // Find the reset token
    const resetToken = await this.passwordResetTokenRepository.findOne({
      where: { token },
      relations: ['user'],
    });

    if (!resetToken) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Check if token is valid (not used and not expired)
    if (!resetToken.isValid()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update user's password
    await this.userRepository.update(resetToken.userId, {
      password: hashedPassword,
    });

    // Mark the token as used
    await this.passwordResetTokenRepository.update(resetToken.id, {
      used: true,
    });

    // Invalidate all other reset tokens for this user
    await this.passwordResetTokenRepository.update(
      { userId: resetToken.userId, used: false },
      { used: true }
    );
  }

  private async generateTokens(user: User): Promise<{ accessToken: string; refreshToken: string }> {
    const payload = { sub: user.id, email: user.email, role: user.role };

    // Different expiration times based on user role
    const accessTokenExpiry = user.role === UserRole.JOB_SEEKER ? '7d' : '15m';
    const refreshTokenExpiry = user.role === UserRole.JOB_SEEKER ? '30d' : '7d';

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, { expiresIn: accessTokenExpiry }),
      this.jwtService.signAsync(payload, { expiresIn: refreshTokenExpiry }),
    ]);

    return { accessToken, refreshToken };
  }
}
