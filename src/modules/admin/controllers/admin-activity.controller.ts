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
} from '@nestjs/swagger';
import { AdminActivityService } from '../services/admin-activity.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { AdminPermissionGuard, AdminPermission } from '../guards/admin-permission.guard';
import { AdminPermissions } from '../decorators/admin-permissions.decorator';

@ApiTags('admin-activity')
@Controller('admin/activity-logs')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminActivityController {
  constructor(private readonly adminActivityService: AdminActivityService) {}

  @Get()
  @AdminPermissions(AdminPermission.VIEW_LOGS)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'Get activity logs' })
  @ApiResponse({ status: 200, description: 'Activity logs retrieved successfully' })
  async getActivityLogs(@Query() query: any) {
    return this.adminActivityService.getActivityLogs(query);
  }

  @Get('export')
  @AdminPermissions(AdminPermission.EXPORT_DATA)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'Export activity logs' })
  @ApiResponse({ status: 200, description: 'Activity logs exported successfully' })
  async exportActivityLogs(@Query() query: any) {
    return this.adminActivityService.exportActivityLogs(query);
  }
}



