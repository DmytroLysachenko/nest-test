import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';
import { LoggerModule } from '@/common/modules/logger/logger.module';
import { HealthModule } from '@/features/health/health.module';
import { DrizzleModule } from '@/common/modules/drizzle/drizzle.module';
import { validateEnv } from '@/config/env';
import { LoggerMiddleware } from '@/common/middleware';
import { NodeMailerModule } from '@/common/modules/node-mailer/node-mailer.module';
import { GeminiModule } from '@/common/modules/gemini/gemini.module';
import { AuthModule } from '@/features/auth/auth.module';
import { UserModule } from '@/features/user/user.module';
import { ProfileInputsModule } from '@/features/profile-inputs/profile-inputs.module';
import { DocumentsModule } from '@/features/documents/documents.module';
import { CareerProfilesModule } from '@/features/career-profiles/career-profiles.module';
import { JobMatchingModule } from '@/features/job-matching/job-matching.module';
import { JobSourcesModule } from '@/features/job-sources/job-sources.module';
import { JobOffersModule } from '@/features/job-offers/job-offers.module';
import { OnboardingDraftsModule } from '@/features/onboarding-drafts/onboarding-drafts.module';
import { WorkspaceModule } from '@/features/workspace/workspace.module';
import { OpsModule } from '@/features/ops/ops.module';
import { AuthorizationGuard } from '@/common/guards';
import { ApiRequestEventsService } from '@/common/observability/api-request-events.service';
import { ApiWarningEventInterceptor } from '@/common/interceptor/api-warning-event.interceptor';
import { AuthorizationEventsService } from '@/common/authorization/authorization-events.service';
import { AuthorizationService } from '@/common/authorization/authorization.service';

import type { Env } from '@/config/env';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    JwtModule.register({
      global: true,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env, true>) => ({
        throttlers: [
          {
            name: 'api',
            ttl: configService.get('API_THROTTLE_TTL_MS', { infer: true }),
            limit: configService.get('API_THROTTLE_LIMIT', { infer: true }),
          },
          {
            name: 'login',
            ttl: configService.get('AUTH_LOGIN_THROTTLE_TTL_MS', { infer: true }),
            limit: configService.get('AUTH_LOGIN_THROTTLE_LIMIT', { infer: true }),
          },
          {
            name: 'otp',
            ttl: configService.get('AUTH_OTP_THROTTLE_TTL_MS', { infer: true }),
            limit: configService.get('AUTH_OTP_THROTTLE_LIMIT', { infer: true }),
          },
          {
            name: 'register',
            ttl: configService.get('AUTH_REGISTER_THROTTLE_TTL_MS', { infer: true }),
            limit: configService.get('AUTH_REGISTER_THROTTLE_LIMIT', { infer: true }),
          },
          {
            name: 'refresh',
            ttl: configService.get('AUTH_REFRESH_THROTTLE_TTL_MS', { infer: true }),
            limit: configService.get('AUTH_REFRESH_THROTTLE_LIMIT', { infer: true }),
          },
        ],
      }),
    }),
    LoggerModule,
    DrizzleModule,
    HealthModule,
    AuthModule,
    NodeMailerModule,
    GeminiModule,
    UserModule,
    ProfileInputsModule,
    DocumentsModule,
    CareerProfilesModule,
    JobMatchingModule,
    JobSourcesModule,
    JobOffersModule,
    OnboardingDraftsModule,
    WorkspaceModule,
    OpsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: AuthorizationGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    ApiRequestEventsService,
    ApiWarningEventInterceptor,
    AuthorizationEventsService,
    AuthorizationService,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
