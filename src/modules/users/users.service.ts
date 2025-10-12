import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { JobSeekerProfile } from '../../entities/job-seeker-profile.entity';
import { UpdateProfileDto, UpdateJobSeekerProfileDto, CompleteOnboardingDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(JobSeekerProfile)
    private jobSeekerProfileRepository: Repository<JobSeekerProfile>,
  ) {}

  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['company', 'jobSeekerProfile'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(userId: number, updateProfileDto: UpdateProfileDto): Promise<User> {
    await this.userRepository.update(userId, updateProfileDto);
    return this.findOne(userId);
  }

  async updateJobSeekerProfile(
    userId: number,
    updateJobSeekerProfileDto: UpdateJobSeekerProfileDto,
  ): Promise<JobSeekerProfile> {
    const profile = await this.jobSeekerProfileRepository.findOne({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Job seeker profile not found');
    }

    await this.jobSeekerProfileRepository.update(profile.id, updateJobSeekerProfileDto);
    const updatedProfile = await this.jobSeekerProfileRepository.findOne({ where: { userId } });
    
    if (!updatedProfile) {
      throw new NotFoundException('Job seeker profile not found after update');
    }
    
    return updatedProfile;
  }

  async getJobSeekerProfile(userId: number): Promise<JobSeekerProfile> {
    const profile = await this.jobSeekerProfileRepository.findOne({
      where: { userId },
      relations: ['user'],
    });

    if (!profile) {
      throw new NotFoundException('Job seeker profile not found');
    }

    return profile;
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
