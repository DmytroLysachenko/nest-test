import { env } from '@/shared/config/env';

import { ApiError } from './api-error';

import type { ApiErrorPayload, ApiSuccess } from '@/shared/types/api';

type RequestInitWithAuth = RequestInit & {
  token?: string | null;
};

const buildHeaders = (init?: RequestInitWithAuth) => {
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');
  if (init?.token) {
    headers.set('Authorization', `Bearer ${init.token}`);
  }
  return headers;
};

export const apiRequest = async <T>(path: string, init?: RequestInitWithAuth): Promise<T> => {
  const response = await fetch(`${env.NEXT_PUBLIC_API_URL}${path}`, {
    ...init,
    headers: buildHeaders(init),
  });

  if (!response.ok) {
    let payload: ApiErrorPayload | undefined;
    try {
      payload = (await response.json()) as ApiErrorPayload;
    } catch {
      payload = undefined;
    }
    throw new ApiError(response.status, payload);
  }

  const payload = (await response.json()) as ApiSuccess<T>;
  return payload.data;
};
