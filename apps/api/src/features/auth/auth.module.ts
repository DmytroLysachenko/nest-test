import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';

import { NodeMailerModule } from '@/common/modules/node-mailer/node-mailer.module';
import { LocalStrategy } from '@/features/auth/strategies/local.strategy';
import { JwtStrategy } from '@/features/auth/strategies/jwt.strategy';
import { AuthorizationService } from '@/common/authorization/authorization.service';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { OptsService } from './opts.service';
import { MailService } from './mail.service';
import { TokenService } from './token.service';
import { GoogleOauthService } from './google-oauth.service';

@Module({
  imports: [NodeMailerModule, ConfigModule, PassportModule],
  providers: [
    AuthService,
    OptsService,
    MailService,
    LocalStrategy,
    JwtStrategy,
    TokenService,
    GoogleOauthService,
    AuthorizationService,
  ],
  controllers: [AuthController],
  exports: [TokenService],
})
export class AuthModule {}
