import type { PracujSourceKind, ScrapeFilters } from '@repo/db';

import type {
  CandidateEmploymentType,
  CandidateProfile,
  CandidateWorkMode,
} from '@/features/career-profiles/schema/candidate-profile.schema';

const SENIORITY_TO_POSITION_LEVEL: Record<string, string> = {
  intern: '1',
  junior: '17',
  mid: '4',
  senior: '18',
  lead: '19',
  manager: '20',
};

const WORK_MODE_TO_PRACUJ: Record<CandidateWorkMode, string> = {
  remote: 'home-office',
  hybrid: 'hybrid',
  onsite: 'full-office',
  mobile: 'mobile',
};

const CONTRACT_TO_PRACUJ: Record<CandidateEmploymentType, string> = {
  uop: '0',
  'specific-task': '1',
  mandate: '2',
  b2b: '3',
  internship: '7',
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

const normalizeAscii = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const CITY_ALIAS_TO_CANONICAL: Record<string, { city: string; radiusKm?: number }> = {
  trojmiasto: { city: 'Gdynia', radiusKm: 35 },
  tricity: { city: 'Gdynia', radiusKm: 35 },
  'tri-city': { city: 'Gdynia', radiusKm: 35 },
};

const mapSpecializationToIts = (value: string): string | undefined => {
  const normalized = normalizeAscii(value);
  const direct = SPECIALIZATION_TO_ITS[normalized];
  if (direct) {
    return direct;
  }

  const entries = Object.entries(SPECIALIZATION_TO_ITS);
  const fuzzy = entries.find(([key]) => normalized.includes(key));
  return fuzzy?.[1];
};

const canonicalizeLocation = (city?: string, radiusKm?: number) => {
  if (!city) {
    return {
      city: undefined,
      radiusKm,
    };
  }
  const normalized = normalizeAscii(city);
  const alias = CITY_ALIAS_TO_CANONICAL[normalized];
  if (!alias) {
    return { city, radiusKm };
  }
  return {
    city: alias.city,
    radiusKm: radiusKm ?? alias.radiusKm,
  };
};

const unique = <T>(values: Array<T | undefined | null>) =>
  Array.from(new Set(values.filter((value): value is T => value != null)));

export const inferPracujSource = (profile: CandidateProfile): PracujSourceKind => {
  const specializations = profile.searchSignals.specializations.map((item) => item.value.toLowerCase());
  const technologies = profile.searchSignals.technologies.map((item) => item.value.toLowerCase());
  const itKeywords = [
    'frontend',
    'backend',
    'fullstack',
    'devops',
    'data',
    'qa',
    'security',
    'react',
    'typescript',
    'java',
  ];
  const hasItSignals = [...specializations, ...technologies].some((value) =>
    itKeywords.some((keyword) => value.includes(keyword)),
  );
  return hasItSignals ? 'pracuj-pl-it' : 'pracuj-pl-general';
};

export const buildFiltersFromProfile = (profile: CandidateProfile): ScrapeFilters | undefined => {
  const primarySeniority = profile.candidateCore.seniority.primary;
  const secondarySeniority = profile.candidateCore.seniority.secondary;
  const seniority = unique([primarySeniority, ...secondarySeniority]);
  const positionLevels = unique(seniority.map((value) => SENIORITY_TO_POSITION_LEVEL[value]));

  const hardWorkModes = profile.workPreferences.hardConstraints.workModes;
  const softWorkModes = profile.workPreferences.softPreferences.workModes
    .filter((item) => item.weight >= 0.4)
    .map((item) => item.value);
  const workModes = unique([...hardWorkModes, ...softWorkModes].map((value) => WORK_MODE_TO_PRACUJ[value]));

  const hardEmploymentTypes = profile.workPreferences.hardConstraints.employmentTypes;
  const softEmploymentTypes = profile.workPreferences.softPreferences.employmentTypes
    .filter((item) => item.weight >= 0.4)
    .map((item) => item.value);
  const contractTypes = unique(
    [...hardEmploymentTypes, ...softEmploymentTypes].map((value) => CONTRACT_TO_PRACUJ[value]),
  );

  const specializations = unique(
    profile.searchSignals.specializations
      .filter((item) => item.weight >= 0.35)
      .map((item) => mapSpecializationToIts(item.value)),
  );

  const keywordPool = [
    ...profile.searchSignals.keywords.filter((item) => item.weight >= 0.3).map((item) => item.value),
    ...profile.targetRoles.map((item) => item.title),
  ];
  const keywords = unique(keywordPool.map((value) => value.trim().replace(/\s+/g, ' ')).filter(Boolean)).join(' ');

  const location =
    profile.workPreferences.hardConstraints.locations[0]?.city ??
    profile.workPreferences.softPreferences.locations[0]?.value.city;
  const radiusKm =
    profile.workPreferences.hardConstraints.locations[0]?.radiusKm ??
    profile.workPreferences.softPreferences.locations[0]?.value.radiusKm;
  const canonicalLocation = canonicalizeLocation(location, radiusKm);

  const minSalary =
    profile.workPreferences.hardConstraints.minSalary?.amount ??
    profile.workPreferences.softPreferences.salary?.value.amount;

  const filters: ScrapeFilters = {
    positionLevels: positionLevels.length ? positionLevels : undefined,
    workModes: workModes.length ? workModes : undefined,
    contractTypes: contractTypes.length ? contractTypes : undefined,
    specializations: specializations.length ? specializations : undefined,
    salaryMin: minSalary ?? undefined,
    location: canonicalLocation.city ?? undefined,
    radiusKm: canonicalLocation.radiusKm ?? undefined,
    keywords: keywords || undefined,
    noPolishRequired: profile.workPreferences.hardConstraints.noPolishRequired || undefined,
    onlyEmployerOffers: profile.workPreferences.hardConstraints.onlyEmployerOffers || undefined,
    onlyWithProjectDescription: profile.workPreferences.hardConstraints.onlyWithProjectDescription || undefined,
  };

  const hasAny = Object.values(filters).some((value) =>
    Array.isArray(value) ? value.length > 0 : value != null && value !== false && value !== '',
  );

  return hasAny ? filters : undefined;
};
