import { apiRequest } from '@/shared/lib/http/api-client';

import type { WorkspaceSummaryDto } from '@/shared/types/api';

export const getWorkspaceSummary = (token: string) =>
  apiRequest<WorkspaceSummaryDto>('/workspace/summary', {
    method: 'GET',
    token,
  });
