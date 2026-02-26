'use client';

import { useForm } from 'react-hook-form';
import { zodFormResolver } from '@/shared/lib/forms/zod-form-resolver';

import {
  profileGenerationInstructionsSchema,
  type ProfileGenerationInstructionsFormValues,
} from '@/features/profile-management/model/validation/profile-generation-instructions-schema';

export const useProfileGenerationInstructionsForm = () =>
  useForm<ProfileGenerationInstructionsFormValues>({
    resolver: zodFormResolver<ProfileGenerationInstructionsFormValues>(profileGenerationInstructionsSchema),
    defaultValues: {
      instructions: '',
    },
  });
