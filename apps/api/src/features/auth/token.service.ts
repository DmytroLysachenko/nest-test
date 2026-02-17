import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { passportTable } from '@repo/db';
import { eq } from 'drizzle-orm';
import * as argon2 from 'argon2';

import { Drizzle } from '@/common/decorators';
import { AuthTokensInterface, JwtPayload } from '@/types/interface/jwt';

import { User } from './auth.interface';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    @Drizzle() private readonly db: NodePgDatabase,
  ) {}

  async generateTokens(user: User): Promise<AuthTokensInterface> {
    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get('ACCESS_TOKEN_SECRET'),
        expiresIn: this.config.get('ACCESS_TOKEN_EXPIRATION'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get('REFRESH_TOKEN_SECRET'),
        expiresIn: this.config.get('REFRESH_TOKEN_EXPIRATION'),
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  generateRefreshTime = (day = 3): string => {
    const threeDays = day * 24 * 60 * 60 * 1000;
    const refreshTime = new Date(Date.now() + threeDays);
    return refreshTime.toISOString();
  };

  async createJwtToken(user: User) {
    const { accessToken, refreshToken } = await this.generateTokens(user);
    const sessionRefreshTime = this.generateRefreshTime();
    return {
      accessToken,
      refreshToken,
      sessionRefreshTime,
    };
  }

  async removeToken(id: string) {
    await this.db.delete(passportTable).where(eq(passportTable.userId, id));
  }

  async verifyRefreshToken(refreshToken: string): Promise<JwtPayload> {
    return this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
      secret: this.config.get('REFRESH_TOKEN_SECRET'),
    });
  }

  async hashRefreshToken(refreshToken: string) {
    return argon2.hash(refreshToken);
  }

  async findSessionByRefreshToken(userId: string, refreshToken: string) {
    const sessions = await this.db
      .select({
        id: passportTable.id,
        refreshToken: passportTable.refreshToken,
      })
      .from(passportTable)
      .where(eq(passportTable.userId, userId));

    for (const session of sessions) {
      if (!session.refreshToken) {
        continue;
      }

      // Backward compatibility: accept old plaintext tokens and migrate on rotate.
      if (session.refreshToken === refreshToken) {
        return { id: session.id };
      }

      if (session.refreshToken.startsWith('$argon2')) {
        try {
          if (await argon2.verify(session.refreshToken, refreshToken)) {
            return { id: session.id };
          }
        } catch {
          // Skip malformed hash and continue checking other sessions.
        }
      }
    }

    return null;
  }

  async rotateRefreshToken(sessionId: string, refreshToken: string) {
    const refreshTokenHash = await this.hashRefreshToken(refreshToken);
    await this.db
      .update(passportTable)
      .set({
        refreshToken: refreshTokenHash,
        updatedAt: new Date(),
      })
      .where(eq(passportTable.id, sessionId));
  }
}
