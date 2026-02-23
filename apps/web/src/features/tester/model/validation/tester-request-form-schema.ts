import { z } from 'zod';

export const testerRequestFormSchema = z.object({
  service: z.enum(['api', 'worker']),
  method: z.enum(['GET', 'POST', 'PATCH', 'DELETE']),
  path: z.string().trim().min(1, 'Path is required'),
  useApiToken: z.enum(['yes', 'no']),
  workerToken: z.string().optional(),
  headersText: z.string().optional(),
  bodyText: z.string().optional(),
});

export type TesterRequestFormValues = z.infer<typeof testerRequestFormSchema>;
