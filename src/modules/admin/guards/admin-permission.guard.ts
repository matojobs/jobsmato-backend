import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const ADMIN_PERMISSIONS_KEY = 'admin_permissions';

export enum AdminPermission {
  // User Management
  VIEW_USERS = 'view_users',
  EDIT_USERS = 'edit_users',
  DELETE_USERS = 'delete_users',
  VERIFY_USERS = 'verify_users',
  SUSPEND_USERS = 'suspend_users',

  // Company Management
  VIEW_COMPANIES = 'view_companies',
  EDIT_COMPANIES = 'edit_companies',
  VERIFY_COMPANIES = 'verify_companies',
  SUSPEND_COMPANIES = 'suspend_companies',

  // Job Management
  VIEW_JOBS = 'view_jobs',
  EDIT_JOBS = 'edit_jobs',
  DELETE_JOBS = 'delete_jobs',
  APPROVE_JOBS = 'approve_jobs',
  BULK_OPERATIONS = 'bulk_operations',

  // System Management
  VIEW_ANALYTICS = 'view_analytics',
  MANAGE_SETTINGS = 'manage_settings',
  VIEW_LOGS = 'view_logs',
  EXPORT_DATA = 'export_data',
}

@Injectable()
export class AdminPermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<AdminPermission[]>(
      ADMIN_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Super admin has all permissions
    if (user.isSuperAdmin) {
      return true;
    }

    // Check if user has required permissions
    const userPermissions = user.permissions || [];
    const hasPermission = requiredPermissions.every(permission =>
      userPermissions.includes(permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
