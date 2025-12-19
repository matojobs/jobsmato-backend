import {
  Controller,
  Get,
  Post,
  Put,
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
  ApiParam,
} from '@nestjs/swagger';
import { AdminUsersService } from '../services/admin-users.service';
import { AdminAuditService } from '../services/admin-audit.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { AdminPermissionGuard, AdminPermission } from '../guards/admin-permission.guard';
import { AdminPermissions } from '../decorators/admin-permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { User } from '../../../entities/user.entity';

export class GetUsersQueryDto {
  page?: number = 1;
  limit?: number = 20;
  search?: string;
  role?: string;
  status?: string;
  sortBy?: string = 'createdAt';
  sortOrder?: 'asc' | 'desc' = 'desc';
}

export class UpdateUserDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
  isActive?: boolean;
  isVerified?: boolean;
}

export class SuspendUserDto {
  reason: string;
  duration?: number; // in days
}

@ApiTags('admin-users')
@Controller('admin/users')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminUsersController {
  constructor(
    private readonly adminUsersService: AdminUsersService,
    private readonly adminAuditService: AdminAuditService,
  ) {}

  @Get()
  @AdminPermissions(AdminPermission.VIEW_USERS)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'Get all users with filtering and pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'role', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'sortBy', required: false, type: String })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  async getUsers(@Query() query: GetUsersQueryDto) {
    return this.adminUsersService.getUsers(query);
  }

  @Get(':id')
  @AdminPermissions(AdminPermission.VIEW_USERS)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'Get specific user details' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'User details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUser(@Param('id', ParseIntPipe) id: number) {
    return this.adminUsersService.getUser(id);
  }

  @Put(':id')
  @AdminPermissions(AdminPermission.EDIT_USERS)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'Update user' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateUserDto,
    @CurrentUser() admin: User,
  ) {
    const result = await this.adminUsersService.updateUser(id, updateDto);
    
    // Log admin action
    await this.adminAuditService.logAction(
      admin.id,
      'update',
      'user',
      id,
      `Updated user ${id}`,
      { changes: updateDto },
      '127.0.0.1', // You should get this from request
      'Admin Panel', // You should get this from request
    );

    return result;
  }

  @Delete(':id')
  @AdminPermissions(AdminPermission.DELETE_USERS)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'Delete user' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteUser(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() admin: User,
  ) {
    const result = await this.adminUsersService.deleteUser(id);
    
    // Log admin action
    await this.adminAuditService.logAction(
      admin.id,
      'delete',
      'user',
      id,
      `Deleted user ${id}`,
      {},
      '127.0.0.1', // You should get this from request
      'Admin Panel', // You should get this from request
    );

    return result;
  }

  @Post(':id/verify')
  @AdminPermissions(AdminPermission.VERIFY_USERS)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'Verify user account' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'User verified successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async verifyUser(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() admin: User,
  ) {
    const result = await this.adminUsersService.verifyUser(id);
    
    // Log admin action
    await this.adminAuditService.logAction(
      admin.id,
      'verify',
      'user',
      id,
      `Verified user ${id}`,
      {},
      '127.0.0.1', // You should get this from request
      'Admin Panel', // You should get this from request
    );

    return result;
  }

  @Post(':id/suspend')
  @AdminPermissions(AdminPermission.SUSPEND_USERS)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'Suspend user account' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'User suspended successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async suspendUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() suspendDto: SuspendUserDto,
    @CurrentUser() admin: User,
  ) {
    const result = await this.adminUsersService.suspendUser(id, suspendDto);
    
    // Log admin action
    await this.adminAuditService.logAction(
      admin.id,
      'suspend',
      'user',
      id,
      `Suspended user ${id}`,
      { reason: suspendDto.reason, duration: suspendDto.duration },
      '127.0.0.1', // You should get this from request
      'Admin Panel', // You should get this from request
    );

    return result;
  }
}



