'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { queryKeys } from './query-keys';

import type { CareerProfileDto, ProfileInputDto } from '@/shared/types/api';

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
    queryClient.invalidateQueries({ queryKey: queryKeys.documents.list(token) });
    queryClient.invalidateQueries({ queryKey: ['documents', 'events', token] });
    // Document changes affect summary
    syncWorkspace();
  }, [queryClient, token, syncWorkspace]);

  /**
   * Sync Job Offers state (Tier 2)
   */
  const syncJobOffers = useCallback(() => {
    // We invalidate all list variants
    queryClient.invalidateQueries({ queryKey: ['job-offers', token] });
    queryClient.invalidateQueries({ queryKey: queryKeys.jobOffers.summary(token) });
    syncWorkspace();
  }, [queryClient, token, syncWorkspace]);

  /**
   * Sync Onboarding state (Tier 1/2)
   */
  const syncOnboarding = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: queryKeys.onboarding.draft(token) });
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
    queryClient.invalidateQueries({ queryKey: queryKeys.jobSources.schedule(token) });
    queryClient.invalidateQueries({ queryKey: ['job-sources', 'preflight', token] });
    // Invalidate summary too as runs affect stats
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
