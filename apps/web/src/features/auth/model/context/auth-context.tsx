'use client';

import { useRouter } from 'next/navigation';
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';

import { useAuthMeQuery } from '@/features/auth/model/hooks/use-auth-me-query';
import {
  clearStoredTokens,
  onStoredTokensChanged,
  readStoredTokens,
  SESSION_TOKEN_PLACEHOLDER,
  writeStoredTokens,
} from '@/features/auth/model/utils/token-storage';
import { ApiError } from '@/shared/lib/http/api-error';

import type { UserDto } from '@/shared/types/api';

type AuthContextValue = {
  token: string | null;
  user: UserDto | null;
  isLoading: boolean;
  isHydrated: boolean;
  isAuthenticated: boolean;
  setSession: (accessToken: string, refreshToken: string, user: UserDto) => void;
  clearSession: () => void;
};

type InitialAuthSession = {
  token: string | null;
  user: UserDto | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({
  children,
  initialSession,
}: {
  children: ReactNode;
  initialSession?: InitialAuthSession;
}) => {
  const hasInitialSession = Boolean(initialSession?.token || initialSession?.user);
  const [clientAuthState, setClientAuthState] = useState<{
    accessToken: string | null;
    isHydrated: boolean;
  }>({
    accessToken:
      initialSession?.token && initialSession.token !== SESSION_TOKEN_PLACEHOLDER ? initialSession.token : null,
    isHydrated: hasInitialSession,
  });
  const [sessionUser, setSessionUser] = useState<UserDto | null>(initialSession?.user ?? null);
  const accessToken = clientAuthState.accessToken;
  const isHydrated = clientAuthState.isHydrated;
  const token = accessToken ?? (sessionUser ? SESSION_TOKEN_PLACEHOLDER : null);

  useEffect(() => {
    const syncStoredAccessToken = () => {
      const nextAccessToken = readStoredTokens().accessToken;
      setClientAuthState({
        accessToken: nextAccessToken,
        isHydrated: true,
      });
    };

    syncStoredAccessToken();

    return onStoredTokensChanged(syncStoredAccessToken);
  }, []);

  const userQuery = useAuthMeQuery(token, initialSession?.token === token ? (initialSession?.user ?? null) : null);

  useEffect(() => {
    if (userQuery.data) {
      setSessionUser(userQuery.data);
    }
  }, [userQuery.data]);

  useEffect(() => {
    if (userQuery.error instanceof ApiError && userQuery.error.status === 401) {
      clearStoredTokens();
      setClientAuthState({
        accessToken: null,
        isHydrated: true,
      });
      setSessionUser(null);
    }
  }, [userQuery.error]);

  const setSession = (accessToken: string, refreshToken: string, user: UserDto) => {
    writeStoredTokens({ accessToken, refreshToken });
    setClientAuthState({
      accessToken,
      isHydrated: true,
    });
    setSessionUser(user);
  };

  const clearSession = () => {
    clearStoredTokens();
    setClientAuthState({
      accessToken: null,
      isHydrated: true,
    });
    setSessionUser(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user: sessionUser,
      isLoading: userQuery.isLoading,
      isHydrated,
      isAuthenticated: Boolean(token),
      setSession,
      clearSession,
    }),
    [isHydrated, sessionUser, token, userQuery.isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const useRequireAuth = () => {
  const router = useRouter();
  const auth = useAuth();

  useEffect(() => {
    if (auth.isHydrated && !auth.isLoading && !auth.isAuthenticated) {
      router.replace('/login');
    }
  }, [auth.isAuthenticated, auth.isHydrated, auth.isLoading, router]);

  return auth;
};
