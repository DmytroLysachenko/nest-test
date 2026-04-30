import { CookieOptions, Request, Response } from 'express';

export const ACCESS_TOKEN_COOKIE = 'career_assistant_access_token';
export const REFRESH_TOKEN_COOKIE = 'career_assistant_refresh_token';

type AuthCookieConfig = {
  accessTokenExpiration: string;
  refreshTokenExpiration: string;
  isProduction: boolean;
};

const parseCookieHeader = (cookieHeader: string | undefined) => {
  if (!cookieHeader) {
    return new Map<string, string>();
  }

  return new Map(
    cookieHeader
      .split(';')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const separatorIndex = entry.indexOf('=');
        if (separatorIndex === -1) {
          return [entry, ''] as const;
        }

        return [entry.slice(0, separatorIndex), decodeURIComponent(entry.slice(separatorIndex + 1))] as const;
      }),
  );
};

const durationUnits = new Map<string, number>([
  ['ms', 1],
  ['s', 1000],
  ['m', 60_000],
  ['h', 3_600_000],
  ['d', 86_400_000],
]);

const toCookieMaxAge = (rawValue: string) => {
  const normalized = rawValue.trim().toLowerCase();
  const directNumber = Number(normalized);
  if (Number.isFinite(directNumber) && directNumber > 0) {
    return directNumber * 1000;
  }

  const match = normalized.match(/^(\d+)(ms|s|m|h|d)$/);
  if (!match) {
    return undefined;
  }

  const [, amount, unit] = match;
  return Number(amount) * (durationUnits.get(unit) ?? 0);
};

const buildCookieOptions = (maxAge: number | undefined, isProduction: boolean): CookieOptions => {
  const sameSite: CookieOptions['sameSite'] = isProduction ? 'none' : 'lax';

  return {
    httpOnly: true,
    path: '/',
    sameSite,
    secure: isProduction,
    ...(maxAge ? { maxAge } : {}),
  };
};

export const readAccessTokenCookie = (request: Request) =>
  parseCookieHeader(request.headers.cookie).get(ACCESS_TOKEN_COOKIE) ?? null;

export const readRefreshTokenCookie = (request: Request) =>
  parseCookieHeader(request.headers.cookie).get(REFRESH_TOKEN_COOKIE) ?? null;

export const setAuthCookies = (
  response: Response,
  tokens: { accessToken: string; refreshToken: string },
  config: AuthCookieConfig,
) => {
  response.cookie(
    ACCESS_TOKEN_COOKIE,
    tokens.accessToken,
    buildCookieOptions(toCookieMaxAge(config.accessTokenExpiration), config.isProduction),
  );
  response.cookie(
    REFRESH_TOKEN_COOKIE,
    tokens.refreshToken,
    buildCookieOptions(toCookieMaxAge(config.refreshTokenExpiration), config.isProduction),
  );
};

export const clearAuthCookies = (response: Response, isProduction: boolean) => {
  response.clearCookie(ACCESS_TOKEN_COOKIE, buildCookieOptions(undefined, isProduction));
  response.clearCookie(REFRESH_TOKEN_COOKIE, buildCookieOptions(undefined, isProduction));
};
