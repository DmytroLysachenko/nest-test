import { env } from '@/shared/config/env';

export const GOOGLE_OAUTH_NONCE_KEY = 'google_oauth_nonce';

export const buildGoogleOauthUrl = (nonce: string, redirectUri: string) => {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'id_token');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('nonce', nonce);
  url.searchParams.set('prompt', 'select_account');
  return url.toString();
};
