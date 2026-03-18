import { ExtractJwt, Strategy, VerifiedCallback } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { usersTable } from '@repo/db';

import { Drizzle } from '@/common/decorators';
import { JwtPayload, JwtValidateUser } from '@/types/interface/jwt';
import { AuthorizationService } from '@/common/authorization/authorization.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly config: ConfigService,
    @Drizzle() private readonly db: NodePgDatabase,
    private readonly authorizationService: AuthorizationService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('ACCESS_TOKEN_SECRET'),
    });
  }

  async validate(payload: JwtPayload, done: VerifiedCallback) {
    const user = await this.db
      .select({
        id: usersTable.id,
        role: usersTable.role,
        isActive: usersTable.isActive,
        deletedAt: usersTable.deletedAt,
      })
      .from(usersTable)
      .where(eq(usersTable.id, payload.sub))
      .limit(1)
      .then(([result]) => result ?? null);

    if (!user || !user.isActive || user.deletedAt) {
      return done(new UnauthorizedException('Account is inactive'), false);
    }

    const permissions = await this.authorizationService.getPermissionsForRole(user.role);

    return done(null, {
      userId: user.id,
      role: user.role,
      permissions,
    } as JwtValidateUser);
  }
}
