import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ApplicationsService } from './applications.service';
import {
  CreateApplicationDto,
  UpdateApplicationStatusDto,
  ApplicationResponseDto,
} from './dto/application.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User, UserRole } from '../../entities/user.entity';

@ApiTags('applications')
@Controller('applications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  @Roles(UserRole.JOB_SEEKER)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Apply for a job' })
  @ApiResponse({
    status: 201,
    description: 'Application submitted successfully',
    type: ApplicationResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Already applied for this job' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async create(
    @Body() createApplicationDto: CreateApplicationDto,
    @CurrentUser() user: User,
  ): Promise<ApplicationResponseDto> {
    return this.applicationsService.create(createApplicationDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get user applications' })
  @ApiResponse({
    status: 200,
    description: 'Applications retrieved successfully',
    type: [ApplicationResponseDto],
  })
  async findAll(@CurrentUser() user: User): Promise<ApplicationResponseDto[]> {
    return this.applicationsService.findAll(user.id);
  }

  @Get('job/:jobId')
  @Roles(UserRole.EMPLOYER)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get applications for a job' })
  @ApiResponse({
    status: 200,
    description: 'Job applications retrieved successfully',
    type: [ApplicationResponseDto],
  })
  @ApiResponse({ status: 403, description: 'Forbidden - You can only view applications for your own jobs' })
  async getJobApplications(
    @Param('jobId', ParseIntPipe) jobId: number,
    @CurrentUser() user: User,
  ): Promise<ApplicationResponseDto[]> {
    return this.applicationsService.getJobApplications(jobId, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get application by ID' })
  @ApiResponse({
    status: 200,
    description: 'Application retrieved successfully',
    type: ApplicationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Application not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - You can only view your own applications' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ): Promise<ApplicationResponseDto> {
    return this.applicationsService.findOne(id, user.id);
  }

  @Patch(':id/status')
  @Roles(UserRole.EMPLOYER)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update application status' })
  @ApiResponse({
    status: 200,
    description: 'Application status updated successfully',
    type: ApplicationResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Forbidden - You can only update applications for your own jobs' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateApplicationStatusDto,
    @CurrentUser() user: User,
  ): Promise<ApplicationResponseDto> {
    return this.applicationsService.updateStatus(id, updateStatusDto, user.id);
  }

  @Delete(':id')
  @Roles(UserRole.JOB_SEEKER)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Withdraw application' })
  @ApiResponse({
    status: 200,
    description: 'Application withdrawn successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - You can only delete your own applications' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.applicationsService.remove(id, user.id);
  }
}
