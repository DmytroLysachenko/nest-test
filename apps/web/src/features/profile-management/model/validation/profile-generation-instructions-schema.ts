import { z } from 'zod';

export const profileGenerationInstructionsSchema = z.object({
  instructions: z.string().trim().optional(),
});

export type ProfileGenerationInstructionsFormValues = z.infer<typeof profileGenerationInstructionsSchema>;
