import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateProfileDto, UpdateJobSeekerProfileDto, CompleteOnboardingDto } from './dto/user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../../entities/user.entity';
import { JobSeekerProfile } from '../../entities/job-seeker-profile.entity';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    type: User,
  })
  async getProfile(@CurrentUser() user: User): Promise<User> {
    return this.usersService.findOne(user.id);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: User,
  })
  async updateProfile(
    @CurrentUser() user: User,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<User> {
    return this.usersService.updateProfile(user.id, updateProfileDto);
  }

  @Get('job-seeker-profile')
  @ApiOperation({ summary: 'Get job seeker profile' })
  @ApiResponse({
    status: 200,
    description: 'Job seeker profile retrieved successfully',
    type: JobSeekerProfile,
  })
  async getJobSeekerProfile(@CurrentUser() user: User): Promise<JobSeekerProfile> {
    return this.usersService.getJobSeekerProfile(user.id);
  }

  @Patch('job-seeker-profile')
  @ApiOperation({ summary: 'Update job seeker profile' })
  @ApiResponse({
    status: 200,
    description: 'Job seeker profile updated successfully',
    type: JobSeekerProfile,
  })
  async updateJobSeekerProfile(
    @CurrentUser() user: User,
    @Body() updateJobSeekerProfileDto: UpdateJobSeekerProfileDto,
  ): Promise<JobSeekerProfile> {
    return this.usersService.updateJobSeekerProfile(user.id, updateJobSeekerProfileDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({
    status: 200,
    description: 'User retrieved successfully',
    type: User,
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<User> {
    return this.usersService.findOne(id);
  }

  @Get('onboarding/status')
  @ApiOperation({ summary: 'Get user onboarding status' })
  @ApiResponse({
    status: 200,
    description: 'Onboarding status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        onboardingComplete: { type: 'boolean', example: false }
      }
    }
  })
  async getOnboardingStatus(@CurrentUser() user: User): Promise<{ onboardingComplete: boolean }> {
    return this.usersService.getOnboardingStatus(user.id);
  }

  @Patch('onboarding/complete')
  @ApiOperation({ summary: 'Mark onboarding as complete' })
  @ApiResponse({
    status: 200,
    description: 'Onboarding marked as complete successfully',
    type: User,
  })
  async completeOnboarding(
    @CurrentUser() user: User,
    @Body() completeOnboardingDto: CompleteOnboardingDto,
  ): Promise<User> {
    return this.usersService.completeOnboarding(user.id, completeOnboardingDto);
  }
}
