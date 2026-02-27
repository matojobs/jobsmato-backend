import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AdminApplicationsService } from '../services/admin-applications.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { AdminPermissionGuard, AdminPermission } from '../guards/admin-permission.guard';
import { AdminPermissions } from '../decorators/admin-permissions.decorator';
import { ApplicationStatus } from '../../../entities/job-application.entity';

@ApiTags('admin-applications')
@Controller('admin/applications')
@UseGuards(JwtAuthGuard, AdminGuard, AdminPermissionGuard)
@ApiBearerAuth()
export class AdminApplicationsController {
  constructor(private readonly adminApplicationsService: AdminApplicationsService) {}

  @Get()
  @AdminPermissions(AdminPermission.VIEW_APPLICATIONS)
  @ApiOperation({ summary: 'List job applications (paginated, optional filters)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'jobId', required: false, type: Number })
  @ApiQuery({ name: 'userId', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: ApplicationStatus })
  @ApiResponse({ status: 200, description: 'Paginated list of applications' })
  async getApplications(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('jobId') jobId?: string,
    @Query('userId') userId?: string,
    @Query('status') status?: string,
  ) {
    const query = {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      jobId: jobId ? Number(jobId) : undefined,
      userId: userId ? Number(userId) : undefined,
      status: status as ApplicationStatus | undefined,
    };
    return this.adminApplicationsService.getApplications(query);
  }

  @Get(':id')
  @AdminPermissions(AdminPermission.VIEW_APPLICATIONS)
  @ApiOperation({ summary: 'Get one job application by ID' })
  @ApiResponse({ status: 200, description: 'Application details' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async getApplicationById(@Param('id', ParseIntPipe) id: number) {
    return this.adminApplicationsService.getApplicationById(id);
  }

  @Patch(':id/status')
  @AdminPermissions(AdminPermission.EDIT_APPLICATIONS)
  @ApiOperation({ summary: 'Update application status' })
  @ApiResponse({ status: 200, description: 'Application updated' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async updateApplicationStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: ApplicationStatus },
  ) {
    return this.adminApplicationsService.updateApplicationStatus(id, body.status);
  }

  @Delete(':id')
  @AdminPermissions(AdminPermission.DELETE_APPLICATIONS)
  @ApiOperation({ summary: 'Delete a job application' })
  @ApiResponse({ status: 200, description: 'Application deleted' })
  @ApiResponse({ status: 404, description: 'Application not found' })
  async deleteApplication(@Param('id', ParseIntPipe) id: number) {
    return this.adminApplicationsService.deleteApplication(id);
  }
}
