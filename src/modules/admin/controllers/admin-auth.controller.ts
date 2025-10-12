import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from '../../auth/auth.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { User } from '../../../entities/user.entity';
import { LoginDto } from '../../auth/dto/auth.dto';

@ApiTags('admin-auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Admin login' })
  @ApiResponse({ status: 200, description: 'Admin logged in successfully' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async adminLogin(@Body() loginDto: LoginDto) {
    const result = await this.authService.login(loginDto);
    
    // Check if user is admin
    if (result.role !== 'admin') {
      throw new Error('Admin access required');
    }

    return {
      success: true,
      user: result,
      token: result.accessToken,
      permissions: this.getAdminPermissions(result),
    };
  }

  @Get('permissions')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get admin permissions' })
  @ApiResponse({ status: 200, description: 'Permissions retrieved successfully' })
  async getPermissions(@CurrentUser() user: User) {
    return {
      permissions: this.getAdminPermissions(user),
      role: user.role,
      isAdmin: user.role === 'admin',
    };
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin logout' })
  @ApiResponse({ status: 200, description: 'Admin logged out successfully' })
  async adminLogout(@CurrentUser() user: User) {
    // Log admin logout action
    // You can add audit logging here if needed
    
    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  private getAdminPermissions(user: any): string[] {
    // Define permissions based on user role or specific user attributes
    const basePermissions = [
      'view_dashboard',
      'view_analytics',
      'view_users',
      'view_companies',
      'view_jobs',
    ];

    // Add more permissions for super admin or specific roles
    if (user.role === 'admin') {
      return [
        ...basePermissions,
        'edit_users',
        'delete_users',
        'verify_users',
        'suspend_users',
        'edit_companies',
        'verify_companies',
        'suspend_companies',
        'edit_jobs',
        'delete_jobs',
        'approve_jobs',
        'bulk_operations',
        'manage_settings',
        'view_logs',
        'export_data',
      ];
    }

    return basePermissions;
  }
}
