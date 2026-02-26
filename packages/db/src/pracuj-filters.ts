export type PracujSourceKind = 'pracuj-pl' | 'pracuj-pl-it' | 'pracuj-pl-general';

export type ScrapeFilters = {
  specializations?: string[];
  workModes?: string[];
  workDimensions?: string[];
  location?: string;
  radiusKm?: number;
  publishedWithinDays?: number;
  positionLevels?: string[];
  contractTypes?: string[];
  technologies?: string[];
  salaryMin?: number;
  onlyWithProjectDescription?: boolean;
  onlyEmployerOffers?: boolean;
  ukrainiansWelcome?: boolean;
  noPolishRequired?: boolean;
  categories?: string[];
  employmentTypes?: string[];
  experienceLevels?: string[];
  keywords?: string;
};

const IT_SPECIALIZATIONS = new Set([
  'backend',
  'frontend',
  'fullstack',
  'mobile',
  'architecture',
  'devops',
  'gamedev',
  'data-analytics-and-bi',
  'big-data-science',
  'embedded',
  'testing',
  'security',
  'helpdesk',
  'product-management',
  'project-management',
  'agile',
  'ux-ui',
  'business-analytics',
  'system-analytics',
  'sap-erp',
  'it-admin',
  'ai-ml',
]);

const IT_TECHNOLOGIES = new Set([
  '226',
  '89',
  '77',
  '73',
  '75',
  '76',
  '62',
  '55',
  '54',
  '50',
  '40',
  '41',
  '42',
  '39',
  '38',
  '37',
  '33',
  '34',
  '36',
  '213',
  '212',
  '86',
]);

const CONTRACT_TYPES = new Set(['0', '1', '2', '3', '4', '5', '6', '7']);
const WORK_DIMENSIONS = new Set(['0', '1', '2']);
const WORK_MODES = new Set(['full-office', 'hybrid', 'home-office', 'mobile']);
const IT_POSITION_LEVELS = new Set(['1', '3', '17', '4', '18', '19', '5', '20', '6', '21']);
const GENERAL_POSITION_LEVELS = new Set(['1', '3', '17', '4', '18', '19', '5', '20', '6', '21', '2']);
const GENERAL_CATEGORIES = new Set([
  '5001',
  '5002',
  '5003',
  '5004',
  '5006',
  '5005',
  '5036',
  '5037',
  '5007',
  '5009',
  '5011',
  '5010',
  '5008',
  '5013',
  '5014',
  '5015',
  '5016',
  '5034',
  '5012',
  '5035',
  '5032',
  '5033',
  '5031',
  '5028',
  '5027',
  '5026',
  '5025',
  '5024',
  '5023',
  '5022',
  '5021',
  '5020',
  '5019',
  '5018',
  '5017',
]);
const PUBLISHED_WINDOWS = new Set([1, 3, 7, 14, 30]);

const cleanString = (value: string | undefined) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const normalizeStringList = (value?: string[]) =>
  Array.from(new Set((value ?? []).map((item) => item.trim()).filter(Boolean)));

const filterAllowed = (values: string[], allowed: Set<string>) => values.filter((value) => allowed.has(value));

export type ScrapeFilterNormalizationResult = {
  filters: ScrapeFilters;
  dropped: Partial<Record<keyof ScrapeFilters, string[]>>;
};

