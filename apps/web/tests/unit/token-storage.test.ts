import { clearStoredTokens, readStoredTokens, writeStoredTokens } from '@/features/auth/model/utils/token-storage';

describe('token storage', () => {
  beforeEach(() => {
    clearStoredTokens();
    window.localStorage.clear();
    document.cookie = 'career_assistant_access_token=legacy; Max-Age=0; Path=/';
    document.cookie = 'career_assistant_refresh_token=legacy; Max-Age=0; Path=/';
  });

  it('persists tokens to localStorage without using cookies', () => {
    writeStoredTokens({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    expect(readStoredTokens()).toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    expect(window.localStorage.getItem('career_assistant_access_token')).toBe('access-token');
    expect(window.localStorage.getItem('career_assistant_refresh_token')).toBe('refresh-token');
    expect(document.cookie).not.toContain('career_assistant_access_token');
    expect(document.cookie).not.toContain('career_assistant_refresh_token');
  });

  it('restores tokens from localStorage when memory is empty', () => {
    window.localStorage.setItem('career_assistant_access_token', 'stored-access-token');
    window.localStorage.setItem('career_assistant_refresh_token', 'stored-refresh-token');

    expect(readStoredTokens()).toEqual({
      accessToken: 'stored-access-token',
      refreshToken: 'stored-refresh-token',
    });
  });

  it('clears in-memory and localStorage tokens without touching cookies', () => {
    writeStoredTokens({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    clearStoredTokens();

    expect(readStoredTokens()).toEqual({
      accessToken: null,
      refreshToken: null,
    });
    expect(window.localStorage.getItem('career_assistant_access_token')).toBeNull();
    expect(window.localStorage.getItem('career_assistant_refresh_token')).toBeNull();
    expect(document.cookie).not.toContain('career_assistant_access_token');
    expect(document.cookie).not.toContain('career_assistant_refresh_token');
  });
});
