import { z } from 'zod';

export const careerProfileGenerationFormSchema = z.object({
  instructions: z.string().trim().optional(),
});

export type CareerProfileGenerationFormValues = z.infer<typeof careerProfileGenerationFormSchema>;
