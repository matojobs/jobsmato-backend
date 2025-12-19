import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../../entities/user.entity';

export const ADMIN_PERMISSIONS_KEY = 'admin_permissions';

export enum AdminPermission {
  // Dashboard permissions
  VIEW_DASHBOARD = 'view_dashboard',
  VIEW_ANALYTICS = 'view_analytics',
  
  // User management permissions
  VIEW_USERS = 'view_users',
  EDIT_USERS = 'edit_users',
  DELETE_USERS = 'delete_users',
  VERIFY_USERS = 'verify_users',
  SUSPEND_USERS = 'suspend_users',
  
  // Company management permissions
  VIEW_COMPANIES = 'view_companies',
  EDIT_COMPANIES = 'edit_companies',
  VERIFY_COMPANIES = 'verify_companies',
  SUSPEND_COMPANIES = 'suspend_companies',
  
  // Job management permissions
  VIEW_JOBS = 'view_jobs',
  EDIT_JOBS = 'edit_jobs',
  DELETE_JOBS = 'delete_jobs',
  APPROVE_JOBS = 'approve_jobs',
  
  // Bulk operations
  BULK_OPERATIONS = 'bulk_operations',
  
  // System management
  MANAGE_SETTINGS = 'manage_settings',
  VIEW_LOGS = 'view_logs',
  EXPORT_DATA = 'export_data',
}

@Injectable()
export class AdminPermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Admin access required');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Account is inactive');
    }

    // Get required permissions from decorator
    const requiredPermissions = this.reflector.getAllAndOverride<AdminPermission[]>(
      ADMIN_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true; // No specific permissions required
    }

    // Check if user has all required permissions
    const userPermissions = user.permissions || [];
    const hasAllPermissions = requiredPermissions.every(permission =>
      userPermissions.includes(permission)
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`
      );
    }

    return true;
  }
}
