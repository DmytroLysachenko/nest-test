import { z } from 'zod';

export const careerProfileSearchViewFormSchema = z.object({
  status: z.enum(['PENDING', 'READY', 'FAILED']),
  isActive: z.enum(['true', 'false']),
  seniority: z.string().trim().optional(),
  role: z.string().trim().optional(),
  keyword: z.string().trim().optional(),
  technology: z.string().trim().optional(),
  limit: z
    .string()
    .trim()
    .refine((value) => /^\d+$/.test(value), 'Limit must be a whole number')
    .refine((value) => Number(value) >= 1 && Number(value) <= 100, 'Limit must be between 1 and 100'),
  offset: z
    .string()
    .trim()
    .refine((value) => /^\d+$/.test(value), 'Offset must be a whole number'),
});

export type CareerProfileSearchViewFormValues = z.infer<typeof careerProfileSearchViewFormSchema>;
