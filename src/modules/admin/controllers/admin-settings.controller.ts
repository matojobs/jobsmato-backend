import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminSettingsService } from '../services/admin-settings.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { AdminPermissionGuard, AdminPermission } from '../guards/admin-permission.guard';
import { AdminPermissions } from '../decorators/admin-permissions.decorator';

@ApiTags('admin-settings')
@Controller('admin/settings')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminSettingsController {
  constructor(private readonly adminSettingsService: AdminSettingsService) {}

  @Get()
  @AdminPermissions(AdminPermission.MANAGE_SETTINGS)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'Get system settings' })
  @ApiResponse({ status: 200, description: 'Settings retrieved successfully' })
  async getSystemSettings() {
    return this.adminSettingsService.getSystemSettings();
  }

  @Put()
  @AdminPermissions(AdminPermission.MANAGE_SETTINGS)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'Update system settings' })
  @ApiResponse({ status: 200, description: 'Settings updated successfully' })
  async updateSystemSettings(@Body() body: { settings: { key: string; value: any }[] }) {
    return this.adminSettingsService.updateSystemSettings(body.settings);
  }
}
