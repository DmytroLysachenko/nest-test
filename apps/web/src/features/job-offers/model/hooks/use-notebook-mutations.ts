'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { enqueueScrape } from '@/features/job-sources/api/job-sources-api';
import {
  clearJobOfferFollowUp,
  completeJobOfferFollowUp,
  scoreJobOffer,
  generateJobOfferPrep,
  snoozeJobOfferFollowUp,
  updateNotebookPreferences,
  updateJobOfferFeedback,
  updateJobOfferMeta,
  updateJobOfferPipeline,
  updateJobOfferStatus,
  bulkUpdateJobOfferFollowUp,
  bulkUpdateJobOfferWorkflow,
  dismissAllSeenJobOffers,
  autoArchiveOldJobOffers,
} from '@/features/job-offers/api/job-offers-api';
import { toUserErrorMessage } from '@/shared/lib/http/to-user-error-message';
import { useDataSync } from '@/shared/lib/query/use-data-sync';
import { toastError, toastInfo, toastSuccess, toastSuccessWithAction } from '@/shared/lib/ui/toast';

import type {
  DiscoverySummaryDto,
  JobOfferStatus,
  JobOfferSummaryDto,
  JobOffersListDto,
  NotebookFiltersDto,
} from '@/shared/types/api';

type UseNotebookMutationsArgs = {
  token: string;
};

