import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

const FRIENDLY_MESSAGES: Partial<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: 'Request validation failed.',
  [HttpStatus.UNAUTHORIZED]: 'Invalid credentials or unauthorized request.',
  [HttpStatus.FORBIDDEN]: 'You do not have permission to perform this action.',
  [HttpStatus.NOT_FOUND]: 'Requested resource was not found.',
  [HttpStatus.CONFLICT]: 'Request conflicts with current state.',
  [HttpStatus.TOO_MANY_REQUESTS]: 'Too many requests. Please try again later.',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'Something went wrong. Please try again.',
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const { error, message, details } = this.normalizeError(exception);

    const traceId =
      request.requestId ||
      request.headers['x-request-id'] ||
      request.headers['x-correlation-id'] ||
      request.id ||
      request.url;

    this.logger.error({
      traceId,
      status,
      method: request.method,
      path: request.url,
      error,
      message,
      details,
    });

    response.status(status).json({
      error: {
        code: error,
        message,
        details,
      },
      meta: {
        traceId,
        timestamp: new Date().toISOString(),
      },
    });
  }

  private normalizeError(exception: unknown): {
    error: string;
    message: string;
    details?: string[];
  } {
    const sanitizeMessage = (status: number, message: string) => {
      const normalized = message.trim();
      if (
        status === HttpStatus.UNAUTHORIZED ||
        status === HttpStatus.FORBIDDEN ||
        status === HttpStatus.NOT_FOUND ||
        status === HttpStatus.CONFLICT ||
        status === HttpStatus.TOO_MANY_REQUESTS
      ) {
        return FRIENDLY_MESSAGES[status]!;
      }
      if (status >= 500) {
        return FRIENDLY_MESSAGES[HttpStatus.INTERNAL_SERVER_ERROR]!;
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
        return FRIENDLY_MESSAGES[status] ?? 'Request failed.';
      }

      return normalized || FRIENDLY_MESSAGES[status] || 'Request failed.';
    };

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        return {
          error: exception.name,
          message: sanitizeMessage(status, res),
        };
      }
      if (typeof res === 'object' && res !== null) {
        const obj = res as any;
        const rawMessage = obj.message || obj.msg || 'Unknown error';
        const details = Array.isArray(rawMessage) ? rawMessage : undefined;
        return {
          error: obj.error || exception.name,
          message: Array.isArray(rawMessage)
            ? FRIENDLY_MESSAGES[HttpStatus.BAD_REQUEST]!
            : sanitizeMessage(status, String(rawMessage)),
          details,
        };
      }
    }
    return {
      error: 'INTERNAL_SERVER_ERROR',
      message: FRIENDLY_MESSAGES[HttpStatus.INTERNAL_SERVER_ERROR]!,
    };
  }
}
