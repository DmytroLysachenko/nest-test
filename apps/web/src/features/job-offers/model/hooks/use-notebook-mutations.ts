'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { enqueueScrape } from '@/features/job-sources/api/job-sources-api';
import {
  scoreJobOffer,
  generateJobOfferPrep,
  updateJobOfferFeedback,
  updateJobOfferMeta,
  updateJobOfferPipeline,
  updateJobOfferStatus,
} from '@/features/job-offers/api/job-offers-api';
import { toUserErrorMessage } from '@/shared/lib/http/to-user-error-message';
import { useDataSync } from '@/shared/lib/query/use-data-sync';
import { toastError, toastInfo, toastSuccess, toastSuccessWithAction } from '@/shared/lib/ui/toast';

import type { JobOfferStatus, JobOffersListDto } from '@/shared/types/api';

type UseNotebookMutationsArgs = {
  token: string;
};

export const useNotebookMutations = ({ token }: UseNotebookMutationsArgs) => {
  const queryClient = useQueryClient();
  const { syncJobOffers, syncJobSources } = useDataSync(token);

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
    onSuccess: (result, variables, context) => {
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

      syncJobOffers();
    },
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: JobOfferStatus }) => {
      const results = await Promise.allSettled(ids.map((id) => updateJobOfferStatus(token, id, status)));
      const failedIds = results.reduce<string[]>((acc, result, index) => {
        if (result.status === 'rejected') {
          const failedId = ids[index];
          if (failedId) {
            acc.push(failedId);
          }
        }
        return acc;
      }, []);
      const failed = failedIds.length;
      return {
        updated: ids.length - failed,
        failed,
        failedIds,
        status,
      };
    },
    onSuccess: (result) => {
      syncJobOffers();
      if (result.failed === 0) {
        toastSuccess(`Updated ${result.updated} offers`);
      } else {
        toastSuccessWithAction(
          `Updated ${result.updated}, failed ${result.failed} (${result.status}).`,
          'Retry failed',
          () => {
            bulkStatusMutation.mutate({
              ids: result.failedIds,
              status: result.status,
            });
          },
        );
      }
    },
    onError: (error) => {
      toastError(toUserErrorMessage(error, 'Bulk status update failed'));
    },
  });

  const metaMutation = useMutation({
    mutationFn: ({ id, notes, tags }: { id: string; notes: string; tags: string[] }) =>
      updateJobOfferMeta(token, id, { notes, tags }),
    onSuccess: () => {
      syncJobOffers();
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: ({
      id,
      aiFeedbackScore,
      aiFeedbackNotes,
    }: {
      id: string;
      aiFeedbackScore: number;
      aiFeedbackNotes?: string;
    }) => updateJobOfferFeedback(token, id, { aiFeedbackScore, aiFeedbackNotes }),
    onSuccess: () => {
      syncJobOffers();
      toastSuccess('Feedback submitted');
    },
    onError: (error) => {
      toastError(toUserErrorMessage(error, 'Failed to submit feedback'));
    },
  });

  const pipelineMutation = useMutation({
    mutationFn: ({ id, pipelineMeta }: { id: string; pipelineMeta: Record<string, unknown> }) =>
      updateJobOfferPipeline(token, id, { pipelineMeta }),
    onSuccess: () => {
      syncJobOffers();
    },
    onError: (error) => {
      toastError(toUserErrorMessage(error, 'Failed to update pipeline details'));
    },
  });

  const scoreMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => scoreJobOffer(token, id, 0),
    onSuccess: () => {
      syncJobOffers();
    },
  });

  const generatePrepMutation = useMutation({
    mutationFn: ({ id, instructions }: { id: string; instructions?: string }) =>
      generateJobOfferPrep(token, id, { instructions }),
    onSuccess: () => {
      syncJobOffers();
      toastSuccess('Interview prep generated');
    },
    onError: (error) => {
      toastError(toUserErrorMessage(error, 'Failed to generate prep materials'));
    },
  });

  const enqueueProfileScrapeMutation = useMutation({
    mutationFn: () =>
      enqueueScrape(token, {
        limit: 20,
      }),
    onSuccess: (result) => {
      syncJobSources();
      syncJobOffers();
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
    feedbackMutation,
    pipelineMutation,
    scoreMutation,
    generatePrepMutation,
    enqueueProfileScrapeMutation,
  };
};
