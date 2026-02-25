import { ApiError } from '@/shared/lib/http/api-error';

type ErrorMessageOverrides = {
  byCode?: Record<string, string>;
  byStatus?: Partial<Record<number, string>>;
};

export const toUserErrorMessage = (
  error: unknown,
  fallbackMessage: string,
  overrides?: ErrorMessageOverrides,
): string => {
  if (error instanceof ApiError) {
    const codeOverride = overrides?.byCode?.[error.code];
    if (codeOverride) {
      return codeOverride;
    }

    const statusOverride = overrides?.byStatus?.[error.status];
    if (statusOverride) {
      return statusOverride;
    }

    return error.message || fallbackMessage;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallbackMessage;
};
