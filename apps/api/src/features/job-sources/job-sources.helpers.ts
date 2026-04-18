import { createHash } from 'crypto';

import { BadRequestException } from '@nestjs/common';
import {
  type JobOfferQualityState,
  normalizeScrapeEmptyReason,
  normalizeScrapeResultKind,
  normalizeScrapeSourceQuality,
  classifyScrapeOutcome,
} from '@repo/db';

import {
  type CallbackJobPayload,
  type RunFailureType,
  type PersistableOfferPayload,
  type RunStatus,
  type RunStoryPhase,
  type RunStoryVisibility,
} from './job-sources.types';
import { ScrapeCompleteDto } from './dto/scrape-complete.dto';

export const normalizeString = (value: string | undefined | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

export const normalizeDateString = (value: string | undefined | null) => {
  const normalized = normalizeString(value);
  if (!normalized) {
    return null;
  }
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

export const parseOptionalDate = (value: string | undefined | null) => {
  const normalized = normalizeDateString(value);
  return normalized ? new Date(normalized) : null;
};

export const sanitizeStringArray = (value: string[] | undefined | null) =>
  Array.from(new Set((value ?? []).map((item) => item.trim()).filter(Boolean)));

export const toRunFailureType = (value?: string | null): RunFailureType | null => {
  if (!value) {
    return null;
  }
  if (
    value === 'timeout' ||
    value === 'network' ||
    value === 'validation' ||
    value === 'parse' ||
    value === 'callback'
  ) {
    return value;
  }
  return 'unknown';
};

export const normalizeCompletionStatus = (dto: ScrapeCompleteDto) => dto.status ?? 'COMPLETED';

export const sanitizeCallbackJobs = (jobs: ScrapeCompleteDto['jobs']) => {
  if (!jobs?.length) {
    return [];
  }

  const dedupByUrl = new Map<string, CallbackJobPayload>();
  for (const job of jobs) {
    const url = normalizeString(job.url);
    const title = normalizeString(job.title);
    const description = normalizeString(job.description);
    if (!url || !title || !description) {
      continue;
    }
    dedupByUrl.set(url.toLowerCase(), {
      ...job,
      url,
      title,
      description,
      source: normalizeString(job.source) ?? undefined,
      sourceId: normalizeString(job.sourceId) ?? undefined,
      applyUrl: normalizeString(job.applyUrl) ?? undefined,
      postedAt: normalizeString(job.postedAt) ?? undefined,
      expiresAt: normalizeDateString(job.expiresAt) ?? undefined,
      sourceCompanyProfileUrl: normalizeString(job.sourceCompanyProfileUrl) ?? undefined,
      company: normalizeString(job.company) ?? undefined,
      location: normalizeString(job.location) ?? undefined,
      salary: normalizeString(job.salary) ?? undefined,
      employmentType: normalizeString(job.employmentType) ?? undefined,
      isExpired: job.isExpired,
      requirements: sanitizeStringArray(job.requirements),
      details: job.details ?? undefined,
      tags: sanitizeStringArray(job.tags),
      rawPayload: job.rawPayload ?? undefined,
    });
  }

  return Array.from(dedupByUrl.values());
};

export const deriveFailureType = (error?: string | null): RunFailureType | null => {
  const normalized = (error ?? '').toLowerCase();
  if (!normalized) {
    return null;
  }
  if (normalized.includes('[timeout]') || normalized.includes('timed out')) {
    return 'timeout';
  }
  if (normalized.includes('[network]') || normalized.includes('cloudflare') || normalized.includes('fetch')) {
    return 'network';
  }
  if (normalized.includes('[validation]') || normalized.includes('invalid') || normalized.includes('required')) {
    return 'validation';
  }
  if (normalized.includes('[parse]') || normalized.includes('parse')) {
    return 'parse';
  }
  if (normalized.includes('[callback]') || normalized.includes('callback')) {
    return 'callback';
  }
  return 'unknown';
};

export const canonicalize = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((item) => canonicalize(item));
  }
  if (value && typeof value === 'object') {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = canonicalize((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }
  return value;
};

export const stableJson = (value: unknown) => JSON.stringify(canonicalize(value ?? null));
export const computeSha256Hex = (value: unknown) => createHash('sha256').update(stableJson(value)).digest('hex');

export const normalizeOfferUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString().toLowerCase();
  } catch {
    return value.toLowerCase();
  }
};

