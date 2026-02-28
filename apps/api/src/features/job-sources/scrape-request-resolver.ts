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

const SPECIALIZATION_TO_SEARCH_KEYWORD: Record<string, string> = {
  frontend: 'frontend',
  backend: 'backend',
  fullstack: 'fullstack',
  devops: 'devops',
  data: 'data',
  qa: 'qa',
  security: 'security',
  product: 'product',
};

const ROLE_SPECIALIZATION_HINTS: Array<{ specialization: keyof typeof SPECIALIZATION_TO_SEARCH_KEYWORD; hints: string[] }> = [
  { specialization: 'frontend', hints: ['frontend', 'front-end', 'front end', 'ui'] },
  { specialization: 'backend', hints: ['backend', 'back-end', 'back end', 'api'] },
  { specialization: 'fullstack', hints: ['fullstack', 'full-stack', 'full stack'] },
  { specialization: 'devops', hints: ['devops', 'platform'] },
  { specialization: 'data', hints: ['data', 'analytics', 'bi', 'ml', 'ai'] },
  { specialization: 'qa', hints: ['qa', 'test', 'testing', 'quality assurance'] },
  { specialization: 'security', hints: ['security', 'secops', 'appsec'] },
  { specialization: 'product', hints: ['product', 'product manager', 'pm'] },
];

const SENIORITY_SEARCH_TOKENS = new Set(['intern', 'junior', 'mid', 'senior', 'lead', 'manager']);

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

const inferRoleSpecialization = (roleTitle: string) => {
  const normalized = normalizeAscii(roleTitle);
  for (const entry of ROLE_SPECIALIZATION_HINTS) {
    if (entry.hints.some((hint) => normalized.includes(hint))) {
      return entry.specialization;
    }
  }
  return undefined;
};

const buildKeywordPhraseFromRole = (
  roleTitle: string,
  fallbackSeniority?: string,
  fallbackSpecialization?: string,
) => {
  const normalized = normalizeAscii(roleTitle).replace(/[()]/g, ' ');
  const roleTokens = normalized.split(/[^a-z0-9+.#-]+/).filter(Boolean);
  const roleSeniority = roleTokens.find((token) => SENIORITY_SEARCH_TOKENS.has(token));
  const seniority = roleSeniority ?? fallbackSeniority;
  const specialization = inferRoleSpecialization(roleTitle) ?? fallbackSpecialization;
  if (!specialization) {
    return undefined;
  }
  const specializationKeyword = SPECIALIZATION_TO_SEARCH_KEYWORD[specialization] ?? specialization;
  return [seniority, specializationKeyword].filter(Boolean).join(' ');
};

const buildFocusedKeywords = (
  profile: CandidateProfile,
  mappedSpecializations: string[],
  seniority: string | undefined,
) => {
  const sortedRoles = [...profile.targetRoles].sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    return b.confidenceScore - a.confidenceScore;
  });
  const fallbackSpecialization = mappedSpecializations[0];
  for (const role of sortedRoles) {
    const phrase = buildKeywordPhraseFromRole(role.title, seniority, fallbackSpecialization);
    if (phrase) {
      return phrase;
    }
  }
  if (fallbackSpecialization) {
    const specializationKeyword = SPECIALIZATION_TO_SEARCH_KEYWORD[fallbackSpecialization] ?? fallbackSpecialization;
    return [seniority, specializationKeyword].filter(Boolean).join(' ');
  }
  return undefined;
};

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
  const primarySeniorityToken = primarySeniority ?? secondarySeniority[0];
  const positionLevels = unique(seniority.map((value) => SENIORITY_TO_POSITION_LEVEL[value]));

  const workModes = unique(profile.workPreferences.hardConstraints.workModes.map((value) => WORK_MODE_TO_PRACUJ[value]));

  const contractTypes = unique(
    profile.workPreferences.hardConstraints.employmentTypes.map((value) => CONTRACT_TO_PRACUJ[value]),
  );

  const specializations = unique(
    profile.searchSignals.specializations
      .filter((item) => item.weight >= 0.35)
      .map((item) => mapSpecializationToIts(item.value)),
  );

  const keywords = buildFocusedKeywords(profile, specializations, primarySeniorityToken);

  const location = profile.workPreferences.hardConstraints.locations[0]?.city;
  const radiusKm = profile.workPreferences.hardConstraints.locations[0]?.radiusKm;
  const canonicalLocation = canonicalizeLocation(location, radiusKm);

  const minSalary = profile.workPreferences.hardConstraints.minSalary?.amount;

  const filters: ScrapeFilters = {
    positionLevels: positionLevels.length ? positionLevels : undefined,
    workModes: workModes.length ? workModes : undefined,
    contractTypes: contractTypes.length ? contractTypes : undefined,
    specializations: specializations.length ? specializations : undefined,
    salaryMin: minSalary ?? undefined,
    location: canonicalLocation.city ?? undefined,
    radiusKm: canonicalLocation.radiusKm ?? undefined,
    keywords: keywords ?? undefined,
    noPolishRequired: profile.workPreferences.hardConstraints.noPolishRequired || undefined,
    onlyEmployerOffers: profile.workPreferences.hardConstraints.onlyEmployerOffers || undefined,
    onlyWithProjectDescription: profile.workPreferences.hardConstraints.onlyWithProjectDescription || undefined,
  };

  const hasAny = Object.values(filters).some((value) =>
    Array.isArray(value) ? value.length > 0 : value != null && value !== false && value !== '',
  );

  return hasAny ? filters : undefined;
};
