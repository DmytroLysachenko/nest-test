import { z } from 'zod';

export const jobMatchingFormSchema = z.object({
  jobDescription: z.string().trim().min(20, 'Paste a fuller job description (at least 20 characters)'),
  minScore: z
    .string()
    .trim()
    .refine((value) => /^\d+$/.test(value), 'Minimum score must be a whole number')
    .refine((value) => Number(value) >= 0 && Number(value) <= 100, 'Minimum score must be between 0 and 100'),
});

export type JobMatchingFormValues = z.infer<typeof jobMatchingFormSchema>;
