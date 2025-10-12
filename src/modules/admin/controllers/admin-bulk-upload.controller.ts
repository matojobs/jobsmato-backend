import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AdminBulkUploadService } from '../services/admin-bulk-upload.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { AdminPermissionGuard, AdminPermission } from '../guards/admin-permission.guard';
import { AdminPermissions } from '../decorators/admin-permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { User } from '../../../entities/user.entity';

@ApiTags('admin-bulk-upload')
@Controller('admin/jobs/bulk-upload')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminBulkUploadController {
  constructor(private readonly adminBulkUploadService: AdminBulkUploadService) {}

  @Post('validate')
  @AdminPermissions(AdminPermission.BULK_OPERATIONS)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'Validate bulk job data' })
  @ApiResponse({ status: 200, description: 'Data validation completed' })
  async validateBulkData(@Body() body: { data: any[] }) {
    return this.adminBulkUploadService.validateBulkData(body.data);
  }

  @Post('upload')
  @AdminPermissions(AdminPermission.BULK_OPERATIONS)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'Process bulk job upload' })
  @ApiResponse({ status: 200, description: 'Bulk upload initiated' })
  async processBulkUpload(
    @Body() body: { data: any[]; options: any },
    @CurrentUser() admin: User,
  ) {
    return this.adminBulkUploadService.processBulkUpload(body.data, body.options, admin.id);
  }

  @Get('uploads/:id')
  @AdminPermissions(AdminPermission.BULK_OPERATIONS)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'Get bulk upload status' })
  @ApiResponse({ status: 200, description: 'Upload status retrieved' })
  async getUploadStatus(@Param('id') id: string) {
    return this.adminBulkUploadService.getUploadStatus(id);
  }

  @Get('uploads')
  @AdminPermissions(AdminPermission.BULK_OPERATIONS)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'Get bulk upload history' })
  @ApiResponse({ status: 200, description: 'Upload history retrieved' })
  async getUploadHistory(@Query() query: any) {
    // Placeholder implementation
    return {
      uploads: [],
      total: 0,
      page: 1,
      limit: 20,
    };
  }
}
