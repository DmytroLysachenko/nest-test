import type { JobDetails, ListingJobSummary } from '../types';

const urlPattern = /,oferta,\d+/;

const isJobUrl = (value: string) => urlPattern.test(value);

const normalizeUrl = (value: string) => {
  try {
    const url = new URL(value);
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return value;
  }
};

const pickString = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : undefined;
  }
  return undefined;
};

const extractUrl = (obj: Record<string, unknown>) => {
  const candidates = ['offerUrl', 'offerAbsoluteUri', 'url', 'link', 'jobUrl'];
  for (const key of candidates) {
    const value = pickString(obj[key]);
    if (value && isJobUrl(value)) {
      return normalizeUrl(value);
    }
  }
  return undefined;
};

const extractTitle = (obj: Record<string, unknown>) => {
  return (
    pickString(obj.offerTitle) ||
    pickString(obj.title) ||
    pickString(obj.jobTitle) ||
    pickString(obj.position) ||
    pickString(obj.name)
  );
};

const extractCompany = (obj: Record<string, unknown>) => {
  const company = obj.company ?? obj.employer ?? obj.companyName ?? obj.companyTitle;
  return pickString(company);
};

const extractLocation = (obj: Record<string, unknown>) => {
  const location = obj.location ?? obj.city ?? obj.region ?? obj.workplace;
  return pickString(location);
};

const extractSourceId = (url: string) => {
  const match = url.match(/,oferta,(\d+)/);
  return match?.[1];
};

const extractStringArray = (value: unknown) => {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const items = value.map((item) => pickString(item)).filter(Boolean);
  return items.length ? (items as string[]) : undefined;
};

const buildDetails = (obj: Record<string, unknown>, offerObj?: Record<string, unknown>): JobDetails | undefined => {
  const technologies = extractStringArray(obj.technologies);
  const positionLevels = extractStringArray(obj.positionLevels);
  const contractTypes = extractStringArray(obj.typesOfContract);
  const workSchedules = extractStringArray(obj.workSchedules);
  const workModes = extractStringArray(obj.workModes);
  const workplace = pickString(offerObj?.displayWorkplace) ?? extractLocation(obj);

  if (
    !technologies &&
    !positionLevels &&
    !contractTypes &&
    !workSchedules &&
    !workModes &&
    !workplace
  ) {
    return undefined;
  }

  return {
    technologies: technologies ? { all: technologies } : undefined,
    positionLevels,
    contractTypes,
    workSchedules,
    workModes,
    workplace,
  };
};

export const extractListingSummaries = (data: unknown) => {
  const results: ListingJobSummary[] = [];

  const visit = (node: unknown) => {
    if (!node) {
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (typeof node === 'object') {
      const obj = node as Record<string, unknown>;
      const offers = obj.offers;
      if (Array.isArray(offers) && typeof obj.jobTitle === 'string') {
        for (const offer of offers) {
          if (typeof offer !== 'object' || offer === null) {
            continue;
          }
          const offerObj = offer as Record<string, unknown>;
          const url = extractUrl(offerObj);
          if (!url) {
            continue;
          }
          results.push({
            url,
            title: extractTitle(obj),
            company: extractCompany(obj),
            location: pickString(offerObj.displayWorkplace) ?? extractLocation(offerObj),
            sourceId: extractSourceId(url),
            description: pickString(obj.jobDescription),
            salary: pickString(obj.salaryDisplayText),
            isRemote: Boolean(obj.isRemoteWorkAllowed),
            details: buildDetails(obj, offerObj),
          });
        }
      }

      const url = extractUrl(obj);
      if (url) {
        const summary: ListingJobSummary = {
          url,
          title: extractTitle(obj),
          company: extractCompany(obj),
          location: extractLocation(obj),
          sourceId: extractSourceId(url),
          details: buildDetails(obj),
        };
        results.push(summary);
      }
      Object.values(obj).forEach(visit);
    }
  };

  visit(data);

  const deduped = new Map<string, ListingJobSummary>();
  for (const item of results) {
    if (!deduped.has(item.url)) {
      deduped.set(item.url, item);
    }
  }
  return Array.from(deduped.values());
};