export const computeOfferIdentityKey = (job: { sourceId?: string | null; url: string }) => {
  const sourceId = normalizeString(job.sourceId);
  if (sourceId) {
    return `source:${sourceId.toLowerCase()}`;
  }
  return `url:${normalizeOfferUrl(job.url)}`;
};

export const resolveCallbackPayloadHash = (dto: ScrapeCompleteDto) =>
  normalizeString(dto.payloadHash) ??
  computeSha256Hex({
    eventId: normalizeString(dto.eventId),
    source: normalizeString(dto.source),
    runId: normalizeString(dto.runId),
    sourceRunId: dto.sourceRunId,
    attemptNo: dto.attemptNo ?? 1,
    emittedAt: normalizeString(dto.emittedAt),
    listingUrl: normalizeString(dto.listingUrl),
    status: dto.status ?? 'COMPLETED',
    scrapedCount: dto.scrapedCount ?? null,
    totalFound: dto.totalFound ?? null,
    jobCount: dto.jobCount ?? null,
    jobLinkCount: dto.jobLinkCount ?? null,
    outputPath: normalizeString(dto.outputPath),
    error: normalizeString(dto.error),
    failureType: normalizeString(dto.failureType),
    failureCode: normalizeString(dto.failureCode),
    jobs: dto.jobs ?? [],
    diagnostics: dto.diagnostics ?? null,
  });

export const resolveClassifiedOutcome = (input: {
  status: RunStatus;
  failureType: RunFailureType | null;
  diagnostics: Record<string, unknown> | null;
  scrapedCount?: number | null;
}) => {
  return classifyScrapeOutcome({
    status: input.status,
    failureType: input.failureType ?? undefined,
    resultKind: normalizeScrapeResultKind(input.diagnostics?.resultKind as string | null | undefined),
    emptyReason: normalizeScrapeEmptyReason(input.diagnostics?.emptyReason as string | null | undefined),
    scrapedCount: input.scrapedCount ?? 0,
    failureReason: typeof input.diagnostics?.failureReason === 'string' ? input.diagnostics.failureReason : undefined,
  });
};

export const resolveCompletedCallbackOutcome = (input: {
  diagnostics: Record<string, unknown> | null;
  scrapedCount: number;
  totalFound: number | null;
}) => {
  const diagnostics = input.diagnostics ?? {};
  const derivedDiagnostics =
    Object.keys(diagnostics).length > 0
      ? diagnostics
      : input.scrapedCount > 0
        ? ({ resultKind: 'healthy' } satisfies Record<string, unknown>)
        : (input.totalFound ?? 0) > 0
          ? ({ resultKind: 'empty', emptyReason: 'detail_parse_gap' } satisfies Record<string, unknown>)
          : ({ resultKind: 'empty', emptyReason: 'no_listings' } satisfies Record<string, unknown>);

  const emptyReason =
    normalizeScrapeEmptyReason(String(derivedDiagnostics.emptyReason ?? '')) ??
    ((input.scrapedCount ?? 0) === 0 && (input.totalFound ?? 0) > 0 ? 'detail_parse_gap' : null);
  const sourceQuality =
    normalizeScrapeSourceQuality(String(derivedDiagnostics.sourceQuality ?? '')) ??
    (input.scrapedCount > 0
      ? ('healthy' as const)
      : emptyReason === 'detail_parse_gap'
        ? ('degraded' as const)
        : ('empty' as const));

  return {
    classifiedOutcome: resolveClassifiedOutcome({
      status: 'COMPLETED',
      failureType: null,
      diagnostics: derivedDiagnostics,
      scrapedCount: input.scrapedCount,
    }),
    emptyReason,
    sourceQuality,
  };
};
