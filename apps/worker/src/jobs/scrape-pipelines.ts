import { defaultGeneralListingUrl, defaultListingUrl } from '../sources/pracuj-pl/constants';
import { crawlPracujPl } from '../sources/pracuj-pl/crawl';
import { normalizePracujPl } from '../sources/pracuj-pl/normalize';
import { parsePracujPl } from '../sources/pracuj-pl/parse';
import { buildPracujListingUrl } from '../sources/pracuj-pl/url-builder';
import { resolveTransportPolicy } from './transport-policy';

import type { ScrapeSourceJob } from '../types/jobs';
import type { ListingJobSummary, ParsedJob, ScrapeSourceAdapter, SourceFetchResult } from '../sources/types';
import type { Logger } from 'pino';

export type ScrapePipelineId = 'pracuj-pl' | 'pracuj-pl-it' | 'pracuj-pl-general';

type PipelineDefinition = ScrapeSourceAdapter & {
  id: ScrapePipelineId;
  buildListingUrl: (filters: NonNullable<ScrapeSourceJob['filters']>) => string;
};

const createPracujPipeline = (
  id: ScrapePipelineId,
  defaultUrl: string,
  buildListingUrl: PipelineDefinition['buildListingUrl'],
  normalizeSource: string,
): PipelineDefinition => ({
  id,
  defaultListingUrl: defaultUrl,
  buildListingUrl,
  normalizeSource,
  transportPolicy: resolveTransportPolicy(id),
  fetch: async ({ headless, listingUrl, limit, logger, options }) =>
    crawlPracujPl(
      headless,
      listingUrl,
      limit,
      logger as Logger | undefined,
      options as Parameters<typeof crawlPracujPl>[4],
    ) as Promise<SourceFetchResult>,
  parse: (pages) => parsePracujPl(pages),
  normalize: (jobs, source) => normalizePracujPl(jobs, source),
});

const pipelines: Record<ScrapePipelineId, PipelineDefinition> = {
  'pracuj-pl': createPracujPipeline(
    'pracuj-pl',
    defaultListingUrl,
    (filters) => buildPracujListingUrl(filters, 'pracuj-pl'),
    'pracuj-pl',
  ),
  'pracuj-pl-it': createPracujPipeline(
    'pracuj-pl-it',
    defaultListingUrl,
    (filters) => buildPracujListingUrl(filters, 'pracuj-pl-it'),
    'pracuj-pl-it',
  ),
  'pracuj-pl-general': createPracujPipeline(
    'pracuj-pl-general',
    defaultGeneralListingUrl,
    (filters) => buildPracujListingUrl(filters, 'pracuj-pl-general'),
    'pracuj-pl-general',
  ),
};

export const resolvePipeline = (source: string): PipelineDefinition => {
  if (source in pipelines) {
    return pipelines[source as ScrapePipelineId];
  }
  throw new Error(`Unknown source: ${source}`);
};

const isHighConfidenceListingSummary = (summary: ListingJobSummary) =>
  Boolean(
    summary.url &&
    summary.title?.trim() &&
    (summary.description?.trim() || summary.sourceId?.trim() || summary.company?.trim() || summary.details),
  );

export const buildSalvagedListingJobs = (summaries: ListingJobSummary[]): ParsedJob[] =>
  summaries.filter(isHighConfidenceListingSummary).map((summary) => ({
    title: summary.title!.trim(),
    company: summary.company,
    location: summary.location,
    description:
      summary.description?.trim() ||
      `Recovered from listing summary for ${summary.title!.trim()}${summary.company ? ` at ${summary.company}` : ''}.`,
    url: summary.url,
    salary: summary.salary,
    sourceId: summary.sourceId,
    requirements: [],
    tags: ['listing-salvage', 'degraded-source'],
    details: summary.details,
  }));

const canonicalizeUrl = (value: string) => {
  try {
    const url = new URL(value);
    url.search = '';
    url.hash = '';
    return url.toString().toLowerCase();
  } catch {
    return value.trim().toLowerCase();
  }
};

export const mergeParsedJobsWithListingSalvage = (
  parsedJobs: ParsedJob[],
  listingSummaries: ListingJobSummary[],
  skippedUrls: string[] = [],
) => {
  const parsedUrlSet = new Set(parsedJobs.map((job) => canonicalizeUrl(job.url)));
  const skippedUrlSet = new Set(skippedUrls.map((url) => canonicalizeUrl(url)));
  const salvagedJobs = buildSalvagedListingJobs(listingSummaries).filter((job) => {
    const normalizedUrl = canonicalizeUrl(job.url);
    return !parsedUrlSet.has(normalizedUrl) && !skippedUrlSet.has(normalizedUrl);
  });

  return [...parsedJobs, ...salvagedJobs];
};

export const runPipeline = async (
  source: string,
  input: {
    headless: boolean;
    listingUrl: string;
    limit?: number;
    logger: Logger | undefined;
    options?: Parameters<typeof crawlPracujPl>[4];
  },
) => {
  const pipeline = resolvePipeline(source);
  const crawlResult = await runFetchStage({
    headless: input.headless,
    listingUrl: input.listingUrl,
    limit: input.limit,
    logger: input.logger,
    options: input.options,
  });
  const detailParsedJobs = runParseStage(crawlResult);
  const parsedJobs = runPostProcessStage(detailParsedJobs, crawlResult, Boolean(input.options?.listingOnly));
  const normalized = runNormalizeStage(parsedJobs, pipeline.normalizeSource);

  return {
    pipeline,
    crawlResult,
    parsedJobs,
    normalized,
  };
};

export const runFetchStage = async (input: {
  headless: boolean;
  listingUrl: string;
  limit?: number;
  logger: Logger | undefined;
  options?: Parameters<typeof crawlPracujPl>[4];
}) => pipelines['pracuj-pl'].fetch(input) as Promise<Awaited<ReturnType<typeof crawlPracujPl>>>;

export const runParseStage = (crawlResult: Awaited<ReturnType<typeof runFetchStage>>) =>
  crawlResult.pages.length > 0 ? pipelines['pracuj-pl'].parse(crawlResult.pages) : [];

export const runPostProcessStage = (
  detailParsedJobs: ParsedJob[],
  crawlResult: Awaited<ReturnType<typeof runFetchStage>>,
  listingOnly = false,
) =>
  listingOnly
    ? []
    : mergeParsedJobsWithListingSalvage(detailParsedJobs, crawlResult.listingSummaries, crawlResult.skippedUrls);

export const runNormalizeStage = (parsedJobs: ParsedJob[], normalizeSource: string) =>
  pipelines['pracuj-pl'].normalize(parsedJobs, normalizeSource);
