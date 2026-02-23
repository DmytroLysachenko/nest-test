import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';
import chalk from 'chalk';
import * as compression from 'compression';
import * as bodyParser from 'body-parser';

import { swagger } from '@/config/swagger';
import { Env } from '@/config/env';

import { TransformInterceptor } from './common/interceptor/transform.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

export const bootstrap = async (app: NestExpressApplication) => {
  const configService = app.get(ConfigService<Env>);
  const logger = app.get(Logger);

  app.set('query parser', 'extended');
  app.use(bodyParser.json({ limit: configService.get('API_BODY_LIMIT') }));
  app.use(bodyParser.urlencoded({ extended: true, limit: configService.get('API_BODY_LIMIT') }));

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
  const origin =
    allowedOrigins === '*'
      ? true
      : allowedOrigins
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean);

  app.enableCors({
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    maxAge: 3600,
    origin,
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
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new HttpExceptionFilter());
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
