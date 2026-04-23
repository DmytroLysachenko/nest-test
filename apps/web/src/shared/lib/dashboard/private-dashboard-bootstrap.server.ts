import { cookies } from 'next/headers';

import { env } from '@/shared/config/env';

import type {
  CareerProfileDto,
  DocumentDto,
  JobOfferSummaryDto,
  ProfileInputDto,
  ScrapeScheduleDto,
  UserDto,
  WorkspaceSummaryDto,
} from '@/shared/types/api';

type BootstrapPayload<T> = {
  success: true;
  data: T;
};

export type PrivateDashboardBootstrap = {
  token: string | null;
  user: UserDto | null;
  summary: WorkspaceSummaryDto | null;
  latestProfileInput: ProfileInputDto | null;
  latestCareerProfile: CareerProfileDto | null;
  documents: DocumentDto[] | null;
  notebookSummary: JobOfferSummaryDto | null;
  scrapeSchedule: ScrapeScheduleDto | null;
};

const readTokenCookie = async () => {
  const cookieStore = await cookies();
  return cookieStore.get('career_assistant_access_token')?.value ?? null;
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

export const getPrivateDashboardBootstrap = async (): Promise<PrivateDashboardBootstrap> => {
  const token = await readTokenCookie();
  if (!token) {
    return {
      token: null,
      user: null,
      summary: null,
      latestProfileInput: null,
      latestCareerProfile: null,
      documents: null,
      notebookSummary: null,
      scrapeSchedule: null,
    };
  }

  const [user, summary, latestProfileInput, latestCareerProfile, documents, notebookSummary, scrapeSchedule] =
    await Promise.all([
      fetchAuthedJson<UserDto>('/user', token),
      fetchAuthedJson<WorkspaceSummaryDto>('/workspace/summary', token),
      fetchAuthedJson<ProfileInputDto | null>('/profile-inputs/latest', token),
      fetchAuthedJson<CareerProfileDto | null>('/career-profiles/latest', token),
      fetchAuthedJson<DocumentDto[]>('/documents', token),
      fetchAuthedJson<JobOfferSummaryDto>('/job-offers/summary', token),
      fetchAuthedJson<ScrapeScheduleDto>('/job-sources/schedule', token),
    ]);

  return {
    token,
    user,
    summary,
    latestProfileInput,
    latestCareerProfile,
    documents,
    notebookSummary,
    scrapeSchedule,
  };
};
