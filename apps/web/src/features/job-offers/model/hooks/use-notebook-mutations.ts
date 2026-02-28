'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { enqueueScrape } from '@/features/job-sources/api/job-sources-api';
import { scoreJobOffer, updateJobOfferMeta, updateJobOfferStatus } from '@/features/job-offers/api/job-offers-api';
import { toUserErrorMessage } from '@/shared/lib/http/to-user-error-message';
import { invalidateQueryKeys } from '@/shared/lib/query/invalidate-query-keys';
import { queryKeys } from '@/shared/lib/query/query-keys';
import { toastError, toastSuccess } from '@/shared/lib/ui/toast';

import type { JobOfferStatus } from '@/shared/types/api';

type UseNotebookMutationsArgs = {
  token: string;
};

export const useNotebookMutations = ({ token }: UseNotebookMutationsArgs) => {
  const queryClient = useQueryClient();

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: JobOfferStatus }) => updateJobOfferStatus(token, id, status),
    onSuccess: async () => {
      await invalidateQueryKeys(queryClient, [
        ['job-offers', token],
        ['job-offers', 'history', token],
      ]);
    },
  });

  const metaMutation = useMutation({
    mutationFn: ({ id, notes, tags }: { id: string; notes: string; tags: string[] }) =>
      updateJobOfferMeta(token, id, { notes, tags }),
    onSuccess: async () => {
      await invalidateQueryKeys(queryClient, [
        ['job-offers', token],
        ['job-offers', 'history', token],
      ]);
    },
  });

  const scoreMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => scoreJobOffer(token, id, 0),
    onSuccess: async () => {
      await invalidateQueryKeys(queryClient, [['job-offers', token]]);
    },
  });

  const enqueueProfileScrapeMutation = useMutation({
    mutationFn: () =>
      enqueueScrape(token, {
        limit: 20,
      }),
    onSuccess: async (result) => {
      await invalidateQueryKeys(queryClient, [
        queryKeys.jobSources.runs(token),
        ['job-offers', token],
      ]);
      toastSuccess(
        result.status === 'reused'
          ? 'Scrape served from recent cached run'
          : 'Profile-based scrape queued successfully',
      );
    },
    onError: (error) => {
      toastError(toUserErrorMessage(error, 'Failed to enqueue profile scrape'));
    },
  });

  return {
    statusMutation,
    metaMutation,
    scoreMutation,
    enqueueProfileScrapeMutation,
  };
};
