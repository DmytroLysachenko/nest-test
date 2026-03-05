import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client, TokenPayload } from 'google-auth-library';

import type { Env } from '@/config/env';

@Injectable()
export class GoogleOauthService {
  private readonly oauthClient = new OAuth2Client();

  constructor(private readonly config: ConfigService<Env, true>) {}

  async verifyIdToken(idToken: string): Promise<TokenPayload> {
    const audience = this.config.get('GOOGLE_OAUTH_CLIENT_ID', { infer: true });
    if (!audience) {
      throw new InternalServerErrorException('Google OAuth is not configured');
    }

    let ticket;
    try {
      ticket = await this.oauthClient.verifyIdToken({
        idToken,
        audience,
      });
    } catch {
      throw new UnauthorizedException('Invalid Google token');
    }

    const payload = ticket.getPayload();
    if (!payload?.email || payload.email_verified !== true) {
      throw new UnauthorizedException('Google account email is not verified');
    }

    return payload;
  }
}
