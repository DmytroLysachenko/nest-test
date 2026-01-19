import type { ListingJobSummary } from '../types';

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
  const candidates = ['offerUrl', 'url', 'link', 'jobUrl'];
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
      const url = extractUrl(obj);
      if (url) {
        const summary: ListingJobSummary = {
          url,
          title: extractTitle(obj),
          company: extractCompany(obj),
          location: extractLocation(obj),
          sourceId: extractSourceId(url),
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
