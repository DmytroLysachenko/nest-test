import { buildPracujListingUrl as buildUrl, type PracujSourceKind, type ScrapeFilters } from '@repo/db';

export type ListingFilters = ScrapeFilters;

export const buildPracujListingUrl = (filters: ListingFilters, source: PracujSourceKind = 'pracuj-pl') =>
  buildUrl(source, filters);

