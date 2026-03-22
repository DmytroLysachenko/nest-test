import { defaultGeneralListingUrl, defaultListingUrl } from '../sources/pracuj-pl/constants';
import { crawlPracujPl } from '../sources/pracuj-pl/crawl';
import { normalizePracujPl } from '../sources/pracuj-pl/normalize';
import { parsePracujPl } from '../sources/pracuj-pl/parse';
import { buildPracujListingUrl } from '../sources/pracuj-pl/url-builder';
import { resolveTransportPolicy } from './transport-policy';

import type { ScrapeSourceJob } from '../types/jobs';
import type { ListingJobSummary, ParsedJob } from '../sources/types';

export type ScrapePipelineId = 'pracuj-pl' | 'pracuj-pl-it' | 'pracuj-pl-general';

type PipelineDefinition = {
  id: ScrapePipelineId;
  defaultListingUrl: string;
  buildListingUrl: (filters: NonNullable<ScrapeSourceJob['filters']>) => string;
  normalizeSource: string;
  transportPolicy: ReturnType<typeof resolveTransportPolicy>;
};

const pipelines: Record<ScrapePipelineId, PipelineDefinition> = {
  'pracuj-pl': {
    id: 'pracuj-pl',
    defaultListingUrl,
    buildListingUrl: (filters) => buildPracujListingUrl(filters, 'pracuj-pl'),
    normalizeSource: 'pracuj-pl',
    transportPolicy: resolveTransportPolicy('pracuj-pl'),
  },
  'pracuj-pl-it': {
    id: 'pracuj-pl-it',
    defaultListingUrl,
    buildListingUrl: (filters) => buildPracujListingUrl(filters, 'pracuj-pl-it'),
    normalizeSource: 'pracuj-pl-it',
    transportPolicy: resolveTransportPolicy('pracuj-pl-it'),
  },
  'pracuj-pl-general': {
    id: 'pracuj-pl-general',
    defaultListingUrl: defaultGeneralListingUrl,
    buildListingUrl: (filters) => buildPracujListingUrl(filters, 'pracuj-pl-general'),
    normalizeSource: 'pracuj-pl-general',
    transportPolicy: resolveTransportPolicy('pracuj-pl-general'),
  },
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

export const runPipeline = async (
  source: string,
  input: {
    headless: boolean;
    listingUrl: string;
    limit?: number;
    logger: Parameters<typeof crawlPracujPl>[3];
    options?: Parameters<typeof crawlPracujPl>[4];
  },
) => {
  const pipeline = resolvePipeline(source);
  const crawlResult = await crawlPracujPl(input.headless, input.listingUrl, input.limit, input.logger, input.options);
  const parsedJobs =
    crawlResult.pages.length > 0
      ? parsePracujPl(crawlResult.pages)
      : input.options?.listingOnly
        ? []
        : buildSalvagedListingJobs(crawlResult.listingSummaries);
  const normalized = normalizePracujPl(parsedJobs, pipeline.normalizeSource);

  return {
    pipeline,
    crawlResult,
    parsedJobs,
    normalized,
  };
};
