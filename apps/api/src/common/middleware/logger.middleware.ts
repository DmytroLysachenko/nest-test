import { randomUUID } from 'crypto';

import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { Logger } from 'nestjs-pino';

const concatStr = (strings: Array<number | string>, divider?: string): string => strings.join(divider ?? ' ');

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(private readonly logger: Logger) {}

  use(req: Request, res: Response, next: NextFunction) {
    const incomingRequestId = req.headers['x-request-id'];
    const requestIdHeader = Array.isArray(incomingRequestId) ? incomingRequestId[0] : incomingRequestId;
    const requestId = requestIdHeader?.trim() || randomUUID();

    req.requestId = requestId;
    req.headers['x-request-id'] = requestId;
    res.setHeader('x-request-id', requestId);

    this.logger.log(concatStr([req.method, req.originalUrl, `[${requestId}]`]), 'Request');
    next();
  }
}
