import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { User, UserRole } from '../../entities/user.entity';
import { Company } from '../../entities/company.entity';
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
    @InjectRepository(PasswordResetToken)
    private passwordResetTokenRepository: Repository<PasswordResetToken>,
    private jwtService: JwtService,
    private emailService: EmailService,
    private dataSource: DataSource,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, password, firstName, lastName, role, phone, location } = registerDto;

    // Check if user already exists using QueryBuilder to avoid googleId column
    const existingUser = await this.userRepository
      .createQueryBuilder('user')
      .select(['user.id', 'user.email'])
      .where('user.email = :email', { email })
      .getOne();
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Use transaction to ensure atomicity - if company creation fails, rollback user creation
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);

      // Create user using raw SQL to avoid googleId column issue
      // Explicitly list only columns that exist in the database
      const insertQuery = `
        INSERT INTO users (email, password, "firstName", "lastName", role, phone, location, "createdAt", "updatedAt", "onboardingComplete")
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), false)
        RETURNING id, email, "firstName", "lastName", role, phone, location, "createdAt", "updatedAt", "onboardingComplete"
      `;
      
      const insertResult = await queryRunner.manager.query(insertQuery, [
        email,
        hashedPassword,
        firstName,
        lastName,
        role,
        phone || null,
        location || null,
      ]);
      
      if (!insertResult || insertResult.length === 0) {
        throw new InternalServerErrorException('Failed to create user');
      }
      
      const rawUser = insertResult[0];
      
      // Create a minimal User object for token generation
      const savedUser = {
        id: rawUser.id,
        email: rawUser.email,
        firstName: rawUser.firstName,
        lastName: rawUser.lastName,
        role: rawUser.role,
        phone: rawUser.phone,
        location: rawUser.location,
        createdAt: rawUser.createdAt,
        updatedAt: rawUser.updatedAt,
        onboardingComplete: rawUser.onboardingComplete || false,
        password: hashedPassword, // Store for potential use
        fullName: `${rawUser.firstName} ${rawUser.lastName}`,
      } as User;

      // Create profile based on role
      if (role === UserRole.EMPLOYER) {
        // Generate unique slug - include user ID to ensure uniqueness
        const baseSlug = `${firstName.toLowerCase()}-${lastName.toLowerCase()}-company`
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        
        // Add user ID to make slug unique
        const uniqueSlug = `${baseSlug}-${savedUser.id}`;

        // Check if slug exists (shouldn't happen with user ID, but just in case)
        const existingCompany = await queryRunner.manager.findOne(Company, {
          where: { slug: uniqueSlug },
        });

        if (existingCompany) {
          // Fallback: add timestamp if somehow duplicate
          const timestamp = Date.now();
          const fallbackSlug = `${uniqueSlug}-${timestamp}`;
          
          const company = this.companyRepository.create({
            userId: savedUser.id,
            name: `${firstName} ${lastName}'s Company`,
            slug: fallbackSlug,
          });
          await queryRunner.manager.save(Company, company);
        } else {
          const company = this.companyRepository.create({
            userId: savedUser.id,
            name: `${firstName} ${lastName}'s Company`,
            slug: uniqueSlug,
          });
          await queryRunner.manager.save(Company, company);
        }
      }
      // Note: Job seeker profile fields are now in User entity with default values
      // No need to create a separate JobSeekerProfile anymore

      // Commit transaction
      await queryRunner.commitTransaction();

      // Generate tokens (outside transaction)
      const tokens = await this.generateTokens(savedUser);

      // Note: Welcome emails are disabled per requirements
      // Email notifications are now focused on application status updates

      return {
        ...tokens,
        userId: savedUser.id,
        email: savedUser.email,
        fullName: savedUser.fullName,
        role: savedUser.role,
        onboardingComplete: savedUser.onboardingComplete,
      };
    } catch (error) {
      // Rollback transaction on error
      await queryRunner.rollbackTransaction();
      
      // If it's a conflict error (duplicate email), re-throw it
      if (error instanceof ConflictException) {
        throw error;
      }
      
      // Log the error for debugging
      console.error('Registration error:', error);
      
      // If it's a duplicate slug error, provide a better message
      if (error.code === '23505' || error.message?.includes('duplicate') || error.message?.includes('unique')) {
        throw new ConflictException('A company with this name already exists. Please try again.');
      }
      
      // Generic error
      throw new InternalServerErrorException('Registration failed. Please try again.');
    } finally {
      // Release query runner
      await queryRunner.release();
    }
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
    // Use QueryBuilder with explicit column selection to avoid schema mismatch issues
    // Select only essential columns that definitely exist in the database
    const user = await this.userRepository
      .createQueryBuilder('user')
      .select([
        'user.id',
        'user.email',
        'user.password',
        'user.firstName',
        'user.lastName',
        'user.role',
        'user.onboardingComplete',
        'user.phone',
        'user.location',
      ])
      .where('user.email = :email', { email })
      .getOne();
    
    if (!user) {
      return null;
    }

    // Check if user has a password (OAuth users might not have one)
    if (!user.password) {
      return null; // OAuth users cannot login with email/password
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async validateUser(userId: number): Promise<User | null> {
    // Use QueryBuilder with explicit column selection to avoid schema mismatch
    return this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.company', 'company')
      .select([
        'user.id',
        'user.email',
        'user.firstName',
        'user.lastName',
        'user.role',
        'user.onboardingComplete',
        'user.phone',
        'user.location',
        'company.id',
        'company.name',
        'company.userId',
      ])
      .where('user.id = :userId', { userId })
      .getOne();
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

  async validateGoogleUser(googleUser: {
    googleId: string;
    email: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  }): Promise<User> {
    // Check if user exists with this Google ID
    let user = await this.userRepository.findOne({
      where: { googleId: googleUser.googleId },
    });

    if (user) {
      // Update last login
      await this.userRepository.update(user.id, {
        lastLoginAt: new Date(),
        loginCount: user.loginCount + 1,
      });
      return user;
    }

    // Check if user exists with this email (link Google account)
    user = await this.userRepository.findOne({
      where: { email: googleUser.email },
    });

    if (user) {
      // Link Google account to existing user
      await this.userRepository.update(user.id, {
        googleId: googleUser.googleId,
        avatar: googleUser.avatar || user.avatar,
        lastLoginAt: new Date(),
        loginCount: user.loginCount + 1,
      });
      const updatedUser = await this.userRepository.findOne({ where: { id: user.id } });
      if (!updatedUser) {
        throw new InternalServerErrorException('Failed to retrieve updated user');
      }
      return updatedUser;
    }

    // Create new user with Google account
    const newUser = this.userRepository.create({
      googleId: googleUser.googleId,
      email: googleUser.email,
      firstName: googleUser.firstName,
      lastName: googleUser.lastName,
      avatar: googleUser.avatar,
      password: undefined, // No password for OAuth users (nullable field)
      role: UserRole.JOB_SEEKER, // Default role
      emailVerified: true, // Google emails are verified
      lastLoginAt: new Date(),
      loginCount: 1,
    });

    const savedUser = await this.userRepository.save(newUser);
    return savedUser;
  }

  async googleLogin(user: User): Promise<AuthResponseDto> {
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
