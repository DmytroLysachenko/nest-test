import { env } from '@/shared/config/env';
import { clearStoredTokens, readStoredTokens, writeStoredTokens } from '@/features/auth/model/utils/token-storage';

import { ApiError } from './api-error';

import type { ApiErrorPayload, ApiSuccess, AuthLoginResponse } from '@/shared/types/api';

type RequestInitWithAuth = RequestInit & {
  token?: string | null;
  disableAutoRefresh?: boolean;
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
  const request = async (tokenOverride?: string | null) =>
    fetch(`${env.NEXT_PUBLIC_API_URL}${path}`, {
      ...init,
      headers: buildHeaders({
        ...init,
        token: tokenOverride ?? init?.token ?? null,
      }),
    });

  let response = await request(init?.token ?? null);

  if (response.status === 401 && !init?.disableAutoRefresh && Boolean(init?.token)) {
    const refreshed = await refreshAccessToken();
    if (refreshed?.accessToken) {
      response = await request(refreshed.accessToken);
    }
  }

  if (!response.ok) {
    throw await toApiError(response);
  }

  const payload = (await response.json()) as ApiSuccess<T>;
  return payload.data;
};

let refreshPromise: Promise<{ accessToken: string; refreshToken: string } | null> | null = null;

const toApiError = async (response: Response) => {
  let payload: ApiErrorPayload | undefined;
  try {
    payload = (await response.json()) as ApiErrorPayload;
  } catch {
    payload = undefined;
  }
  return new ApiError(response.status, payload);
};

const refreshAccessToken = async (): Promise<{ accessToken: string; refreshToken: string } | null> => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const { refreshToken } = readStoredTokens();
    if (!refreshToken) {
      return null;
    }

    const refreshPath = '/auth/refresh';
    const response = await fetch(`${env.NEXT_PUBLIC_API_URL}${refreshPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      clearStoredTokens();
      return null;
    }

    const payload = (await response.json()) as ApiSuccess<AuthLoginResponse>;
    if (!payload?.data?.accessToken || !payload?.data?.refreshToken) {
      clearStoredTokens();
      return null;
    }

    writeStoredTokens({
      accessToken: payload.data.accessToken,
      refreshToken: payload.data.refreshToken,
    });

    return {
      accessToken: payload.data.accessToken,
      refreshToken: payload.data.refreshToken,
    };
  })()
    .catch(() => {
      clearStoredTokens();
      return null;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
};
