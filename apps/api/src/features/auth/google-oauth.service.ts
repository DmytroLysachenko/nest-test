import { Injectable, InternalServerErrorException, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client, TokenPayload } from 'google-auth-library';

import type { Env } from '@/config/env';

@Injectable()
export class GoogleOauthService {
  private readonly logger = new Logger(GoogleOauthService.name);

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
    } catch (error) {
      const diagnostics = this.extractExchangeDiagnostics(error, {
        redirectUri: params.redirectUri,
        hasCodeVerifier: Boolean(params.codeVerifier),
      });
      this.logger.warn(
        {
          googleOauthStage: 'exchange_authorization_code',
          ...diagnostics,
        },
        'Google authorization code exchange failed',
      );
      throw new UnauthorizedException({
        message: [`google_oauth_exchange_failed:${diagnostics.reasonCode}`],
      });
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

  private extractExchangeDiagnostics(
    error: unknown,
    options: {
      redirectUri?: string;
      hasCodeVerifier: boolean;
    },
  ) {
    const response = this.asRecord((error as { response?: unknown } | null)?.response);
    const responseData = this.asRecord(response?.data);
    const reasonCode =
      (typeof responseData?.error === 'string' && responseData.error.trim()) ||
      (typeof (error as { code?: unknown } | null)?.code === 'string' && (error as { code: string }).code.trim()) ||
      'unknown';
    const statusCode = typeof response?.status === 'number' ? response.status : null;
    const errorDescription =
      typeof responseData?.error_description === 'string' ? responseData.error_description.trim() : null;

    let redirectUriHost: string | null = null;
    if (options.redirectUri) {
      try {
        redirectUriHost = new URL(options.redirectUri).host;
      } catch {
        redirectUriHost = null;
      }
    }

    return {
      reasonCode,
      statusCode,
      redirectUriHost,
      hasCodeVerifier: options.hasCodeVerifier,
      errorDescription,
    };
  }

  private asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return null;
    }
    return value as Record<string, unknown>;
  }
}
