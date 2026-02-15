'use client';

import { useRouter } from 'next/navigation';
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { getCurrentUser } from '@/features/auth/api/auth-api';
import {
  clearStoredTokens,
  onStoredTokensChanged,
  readStoredTokens,
  writeStoredTokens,
} from '@/features/auth/model/token-storage';
import { ApiError } from '@/shared/lib/http/api-error';

import type { UserDto } from '@/shared/types/api';

type AuthContextValue = {
  token: string | null;
  user: UserDto | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setSession: (accessToken: string, refreshToken: string, user: UserDto) => void;
  clearSession: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [sessionUser, setSessionUser] = useState<UserDto | null>(null);

  useEffect(() => {
    const syncTokens = () => {
      const tokens = readStoredTokens();
      setToken(tokens.accessToken);
      if (!tokens.accessToken) {
        setSessionUser(null);
      }
    };
    syncTokens();
    return onStoredTokensChanged(syncTokens);
  }, []);

  const userQuery = useQuery({
    queryKey: ['auth', 'me', token],
    queryFn: async () => {
      if (!token) {
        return null;
      }
      return getCurrentUser(token);
    },
    enabled: Boolean(token),
  });

  useEffect(() => {
    if (userQuery.data) {
      setSessionUser(userQuery.data);
    }
  }, [userQuery.data]);

  useEffect(() => {
    if (userQuery.error instanceof ApiError && userQuery.error.status === 401) {
      clearStoredTokens();
      setToken(null);
      setSessionUser(null);
    }
  }, [userQuery.error]);

  const setSession = (accessToken: string, refreshToken: string, user: UserDto) => {
    writeStoredTokens({ accessToken, refreshToken });
    setToken(accessToken);
    setSessionUser(user);
  };

  const clearSession = () => {
    clearStoredTokens();
    setToken(null);
    setSessionUser(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user: sessionUser,
      isLoading: userQuery.isLoading,
      isAuthenticated: Boolean(token),
      setSession,
      clearSession,
    }),
    [sessionUser, token, userQuery.isLoading],
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
    if (!auth.isLoading && !auth.isAuthenticated) {
      router.replace('/login');
    }
  }, [auth.isAuthenticated, auth.isLoading, router]);

  return auth;
};
