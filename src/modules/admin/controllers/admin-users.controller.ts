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
  ApiProperty,
} from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, IsIn, Min, Max, IsEmail, MinLength, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { AdminUsersService } from '../services/admin-users.service';
import { AdminAuditService } from '../services/admin-audit.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { AdminPermissionGuard, AdminPermission } from '../guards/admin-permission.guard';
import { AdminPermissions } from '../decorators/admin-permissions.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { User } from '../../../entities/user.entity';

/** Query DTO for GET /admin/users. All properties optional; must be whitelisted for global ValidationPipe. */
export class GetUsersQueryDto {
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
  role?: string;

  @IsOptional()
  @IsString()
  status?: string;

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

export class CreateUserDto {
  @ApiProperty({ example: 'recruiter@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 'Jane' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  lastName: string;

  @ApiProperty({ example: 'recruiter', enum: ['job_seeker', 'employer', 'recruiter', 'admin'] })
  @IsString()
  @IsIn(['job_seeker', 'employer', 'recruiter', 'admin'])
  role: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  location?: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @IsIn(['job_seeker', 'employer', 'recruiter', 'admin'])
  role?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isVerified?: boolean;

  @IsOptional()
  @IsBoolean()
  canPostForAnyCompany?: boolean;
}

export class SuspendUserDto {
  @IsString()
  reason: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
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

  @Post()
  @AdminPermissions(AdminPermission.CREATE_USERS)
  @UseGuards(AdminPermissionGuard)
  @ApiOperation({ summary: 'Create a new user (job seeker, employer, or recruiter)' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input or email already exists' })
  async createUser(
    @Body() createDto: CreateUserDto,
    @CurrentUser() admin: User,
  ) {
    const result = await this.adminUsersService.createUser(createDto);
    await this.adminAuditService.logAction(
      admin.id,
      'create',
      'user',
      result.user.id,
      `Created user ${result.user.email} (role: ${result.user.role})`,
      { email: result.user.email, role: result.user.role },
      '127.0.0.1',
      'Admin Panel',
    );
    return result;
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



