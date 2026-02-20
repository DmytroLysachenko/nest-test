import type { ScrapeFilters } from '@repo/db';
import type { PracujSourceKind } from '@repo/db';

import type { NormalizedProfileInput } from '@/features/profile-inputs/normalization/schema';

const SENIORITY_TO_POSITION_LEVEL: Record<string, string> = {
  intern: '1',
  junior: '17',
  mid: '4',
  senior: '18',
  lead: '19',
  manager: '20',
};

const WORK_MODE_TO_PRACUJ: Record<string, string> = {
  remote: 'home-office',
  hybrid: 'hybrid',
  onsite: 'full-office',
  mobile: 'mobile',
};

const CONTRACT_TO_PRACUJ: Record<string, string> = {
  uop: '0',
  'specific-task': '1',
  mandate: '2',
  b2b: '3',
  internship: '7',
};

const TIME_MODE_TO_PRACUJ: Record<string, string> = {
  'full-time': '0',
  'part-time': '1',
  temporary: '2',
};

const SPECIALIZATION_TO_ITS: Record<string, string> = {
  frontend: 'frontend',
  backend: 'backend',
  fullstack: 'fullstack',
  devops: 'devops',
  data: 'data-analytics-and-bi',
  qa: 'testing',
  security: 'security',
  product: 'product-management',
};

const IT_LIKE_TECH = new Set(['javascript', 'typescript', 'react', 'node.js', 'nestjs', 'java', 'python', 'go', '.net', 'sql']);

const unique = <T>(values: Array<T | undefined | null>) =>
  Array.from(new Set(values.filter((value): value is T => value != null)));

const normalizeKeyword = (value: string) => value.trim().replace(/\s+/g, ' ');

const inferSourceKind = (normalizedInput: NormalizedProfileInput): 'it' | 'general' => {
  if (normalizedInput.searchPreferences.sourceKind) {
    return normalizedInput.searchPreferences.sourceKind;
  }

  if (normalizedInput.specializations.length > 0) {
    return 'it';
  }

  const hasItTech = normalizedInput.technologies.some((tech) => IT_LIKE_TECH.has(tech.toLowerCase()));
  return hasItTech ? 'it' : 'general';
};

export const inferPracujSource = (normalizedInput: NormalizedProfileInput): PracujSourceKind => {
  return inferSourceKind(normalizedInput) === 'general' ? 'pracuj-pl-general' : 'pracuj-pl-it';
};

export const buildFiltersFromProfile = (normalizedInput: NormalizedProfileInput): ScrapeFilters | undefined => {
  const preferences = normalizedInput.searchPreferences;

  const positionLevels = unique(preferences.seniority.map((value) => SENIORITY_TO_POSITION_LEVEL[value]));
  const workModes = unique(preferences.workModes.map((value) => WORK_MODE_TO_PRACUJ[value]));
  const contractTypes = unique(preferences.employmentTypes.map((value) => CONTRACT_TO_PRACUJ[value]));
  const workDimensions = unique(preferences.timeModes.map((value) => TIME_MODE_TO_PRACUJ[value]));
  const specializations = unique(normalizedInput.specializations.map((value) => SPECIALIZATION_TO_ITS[value]));
  const keywords = unique(preferences.keywords.map((value) => normalizeKeyword(value))).join(' ').trim();

  const filters: ScrapeFilters = {
    positionLevels: positionLevels.length ? positionLevels : undefined,
    workModes: workModes.length ? workModes : undefined,
    contractTypes: contractTypes.length ? contractTypes : undefined,
    workDimensions: workDimensions.length ? workDimensions : undefined,
    specializations: specializations.length ? specializations : undefined,
    salaryMin: preferences.salaryMin ?? undefined,
    location: preferences.city ?? undefined,
    radiusKm: preferences.radiusKm ?? undefined,
    keywords: keywords || undefined,
    onlyWithProjectDescription: normalizedInput.constraints.onlyWithProjectDescription || undefined,
    onlyEmployerOffers: normalizedInput.constraints.onlyEmployerOffers || undefined,
    ukrainiansWelcome: normalizedInput.constraints.ukrainiansWelcome || undefined,
    noPolishRequired: normalizedInput.constraints.noPolishRequired || undefined,
  };

  const hasAny = Object.values(filters).some((value) =>
    Array.isArray(value) ? value.length > 0 : value != null && value !== false && value !== '',
  );

  return hasAny ? filters : undefined;
};
