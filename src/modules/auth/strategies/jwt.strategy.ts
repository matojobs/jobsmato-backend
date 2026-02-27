import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';
import { UserRole } from '../../../entities/user.entity';

/** All permissions granted to admin users (used when attaching user to request). */
const ADMIN_PERMISSIONS = [
  'view_dashboard',
  'view_analytics',
  'view_users',
  'create_users',
  'edit_users',
  'delete_users',
  'verify_users',
  'suspend_users',
  'view_companies',
  'create_companies',
  'edit_companies',
  'delete_companies',
  'verify_companies',
  'suspend_companies',
  'view_jobs',
  'create_jobs',
  'edit_jobs',
  'delete_jobs',
  'approve_jobs',
  'view_applications',
  'edit_applications',
  'delete_applications',
  'bulk_operations',
  'manage_settings',
  'view_logs',
  'export_data',
];

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET') || 'default-secret',
    });
  }

  async validate(payload: any) {
    const user = await this.authService.validateUser(payload.sub);
    if (!user) {
      throw new UnauthorizedException();
    }
    // Attach permissions for admin so AdminPermissionGuard can allow access
    if (user.role === UserRole.ADMIN) {
      (user as any).permissions = ADMIN_PERMISSIONS;
    }
    return user;
  }
}
