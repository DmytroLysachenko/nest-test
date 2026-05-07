import { ExecutionContext, Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

const THROTTLE_BYPASS_PREFIXES = ['/docs'];
const THROTTLE_BYPASS_PATHS = new Set(['/', '/health', '/health/test']);

export const shouldBypassApiThrottle = (path: string | undefined) => {
  if (!path) {
    return false;
  }

  const normalizedPath = path.split('?')[0]?.trim() ?? '';
  if (!normalizedPath) {
    return false;
  }

  if (THROTTLE_BYPASS_PATHS.has(normalizedPath)) {
    return true;
  }

  return THROTTLE_BYPASS_PREFIXES.some(
    (prefix) => normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`),
  );
};

@Injectable()
export class ApiThrottlerGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{ originalUrl?: string; path?: string; url?: string }>();
    if (shouldBypassApiThrottle(request.originalUrl ?? request.path ?? request.url)) {
      return true;
    }

    return await super.canActivate(context);
  }
}
