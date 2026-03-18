import { randomUUID } from 'crypto';

import { BadRequestException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { otpsTable, profilesTable, passportTable, usersTable } from '@repo/db';
import { eq } from 'drizzle-orm';
import { pickBy } from 'lodash';
import { Logger } from 'nestjs-pino';

import { Drizzle } from '@/common/decorators';
import { UserNotFoundException } from '@/common/error';
import { DeviceType } from '@/common/decorators/device.decorator';
import { JwtValidateUser } from '@/types/interface/jwt';
import { AuthorizationService } from '@/common/authorization/authorization.service';

import { hashPassword, validatePassword } from './utils/password';
import { RegisterDto } from './dto/register-dto';
import { OptsService } from './opts.service';
import { ResetPasswordDto } from './dto/rest-password';
import { ChangePasswordDto } from './dto/change-password-dto';
import { User } from './auth.interface';
import { TokenService } from './token.service';
import { GoogleOauthService } from './google-oauth.service';
import { GoogleOauthLoginDto } from './dto/google-oauth-login.dto';

type UserWithProfile = {
  users: typeof usersTable.$inferSelect;
  profiles: typeof profilesTable.$inferSelect | null;
};

@Injectable()
export class AuthService {
  constructor(
    @Drizzle() private readonly db: NodePgDatabase,
    private readonly optsService: OptsService,
    private readonly logger: Logger,
    private readonly tokenService: TokenService,
    private readonly googleOauthService: GoogleOauthService,
    private readonly authorizationService: AuthorizationService,
  ) {}

  async validateUser(email: string, password: string) {
    let user: typeof usersTable.$inferSelect | undefined;
    try {
      user = await this.db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, email))
        .limit(1)
        .then((res) => res[0]);
    } catch (error) {
      this.logger.error({ error }, 'User lookup failed during login');
      throw new InternalServerErrorException('Login service unavailable');
    }

    if (!user) {
      throw new UserNotFoundException('User not found');
    }

    this.assertAccountAvailable(user);

    if (!(await validatePassword(password, user.password))) {
      throw new UnauthorizedException('Incorrect password');
    }

    return user;
  }

  async login(user: User, device: DeviceType) {
    const now = new Date();
    await this.db
      .update(usersTable)
      .set({
        lastLoginAt: now,
        updatedAt: now,
      })
      .where(eq(usersTable.id, user.id));

    const sessionUser: typeof usersTable.$inferSelect = {
      ...user,
      lastLoginAt: now,
      updatedAt: now,
    };

    const { accessToken, refreshToken } = await this.tokenService.createJwtToken(sessionUser);
    const refreshTokenHash = await this.tokenService.hashRefreshToken(refreshToken);
    await this.db.insert(passportTable).values({
      userId: sessionUser.id,
      refreshToken: refreshTokenHash,
      userAgent: device.userAgent,
      createdAt: now,
      updatedAt: now,
      ...pickBy(device),
    });
    return {
      accessToken,
      refreshToken,
      user: await this.toUserResponse(sessionUser),
    };
  }

  async loginWithGoogle(body: GoogleOauthLoginDto, device: DeviceType) {
    const { idToken, code, codeVerifier, redirectUri, nonce } = body;
    let resolvedIdToken = idToken;
    if (!resolvedIdToken && code) {
      resolvedIdToken = await this.googleOauthService.exchangeAuthorizationCodeForIdToken({
        code,
        codeVerifier,
        redirectUri,
      });
    }
    if (!resolvedIdToken) {
      throw new BadRequestException('Either idToken or authorization code is required');
    }

    const payload = await this.googleOauthService.verifyIdToken(resolvedIdToken);
    if (nonce && payload.nonce !== nonce) {
      throw new UnauthorizedException('Invalid Google token nonce');
    }

    return this.loginWithGooglePayload(payload.email as string, device);
  }

  private async loginWithGooglePayload(email: string, device: DeviceType) {
    const now = new Date();
    let user = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1)
      .then((res) => res[0]);

    if (!user) {
      try {
        user = await this.db.transaction(async (trx) => {
          const [created] = await trx
            .insert(usersTable)
            .values({
              email,
              password: await hashPassword(randomUUID()),
              role: 'user',
              isEmailVerified: true,
              updatedAt: now,
              createdAt: now,
            })
            .returning();

          await trx.insert(profilesTable).values({
            userId: created.id,
            displayName: email.split('@')[0],
            updatedAt: now,
            createdAt: now,
          });

          return created;
        });
      } catch (error) {
        this.logger.error({ error }, 'Google OAuth auto-registration failed');
        throw new InternalServerErrorException('Google login unavailable');
      }
    }

    this.assertAccountAvailable(user);

    return this.login(user, device);
  }

  async register(dto: RegisterDto) {
    const { email, password, confirmPassword, code } = dto;
    if (password !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }
    const optRecord = await this.optsService.verifyOtp(email, code, 'EMAIL_REGISTER');

    if (!optRecord) {
      throw new BadRequestException('Verification code error');
    }

    if (optRecord.expiresAt && optRecord.expiresAt < new Date()) {
      throw new BadRequestException('Verification code expired');
    }

    const now = new Date();

    try {
      return await this.db.transaction(async (trx) => {
        const [user] = await trx
          .insert(usersTable)
          .values({
            email,
            password: await hashPassword(password),
            updatedAt: now,
            createdAt: now,
          })
          .returning();

        await trx
          .insert(profilesTable)
          .values({
            userId: user.id,
            displayName: user.email.split('@')[0],
            updatedAt: now,
            createdAt: now,
          })
          .returning();

        await trx.delete(otpsTable).where(eq(otpsTable.receiver, email));

        return user;
      });
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('Register failed');
    }
  }

  async resetPassword(dto: ResetPasswordDto) {
    const { email, code, password, confirmPassword } = dto;

    if (password !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const optRecord = await this.optsService.verifyOtp(email, code, 'PASSWORD_RESET');

    if (!optRecord) {
      throw new BadRequestException('Verification code error');
    }
    if (optRecord.expiresAt && optRecord.expiresAt < new Date()) {
      throw new BadRequestException('Verification code expired');
    }

    try {
      return await this.db.transaction(async (trx) => {
        await trx
          .update(usersTable)
          .set({ password: await hashPassword(password) })
          .where(eq(usersTable.email, email))
          .returning();

        await trx.delete(otpsTable).where(eq(otpsTable.receiver, email));
      });
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('Reset password failed');
    }
  }

  async logout(id: string) {
    await this.tokenService.removeToken(id);
  }

  async refresh(refreshToken: string) {
    let payload: { sub: string; role: string };
    try {
      payload = await this.tokenService.verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const session = await this.tokenService.findSessionByRefreshToken(payload.sub, refreshToken);
    if (!session) {
      throw new UnauthorizedException('Refresh session not found');
    }

    const user = await this.db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, payload.sub))
      .limit(1)
      .then(([result]) => result);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    this.assertAccountAvailable(user);

    const tokens = await this.tokenService.createJwtToken(user);
    await this.tokenService.rotateRefreshToken(session.id, tokens.refreshToken);

    return {
      ...tokens,
      user: await this.toUserResponse(user),
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const { oldPassword, password, confirmPassword } = dto;
    const result = await this.findUserById(userId);
    if (!result?.users) {
      throw new UserNotFoundException('User not found');
    }
    const { users } = result;

    if (password !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    if (!(await validatePassword(oldPassword, users.password))) {
      throw new BadRequestException('Old password error');
    }

    try {
      await this.db
        .update(usersTable)
        .set({ password: await hashPassword(password) })
        .where(eq(usersTable.id, userId));
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('Change password failed');
    }
  }

  async findUserByEmail(email: string): Promise<UserWithProfile | undefined> {
    const result = await this.db
      .select()
      .from(usersTable)
      .leftJoin(profilesTable, eq(usersTable.id, profilesTable.userId))
      .where(eq(usersTable.email, email))
      .limit(1)
      .then((res) => res[0]);
    return result as UserWithProfile | undefined;
  }

  async findUserById(userId: string): Promise<UserWithProfile | undefined> {
    const result = await this.db
      .select()
      .from(usersTable)
      .leftJoin(profilesTable, eq(usersTable.id, profilesTable.userId))
      .where(eq(usersTable.id, userId))
      .limit(1)
      .then((res) => res[0]);
    return result as UserWithProfile | undefined;
  }

  private async toUserResponse(user: User | typeof usersTable.$inferSelect) {
    const permissions = await this.authorizationService.getPermissionsForRole(user.role);
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      permissions,
      lastLoginAt: user.lastLoginAt ?? null,
      isActive: user.isActive,
      deletedAt: user.deletedAt ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private assertAccountAvailable(user: typeof usersTable.$inferSelect) {
    if (!user.isActive || user.deletedAt) {
      throw new UnauthorizedException('Account is inactive');
    }
  }
}
