'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { queryKeys } from './query-keys';

import type { CareerProfileDto, ProfileInputDto } from '@/shared/types/api';

type JobOfferSyncOptions = {
  collections?: boolean;
  historyOfferId?: string | null;
  prepOfferId?: string | null;
  preferences?: boolean;
  notebookSummary?: boolean;
  discoverySummary?: boolean;
  focus?: boolean;
  actionPlan?: boolean;
  reminderPreview?: boolean;
  workspace?: boolean;
};

/**
 * Centralized hook for manual data synchronization and invalidation.
 *
 * Use this to trigger "Chain Reaction" updates when actions in one feature
 * should affect the global context of other features.
 */
export const useDataSync = (token: string | null) => {
  const queryClient = useQueryClient();

  /**
   * Sync Workflow/Workspace state (Tier 2)
   */
  const syncWorkspace = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.workflow.summary(token) });
  }, [queryClient, token]);

  /**
   * Sync Profile state (Tier 1)
   */
  const syncProfile = useCallback(
    (newProfile?: CareerProfileDto) => {
      if (newProfile) {
        queryClient.setQueryData(queryKeys.careerProfiles.latest(token), newProfile);
      } else {
        queryClient.invalidateQueries({ queryKey: queryKeys.careerProfiles.latest(token) });
      }
      // Profile changes often affect the workspace summary
      syncWorkspace();
    },
    [queryClient, token, syncWorkspace],
  );

  /**
   * Sync Document state (Tier 2)
   */
  const syncDocuments = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.documents.list(token), exact: true });
    queryClient.invalidateQueries({ queryKey: ['documents', 'events', token] });
    // Document changes affect summary
    syncWorkspace();
  }, [queryClient, token, syncWorkspace]);

  /**
   * Sync Job Offers state (Tier 2)
   */
  const syncJobOffers = useCallback(
    (options?: JobOfferSyncOptions) => {
      const config: Required<JobOfferSyncOptions> = {
        collections: options?.collections ?? true,
        historyOfferId: options?.historyOfferId ?? null,
        prepOfferId: options?.prepOfferId ?? null,
        preferences: options?.preferences ?? false,
        notebookSummary: options?.notebookSummary ?? true,
        discoverySummary: options?.discoverySummary ?? true,
        focus: options?.focus ?? true,
        actionPlan: options?.actionPlan ?? true,
        reminderPreview: options?.reminderPreview ?? true,
        workspace: options?.workspace ?? true,
      };

      if (config.collections) {
        queryClient.invalidateQueries({ queryKey: ['job-offers', token] });
        queryClient.invalidateQueries({ queryKey: ['job-offers', 'discovery', token] });
      }

      if (config.historyOfferId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.jobOffers.history(token, config.historyOfferId),
          exact: true,
        });
      }

      if (config.prepOfferId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.jobOffers.prepPacket(token, config.prepOfferId),
          exact: true,
        });
      }

      if (config.preferences) {
        queryClient.invalidateQueries({ queryKey: queryKeys.jobOffers.preferences(token), exact: true });
      }

      if (config.notebookSummary) {
        queryClient.invalidateQueries({ queryKey: queryKeys.jobOffers.summary(token), exact: true });
      }

      if (config.discoverySummary) {
        queryClient.invalidateQueries({ queryKey: queryKeys.jobOffers.discoverySummary(token), exact: true });
      }

      if (config.focus) {
        queryClient.invalidateQueries({ queryKey: queryKeys.jobOffers.focus(token), exact: true });
      }

      if (config.actionPlan) {
        queryClient.invalidateQueries({ queryKey: queryKeys.jobOffers.actionPlan(token), exact: true });
      }

      if (config.reminderPreview) {
        queryClient.invalidateQueries({ queryKey: queryKeys.jobOffers.reminderPreview(token), exact: true });
      }

      if (config.workspace) {
        syncWorkspace();
      }
    },
    [queryClient, token, syncWorkspace],
  );

  /**
   * Sync Onboarding state (Tier 1/2)
   */
  const syncOnboarding = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.draft(token), exact: true });
    syncWorkspace();
  }, [queryClient, token, syncWorkspace]);

  /**
   * Sync Profile Input state (Tier 1)
   */
  const syncProfileInputs = useCallback(
    (newInput?: ProfileInputDto) => {
      if (newInput) {
        queryClient.setQueryData(queryKeys.profileInputs.latest(token), newInput);
      } else {
        queryClient.invalidateQueries({ queryKey: queryKeys.profileInputs.latest(token) });
      }
      syncWorkspace();
    },
    [queryClient, token, syncWorkspace],
  );

  /**
   * Sync Job Sources state (Tier 3)
   */
  const syncJobSources = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.jobSources.runs(token) });
    queryClient.invalidateQueries({ queryKey: queryKeys.jobSources.schedule(token), exact: true });
    queryClient.invalidateQueries({ queryKey: ['job-sources', 'schedule-events', token] });
    queryClient.invalidateQueries({ queryKey: ['job-sources', 'preflight', token] });
    // Invalidate summary too as runs affect stats
    queryClient.invalidateQueries({ queryKey: queryKeys.jobSources.diagnosticsSummary(token, 72) });
    syncWorkspace();
  }, [queryClient, token, syncWorkspace]);

  /**
   * Sync Job Matching state (Tier 2)
   */
  const syncJobMatching = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.jobMatching.list(token) });
    syncWorkspace();
  }, [queryClient, token, syncWorkspace]);

  return {
    syncWorkspace,
    syncProfile,
    syncProfileInputs,
    syncDocuments,
    syncJobOffers,
    syncJobSources,
    syncOnboarding,
    syncJobMatching,
  };
};
