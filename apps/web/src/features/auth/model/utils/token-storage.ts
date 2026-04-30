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

const readTokensFromLocalStorage = (): StoredTokens => {
  if (!inBrowser()) {
    return {
      accessToken: null,
      refreshToken: null,
    };
  }

  return {
    accessToken: window.localStorage.getItem(ACCESS_TOKEN_KEY),
    refreshToken: window.localStorage.getItem(REFRESH_TOKEN_KEY),
  };
};

const writeTokensToLocalStorage = ({ accessToken, refreshToken }: StoredTokens) => {
  if (!inBrowser()) {
    return;
  }

  if (accessToken) {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  } else {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  }

  if (refreshToken) {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } else {
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
};

const emitTokensChanged = () => {
  if (!inBrowser()) {
    return;
  }

  window.dispatchEvent(new Event(TOKENS_EVENT));
};

export const readStoredTokens = (): StoredTokens => {
  if (storedTokens.accessToken || storedTokens.refreshToken) {
    return storedTokens;
  }

  const localStorageTokens = readTokensFromLocalStorage();
  if (localStorageTokens.accessToken || localStorageTokens.refreshToken) {
    storedTokens = localStorageTokens;
  }

  return storedTokens;
};

export const writeStoredTokens = (tokens: { accessToken: string; refreshToken: string }) => {
  storedTokens = {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
  writeTokensToLocalStorage(storedTokens);
  emitTokensChanged();
};

export const clearStoredTokens = () => {
  storedTokens = {
    accessToken: null,
    refreshToken: null,
  };
  writeTokensToLocalStorage(storedTokens);
  emitTokensChanged();
};

export const onStoredTokensChanged = (handler: () => void) => {
  if (!inBrowser()) {
    return () => undefined;
  }

  window.addEventListener(TOKENS_EVENT, handler);
  return () => window.removeEventListener(TOKENS_EVENT, handler);
};
