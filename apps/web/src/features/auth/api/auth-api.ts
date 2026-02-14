import { apiRequest } from '@/shared/lib/http/api-client';

import type { AuthLoginResponse, UserDto } from '@/shared/types/api';

type LoginPayload = {
  email: string;
  password: string;
};

type RegisterPayload = {
  email: string;
  password: string;
  confirmPassword: string;
  code: string;
};

export const login = (payload: LoginPayload) =>
  apiRequest<AuthLoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const register = (payload: RegisterPayload) =>
  apiRequest<UserDto>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

export const sendRegisterCode = (email: string) =>
  apiRequest<void>('/auth/send-register-code', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

export const getCurrentUser = (token: string) =>
  apiRequest<UserDto>('/user', {
    method: 'GET',
    token,
  });

export const logout = (token: string) =>
  apiRequest<string>('/auth/logout', {
    method: 'POST',
    token,
  });
