import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    const clientID = configService.get<string>('GOOGLE_CLIENT_ID');
    const clientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');
    const callbackURL = configService.get<string>('GOOGLE_CALLBACK_URL');

    // Google requires an absolute callback URL (relative paths cause redirect_uri_mismatch)
    const resolvedCallback =
      callbackURL && callbackURL.startsWith('http') ? callbackURL : undefined;

    // If Google OAuth is not configured, register with placeholder values so the
    // app still starts. The /auth/google routes simply won't work, which is fine
    // for deployments that don't use Google login.
    super({
      clientID: clientID || 'google-oauth-not-configured',
      clientSecret: clientSecret || 'google-oauth-not-configured',
      callbackURL: resolvedCallback || 'https://api.jobsmato.com/api/auth/google/callback',
      scope: ['email', 'profile'],
    } as any);
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<void> {
    try {
      const id = profile?.id;
      const name = profile?.name || {};
      const emails = profile?.emails || [];
      const photos = profile?.photos || [];
      const email = emails[0]?.value;

      if (!id || !email) {
        return done(
          new Error('Google did not provide required profile data (id or email). Ensure scope includes email and profile.'),
          undefined,
        );
      }

      const user = {
        googleId: id,
        email,
        firstName: name.givenName || name.displayName || 'User',
        lastName: name.familyName ?? '',
        avatar: photos[0]?.value,
        accessToken,
        refreshToken,
      };

      const validatedUser = await this.authService.validateGoogleUser(user);
      done(null, validatedUser);
    } catch (err) {
      done(err as Error, undefined);
    }
  }
}

