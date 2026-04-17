import { Throttle } from '@nestjs/throttler';

export const RATE_LIMIT_GROUPS = {
  default: 'default',
  write: 'write',
  auth: 'auth',
  sensitive: 'sensitive',
} as const;

export const AuthRateLimit = () => Throttle({ [RATE_LIMIT_GROUPS.auth]: {} });
export const WriteRateLimit = () => Throttle({ [RATE_LIMIT_GROUPS.write]: {} });
export const SensitiveRateLimit = () => Throttle({ [RATE_LIMIT_GROUPS.sensitive]: {} });
