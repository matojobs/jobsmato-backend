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
  CREATE_USERS = 'create_users',
  EDIT_USERS = 'edit_users',
  DELETE_USERS = 'delete_users',
  VERIFY_USERS = 'verify_users',
  SUSPEND_USERS = 'suspend_users',
  
  // Company management permissions
  VIEW_COMPANIES = 'view_companies',
  CREATE_COMPANIES = 'create_companies',
  EDIT_COMPANIES = 'edit_companies',
  DELETE_COMPANIES = 'delete_companies',
  VERIFY_COMPANIES = 'verify_companies',
  SUSPEND_COMPANIES = 'suspend_companies',
  
  // Job management permissions
  VIEW_JOBS = 'view_jobs',
  CREATE_JOBS = 'create_jobs',
  EDIT_JOBS = 'edit_jobs',
  DELETE_JOBS = 'delete_jobs',
  APPROVE_JOBS = 'approve_jobs',

  // Job application management (admin portal Job Applications page)
  VIEW_APPLICATIONS = 'view_applications',
  EDIT_APPLICATIONS = 'edit_applications',
  DELETE_APPLICATIONS = 'delete_applications',

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

    // User permissions: from request (e.g. set by frontend) or, for admin role, assume all permissions
    // (JWT payload does not include permissions; they are only returned at login)
    const userPermissions =
      user.permissions?.length > 0
        ? user.permissions
        : (Object.values(AdminPermission) as string[]);
    const hasAllPermissions = requiredPermissions.every(permission =>
      userPermissions.includes(permission),
    );

    if (!hasAllPermissions) {
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${requiredPermissions.join(', ')}`
      );
    }

    return true;
  }
}
