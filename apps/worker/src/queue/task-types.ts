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

export const TASK_SCHEMA_VERSION = '1' as const;

export const taskEnvelopeSchema = z.object({
  name: z.enum(['scrape:source']),
  payload: z.object({
    taskSchemaVersion: z.literal(TASK_SCHEMA_VERSION).optional(),
    source: z.string().min(1),
    runId: z.string().optional(),
    sourceRunId: z.string().uuid().optional(),
    traceId: z.string().uuid().optional(),
    requestId: z.string().optional(),
    dedupeKey: z.string().min(8).optional(),
    callbackUrl: z.string().url().optional(),
    heartbeatUrl: z.string().url().optional(),
    callbackToken: z.string().optional(),
    userId: z.string().uuid().optional(),
    careerProfileId: z.string().uuid().optional(),
    listingUrl: z.string().url().optional(),
    limit: z.number().int().min(1).max(100).optional(),
    filters: z
      .object({
        specializations: z.array(z.string()).optional(),
        workModes: z.array(z.string()).optional(),
        workDimensions: z.array(z.string()).optional(),
        location: z.string().optional(),
        radiusKm: z.number().int().min(1).max(200).optional(),
        publishedWithinDays: z
          .union([z.literal(1), z.literal(3), z.literal(7), z.literal(14), z.literal(30)])
          .optional(),
        positionLevels: z.array(z.string()).optional(),
        contractTypes: z.array(z.string()).optional(),
        technologies: z.array(z.string()).optional(),
        salaryMin: z.number().int().min(1).optional(),
        onlyWithProjectDescription: z.boolean().optional(),
        onlyEmployerOffers: z.boolean().optional(),
        ukrainiansWelcome: z.boolean().optional(),
        noPolishRequired: z.boolean().optional(),
        categories: z.array(z.string()).optional(),
        employmentTypes: z.array(z.string()).optional(),
        experienceLevels: z.array(z.string()).optional(),
        keywords: z.string().optional(),
      })
      .optional(),
    matchingFilters: z
      .object({
        specializations: z.array(z.string()).optional(),
        workModes: z.array(z.string()).optional(),
        workDimensions: z.array(z.string()).optional(),
        location: z.string().optional(),
        radiusKm: z.number().int().min(1).max(200).optional(),
        publishedWithinDays: z
          .union([z.literal(1), z.literal(3), z.literal(7), z.literal(14), z.literal(30)])
          .optional(),
        positionLevels: z.array(z.string()).optional(),
        contractTypes: z.array(z.string()).optional(),
        technologies: z.array(z.string()).optional(),
        salaryMin: z.number().int().min(1).optional(),
        onlyWithProjectDescription: z.boolean().optional(),
        onlyEmployerOffers: z.boolean().optional(),
        ukrainiansWelcome: z.boolean().optional(),
        noPolishRequired: z.boolean().optional(),
        categories: z.array(z.string()).optional(),
        employmentTypes: z.array(z.string()).optional(),
        experienceLevels: z.array(z.string()).optional(),
        keywords: z.string().optional(),
      })
      .optional(),
    adaptiveQueryWindow: z
      .object({
        min: z.number().int().min(1).max(100),
        max: z.number().int().min(1).max(100),
      })
      .optional(),
  }),
});
