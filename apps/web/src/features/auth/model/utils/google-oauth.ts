import { env } from '@/shared/config/env';

export const GOOGLE_OAUTH_NONCE_KEY = 'google_oauth_nonce';
export const GOOGLE_OAUTH_STATE_KEY = 'google_oauth_state';
export const GOOGLE_OAUTH_CODE_VERIFIER_KEY = 'google_oauth_code_verifier';

const toBase64Url = (bytes: Uint8Array) => {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const randomBase64Url = (size: number) => {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
};

const sha256 = async (value: string) => {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return new Uint8Array(hash);
};

export const buildGoogleOauthUrl = async (redirectUri: string) => {
  const nonce = randomBase64Url(32);
  const state = randomBase64Url(32);
  const codeVerifier = randomBase64Url(64);
  const codeChallenge = toBase64Url(await sha256(codeVerifier));

  window.sessionStorage.setItem(GOOGLE_OAUTH_NONCE_KEY, nonce);
  window.sessionStorage.setItem(GOOGLE_OAUTH_STATE_KEY, state);
  window.sessionStorage.setItem(GOOGLE_OAUTH_CODE_VERIFIER_KEY, codeVerifier);

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', env.NEXT_PUBLIC_GOOGLE_OAUTH_CLIENT_ID);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('nonce', nonce);
  url.searchParams.set('state', state);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('prompt', 'select_account');
  return url.toString();
};