export const useNotebookMutations = ({ token }: UseNotebookMutationsArgs) => {
  const queryClient = useQueryClient();
  const { syncJobOffers, syncJobSources } = useDataSync(token);
  const pipelineStatuses: JobOfferStatus[] = ['SAVED', 'APPLIED', 'INTERVIEWING', 'OFFER'];

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
      const changedAt = new Date().toISOString();
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
            items: current.items.map((offer) => {
              if (offer.id !== id) {
                return offer;
              }

              const history = Array.isArray(offer.statusHistory) ? offer.statusHistory : [];
              const nextHistory = [...history, { status, changedAt }];

              return {
                ...offer,
                status,
                isInPipeline: 'isInPipeline' in offer ? pipelineStatuses.includes(status) : undefined,
                lastStatusAt: changedAt,
                statusHistory: nextHistory,
              };
            }),
          };
        },
      );

      queryClient.setQueryData<DiscoverySummaryDto | undefined>(
        ['job-offers', 'discovery-summary', token],
        (current) => {
          if (!current || previousStatus === status) {
            return current;
          }

          const wasPipeline = previousStatus ? pipelineStatuses.includes(previousStatus) : false;
          const isPipeline = pipelineStatuses.includes(status);
          const wasReviewed = previousStatus === 'SEEN';
          const wasUnseen = previousStatus === 'NEW';
          const isReviewed = status === 'SEEN';
          const isUnseen = status === 'NEW';

          return {
            ...current,
            unseen: Math.max(0, current.unseen + (isUnseen ? 1 : 0) - (wasUnseen ? 1 : 0)),
            reviewed: Math.max(0, current.reviewed + (isReviewed ? 1 : 0) - (wasReviewed ? 1 : 0)),
            inPipeline: Math.max(0, current.inPipeline + (isPipeline ? 1 : 0) - (wasPipeline ? 1 : 0)),
            buckets: current.buckets.map((bucket) => {
              if (bucket.key === 'new') {
                return { ...bucket, count: Math.max(0, bucket.count + (isUnseen ? 1 : 0) - (wasUnseen ? 1 : 0)) };
              }
              if (bucket.key === 'seen') {
                return {
                  ...bucket,
                  count: Math.max(0, bucket.count + (isReviewed ? 1 : 0) - (wasReviewed ? 1 : 0)),
                };
              }
              if (bucket.key === 'pipeline') {
                return {
                  ...bucket,
                  count: Math.max(0, bucket.count + (isPipeline ? 1 : 0) - (wasPipeline ? 1 : 0)),
                };
              }
              return bucket;
            }),
          };
        },
      );

      queryClient.setQueryData<JobOfferSummaryDto | undefined>(['job-offers', 'summary', token], (current) => {
        if (!current || previousStatus === status) {
          return current;
        }

        const pipelineBucketStatusKeys = new Set(['saved', 'applied']);
        const wasPipeline = previousStatus ? pipelineStatuses.includes(previousStatus) : false;
        const isPipeline = pipelineStatuses.includes(status);

        return {
          ...current,
          buckets: current.buckets.map((bucket) => {
            if (!pipelineBucketStatusKeys.has(bucket.key)) {
              return bucket;
            }
            if (bucket.key === 'saved') {
              return {
                ...bucket,
                count: bucket.count + (status === 'SAVED' ? 1 : 0) - (previousStatus === 'SAVED' ? 1 : 0),
              };
            }
            if (bucket.key === 'applied') {
              return {
                ...bucket,
                count: bucket.count + (status === 'APPLIED' ? 1 : 0) - (previousStatus === 'APPLIED' ? 1 : 0),
              };
            }
            return bucket;
          }),
          total: Math.max(0, current.total + (isPipeline ? 0 : 0) - (wasPipeline ? 0 : 0)),
        };
      });

      queryClient.setQueryData<{ statusHistory: Array<{ status: JobOfferStatus; changedAt: string }> } | undefined>(
        ['job-offers', 'history', token, id],
        (current) => ({
          statusHistory: [...(current?.statusHistory ?? []), { status, changedAt }],
        }),
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

      syncJobOffers({
        collections: true,
        historyOfferId: variables.id,
        notebookSummary: true,
        discoverySummary: true,
        focus: true,
        actionPlan: true,
        reminderPreview: true,
        workspace: true,
      });
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
      syncJobOffers({
        collections: true,
        notebookSummary: true,
        discoverySummary: true,
        focus: true,
        actionPlan: true,
        reminderPreview: true,
        workspace: true,
      });
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

  const dismissAllSeenMutation = useMutation({
    mutationFn: () => dismissAllSeenJobOffers(token),
    onSuccess: (result) => {
      syncJobOffers({
        collections: true,
        notebookSummary: true,
        discoverySummary: true,
        focus: true,
        actionPlan: true,
        reminderPreview: true,
        workspace: true,
      });
      toastSuccess(`Marked ${result.count} offers as dismissed`);
    },
    onError: (error) => {
      toastError(toUserErrorMessage(error, 'Failed to dismiss offers'));
    },
  });

  const autoArchiveMutation = useMutation({
    mutationFn: () => autoArchiveOldJobOffers(token),
    onSuccess: (result) => {
      syncJobOffers({
        collections: true,
        notebookSummary: true,
        discoverySummary: true,
        focus: true,
        actionPlan: true,
        reminderPreview: true,
        workspace: true,
      });
      if (result.count > 0) {
        toastSuccess(`Automatically archived ${result.count} old offers`);
      }
    },
    onError: (error) => {
      toastError(toUserErrorMessage(error, 'Failed to archive old offers'));
    },
  });

  const metaMutation = useMutation({
    mutationFn: ({ id, notes, tags }: { id: string; notes: string; tags: string[] }) =>
      updateJobOfferMeta(token, id, { notes, tags }),
    onSuccess: (_result, variables) => {
      syncJobOffers({
        collections: true,
        historyOfferId: variables.id,
        notebookSummary: false,
        discoverySummary: false,
        focus: false,
        actionPlan: false,
        reminderPreview: false,
        workspace: false,
      });
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
    onSuccess: (_result, variables) => {
      syncJobOffers({
        collections: true,
        historyOfferId: variables.id,
        notebookSummary: false,
        discoverySummary: false,
        focus: false,
        actionPlan: false,
        reminderPreview: false,
        workspace: false,
      });
      toastSuccess('Feedback submitted');
    },
    onError: (error) => {
      toastError(toUserErrorMessage(error, 'Failed to submit feedback'));
    },
  });

  const pipelineMutation = useMutation({
    mutationFn: ({ id, pipelineMeta }: { id: string; pipelineMeta: Record<string, unknown> }) =>
      updateJobOfferPipeline(token, id, { pipelineMeta }),
    onSuccess: (_result, variables) => {
      syncJobOffers({
        collections: true,
        historyOfferId: variables.id,
        notebookSummary: true,
        discoverySummary: false,
        focus: true,
        actionPlan: true,
        reminderPreview: true,
        workspace: true,
      });
    },
    onError: (error) => {
      toastError(toUserErrorMessage(error, 'Failed to update pipeline details'));
    },
  });

  const completeFollowUpMutation = useMutation({
    mutationFn: ({
      id,
      note,
      nextAction,
    }: {
      id: string;
      note?: string;
      nextAction?: 'clear' | 'tomorrow' | 'in3days' | 'in1week';
    }) => completeJobOfferFollowUp(token, id, { note, nextAction }),
    onSuccess: (_result, variables) => {
      syncJobOffers({
        collections: true,
        historyOfferId: variables.id,
        notebookSummary: false,
        discoverySummary: false,
        focus: true,
        actionPlan: true,
        reminderPreview: true,
        workspace: true,
      });
      toastSuccess('Follow-up marked as completed');
    },
    onError: (error) => {
      toastError(toUserErrorMessage(error, 'Failed to complete follow-up'));
    },
  });

  const snoozeFollowUpMutation = useMutation({
    mutationFn: ({ id, durationHours }: { id: string; durationHours?: number }) =>
      snoozeJobOfferFollowUp(token, id, { durationHours }),
    onSuccess: (_result, variables) => {
      syncJobOffers({
        collections: true,
        historyOfferId: variables.id,
        notebookSummary: false,
        discoverySummary: false,
        focus: true,
        actionPlan: true,
        reminderPreview: true,
        workspace: true,
      });
      toastSuccess(`Follow-up snoozed${variables.durationHours ? ` by ${variables.durationHours}h` : ''}`);
    },
    onError: (error) => {
      toastError(toUserErrorMessage(error, 'Failed to snooze follow-up'));
    },
  });

  const clearFollowUpMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => clearJobOfferFollowUp(token, id),
    onSuccess: (_result, variables) => {
      syncJobOffers({
        collections: true,
        historyOfferId: variables.id,
        notebookSummary: false,
        discoverySummary: false,
        focus: true,
        actionPlan: true,
        reminderPreview: true,
        workspace: true,
      });
      toastSuccess('Follow-up cleared');
    },
    onError: (error) => {
      toastError(toUserErrorMessage(error, 'Failed to clear follow-up'));
    },
  });

  const bulkFollowUpMutation = useMutation({
    mutationFn: (payload: {
      ids: string[];
      followUpAt: string | null;
      nextStep?: string | null;
      note?: string | null;
    }) => bulkUpdateJobOfferFollowUp(token, payload),
    onSuccess: (result) => {
      syncJobOffers({
        collections: true,
        notebookSummary: false,
        discoverySummary: false,
        focus: true,
        actionPlan: true,
        reminderPreview: true,
        workspace: true,
      });
      const noteLabel = result.summary.noteApplied ? ' with notes' : '';
      toastSuccess(
        `Updated follow-up plan for ${result.updated} offers (${result.summary.due} due, ${result.summary.upcoming} upcoming, ${result.summary.none} none)${noteLabel}`,
      );
    },
    onError: (error) => {
      toastError(toUserErrorMessage(error, 'Failed to update follow-up plan'));
    },
  });

  const bulkWorkflowMutation = useMutation({
    mutationFn: (payload: {
      ids: string[];
      followUpAt?: string | null;
      nextStep?: string | null;
      note?: string | null;
      decisionDueAt?: string | null;
      prepRecommended?: boolean | null;
    }) => bulkUpdateJobOfferWorkflow(token, payload),
    onSuccess: (result) => {
      syncJobOffers({
        collections: true,
        notebookSummary: true,
        discoverySummary: false,
        focus: true,
        actionPlan: true,
        reminderPreview: true,
        workspace: true,
      });
      toastSuccess(
        `Updated workflow plan for ${result.updated} offers (${result.summary.due} due, ${result.summary.upcoming} upcoming, ${result.summary.none} none)`,
      );
    },
    onError: (error) => {
      toastError(toUserErrorMessage(error, 'Failed to update workflow plan'));
    },
  });

  const scoreMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => scoreJobOffer(token, id, 0),
    onSuccess: (_result, variables) => {
      syncJobOffers({
        collections: true,
        historyOfferId: variables.id,
        notebookSummary: false,
        discoverySummary: true,
        focus: true,
        actionPlan: false,
        reminderPreview: false,
        workspace: false,
      });
    },
  });

  const generatePrepMutation = useMutation({
    mutationFn: ({ id, instructions }: { id: string; instructions?: string }) =>
      generateJobOfferPrep(token, id, { instructions }),
    onSuccess: (_result, variables) => {
      syncJobOffers({
        collections: false,
        historyOfferId: variables.id,
        prepOfferId: variables.id,
        notebookSummary: false,
        discoverySummary: false,
        focus: false,
        actionPlan: false,
        reminderPreview: false,
        workspace: false,
      });
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
      syncJobOffers({
        collections: true,
        notebookSummary: true,
        discoverySummary: true,
        focus: true,
        actionPlan: true,
        reminderPreview: true,
        workspace: true,
      });
      toastSuccess(result.status === 'reused' ? 'Recent results are already available' : 'Finding fresh matches now');
    },
    onError: (error) => {
      toastError(toUserErrorMessage(error, 'Unable to look for fresh matches right now'));
    },
  });

  const preferencesMutation = useMutation({
    mutationFn: ({ filters, savedPreset }: { filters: NotebookFiltersDto; savedPreset: NotebookFiltersDto | null }) =>
      updateNotebookPreferences(token, { filters, savedPreset }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['job-offers', 'preferences', token],
      });
    },
  });

  return {
    statusMutation,
    bulkStatusMutation,
    bulkFollowUpMutation,
    bulkWorkflowMutation,
    dismissAllSeenMutation,
    autoArchiveMutation,
    metaMutation,
    feedbackMutation,
    pipelineMutation,
    completeFollowUpMutation,
    snoozeFollowUpMutation,
    clearFollowUpMutation,
    scoreMutation,
    generatePrepMutation,
    enqueueProfileScrapeMutation,
    preferencesMutation,
  };
};
