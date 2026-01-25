import { load } from 'cheerio';

import type { JobDetails, ParsedJob, RawPage } from '../types';

type JsonLdJob = {
  '@type'?: string;
  title?: string;
  description?: string;
  employmentType?: string | string[];
  hiringOrganization?: { name?: string } | string;
  jobLocation?:
    | { address?: { addressLocality?: string; addressRegion?: string; streetAddress?: string } }
    | Array<{ address?: { addressLocality?: string; addressRegion?: string; streetAddress?: string } }>;
  baseSalary?: {
    value?: { value?: number; minValue?: number; maxValue?: number; unitText?: string };
    currency?: string;
  };
  identifier?: { value?: string };
  responsibilities?: string;
  experienceRequirements?: string;
  jobBenefits?: string;
};

const extractJsonLdBlocks = (html: string) => {
  const blocks: string[] = [];
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match = regex.exec(html);
  while (match) {
    blocks.push(match[1]);
    match = regex.exec(html);
  }
  return blocks;
};

const toText = (value?: string) => (value ? value.replace(/<[^>]+>/g, '').trim() : '');
const cleanText = (value?: string) => (value ? value.replace(/\s+/g, ' ').trim() : '');
const pickString = (value: unknown) => (typeof value === 'string' && value.trim().length ? value.trim() : undefined);

const extractNextDataJson = (html: string) => {
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!match) {
    return null;
  }
  try {
    return JSON.parse(match[1]) as unknown;
  } catch {
    return null;
  }
};

const findJobOfferData = (html: string) => {
  const data = extractNextDataJson(html) as
    | {
        props?: {
          pageProps?: {
            dehydratedState?: {
              queries?: Array<{
                queryKey?: unknown[];
                state?: { data?: Record<string, unknown> };
              }>;
            };
          };
        };
      }
    | null;
  const queries = data?.props?.pageProps?.dehydratedState?.queries;
  if (!Array.isArray(queries)) {
    return null;
  }
  for (const query of queries) {
    const key = query.queryKey;
    if (Array.isArray(key) && key[0] === 'jobOffer') {
      return query.state?.data ?? null;
    }
  }
  return null;
};

const splitList = (value?: string) => {
  if (!value) {
    return [];
  }
  const parts = value
    .split(/,\s*/)
    .map((item) => item.trim())
    .filter(Boolean);
  return parts.length ? parts : [];
};

const buildDescription = (lines: string[]) => {
  if (!lines.length) {
    return '';
  }
  return lines.join(' ');
};

const extractTextBySelectors = (html: string, selectors: string[]) => {
  const $ = load(html);
  for (const selector of selectors) {
    const text = cleanText($(selector).first().text());
    if (text) {
      return text;
    }
  }
  return '';
};

const extractListBySelectors = (html: string, selectors: string[]) => {
  const $ = load(html);
  for (const selector of selectors) {
    const items = $(selector)
      .find('li')
      .map((_, el) => cleanText($(el).text()))
      .get()
      .filter(Boolean);
    if (items.length) {
      return items;
    }
  }
  return [];
};

const extractChipText = (value: string) =>
  cleanText(value.replace(/[,;]\s*$/, '').replace(/\s*\|\s*/g, ' '));

const extractChips = (html: string, selectors: string[]) => {
  const $ = load(html);
  for (const selector of selectors) {
    const items = $(selector)
      .find('li, [data-test*="chip"], [class*="chip"], [class*="tag"]')
      .map((_, el) => extractChipText($(el).text()))
      .get()
      .filter(Boolean);
    if (items.length) {
      return items;
    }
  }
  return [];
};

const findSectionByHeading = ($: ReturnType<typeof load>, patterns: RegExp[]) => {
  const headings = $('h1, h2, h3, h4');
  for (const heading of headings.toArray()) {
    const text = cleanText($(heading).text());
    if (patterns.some((pattern) => pattern.test(text))) {
      return $(heading).closest('section, div');
    }
  }
  return null;
};

const extractChipsByHeading = (html: string, headingPatterns: RegExp[], subheadingPatterns?: RegExp[]) => {
  const $ = load(html);
  const section = findSectionByHeading($, headingPatterns);
  if (!section) {
    return [];
  }
  if (!subheadingPatterns?.length) {
    const items = section
      .find('li, [data-test*="chip"], [class*="chip"], [class*="tag"]')
      .map((_, el) => extractChipText($(el).text()))
      .get()
      .filter(Boolean);
    return items;
  }

  const subheadings = section.find('h3, h4, h5, strong');
  for (const subheading of subheadings.toArray()) {
    const text = cleanText($(subheading).text());
    if (!subheadingPatterns.some((pattern) => pattern.test(text))) {
      continue;
    }
    const container = $(subheading).closest('div, section');
    const items = container
      .find('li, [data-test*="chip"], [class*="chip"], [class*="tag"]')
      .map((_, el) => extractChipText($(el).text()))
      .get()
      .filter(Boolean);
    if (items.length) {
      return items;
    }
  }

  return [];
};

