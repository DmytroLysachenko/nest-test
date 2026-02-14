'use client';

import { useRouter } from 'next/navigation';
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { getCurrentUser } from '@/features/auth/api/auth-api';

import type { UserDto } from '@/shared/types/api';

const ACCESS_TOKEN_KEY = 'career_assistant_access_token';

type AuthContextValue = {
  token: string | null;
  user: UserDto | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setSession: (accessToken: string, user: UserDto) => void;
  clearSession: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const readToken = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setToken] = useState<string | null>(null);
  const [sessionUser, setSessionUser] = useState<UserDto | null>(null);

  useEffect(() => {
    setToken(readToken());
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

  const setSession = (accessToken: string, user: UserDto) => {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    setToken(accessToken);
    setSessionUser(user);
  };

  const clearSession = () => {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
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
