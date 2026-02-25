'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { defaultOnboardingDraft, type OnboardingDraft } from '@/features/onboarding/model/types/onboarding-draft';

type OnboardingDraftState = {
  draft: OnboardingDraft;
  step: 1 | 2 | 3;
  setStep: (next: 1 | 2 | 3) => void;
  patchDraft: (patch: Partial<OnboardingDraft>) => void;
  resetDraft: () => void;
};

export const useOnboardingDraftStore = create<OnboardingDraftState>()(
  persist(
    (set) => ({
      draft: defaultOnboardingDraft,
      step: 1,
      setStep: (next) => set(() => ({ step: next })),
      patchDraft: (patch) =>
        set((state) => ({
          draft: {
            ...state.draft,
            ...patch,
            sectionNotes: {
              ...state.draft.sectionNotes,
              ...(patch.sectionNotes ?? {}),
            },
          },
        })),
      resetDraft: () =>
        set(() => ({
          draft: defaultOnboardingDraft,
          step: 1,
        })),
    }),
    {
      name: 'onboarding-draft-v1',
    },
  ),
);