const extractSectionTextByHeading = (html: string, headingPatterns: RegExp[]) => {
  const $ = load(html);
  const section = findSectionByHeading($, headingPatterns);
  if (!section) {
    return undefined;
  }
  const text = cleanText(
    section
      .find('p')
      .map((_, el) => $(el).text())
      .get()
      .join(' '),
  );
  return text || undefined;
};

const extractJobOfferSections = (jobOffer: Record<string, unknown> | null) => {
  const sections = Array.isArray(jobOffer?.textSections) ? (jobOffer?.textSections as Array<Record<string, unknown>>) : [];
  const collect = (type: string) =>
    sections
      .filter((section) => section.sectionType === type)
      .flatMap((section) => (Array.isArray(section.textElements) ? section.textElements : []))
      .map((item) => cleanText(String(item)))
      .filter(Boolean);

  const sectionTitle = (type: string) => {
    const section = sections.find((item) => item.sectionType === type);
    return section?.title ? cleanText(String(section.title)) : undefined;
  };

  return {
    responsibilities: collect('responsibilities'),
    requirementsExpected: collect('requirements-expected'),
    requirementsOptional: collect('requirements-optional'),
    technologiesExpected: collect('technologies-expected'),
    technologiesOptional: collect('technologies-optional'),
    benefits: collect('benefits'),
    offered: collect('offered'),
    companyDescription: collect('about-us-description'),
    companyTitle: sectionTitle('about-us-description'),
  };
};

const collectDetails = (html: string, jsonLd?: JsonLdJob | null): JobDetails | undefined => {
  const jobOffer = findJobOfferData(html);
  const offerSections = extractJobOfferSections(jobOffer);

  const expectedTech = extractChipsByHeading(html, [/Technologies we use/i, /Technologie/i], [
    /Expected/i,
    /Wymagane/i,
  ]);
  const optionalTech = extractChipsByHeading(html, [/Technologies we use/i, /Technologie/i], [
    /Optional/i,
    /Mile widziane/i,
  ]);
  const allTech =
    expectedTech.length || optionalTech.length
      ? Array.from(new Set([...expectedTech, ...optionalTech]))
      : extractChipsByHeading(html, [/Technologies we use/i, /Technologie/i]);

  const workModes = extractChips(html, ['[data-test="offer-work-modes"]', '[data-test="offer-workmode"]']);
  const contractTypes = extractChips(html, ['[data-test="offer-contracts"]', '[data-test="offer-contracts-types"]']);
  const positionLevels = extractChips(html, ['[data-test="offer-position-levels"]']);
  const workSchedules = extractChips(html, ['[data-test="offer-work-schedules"]']);
  const benefits = offerSections.benefits.length
    ? offerSections.benefits
    : extractChips(html, ['[data-test="section-benefits"]', '[data-test="offer-benefits"]']);
  const jsonLdBenefits = splitList(jsonLd?.jobBenefits);
  const requiredReq = offerSections.requirementsExpected;
  const optionalReq = offerSections.requirementsOptional;
  const allReq = requiredReq.length || optionalReq.length ? Array.from(new Set([...requiredReq, ...optionalReq])) : [];
  const companyDescription =
    offerSections.companyDescription.length > 0
      ? buildDescription(offerSections.companyDescription)
      : extractSectionTextByHeading(html, [/About company/i, /O firmie/i, /O pracodawcy/i]);

  if (
    !allTech.length &&
    !workModes.length &&
    !contractTypes.length &&
    !positionLevels.length &&
    !workSchedules.length &&
    !benefits.length &&
    !companyDescription
  ) {
    return undefined;
  }

  return {
    technologies:
      allTech.length || expectedTech.length || optionalTech.length || offerSections.technologiesExpected.length
        ? {
            all: allTech.length ? allTech : offerSections.technologiesExpected,
            required: expectedTech.length ? expectedTech : offerSections.technologiesExpected,
            niceToHave: optionalTech.length ? optionalTech : offerSections.technologiesOptional,
          }
        : undefined,
    requirements:
      allReq.length
        ? {
            all: allReq,
            required: requiredReq.length ? requiredReq : undefined,
            niceToHave: optionalReq.length ? optionalReq : undefined,
          }
        : undefined,
    workModes: workModes.length ? workModes : undefined,
    contractTypes: contractTypes.length ? contractTypes : undefined,
    positionLevels: positionLevels.length ? positionLevels : undefined,
    workSchedules: workSchedules.length ? workSchedules : undefined,
    benefits: benefits.length ? benefits : jsonLdBenefits.length ? jsonLdBenefits : undefined,
    companyDescription,
  };
};

