import { z } from 'zod';

export const enqueueScrapeSchema = z
  .object({
    mode: z.enum(['profile', 'custom']),
    listingUrl: z.string().trim().url('Provide a valid URL').optional(),
    limit: z
      .string()
      .trim()
      .refine((value) => /^\d+$/.test(value), 'Limit must be a whole number')
      .refine((value) => Number(value) >= 1 && Number(value) <= 100, 'Limit must be between 1 and 100'),
  })
  .superRefine((data, context) => {
    if (data.mode === 'custom' && !data.listingUrl) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['listingUrl'],
        message: 'Listing URL is required for custom mode',
      });
    }
  });

export type EnqueueScrapeFormValues = z.infer<typeof enqueueScrapeSchema>;
