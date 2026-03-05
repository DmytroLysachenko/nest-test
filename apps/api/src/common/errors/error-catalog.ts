import { HttpStatus } from '@nestjs/common';

export type ErrorCatalogEntry = {
  code: string;
  safeMessage: string;
  retryable: boolean;
  category: 'validation' | 'auth' | 'permissions' | 'rate_limit' | 'not_found' | 'conflict' | 'internal';
};

const DEFAULT_ENTRY: ErrorCatalogEntry = {
  code: 'INTERNAL_ERROR',
  safeMessage: 'Something went wrong. Please try again.',
  retryable: true,
  category: 'internal',
};

const CATALOG_BY_STATUS: Record<number, ErrorCatalogEntry> = {
  [HttpStatus.BAD_REQUEST]: {
    code: 'VALIDATION_ERROR',
    safeMessage: 'Request validation failed.',
    retryable: false,
    category: 'validation',
  },
  [HttpStatus.UNAUTHORIZED]: {
    code: 'UNAUTHORIZED',
    safeMessage: 'Invalid credentials or unauthorized request.',
    retryable: false,
    category: 'auth',
  },
  [HttpStatus.FORBIDDEN]: {
    code: 'FORBIDDEN',
    safeMessage: 'You do not have permission to perform this action.',
    retryable: false,
    category: 'permissions',
  },
  [HttpStatus.NOT_FOUND]: {
    code: 'NOT_FOUND',
    safeMessage: 'Requested resource was not found.',
    retryable: false,
    category: 'not_found',
  },
  [HttpStatus.CONFLICT]: {
    code: 'CONFLICT',
    safeMessage: 'Request conflicts with current state.',
    retryable: false,
    category: 'conflict',
  },
  [HttpStatus.TOO_MANY_REQUESTS]: {
    code: 'RATE_LIMITED',
    safeMessage: 'Too many requests. Please try again later.',
    retryable: true,
    category: 'rate_limit',
  },
  [HttpStatus.INTERNAL_SERVER_ERROR]: DEFAULT_ENTRY,
};

export const getErrorCatalogEntry = (status: number): ErrorCatalogEntry =>
  CATALOG_BY_STATUS[status] ?? DEFAULT_ENTRY;