export const normalizePracujFilters = (
  source: PracujSourceKind,
  input: ScrapeFilters | null | undefined,
): ScrapeFilterNormalizationResult => {
  if (!input) {
    return { filters: {}, dropped: {} };
  }

  const dropped: ScrapeFilterNormalizationResult['dropped'] = {};
  const result: ScrapeFilters = {};

  const positionLevelsRaw = normalizeStringList(
    input.positionLevels ?? input.employmentTypes ?? input.experienceLevels,
  );
  const specializationRaw = normalizeStringList(input.specializations);
  const technologiesRaw = normalizeStringList(input.technologies);
  const categoriesRaw = normalizeStringList(input.categories);
  const contractTypesRaw = normalizeStringList(input.contractTypes);
  const workDimensionsRaw = normalizeStringList(input.workDimensions);
  const workModesRaw = normalizeStringList(input.workModes);

  const positionAllowed = source === 'pracuj-pl-general' ? GENERAL_POSITION_LEVELS : IT_POSITION_LEVELS;
  const positionLevels = filterAllowed(positionLevelsRaw, positionAllowed);
  if (positionLevels.length) {
    result.positionLevels = positionLevels;
  }
  if (positionLevelsRaw.length !== positionLevels.length) {
    dropped.positionLevels = positionLevelsRaw.filter((value) => !positionLevels.includes(value));
  }

  const contractTypes = filterAllowed(contractTypesRaw, CONTRACT_TYPES);
  if (contractTypes.length) {
    result.contractTypes = contractTypes;
  }
  if (contractTypesRaw.length !== contractTypes.length) {
    dropped.contractTypes = contractTypesRaw.filter((value) => !contractTypes.includes(value));
  }

  const workDimensions = filterAllowed(workDimensionsRaw, WORK_DIMENSIONS);
  if (workDimensions.length) {
    result.workDimensions = workDimensions;
  }
  if (workDimensionsRaw.length !== workDimensions.length) {
    dropped.workDimensions = workDimensionsRaw.filter((value) => !workDimensions.includes(value));
  }

  const workModes = filterAllowed(workModesRaw, WORK_MODES);
  if (workModes.length) {
    result.workModes = workModes;
  }
  if (workModesRaw.length !== workModes.length) {
    dropped.workModes = workModesRaw.filter((value) => !workModes.includes(value));
  }

  if (source === 'pracuj-pl-general') {
    const categories = filterAllowed(categoriesRaw, GENERAL_CATEGORIES);
    if (categories.length) {
      result.categories = categories;
    }
    if (categoriesRaw.length !== categories.length) {
      dropped.categories = categoriesRaw.filter((value) => !categories.includes(value));
    }
  } else {
    const specializations = filterAllowed(specializationRaw, IT_SPECIALIZATIONS);
    if (specializations.length) {
      result.specializations = specializations;
    }
    if (specializationRaw.length !== specializations.length) {
      dropped.specializations = specializationRaw.filter((value) => !specializations.includes(value));
    }

    const technologies = filterAllowed(technologiesRaw, IT_TECHNOLOGIES);
    if (technologies.length) {
      result.technologies = technologies;
    }
    if (technologiesRaw.length !== technologies.length) {
      dropped.technologies = technologiesRaw.filter((value) => !technologies.includes(value));
    }
  }

  const publishedWithinDays = input.publishedWithinDays;
  if (publishedWithinDays && PUBLISHED_WINDOWS.has(publishedWithinDays)) {
    result.publishedWithinDays = publishedWithinDays;
  } else if (publishedWithinDays !== undefined) {
    dropped.publishedWithinDays = [String(publishedWithinDays)];
  }

  const radiusKm = input.radiusKm;
  if (radiusKm && radiusKm >= 1 && radiusKm <= 200) {
    result.radiusKm = Math.round(radiusKm);
  } else if (radiusKm !== undefined) {
    dropped.radiusKm = [String(radiusKm)];
  }

  const salaryMin = input.salaryMin;
  if (salaryMin && salaryMin >= 1) {
    result.salaryMin = Math.round(salaryMin);
  } else if (salaryMin !== undefined) {
    dropped.salaryMin = [String(salaryMin)];
  }

  const location = cleanString(input.location);
  if (location) {
    result.location = location;
  }
  const keywords = cleanString(input.keywords);
  if (keywords) {
    result.keywords = keywords;
  }

  if (input.onlyWithProjectDescription) {
    result.onlyWithProjectDescription = true;
  }
  if (input.onlyEmployerOffers) {
    result.onlyEmployerOffers = true;
  }
  if (input.ukrainiansWelcome) {
    result.ukrainiansWelcome = true;
  }
  if (input.noPolishRequired) {
    result.noPolishRequired = true;
  }

  return { filters: result, dropped };
};

const resolvePublishedPath = (days: number) => {
  if (days === 1) {
    return 'ostatnich 24h;p,1';
  }
  return `ostatnich ${days} dni;p,${days}`;
};

const resolveBaseUrl = (source: PracujSourceKind) => {
  if (source === 'pracuj-pl-general') {
    return 'https://www.pracuj.pl/praca';
  }
  return 'https://it.pracuj.pl/praca';
};

export const buildPracujListingUrl = (source: PracujSourceKind, rawFilters: ScrapeFilters) => {
  const { filters } = normalizePracujFilters(source, rawFilters);
  const segments: string[] = [];
  if (filters.keywords) {
    segments.push(`${encodeURIComponent(filters.keywords)};kw`);
  } else if (filters.location) {
    segments.push(`${encodeURIComponent(filters.location)};wp`);
  }

  if (filters.publishedWithinDays) {
    segments.push(resolvePublishedPath(filters.publishedWithinDays));
  }

  const base = `${resolveBaseUrl(source)}${segments.length ? `/${segments.join('/')}` : ''}`;
  const url = new URL(base);
  const params = url.searchParams;

  if (filters.specializations?.length) {
    params.set('its', filters.specializations.join(','));
  }
  if (filters.workModes?.length) {
    params.set('wm', filters.workModes.join(','));
  }
  if (filters.workDimensions?.length) {
    params.set('ws', filters.workDimensions.join(','));
  }
  if (filters.technologies?.length) {
    params.set('itth', filters.technologies.join(','));
  }
  if (filters.categories?.length) {
    params.set('cc', filters.categories.join(','));
  }
  if (filters.positionLevels?.length) {
    params.set('et', filters.positionLevels.join(','));
  }
  if (filters.contractTypes?.length) {
    params.set('tc', filters.contractTypes.join(','));
  }
  if (filters.salaryMin) {
    params.set('sal', String(filters.salaryMin));
  }
  if (filters.radiusKm) {
    params.set('rd', String(filters.radiusKm));
  }
  if (filters.onlyWithProjectDescription) {
    params.set('ap', 'true');
  }
  if (filters.onlyEmployerOffers) {
    params.set('ao', 'false');
  }
  if (filters.ukrainiansWelcome) {
    params.set('ua', 'true');
  }
  if (filters.noPolishRequired) {
    params.set('wpl', 'true');
  }
  if (filters.keywords && filters.location) {
    params.set('wp', filters.location);
  }

  return url.toString();
};
