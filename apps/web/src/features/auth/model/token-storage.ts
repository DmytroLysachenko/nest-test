const ACCESS_TOKEN_KEY = 'career_assistant_access_token';
const REFRESH_TOKEN_KEY = 'career_assistant_refresh_token';
const TOKENS_EVENT = 'career_assistant_tokens_updated';

export type StoredTokens = {
  accessToken: string | null;
  refreshToken: string | null;
};

const inBrowser = () => typeof window !== 'undefined';

const emitTokensChanged = () => {
  if (!inBrowser()) {
    return;
  }
  window.dispatchEvent(new Event(TOKENS_EVENT));
};

export const readStoredTokens = (): StoredTokens => {
  if (!inBrowser()) {
    return { accessToken: null, refreshToken: null };
  }

  return {
    accessToken: window.localStorage.getItem(ACCESS_TOKEN_KEY),
    refreshToken: window.localStorage.getItem(REFRESH_TOKEN_KEY),
  };
};

export const writeStoredTokens = (tokens: { accessToken: string; refreshToken: string }) => {
  if (!inBrowser()) {
    return;
  }
  window.localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  emitTokensChanged();
};

export const clearStoredTokens = () => {
  if (!inBrowser()) {
    return;
  }
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  emitTokensChanged();
};

export const onStoredTokensChanged = (handler: () => void) => {
  if (!inBrowser()) {
    return () => undefined;
  }
  window.addEventListener(TOKENS_EVENT, handler);
  return () => window.removeEventListener(TOKENS_EVENT, handler);
};