import { z } from 'zod';

export const profileInputFormSchema = z.object({
  targetRoles: z.string().trim().min(2, 'Target roles are required'),
  notes: z.string().trim().optional(),
});

export type ProfileInputFormValues = z.infer<typeof profileInputFormSchema>;
