import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

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
      mate: {
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
    if (exception instanceof HttpException) {
      const res = exception.getResponse();
      if (typeof res === 'string') {
        return { error: exception.name, message: res };
      }
      if (typeof res === 'object' && res !== null) {
        const obj = res as any;
        const rawMessage = obj.message || obj.msg || 'Unknown error';
        const details = Array.isArray(rawMessage) ? rawMessage : undefined;
        return {
          error: obj.error || exception.name,
          message: Array.isArray(rawMessage) ? 'Validation failed' : rawMessage,
          details,
        };
      }
    }
    return {
      error: 'INTERNAL_SERVER_ERROR',
      message: (exception as any)?.message || 'Internal server error',
    };
  }
}
