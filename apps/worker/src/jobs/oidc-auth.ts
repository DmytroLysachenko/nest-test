import { GoogleAuth } from 'google-auth-library';

const auth = new GoogleAuth();
const TOKEN_CACHE_TTL_MS = 5 * 60 * 1000;
const tokenCache = new Map<string, { value: string; expiresAt: number }>();

export const resolveOutboundAuthorizationHeader = async (
  staticToken?: string,
  oidcAudience?: string,
): Promise<string | undefined> => {
  if (staticToken?.trim()) {
    return `Bearer ${staticToken.trim()}`;
  }
  if (!oidcAudience) {
    return undefined;
  }

  const now = Date.now();
  const cached = tokenCache.get(oidcAudience);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const client = await auth.getIdTokenClient(oidcAudience);
  const headers = await client.getRequestHeaders();
  const authorization = headers.Authorization ?? headers.authorization;
  if (!authorization || typeof authorization !== 'string') {
    throw new Error('Failed to mint OIDC authorization header');
  }

  tokenCache.set(oidcAudience, {
    value: authorization,
    expiresAt: now + TOKEN_CACHE_TTL_MS,
  });
  return authorization;
};
