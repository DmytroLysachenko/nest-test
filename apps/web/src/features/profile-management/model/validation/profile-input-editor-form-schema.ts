import { z } from 'zod';

export const profileInputEditorFormSchema = z.object({
  targetRoles: z.string().trim().min(2, 'Target roles are required'),
  notes: z.string().trim().optional(),
});

export type ProfileInputEditorFormValues = z.infer<typeof profileInputEditorFormSchema>;
