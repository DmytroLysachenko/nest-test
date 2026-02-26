'use client';

import { zodFormResolver } from '@/shared/lib/forms/zod-form-resolver';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import { useRequireAuth } from '@/features/auth/model/context/auth-context';
import { useOnboardingMutations } from '@/features/onboarding/model/hooks/use-onboarding-mutations';
import { useOnboardingQueries } from '@/features/onboarding/model/hooks/use-onboarding-queries';
import { useOnboardingDraftStore } from '@/features/onboarding/model/state/onboarding-draft-store';
import {
  onboardingStepOneSchema,
  type OnboardingStepOneValues,
} from '@/features/onboarding/model/validation/onboarding-step-one-schema';
import { defaultOnboardingDraft } from '@/features/onboarding/model/types/onboarding-draft';
import { toUserErrorMessage } from '@/shared/lib/http/to-user-error-message';

export const useOnboardingPage = () => {
  const auth = useRequireAuth();
  const { draft, step, setStep, patchDraft, resetDraft } = useOnboardingDraftStore();

  const { latestCareerProfileQuery, onboardingDraftQuery, documentsQuery } = useOnboardingQueries(auth.token);

  const stepOneForm = useForm<OnboardingStepOneValues>({
    resolver: zodFormResolver<OnboardingStepOneValues>(onboardingStepOneSchema),
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

  const { submitProfileMutation, saveDraftMutation, clearDraftMutation } = useOnboardingMutations({
    token: auth.token,
    draft,
    resetDraft,
  });

  const saveStepOne = stepOneForm.handleSubmit((values) => {
    patchDraft(values);
    if (auth.token) {
      saveDraftMutation.mutate(values as Record<string, unknown>);
    }
    setStep(2);
  });

  const hasReadyDocument = (documentsQuery.data ?? []).some((item) => item.extractionStatus === 'READY');

  const generationError = submitProfileMutation.error
    ? toUserErrorMessage(submitProfileMutation.error, 'Failed to generate profile')
    : null;

  useEffect(() => {
    const server = onboardingDraftQuery.data?.payload as Record<string, unknown> | null | undefined;
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
      desiredPositions: Array.isArray(server.desiredPositions) ? (server.desiredPositions as string[]) : [],
      jobDomains: Array.isArray(server.jobDomains) ? (server.jobDomains as string[]) : [],
      coreSkills: Array.isArray(server.coreSkills) ? (server.coreSkills as string[]) : [],
      experienceYearsInRole: typeof server.experienceYearsInRole === 'number' ? server.experienceYearsInRole : null,
      targetSeniority: Array.isArray(server.targetSeniority)
        ? (server.targetSeniority as Array<'intern' | 'junior' | 'mid' | 'senior' | 'lead' | 'manager'>)
        : [],
      hardWorkModes: Array.isArray(server.hardWorkModes)
        ? (server.hardWorkModes as Array<'remote' | 'hybrid' | 'onsite' | 'mobile'>)
        : [],
      softWorkModes: Array.isArray(server.softWorkModes)
        ? (server.softWorkModes as Array<'remote' | 'hybrid' | 'onsite' | 'mobile'>)
        : [],
      hardContractTypes: Array.isArray(server.hardContractTypes)
        ? (server.hardContractTypes as Array<'uop' | 'b2b' | 'mandate' | 'specific-task' | 'internship'>)
        : [],
      softContractTypes: Array.isArray(server.softContractTypes)
        ? (server.softContractTypes as Array<'uop' | 'b2b' | 'mandate' | 'specific-task' | 'internship'>)
        : [],
      sectionNotes: {
        positions:
          typeof server.sectionNotes === 'object' && server.sectionNotes && 'positions' in server.sectionNotes
            ? String((server.sectionNotes as Record<string, unknown>).positions ?? '')
            : '',
        domains:
          typeof server.sectionNotes === 'object' && server.sectionNotes && 'domains' in server.sectionNotes
            ? String((server.sectionNotes as Record<string, unknown>).domains ?? '')
            : '',
        skills:
          typeof server.sectionNotes === 'object' && server.sectionNotes && 'skills' in server.sectionNotes
            ? String((server.sectionNotes as Record<string, unknown>).skills ?? '')
            : '',
        experience:
          typeof server.sectionNotes === 'object' && server.sectionNotes && 'experience' in server.sectionNotes
            ? String((server.sectionNotes as Record<string, unknown>).experience ?? '')
            : '',
        preferences:
          typeof server.sectionNotes === 'object' && server.sectionNotes && 'preferences' in server.sectionNotes
            ? String((server.sectionNotes as Record<string, unknown>).preferences ?? '')
            : '',
      },
      generalNotes: typeof server.generalNotes === 'string' ? server.generalNotes : '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardingDraftQuery.data]);

  return {
    auth,
    step,
    setStep,
    onboardingDraftQuery,
    saveDraftMutation,
    clearDraftMutation,
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
