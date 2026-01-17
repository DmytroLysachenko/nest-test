import { z } from 'zod';

import { ScrapeSourceJob } from '../types/jobs';

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
  }),
});
