import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

import { getErrorCatalogEntry } from '@/common/errors/error-catalog';
import { ApiRequestEventsService } from '@/common/observability/api-request-events.service';

type NormalizedError = {
  error: string;
  message: string;
  details?: string[];
  retryable?: boolean;
  category?: 'validation' | 'auth' | 'permissions' | 'rate_limit' | 'not_found' | 'conflict' | 'internal';
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  constructor(private readonly apiRequestEventsService: ApiRequestEventsService) {}

  async catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const normalized = this.normalizeError(exception, status);
    const catalog = getErrorCatalogEntry(status);
    const error = normalized.error;
    const message = normalized.message;
    const details = normalized.details;
    const retryable = normalized.retryable ?? catalog.retryable;
    const category = normalized.category ?? catalog.category;
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

    await this.apiRequestEventsService.create({
      userId: request.user?.userId ?? null,
      requestId: String(requestId),
      level: 'error',
      method: request.method,
      path: request.originalUrl || request.url,
      statusCode: status,
      message,
      errorCode: error,
      details,
      meta: {
        category,
        retryable,
        query: request.query,
        params: request.params,
        exceptionName: exception instanceof Error ? exception.name : 'UnknownException',
        rawMessage: this.extractRawMessage(exception),
      },
    });

    response.status(status).json({
      code: error,
      message,
      requestId,
      timestamp,
      ...(details ? { details } : {}),
      retryable,
      category,
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

  private normalizeError(exception: unknown, status: number): NormalizedError {
    const sanitizeMessage = (message: string, safe?: boolean) => {
      const normalized = message.trim();
      if (safe) {
        return normalized || getErrorCatalogEntry(status).safeMessage || 'Request failed.';
      }
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
        const safe = obj.safe === true;
        const rawMessage = obj.message || obj.msg || 'Unknown error';
        const details = Array.isArray(rawMessage) ? rawMessage : undefined;
        return {
          error: obj.code || getErrorCatalogEntry(status).code,
          message: Array.isArray(rawMessage)
            ? getErrorCatalogEntry(HttpStatus.BAD_REQUEST).safeMessage
            : sanitizeMessage(String(rawMessage), safe),
          details,
          retryable: typeof obj.retryable === 'boolean' ? obj.retryable : undefined,
          category: obj.category,
        };
      }
    }
    return {
      error: getErrorCatalogEntry(HttpStatus.INTERNAL_SERVER_ERROR).code,
      message: getErrorCatalogEntry(HttpStatus.INTERNAL_SERVER_ERROR).safeMessage,
    };
  }

  private extractRawMessage(exception: unknown) {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      if (typeof response === 'string') {
        return response;
      }
      if (typeof response === 'object' && response !== null) {
        const candidate = response as Record<string, unknown>;
        return candidate.message ?? candidate.error ?? null;
      }
      return exception.message;
    }

    if (exception instanceof Error) {
      return exception.message;
    }

    return null;
  }
}
