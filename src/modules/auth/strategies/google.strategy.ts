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

    if (!clientID || !clientSecret) {
      throw new Error(
        'Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET. ' +
          'Get them from Google Cloud Console > APIs & Services > Credentials.',
      );
    }
    if (!resolvedCallback) {
      throw new Error(
        'GOOGLE_CALLBACK_URL must be the full API URL, e.g. ' +
          'https://api.jobsmato.com/api/auth/google/callback or http://localhost:5000/api/auth/google/callback',
      );
    }

    super({
      clientID,
      clientSecret,
      callbackURL: resolvedCallback,
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

