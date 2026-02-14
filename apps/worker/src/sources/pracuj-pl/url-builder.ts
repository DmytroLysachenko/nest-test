type ListingFilters = {
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

type PracujSourceKind = 'pracuj-pl' | 'pracuj-pl-it' | 'pracuj-pl-general';

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

export const buildPracujListingUrl = (
  filters: ListingFilters,
  source: PracujSourceKind = 'pracuj-pl',
) => {
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

  const positionLevels = filters.positionLevels ?? filters.employmentTypes ?? filters.experienceLevels;
  if (positionLevels?.length) {
    params.set('et', positionLevels.join(','));
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

