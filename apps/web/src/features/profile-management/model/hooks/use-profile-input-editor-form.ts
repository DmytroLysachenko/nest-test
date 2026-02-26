'use client';

import { zodFormResolver } from '@/shared/lib/forms/zod-form-resolver';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';

import {
  profileInputEditorFormSchema,
  type ProfileInputEditorFormValues,
} from '@/features/profile-management/model/validation/profile-input-editor-form-schema';

type UseProfileInputEditorFormArgs = {
  initialTargetRoles?: string;
  initialNotes?: string;
};

export const useProfileInputEditorForm = ({ initialTargetRoles, initialNotes }: UseProfileInputEditorFormArgs) => {
  const form = useForm<ProfileInputEditorFormValues>({
    resolver: zodFormResolver<ProfileInputEditorFormValues>(profileInputEditorFormSchema),
    defaultValues: {
      targetRoles: initialTargetRoles ?? '',
      notes: initialNotes ?? '',
    },
  });

  useEffect(() => {
    form.reset({
      targetRoles: initialTargetRoles ?? '',
      notes: initialNotes ?? '',
    });
  }, [form, initialNotes, initialTargetRoles]);

  return form;
};
