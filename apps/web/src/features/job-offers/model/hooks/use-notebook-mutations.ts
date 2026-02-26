'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { scoreJobOffer, updateJobOfferMeta, updateJobOfferStatus } from '@/features/job-offers/api/job-offers-api';
import { invalidateQueryKeys } from '@/shared/lib/query/invalidate-query-keys';

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

  return {
    statusMutation,
    metaMutation,
    scoreMutation,
  };
};
