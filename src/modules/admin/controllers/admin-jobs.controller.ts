import {
  Controller,
  Get,
  Put,
  Post,
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
} from '@nestjs/swagger';
import { AdminJobsService } from '../services/admin-jobs.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { AdminPermissionGuard, AdminPermission } from '../guards/admin-permission.guard';
import { AdminPermissions } from '../decorators/admin-permissions.decorator';

@ApiTags('admin-jobs')
@Controller('admin/jobs')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminJobsController {
  constructor(private readonly adminJobsService: AdminJobsService) {}

  @Get()
  @AdminPermissions(AdminPermission.VIEW_JOBS)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'Get all jobs' })
  @ApiResponse({ status: 200, description: 'Jobs retrieved successfully' })
  async getJobs(@Query() query: any) {
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

  @Put(':id/status')
  @AdminPermissions(AdminPermission.EDIT_JOBS)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'Update job status' })
  @ApiResponse({ status: 200, description: 'Job status updated successfully' })
  async updateJobStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: string; adminNotes?: string },
  ) {
    return this.adminJobsService.updateJobStatus(id, body.status, body.adminNotes);
  }

  @Post('bulk-action')
  @AdminPermissions(AdminPermission.BULK_OPERATIONS)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'Perform bulk job operations' })
  @ApiResponse({ status: 200, description: 'Bulk operation completed successfully' })
  async bulkJobAction(@Body() body: { action: string; jobIds: number[]; adminNotes?: string }) {
    return this.adminJobsService.bulkJobAction(body.action, body.jobIds, body.adminNotes);
  }
}