const normalizeSalary = (job: JsonLdJob | null) => {
  if (!job) {
    return null;
  }
  const currency = job.baseSalary?.currency ?? '';
  const value = job.baseSalary?.value;
  if (!value) {
    return null;
  }
  const min = value.minValue ?? value.value;
  const max = value.maxValue;
  const unit = value.unitText ?? '';
  if (min && max) {
    return `${min}-${max} ${currency} ${unit}`.trim();
  }
  if (min) {
    return `${min} ${currency} ${unit}`.trim();
  }
  return null;
};

const findJobPosting = (blocks: string[]) => {
  for (const block of blocks) {
    try {
      const data = JSON.parse(block) as JsonLdJob | JsonLdJob[] | { ['@graph']?: JsonLdJob[] };
      const graph = (data as { ['@graph']?: JsonLdJob[] })['@graph'];
      const list = Array.isArray(data)
        ? data
        : Array.isArray(graph)
          ? graph
          : [data as JsonLdJob];
      const posting = list.find((item) => item['@type'] === 'JobPosting');
      if (posting) {
        return posting;
      }
    } catch {
      continue;
    }
  }
  return null;
};

const fallbackTitle = (html: string) => {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return match ? toText(match[1]) : 'Unknown title';
};

const extractSourceId = (url: string) => {
  const match = url.match(/,oferta,(\d+)/);
  return match?.[1] ?? null;
};

export const parsePracujPl = (pages: RawPage[]): ParsedJob[] => {
  return pages.map((page) => {
    const jsonLd = findJobPosting(extractJsonLdBlocks(page.html));
    const employmentType = Array.isArray(jsonLd?.employmentType)
      ? jsonLd?.employmentType.join(', ')
      : jsonLd?.employmentType;

    const jobLocation = Array.isArray(jsonLd?.jobLocation) ? jsonLd?.jobLocation?.[0] : jsonLd?.jobLocation;
    const location = jobLocation?.address?.addressLocality;
    const region = jobLocation?.address?.addressRegion;
    const combinedLocation = [location, region].filter(Boolean).join(', ');

    const hiringOrg =
      typeof jsonLd?.hiringOrganization === 'string'
        ? jsonLd?.hiringOrganization
        : jsonLd?.hiringOrganization?.name;

    const jobOffer = findJobOfferData(page.html);
    const offerSections = extractJobOfferSections(jobOffer);

    const title =
      jsonLd?.title?.trim() ||
      extractTextBySelectors(page.html, ['[data-test="offer-title"]', 'h1']) ||
      fallbackTitle(page.html);
    const company =
      hiringOrg?.trim() ||
      pickString((jobOffer as Record<string, unknown> | null)?.employerName) ||
      extractTextBySelectors(page.html, ['[data-test="offer-company"]', '[data-test="text-company-name"]']) ||
      extractTextBySelectors(page.html, ['[data-test="text-employerName"]']) ||
      undefined;
    const locationText =
      combinedLocation ||
      extractTextBySelectors(page.html, ['[data-test="offer-location"]', '[data-test="text-region"]']) ||
      undefined;
    const description =
      cleanText(toText(jsonLd?.description)) ||
      cleanText(jsonLd?.responsibilities) ||
      buildDescription(offerSections.responsibilities) ||
      extractTextBySelectors(page.html, [
        '[data-test="section-offer-description"]',
        '[data-test="offer-description"]',
        '[data-test="text-job-description"]',
      ]) ||
      'No description found';
    const salary = normalizeSalary(jsonLd) || undefined;
    const requirements =
      offerSections.requirementsExpected.length || offerSections.requirementsOptional.length
        ? [...offerSections.requirementsExpected, ...offerSections.requirementsOptional]
        : splitList(jsonLd?.experienceRequirements);
    const details = collectDetails(page.html, jsonLd);

    return {
      title,
      company,
      location: locationText,
      description,
      url: page.url,
      salary,
      employmentType: employmentType?.toString(),
      sourceId: extractSourceId(page.url) ?? undefined,
      requirements,
      details,
    };
  });
};
