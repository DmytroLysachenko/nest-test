import { z } from 'zod';

import type { ScrapeSourceJob } from '../types/jobs';

export type TaskName = 'scrape:source';

export type TaskPayloadMap = {
  'scrape:source': ScrapeSourceJob;
};

export type TaskEnvelope<T extends TaskName = TaskName> = {
  name: T;
  payload: TaskPayloadMap[T];
};

export const taskEnvelopeSchema = z.object({
  name: z.enum(['scrape:source']),
  payload: z.object({
    source: z.string().min(1),
    runId: z.string().optional(),
    listingUrl: z.string().url().optional(),
    limit: z.number().int().min(1).max(100).optional(),
    filters: z
      .object({
        specializations: z.array(z.string()).optional(),
        workModes: z.array(z.string()).optional(),
        location: z.string().optional(),
        employmentTypes: z.array(z.string()).optional(),
        experienceLevels: z.array(z.string()).optional(),
        keywords: z.string().optional(),
      })
      .optional(),
  }),
});
