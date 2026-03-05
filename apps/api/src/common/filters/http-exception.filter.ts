import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

import { getErrorCatalogEntry } from '@/common/errors/error-catalog';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const { error, message, details } = this.normalizeError(exception, status);
    const catalog = getErrorCatalogEntry(status);
    const timestamp = new Date().toISOString();

    const requestId =
      request.requestId ||
      request.headers['x-request-id'] ||
      request.headers['x-correlation-id'] ||
      request.id ||
      request.url;

    this.logger.error({
      requestId,
      status,
      method: request.method,
      path: request.url,
      error,
      message,
      details,
    });

    response.status(status).json({
      code: error,
      message,
      requestId,
      timestamp,
      ...(details ? { details } : {}),
      retryable: catalog.retryable,
      category: catalog.category,
      error: {
        code: error,
        message,
        details,
      },
      meta: {
        traceId: requestId,
        timestamp,
      },
    });
  }

  private normalizeError(
    exception: unknown,
    status: number,
  ): {
    error: string;
    message: string;
    details?: string[];
  } {
    const sanitizeMessage = (message: string) => {
      const normalized = message.trim();
      if (
        status === HttpStatus.UNAUTHORIZED ||
        status === HttpStatus.FORBIDDEN ||
        status === HttpStatus.NOT_FOUND ||
        status === HttpStatus.CONFLICT ||
        status === HttpStatus.TOO_MANY_REQUESTS
      ) {
        return getErrorCatalogEntry(status).safeMessage;
      }
      if (status >= 500) {
        return getErrorCatalogEntry(HttpStatus.INTERNAL_SERVER_ERROR).safeMessage;
      }

      // Guard against accidental leakage of SQL/stack internals in 4xx payloads.
      const lower = normalized.toLowerCase();
      if (
        lower.includes('failed query') ||
        lower.includes('syntax error at or near') ||
        lower.includes('sql') ||
        lower.includes('relation "') ||
        lower.includes('stack')
      ) {
        return getErrorCatalogEntry(status).safeMessage ?? 'Request failed.';
      }

      return normalized || getErrorCatalogEntry(status).safeMessage || 'Request failed.';
    };

    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'string') {
        return {
          error: getErrorCatalogEntry(status).code,
          message: sanitizeMessage(res),
        };
      }
      if (typeof res === 'object' && res !== null) {
        const obj = res as any;
        const rawMessage = obj.message || obj.msg || 'Unknown error';
        const details = Array.isArray(rawMessage) ? rawMessage : undefined;
        return {
          error: obj.code || getErrorCatalogEntry(status).code,
          message: Array.isArray(rawMessage)
            ? getErrorCatalogEntry(HttpStatus.BAD_REQUEST).safeMessage
            : sanitizeMessage(String(rawMessage)),
          details,
        };
      }
    }
    return {
      error: getErrorCatalogEntry(HttpStatus.INTERNAL_SERVER_ERROR).code,
      message: getErrorCatalogEntry(HttpStatus.INTERNAL_SERVER_ERROR).safeMessage,
    };
  }
}
