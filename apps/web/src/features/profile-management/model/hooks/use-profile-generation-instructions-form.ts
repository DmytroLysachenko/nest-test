'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  profileGenerationInstructionsSchema,
  type ProfileGenerationInstructionsFormValues,
} from '@/features/profile-management/model/validation/profile-generation-instructions-schema';

export const useProfileGenerationInstructionsForm = () =>
  useForm<ProfileGenerationInstructionsFormValues>({
    resolver: zodResolver(profileGenerationInstructionsSchema),
    defaultValues: {
      instructions: '',
    },
  });
