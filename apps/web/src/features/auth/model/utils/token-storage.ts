export const ACCESS_TOKEN_KEY = 'career_assistant_access_token';
export const REFRESH_TOKEN_KEY = 'career_assistant_refresh_token';
export const SESSION_TOKEN_PLACEHOLDER = '__cookie_session__';

const TOKENS_EVENT = 'career_assistant_tokens_updated';

export type StoredTokens = {
  accessToken: string | null;
  refreshToken: string | null;
};

let storedTokens: StoredTokens = {
  accessToken: null,
  refreshToken: null,
};

const inBrowser = () => typeof window !== 'undefined';

const emitTokensChanged = () => {
  if (!inBrowser()) {
    return;
  }

  window.dispatchEvent(new Event(TOKENS_EVENT));
};

export const readStoredTokens = (): StoredTokens => storedTokens;

export const writeStoredTokens = (tokens: { accessToken: string; refreshToken: string }) => {
  storedTokens = {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
  emitTokensChanged();
};

export const clearStoredTokens = () => {
  storedTokens = {
    accessToken: null,
    refreshToken: null,
  };
  emitTokensChanged();
};

export const onStoredTokensChanged = (handler: () => void) => {
  if (!inBrowser()) {
    return () => undefined;
  }

  window.addEventListener(TOKENS_EVENT, handler);
  return () => window.removeEventListener(TOKENS_EVENT, handler);
};
