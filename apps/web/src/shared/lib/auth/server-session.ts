import { cookies } from 'next/headers';

import { env } from '@/shared/config/env';

import type { UserDto } from '@/shared/types/api';

type BootstrapPayload<T> = {
  success: true;
  data: T;
};

export type ServerSession = {
  token: string | null;
  user: UserDto | null;
};

const fetchAuthedJson = async <T>(path: string, token: string) => {
  try {
    const response = await fetch(`${env.NEXT_PUBLIC_API_URL}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as BootstrapPayload<T>;
    return payload.data;
  } catch {
    return null;
  }
};

export const getServerSession = async (): Promise<ServerSession> => {
  const cookieStore = await cookies();
  const token = cookieStore.get('career_assistant_access_token')?.value ?? null;

  if (!token) {
    return { token: null, user: null };
  }

  const user = await fetchAuthedJson<UserDto>('/user', token);

  return {
    token,
    user,
  };
};
