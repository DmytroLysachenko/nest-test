'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { enqueueScrape } from '@/features/job-sources/api/job-sources-api';
import { scoreJobOffer, updateJobOfferMeta, updateJobOfferStatus } from '@/features/job-offers/api/job-offers-api';
import { toUserErrorMessage } from '@/shared/lib/http/to-user-error-message';
import { invalidateQueryKeys } from '@/shared/lib/query/invalidate-query-keys';
import { queryKeys } from '@/shared/lib/query/query-keys';
import { toastError, toastInfo, toastSuccess, toastSuccessWithAction } from '@/shared/lib/ui/toast';

import type { JobOfferStatus, JobOffersListDto } from '@/shared/types/api';

type UseNotebookMutationsArgs = {
  token: string;
};

export const useNotebookMutations = ({ token }: UseNotebookMutationsArgs) => {
  const queryClient = useQueryClient();

  const statusMutation = useMutation({
    mutationFn: ({
      id,
      status,
      suppressUndoToast,
    }: {
      id: string;
      status: JobOfferStatus;
      suppressUndoToast?: boolean;
    }) => updateJobOfferStatus(token, id, status),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({
        queryKey: ['job-offers', token],
      });

      const snapshots = queryClient.getQueriesData<JobOffersListDto>({
        queryKey: ['job-offers', token],
      });

      const previousStatus =
        snapshots.flatMap(([, data]) => data?.items ?? []).find((offer) => offer.id === id)?.status ?? null;

      queryClient.setQueriesData<JobOffersListDto>(
        {
          queryKey: ['job-offers', token],
        },
        (current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            items: current.items.map((offer) => (offer.id === id ? { ...offer, status } : offer)),
          };
        },
      );

      return {
        snapshots,
        previousStatus,
      };
    },
    onError: (error, _variables, context) => {
      context?.snapshots.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
      toastError(toUserErrorMessage(error, 'Failed to update status.'));
    },
    onSuccess: async (_result, variables, context) => {
      if (!variables.suppressUndoToast) {
        const previousStatus = context?.previousStatus;
        if (previousStatus && previousStatus !== variables.status) {
          toastSuccessWithAction(`Status updated to ${variables.status}`, 'Undo', () => {
            statusMutation.mutate({
              id: variables.id,
              status: previousStatus,
              suppressUndoToast: true,
            });
            toastInfo(`Status reverted to ${previousStatus}`);
          });
        } else {
          toastSuccess('Offer status updated');
        }
      }

      await invalidateQueryKeys(queryClient, [
        ['job-offers', token],
        ['job-offers', 'history', token],
      ]);
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: JobOfferStatus }) => {
      const results = await Promise.allSettled(ids.map((id) => updateJobOfferStatus(token, id, status)));
      const failed = results.filter((result) => result.status === 'rejected').length;
      return {
        updated: ids.length - failed,
        failed,
      };
    },
    onSuccess: async (result) => {
      await invalidateQueryKeys(queryClient, [
        ['job-offers', token],
        ['job-offers', 'history', token],
      ]);
      if (result.failed === 0) {
        toastSuccess(`Updated ${result.updated} offers`);
      } else {
        toastError(`Updated ${result.updated}, failed ${result.failed}. Retry failed items.`);
      }
    },
    onError: (error) => {
      toastError(toUserErrorMessage(error, 'Bulk status update failed'));
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
      await invalidateQueryKeys(queryClient, [queryKeys.jobSources.runs(token), ['job-offers', token]]);
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
    bulkStatusMutation,
    metaMutation,
    scoreMutation,
    enqueueProfileScrapeMutation,
  };
};
