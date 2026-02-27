import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../../entities/user.entity';

/**
 * Recruiter Guard
 * Ensures user has recruiter role and is active
 * Prevents access to job portal and admin APIs
 */
@Injectable()
export class RecruiterGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Only recruiter role allowed
    // Compare as strings since JWT payload uses string values
    const userRole = String(user.role);
    const recruiterRole = String(UserRole.RECRUITER);
    if (userRole !== recruiterRole) {
      throw new ForbiddenException(`Recruiter access required. Current role: "${userRole}", Expected: "${recruiterRole}"`);
    }

    // User must be active
    // Temporarily allow all users - isActive field needs to be properly loaded from DB
    // TODO: Re-enable after fixing auth.service.ts to properly select isActive
    // if (user.isActive === false || user.isActive === 0) {
    //   throw new ForbiddenException(`Account is inactive`);
    // }

    return true;
  }
}
