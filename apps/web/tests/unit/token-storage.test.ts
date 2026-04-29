import { clearStoredTokens, readStoredTokens, writeStoredTokens } from '@/features/auth/model/utils/token-storage';

describe('token storage', () => {
  beforeEach(() => {
    clearStoredTokens();
    window.localStorage.clear();
    document.cookie = 'career_assistant_access_token=legacy; Max-Age=0; Path=/';
    document.cookie = 'career_assistant_refresh_token=legacy; Max-Age=0; Path=/';
  });

  it('keeps tokens in memory only', () => {
    writeStoredTokens({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    expect(readStoredTokens()).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    expect(window.localStorage.length).toBe(0);
    expect(document.cookie).not.toContain('career_assistant_access_token');
    expect(document.cookie).not.toContain('career_assistant_refresh_token');
  });

  it('clears in-memory tokens without touching browser storage', () => {
    writeStoredTokens({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    clearStoredTokens();

    expect(readStoredTokens()).toEqual({
      accessToken: null,
      refreshToken: null,
    });
    expect(window.localStorage.length).toBe(0);
    expect(document.cookie).not.toContain('career_assistant_access_token');
    expect(document.cookie).not.toContain('career_assistant_refresh_token');
  });
});
