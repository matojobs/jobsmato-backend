import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AdminDashboardService } from '../services/admin-dashboard.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { AdminPermissionGuard, AdminPermission } from '../guards/admin-permission.guard';
import { AdminPermissions } from '../decorators/admin-permissions.decorator';

@ApiTags('admin-dashboard')
@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get('stats')
  @AdminPermissions(AdminPermission.VIEW_ANALYTICS)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'Get dashboard statistics' })
  @ApiResponse({ status: 200, description: 'Dashboard statistics retrieved successfully' })
  async getDashboardStats() {
    return this.adminDashboardService.getDashboardStats();
  }

  @Get('analytics/users')
  @AdminPermissions(AdminPermission.VIEW_ANALYTICS)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'Get user analytics' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days to analyze' })
  @ApiResponse({ status: 200, description: 'User analytics retrieved successfully' })
  async getUserAnalytics(@Query('days') days: number = 30) {
    return this.adminDashboardService.getUserAnalytics(days);
  }

  @Get('analytics/jobs')
  @AdminPermissions(AdminPermission.VIEW_ANALYTICS)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'Get job analytics' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days to analyze' })
  @ApiResponse({ status: 200, description: 'Job analytics retrieved successfully' })
  async getJobAnalytics(@Query('days') days: number = 30) {
    return this.adminDashboardService.getJobAnalytics(days);
  }

  @Get('analytics/applications')
  @AdminPermissions(AdminPermission.VIEW_ANALYTICS)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'Get application analytics' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days to analyze' })
  @ApiResponse({ status: 200, description: 'Application analytics retrieved successfully' })
  async getApplicationAnalytics(@Query('days') days: number = 30) {
    // Placeholder - implement when Application entity is available
    return {
      applicationRates: [],
      applicationStatus: [],
      topJobs: [],
      applicationTrends: [],
    };
  }
}
