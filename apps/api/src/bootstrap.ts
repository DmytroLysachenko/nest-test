import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';
import chalk from 'chalk';
import * as compression from 'compression';
import { json, urlencoded } from 'body-parser';

import { swagger } from '@/config/swagger';
import { Env } from '@/config/env';

import { TransformInterceptor } from './common/interceptor/transform.interceptor';
import { ApiWarningEventInterceptor } from './common/interceptor/api-warning-event.interceptor';

export const bootstrap = async (app: NestExpressApplication) => {
  const configService = app.get(ConfigService<Env>);
  const logger = app.get(Logger);

  app.set('query parser', 'extended');
  app.use(json({ limit: configService.get('API_BODY_LIMIT') }));
  app.use(urlencoded({ extended: true, limit: configService.get('API_BODY_LIMIT') }));

  // =========================================================
  // configure swagger
  // =========================================================
  if (configService.get('NODE_ENV') !== 'production') {
    swagger(app);
  }

  // ======================================================
  // security and middlewares
  // ======================================================
  app.enable('trust proxy');
  app.set('etag', 'strong');

  app.use(compression());
  app.use(helmet());
  const allowedOrigins = configService.get('ALLOWED_ORIGINS') ?? '*';
  const isProduction = configService.get('NODE_ENV') === 'production';
  if (isProduction && allowedOrigins.trim() === '*') {
    throw new Error('ALLOWED_ORIGINS cannot be "*" in production');
  }

  const normalizeOrigin = (value: string) => {
    const trimmed = value.trim().replace(/^['"]|['"]$/g, '');
    if (!trimmed) {
      return null;
    }

    try {
      return new URL(trimmed).origin.toLowerCase();
    } catch {
      return trimmed.replace(/\/+$/, '').toLowerCase();
    }
  };

  const originList = (() => {
    if (allowedOrigins === '*') {
      return null;
    }

    const parsed = allowedOrigins
      .split(',')
      .map(normalizeOrigin)
      .filter((value): value is string => Boolean(value));

    return Array.from(new Set(parsed));
  })();

  const isOriginAllowed = (origin: string | undefined) => {
    if (!originList) {
      return true;
    }
    if (!origin) {
      return true;
    }
    const normalizedOrigin = normalizeOrigin(origin);
    if (!normalizedOrigin) {
      return false;
    }
    return originList.includes(normalizedOrigin);
  };

  app.enableCors({
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    maxAge: 3600,
    origin: (origin, callback) => {
      const isAllowed = isOriginAllowed(origin);
      if (!isAllowed) {
        logger.warn(`Rejected CORS origin: ${origin ?? 'unknown'}`);
      }
      callback(null, isAllowed);
    },
  });

  // =====================================================
  // configure global pipes, filters, interceptors
  // =====================================================

  app.setGlobalPrefix(configService.get('API_PREFIX'), {
    exclude: [
      {
        path: '/',
        method: RequestMethod.GET,
      },
      {
        path: '/docs',
        method: RequestMethod.GET,
      },
      {
        path: '/health',
        method: RequestMethod.GET,
      },
      {
        path: '/health/test',
        method: RequestMethod.GET,
      },
    ],
  });

  app.useStaticAssets('./uploads', {
    prefix: '/assets',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Allow only DTO properties and strip unknown fields.
      forbidNonWhitelisted: true, // Reject requests with unknown properties.
      transform: true, // Transform payloads to DTO types.
      transformOptions: {
        enableImplicitConversion: true, // Enable implicit type conversion.
      },
      disableErrorMessages: configService.get('NODE_ENV') === 'production',
    }),
  );

  app.useGlobalInterceptors(new LoggerErrorInterceptor());
  app.useGlobalInterceptors(app.get(ApiWarningEventInterceptor));
  app.useGlobalInterceptors(new TransformInterceptor());
  await app.listen(configService.get('PORT'), () => {
    logger.log(
      [
        '',
        chalk.magentaBright('===================================================='),
        chalk.green.bold('  Service Started!'),
        chalk.cyanBright('  --------------------------------------------------'),
        chalk.blueBright('  URL: ') +
          chalk.whiteBright.underline(`http://${configService.get('HOST')}:${configService.get('PORT')}`),
        chalk.yellowBright('  Docs: ') +
          chalk.whiteBright.underline(`http://${configService.get('HOST')}:${configService.get('PORT')}/docs`),
        chalk.cyanBright('  Env: ') + chalk.whiteBright(`${configService.get('NODE_ENV')}`),
        chalk.magentaBright('===================================================='),
        '',
      ].join('\n'),
    );
  });
};
