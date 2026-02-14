import { ApiError } from '@/shared/lib/http/api-error';

import { type TesterService } from '../model/endpoint-presets';

type TesterRequestInput = {
  service: TesterService;
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  token?: string | null;
  workerToken?: string | null;
  extraHeadersText?: string;
  bodyText?: string;
  apiBaseUrl: string;
  workerBaseUrl: string;
};

export type TesterRequestResult = {
  request: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body: unknown;
  };
  response: {
    status: number;
    ok: boolean;
    headers: Record<string, string>;
    body: unknown;
  };
};

const parseJsonObject = (value: string, fieldName: string): Record<string, string> => {
  if (!value.trim()) {
    return {};
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new ApiError(400, {
      error: {
        code: 'INVALID_JSON',
        message: `${fieldName} is not valid JSON.`,
      },
    });
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new ApiError(400, {
      error: {
        code: 'INVALID_JSON',
        message: `${fieldName} must be a JSON object.`,
      },
    });
  }

  const normalized = Object.entries(parsed).reduce<Record<string, string>>((acc, [key, raw]) => {
    acc[key] = typeof raw === 'string' ? raw : JSON.stringify(raw);
    return acc;
  }, {});

  return normalized;
};

const parseBody = (value?: string): unknown => {
  if (!value?.trim()) {
    return undefined;
  }

  try {
    return JSON.parse(value);
  } catch {
    throw new ApiError(400, {
      error: {
        code: 'INVALID_JSON',
        message: 'Request body is not valid JSON.',
      },
    });
  }
};

const normalizeBaseUrl = (baseUrl: string) => baseUrl.trim().replace(/\/+$/, '');

const buildUrl = (baseUrl: string, path: string) => {
  const normalizedBase = normalizeBaseUrl(baseUrl);
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
};

const responseToBody = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const responseHeaders = (response: Response) => {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });
  return headers;
};

export const runTesterRequest = async (input: TesterRequestInput): Promise<TesterRequestResult> => {
  const url = buildUrl(input.service === 'api' ? input.apiBaseUrl : input.workerBaseUrl, input.path);

  const parsedBody = parseBody(input.bodyText);
  const extraHeaders = parseJsonObject(input.extraHeadersText ?? '', 'Extra headers');

  const headers: Record<string, string> = {
    ...extraHeaders,
  };

  if (parsedBody !== undefined) {
    headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
  }

  if (input.service === 'api' && input.token) {
    headers.Authorization = `Bearer ${input.token}`;
  }

  if (input.service === 'worker' && input.workerToken) {
    headers.Authorization = `Bearer ${input.workerToken}`;
  }

  const response = await fetch(url, {
    method: input.method,
    headers,
    ...(parsedBody !== undefined ? { body: JSON.stringify(parsedBody) } : {}),
  });

  const responseBody = await responseToBody(response);

  return {
    request: {
      url,
      method: input.method,
      headers,
      body: parsedBody ?? null,
    },
    response: {
      status: response.status,
      ok: response.ok,
      headers: responseHeaders(response),
      body: responseBody,
    },
  };
};