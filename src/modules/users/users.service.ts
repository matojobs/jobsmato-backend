import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { UpdateProfileDto, CompleteOnboardingDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findOne(id: number): Promise<User> {
    // Use QueryBuilder with explicit column selection to avoid schema mismatch
    // Exclude googleId as it doesn't exist in production database
    const user = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.company', 'company')
      .select([
        'user.id',
        'user.email',
        'user.password',
        'user.firstName',
        'user.lastName',
        'user.role',
        'user.status',
        'user.avatar',
        'user.phone',
        'user.location',
        'user.dateOfBirth',
        'user.gender',
        'user.bio',
        'user.linkedin',
        'user.github',
        'user.website',
        'user.resume',
        'user.coverLetter',
        'user.skills',
        'user.technicalSkills',
        'user.functionalSkills',
        'user.currentCompany',
        'user.currentJobTitle',
        'user.currentCTC',
        'user.experience',
        'user.education',
        'user.specialization',
        'user.university',
        'user.yearOfPassing',
        'user.certifications',
        'user.portfolio',
        'user.availability',
        'user.salaryExpectation',
        'user.preferredJobTypes',
        'user.preferredLocations',
        'user.isOpenToWork',
        'user.experienceType',
        'user.languages',
        'user.industry',
        'user.hasBike',
        'user.hasDrivingLicense',
        'user.emailVerified',
        'user.onboardingComplete',
        'user.lastLoginAt',
        'user.loginCount',
        'user.isActive',
        'user.isVerified',
        'user.verificationToken',
        'user.verificationExpiresAt',
        'user.createdAt',
        'user.updatedAt',
        'company.id',
        'company.name',
        'company.slug',
        'company.description',
        'company.website',
        'company.logo',
        'company.industry',
        'company.size',
        'company.location',
        'company.foundedYear',
        'company.isVerified',
        'company.userId',
      ])
      .where('user.id = :id', { id })
      .getOne();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(userId: number, updateProfileDto: UpdateProfileDto): Promise<User> {
    await this.userRepository.update(userId, updateProfileDto);
    return this.findOne(userId);
  }

  async completeOnboarding(userId: number, completeOnboardingDto: CompleteOnboardingDto): Promise<User> {
    await this.userRepository.update(userId, {
      onboardingComplete: completeOnboardingDto.onboardingComplete,
    });
    return this.findOne(userId);
  }

  async getOnboardingStatus(userId: number): Promise<{ onboardingComplete: boolean }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'onboardingComplete'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return { onboardingComplete: user.onboardingComplete };
  }
}
