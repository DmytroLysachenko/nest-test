import { cookies } from 'next/headers';

import { env } from '@/shared/config/env';
import { SESSION_TOKEN_PLACEHOLDER } from '@/features/auth/model/utils/token-storage';

import type { UserDto } from '@/shared/types/api';

export type ServerSession = {
  token: string | null;
  user: UserDto | null;
};

type ServerPayload<T> = {
  success: true;
  data: T;
};

export const getServerSession = async (): Promise<ServerSession> => {
  const cookieHeader = (await cookies()).toString();
  if (!cookieHeader) {
    return {
      token: null,
      user: null,
    };
  }

  try {
    const response = await fetch(`${env.NEXT_PUBLIC_API_URL}/user`, {
      headers: {
        Cookie: cookieHeader,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return {
        token: null,
        user: null,
      };
    }

    const payload = (await response.json()) as ServerPayload<UserDto>;
    return {
      token: SESSION_TOKEN_PLACEHOLDER,
      user: payload.data,
    };
  } catch {
    return {
      token: null,
      user: null,
    };
  }
};
