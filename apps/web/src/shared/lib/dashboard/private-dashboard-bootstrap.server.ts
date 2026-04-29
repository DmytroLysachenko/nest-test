import { cookies } from 'next/headers';

import { env } from '@/shared/config/env';
import { getServerSession } from '@/shared/lib/auth/server-session';

import type { UserDto, WorkspaceSummaryDto } from '@/shared/types/api';

type BootstrapPayload<T> = {
  success: true;
  data: T;
};

export type PrivateDashboardBootstrap = {
  token: string | null;
  user: UserDto | null;
  summary: WorkspaceSummaryDto | null;
};

const fetchAuthedJson = async <T>(path: string, cookieHeader: string) => {
  try {
    const response = await fetch(`${env.NEXT_PUBLIC_API_URL}${path}`, {
      headers: {
        Cookie: cookieHeader,
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

export const getPrivateDashboardBootstrap = async (): Promise<PrivateDashboardBootstrap> => {
  const { token, user } = await getServerSession();
  const cookieHeader = (await cookies()).toString();
  if (!token || !cookieHeader) {
    return {
      token: null,
      user,
      summary: null,
    };
  }

  const summary = await fetchAuthedJson<WorkspaceSummaryDto>('/workspace/summary', cookieHeader);

  return {
    token,
    user,
    summary,
  };
};
