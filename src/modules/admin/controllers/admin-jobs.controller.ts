import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiProperty,
} from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, IsIn, Min, Max, IsEnum, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { AdminJobsService } from '../services/admin-jobs.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { AdminPermissionGuard, AdminPermission } from '../guards/admin-permission.guard';
import { AdminPermissions } from '../decorators/admin-permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { User } from '../../../entities/user.entity';
import { JobType, JobStatus, Industry } from '../../../entities/job.entity';

export class GetJobsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  adminStatus?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  companyId?: number;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @IsString()
  sort_by?: string;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sort_order?: 'asc' | 'desc';
}

export class CreateJobDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @Type(() => Number)
  companyId: number;

  @ApiProperty({ example: 'Senior Software Engineer' })
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsString()
  requirements: string;

  @ApiProperty({ example: 'San Francisco, CA' })
  @IsString()
  location: string;

  @ApiProperty({ enum: JobType })
  @IsEnum(JobType)
  type: JobType;

  @ApiProperty({ example: 'Technology' })
  @IsString()
  category: string;

  @IsOptional()
  @IsString()
  benefits?: string;

  @IsOptional()
  @IsString()
  salary?: string;

  @IsOptional()
  @IsEnum(Industry)
  industry?: Industry;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  experience?: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isRemote?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isUrgent?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isFeatured?: boolean;

  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @IsOptional()
  @IsString()
  applicationDeadline?: string;

  @IsOptional()
  @IsString()
  hrName?: string;

  @IsOptional()
  @IsString()
  hrContact?: string;

  @IsOptional()
  @IsString()
  hrWhatsapp?: string;
}

@ApiTags('admin-jobs')
@Controller('admin/jobs')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminJobsController {
  constructor(private readonly adminJobsService: AdminJobsService) {}

  @Post()
  @AdminPermissions(AdminPermission.CREATE_JOBS)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'Create job' })
  @ApiResponse({ status: 201, description: 'Job created successfully' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  async createJob(@Body() body: CreateJobDto) {
    return this.adminJobsService.createJob(body);
  }

  @Get()
  @AdminPermissions(AdminPermission.VIEW_JOBS)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'Get all jobs' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'adminStatus', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Jobs retrieved successfully' })
  async getJobs(@Query() query: GetJobsQueryDto) {
    return this.adminJobsService.getJobs(query);
  }

  @Get(':id')
  @AdminPermissions(AdminPermission.VIEW_JOBS)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'Get specific job details' })
  @ApiResponse({ status: 200, description: 'Job details retrieved successfully' })
  async getJob(@Param('id', ParseIntPipe) id: number) {
    return this.adminJobsService.getJob(id);
  }

  @Delete(':id')
  @AdminPermissions(AdminPermission.DELETE_JOBS)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({
    summary: 'Delete job',
    description: 'By default returns 409 if job has applications. Use ?cascade=true to delete applications first, then the job.',
  })
  @ApiQuery({ name: 'cascade', required: false, type: Boolean, description: 'If true, delete all applications for this job, then delete the job' })
  @ApiResponse({ status: 200, description: 'Job deleted successfully' })
  @ApiResponse({ status: 409, description: 'Job has applications; use cascade=true to force delete' })
  async deleteJob(
    @Param('id', ParseIntPipe) id: number,
    @Query('cascade') cascade?: string,
  ) {
    const cascadeDelete = cascade === 'true' || cascade === '1';
    return this.adminJobsService.deleteJob(id, cascadeDelete);
  }

  @Put(':id/status')
  @AdminPermissions(AdminPermission.EDIT_JOBS)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'Update job status' })
  @ApiResponse({ status: 200, description: 'Job status updated successfully' })
  async updateJobStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: string; adminNotes?: string },
    @CurrentUser() admin?: User,
  ) {
    return this.adminJobsService.updateJobStatus(id, body.status, body.adminNotes, admin?.id);
  }

  @Post('bulk-action')
  @AdminPermissions(AdminPermission.BULK_OPERATIONS)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'Perform bulk job operations' })
  @ApiResponse({ status: 200, description: 'Bulk operation completed successfully' })
  async bulkJobAction(
    @Body() body: { action: string; jobIds: number[]; adminNotes?: string },
    @CurrentUser() admin?: User,
  ) {
    return this.adminJobsService.bulkJobAction(body.action, body.jobIds, body.adminNotes, admin?.id);
  }
}



