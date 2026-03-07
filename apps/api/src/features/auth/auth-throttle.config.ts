const parseIntOr = (value: string | undefined, fallback: number) => {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const AUTH_LOGIN_THROTTLE = {
  ttl: parseIntOr(process.env.AUTH_LOGIN_THROTTLE_TTL_MS, 60_000),
  limit: parseIntOr(process.env.AUTH_LOGIN_THROTTLE_LIMIT, 5),
} as const;

export const AUTH_REFRESH_THROTTLE = {
  ttl: parseIntOr(process.env.AUTH_REFRESH_THROTTLE_TTL_MS, 60_000),
  limit: parseIntOr(process.env.AUTH_REFRESH_THROTTLE_LIMIT, 10),
} as const;

export const AUTH_REGISTER_THROTTLE = {
  ttl: parseIntOr(process.env.AUTH_REGISTER_THROTTLE_TTL_MS, 60_000),
  limit: parseIntOr(process.env.AUTH_REGISTER_THROTTLE_LIMIT, 3),
} as const;

export const AUTH_OTP_THROTTLE = {
  ttl: parseIntOr(process.env.AUTH_OTP_THROTTLE_TTL_MS, 60_000),
  limit: parseIntOr(process.env.AUTH_OTP_THROTTLE_LIMIT, 3),
} as const;
