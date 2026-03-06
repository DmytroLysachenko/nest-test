import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client, TokenPayload } from 'google-auth-library';

import type { Env } from '@/config/env';

@Injectable()
export class GoogleOauthService {
  constructor(private readonly config: ConfigService<Env, true>) {}

  private getOAuthConfig() {
    const clientId = this.config.get('GOOGLE_OAUTH_CLIENT_ID', { infer: true });
    const clientSecret = this.config.get('GOOGLE_OAUTH_CLIENT_SECRET', { infer: true });
    if (!clientId || !clientSecret) {
      throw new InternalServerErrorException('Google OAuth is not configured');
    }
    return { clientId, clientSecret };
  }

  private createOAuthClient() {
    const { clientId, clientSecret } = this.getOAuthConfig();
    return new OAuth2Client({
      clientId,
      clientSecret,
    });
  }

  async exchangeAuthorizationCodeForIdToken(params: {
    code: string;
    redirectUri?: string;
    codeVerifier?: string;
  }): Promise<string> {
    const oauthClient = this.createOAuthClient();
    try {
      const { tokens } = await oauthClient.getToken({
        code: params.code,
        redirect_uri: params.redirectUri,
        codeVerifier: params.codeVerifier,
      });
      if (!tokens.id_token) {
        throw new UnauthorizedException('Google token exchange did not return id_token');
      }
      return tokens.id_token;
    } catch {
      throw new UnauthorizedException('Google authorization code exchange failed');
    }
  }

  async verifyIdToken(idToken: string): Promise<TokenPayload> {
    const { clientId } = this.getOAuthConfig();
    const oauthClient = this.createOAuthClient();

    let ticket;
    try {
      ticket = await oauthClient.verifyIdToken({
        idToken,
        audience: clientId,
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
