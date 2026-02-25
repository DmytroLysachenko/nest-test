'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { useRequireAuth } from '@/features/auth/model/context/auth-context';
import { generateCareerProfile, getLatestCareerProfile } from '@/features/career-profiles/api/career-profiles-api';
import { listDocuments } from '@/features/documents/api/documents-api';
import { useOnboardingDraftStore } from '@/features/onboarding/model/state/onboarding-draft-store';
import { onboardingStepOneSchema, type OnboardingStepOneValues } from '@/features/onboarding/model/validation/onboarding-step-one-schema';
import { createProfileInput } from '@/features/profile-inputs/api/profile-inputs-api';
import { getLatestProfileInput } from '@/features/profile-inputs/api/profile-inputs-api';
import { ApiError } from '@/shared/lib/http/api-error';
import { queryKeys } from '@/shared/lib/query/query-keys';
import { defaultOnboardingDraft } from '@/features/onboarding/model/types/onboarding-draft';

export const useOnboardingPage = () => {
  const auth = useRequireAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { draft, step, setStep, patchDraft, resetDraft } = useOnboardingDraftStore();

  const latestCareerProfileQuery = useQuery({
    queryKey: queryKeys.careerProfiles.latest(auth.token),
    queryFn: () => getLatestCareerProfile(auth.token as string),
    enabled: Boolean(auth.token),
  });

  const latestProfileInputQuery = useQuery({
    queryKey: queryKeys.profileInputs.latest(auth.token),
    queryFn: () => getLatestProfileInput(auth.token as string),
    enabled: Boolean(auth.token),
  });

  const documentsQuery = useQuery({
    queryKey: queryKeys.documents.list(auth.token),
    queryFn: () => listDocuments(auth.token as string),
    enabled: Boolean(auth.token),
  });

  const stepOneForm = useForm<OnboardingStepOneValues>({
    resolver: zodResolver(onboardingStepOneSchema),
    defaultValues: {
      desiredPositions: draft.desiredPositions,
      jobDomains: draft.jobDomains,
      coreSkills: draft.coreSkills,
      experienceYearsInRole: draft.experienceYearsInRole,
      targetSeniority: draft.targetSeniority,
      hardWorkModes: draft.hardWorkModes,
      softWorkModes: draft.softWorkModes,
      hardContractTypes: draft.hardContractTypes,
      softContractTypes: draft.softContractTypes,
      sectionNotes: draft.sectionNotes,
      generalNotes: draft.generalNotes,
    },
  });

  const submitProfileMutation = useMutation({
    mutationFn: async () => {
      if (!auth.token) {
        throw new Error('No auth token');
      }

      await createProfileInput(auth.token, {
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

      await generateCareerProfile(auth.token, {
        instructions: draft.generationInstructions || undefined,
      });
    },
    onSuccess: async () => {
      resetDraft();
      await queryClient.invalidateQueries({ queryKey: queryKeys.profileInputs.latest(auth.token) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.careerProfiles.latest(auth.token) });
      router.push('/app');
    },
  });

  const saveStepOne = stepOneForm.handleSubmit((values) => {
    patchDraft(values);
    setStep(2);
  });

  const hasReadyDocument = (documentsQuery.data ?? []).some((item) => item.extractionStatus === 'READY');

  const generationError =
    submitProfileMutation.error instanceof ApiError
      ? submitProfileMutation.error.message
      : submitProfileMutation.error instanceof Error
        ? submitProfileMutation.error.message
        : null;

  useEffect(() => {
    const server = latestProfileInputQuery.data?.intakePayload;
    if (!server) {
      return;
    }

    const isPristine =
      draft.desiredPositions.length === defaultOnboardingDraft.desiredPositions.length &&
      draft.jobDomains.length === defaultOnboardingDraft.jobDomains.length &&
      draft.coreSkills.length === defaultOnboardingDraft.coreSkills.length &&
      draft.targetSeniority.length === defaultOnboardingDraft.targetSeniority.length &&
      draft.hardWorkModes.length === defaultOnboardingDraft.hardWorkModes.length &&
      draft.softWorkModes.length === defaultOnboardingDraft.softWorkModes.length &&
      draft.hardContractTypes.length === defaultOnboardingDraft.hardContractTypes.length &&
      draft.softContractTypes.length === defaultOnboardingDraft.softContractTypes.length &&
      !draft.generalNotes;

    if (!isPristine) {
      return;
    }

    patchDraft({
      desiredPositions: server.desiredPositions ?? [],
      jobDomains: server.jobDomains ?? [],
      coreSkills: server.coreSkills ?? [],
      experienceYearsInRole: server.experienceYearsInRole ?? null,
      targetSeniority: server.targetSeniority ?? [],
      hardWorkModes: server.workModePreferences?.hard ?? [],
      softWorkModes: (server.workModePreferences?.soft ?? []).map((item) => item.value),
      hardContractTypes: server.contractPreferences?.hard ?? [],
      softContractTypes: (server.contractPreferences?.soft ?? []).map((item) => item.value),
      sectionNotes: {
        positions: server.sectionNotes?.positions ?? '',
        domains: server.sectionNotes?.domains ?? '',
        skills: server.sectionNotes?.skills ?? '',
        experience: server.sectionNotes?.experience ?? '',
        preferences: server.sectionNotes?.preferences ?? '',
      },
      generalNotes: server.generalNotes ?? '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestProfileInputQuery.data]);

  return {
    auth,
    step,
    setStep,
    latestProfileInputQuery,
    draft,
    patchDraft,
    stepOneForm,
    saveStepOne,
    documentsQuery,
    latestCareerProfileQuery,
    hasReadyDocument,
    submitProfileMutation,
    generationError,
  };
};
