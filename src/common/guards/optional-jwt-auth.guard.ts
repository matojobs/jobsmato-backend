import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Always return true to allow the request to proceed
    // The JWT strategy will handle the optional authentication
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    // Return the user if authenticated, or null if not
    // This allows the endpoint to work with or without authentication
    return user || null;
  }
}
