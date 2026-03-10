import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { ApiRequestEventsService } from '@/common/observability/api-request-events.service';

@Injectable()
export class ApiWarningEventInterceptor implements NestInterceptor {
  constructor(private readonly apiRequestEventsService: ApiRequestEventsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    return next.handle().pipe(
      tap((data) => {
        const warnings = this.extractWarnings(data);
        if (!warnings.length) {
          return;
        }

        void this.apiRequestEventsService.create({
          userId: request.user?.userId ?? null,
          requestId:
            typeof request.requestId === 'string' ? request.requestId : request.id != null ? String(request.id) : null,
          level: 'warning',
          method: request.method,
          path: request.originalUrl || request.url,
          statusCode: response.statusCode || 200,
          message: warnings.join(' | '),
          errorCode: 'API_WARNING',
          details: warnings,
          meta: {
            params: request.params,
            query: request.query,
          },
        });
      }),
    );
  }

  private extractWarnings(data: unknown): string[] {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return [];
    }

    const candidate = data as Record<string, unknown>;
    const warnings = Array.isArray(candidate.warnings)
      ? candidate.warnings.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : [];

    if (typeof candidate.warning === 'string' && candidate.warning.trim().length > 0) {
      warnings.unshift(candidate.warning.trim());
    }

    return Array.from(new Set(warnings));
  }
}
