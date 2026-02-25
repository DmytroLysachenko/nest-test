'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { generateCareerProfile } from '@/features/career-profiles/api/career-profiles-api';
import { deleteOnboardingDraft, upsertOnboardingDraft } from '@/features/onboarding/api/onboarding-drafts-api';
import { createProfileInput } from '@/features/profile-inputs/api/profile-inputs-api';
import { invalidateQueryKeys } from '@/shared/lib/query/invalidate-query-keys';
import { queryKeys } from '@/shared/lib/query/query-keys';
import { toastError, toastSuccess } from '@/shared/lib/ui/toast';

import type { OnboardingDraft } from '@/features/onboarding/model/types/onboarding-draft';

type UseOnboardingMutationsArgs = {
  token: string | null;
  draft: OnboardingDraft;
  resetDraft: () => void;
};

export const useOnboardingMutations = ({ token, draft, resetDraft }: UseOnboardingMutationsArgs) => {
  const router = useRouter();
  const queryClient = useQueryClient();

  const submitProfileMutation = useMutation({
    mutationFn: async () => {
      if (!token) {
        throw new Error('No auth token');
      }

      await createProfileInput(token, {
        intakePayload: {
          desiredPositions: draft.desiredPositions,
          jobDomains: draft.jobDomains,
          coreSkills: draft.coreSkills,
          experienceYearsInRole: draft.experienceYearsInRole ?? undefined,
          targetSeniority: draft.targetSeniority,
          workModePreferences: {
            hard: draft.hardWorkModes,
            soft: draft.softWorkModes.map((value) => ({ value, weight: 0.6 })),
          },
          contractPreferences: {
            hard: draft.hardContractTypes,
            soft: draft.softContractTypes.map((value) => ({ value, weight: 0.6 })),
          },
          sectionNotes: {
            positions: draft.sectionNotes.positions || undefined,
            domains: draft.sectionNotes.domains || undefined,
            skills: draft.sectionNotes.skills || undefined,
            experience: draft.sectionNotes.experience || undefined,
            preferences: draft.sectionNotes.preferences || undefined,
          },
          generalNotes: draft.generalNotes || undefined,
        },
      });

      await generateCareerProfile(token, {
        instructions: draft.generationInstructions || undefined,
      });

      await deleteOnboardingDraft(token);
    },
    onSuccess: async () => {
      resetDraft();
      await invalidateQueryKeys(queryClient, [
        queryKeys.profileInputs.latest(token),
        queryKeys.careerProfiles.latest(token),
        queryKeys.onboarding.draft(token),
      ]);
      toastSuccess('Profile created successfully');
      router.push('/app');
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to generate profile';
      toastError(message);
    },
  });

  const saveDraftMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => upsertOnboardingDraft(token as string, payload),
    onSuccess: async () => {
      await invalidateQueryKeys(queryClient, [queryKeys.onboarding.draft(token)]);
    },
  });

  const clearDraftMutation = useMutation({
    mutationFn: () => deleteOnboardingDraft(token as string),
    onSuccess: async () => {
      await invalidateQueryKeys(queryClient, [queryKeys.onboarding.draft(token)]);
      toastSuccess('Draft cleared');
    },
  });

  return {
    submitProfileMutation,
    saveDraftMutation,
    clearDraftMutation,
  };
};
