import type { PracujSourceKind, ScrapeFilters } from '@repo/db';

const widenPublishedWindow = (value: number) => {
  if (value <= 1) {
    return 3;
  }
  if (value <= 3) {
    return 7;
  }
  if (value <= 7) {
    return 14;
  }
  if (value <= 14) {
    return 30;
  }
  return null;
};

const cloneFilters = (filters: ScrapeFilters): ScrapeFilters => ({
  ...filters,
  specializations: filters.specializations ? [...filters.specializations] : undefined,
  workModes: filters.workModes ? [...filters.workModes] : undefined,
  workDimensions: filters.workDimensions ? [...filters.workDimensions] : undefined,
  positionLevels: filters.positionLevels ? [...filters.positionLevels] : undefined,
  contractTypes: filters.contractTypes ? [...filters.contractTypes] : undefined,
  technologies: filters.technologies ? [...filters.technologies] : undefined,
  categories: filters.categories ? [...filters.categories] : undefined,
  employmentTypes: filters.employmentTypes ? [...filters.employmentTypes] : undefined,
  experienceLevels: filters.experienceLevels ? [...filters.experienceLevels] : undefined,
});

const dropOneFromArray = (filters: ScrapeFilters, key: keyof ScrapeFilters, reason: string) => {
  const value = filters[key];
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }
  const next = [...value];
  next.pop();
  if (next.length) {
    (filters as Record<string, unknown>)[key] = next;
  } else {
    delete (filters as Record<string, unknown>)[key];
  }
  return reason;
};

const relaxKeywords = (filters: ScrapeFilters) => {
  const keywords = filters.keywords?.trim();
  if (!keywords) {
    return null;
  }
  const terms = keywords.split(/\s+/g).filter(Boolean);
  if (terms.length <= 1) {
    delete filters.keywords;
    return 'removed keywords';
  }
  terms.pop();
  filters.keywords = terms.join(' ');
  return 'reduced keywords';
};

const hasAnyFilters = (filters: ScrapeFilters) =>
  Object.values(filters).some((value) => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return value !== undefined && value !== null && value !== false && value !== '';
  });

export const relaxPracujFiltersOnce = (source: PracujSourceKind, current: ScrapeFilters) => {
  const filters = cloneFilters(current);

  const reasonFromArrays =
    dropOneFromArray(
      filters,
      source === 'pracuj-pl-general' ? 'categories' : 'technologies',
      'reduced tech/category',
    ) ??
    dropOneFromArray(
      filters,
      source === 'pracuj-pl-general' ? 'positionLevels' : 'specializations',
      'reduced specialization/level',
    ) ??
    dropOneFromArray(filters, 'workModes', 'reduced work mode') ??
    dropOneFromArray(filters, 'contractTypes', 'reduced contract type') ??
    dropOneFromArray(filters, 'workDimensions', 'reduced work dimension') ??
    dropOneFromArray(filters, 'positionLevels', 'reduced position level');
  if (reasonFromArrays) {
    return {
      next: hasAnyFilters(filters) ? filters : null,
      reason: reasonFromArrays,
    };
  }

  if (typeof filters.publishedWithinDays === 'number') {
    const widened = widenPublishedWindow(filters.publishedWithinDays);
    if (widened) {
      filters.publishedWithinDays = widened;
      return { next: filters, reason: `widened publishedWithinDays to ${widened}` };
    }
    delete filters.publishedWithinDays;
    return { next: hasAnyFilters(filters) ? filters : null, reason: 'removed publishedWithinDays' };
  }

  if (typeof filters.salaryMin === 'number') {
    if (filters.salaryMin > 1) {
      filters.salaryMin = Math.max(1, Math.floor(filters.salaryMin * 0.7));
      return { next: filters, reason: `reduced salaryMin to ${filters.salaryMin}` };
    }
    delete filters.salaryMin;
    return { next: hasAnyFilters(filters) ? filters : null, reason: 'removed salaryMin' };
  }

  if (typeof filters.radiusKm === 'number') {
    if (filters.radiusKm < 200) {
      filters.radiusKm = Math.min(200, filters.radiusKm + 25);
      return { next: filters, reason: `increased radiusKm to ${filters.radiusKm}` };
    }
    delete filters.radiusKm;
    return { next: hasAnyFilters(filters) ? filters : null, reason: 'removed radiusKm' };
  }

  if (filters.onlyWithProjectDescription) {
    delete filters.onlyWithProjectDescription;
    return { next: hasAnyFilters(filters) ? filters : null, reason: 'removed onlyWithProjectDescription' };
  }
  if (filters.onlyEmployerOffers) {
    delete filters.onlyEmployerOffers;
    return { next: hasAnyFilters(filters) ? filters : null, reason: 'removed onlyEmployerOffers' };
  }
  if (filters.noPolishRequired) {
    delete filters.noPolishRequired;
    return { next: hasAnyFilters(filters) ? filters : null, reason: 'removed noPolishRequired' };
  }
  if (filters.ukrainiansWelcome) {
    delete filters.ukrainiansWelcome;
    return { next: hasAnyFilters(filters) ? filters : null, reason: 'removed ukrainiansWelcome' };
  }
  if (filters.location) {
    delete filters.location;
    return { next: hasAnyFilters(filters) ? filters : null, reason: 'removed location' };
  }

  const keywordReason = relaxKeywords(filters);
  if (keywordReason) {
    return { next: hasAnyFilters(filters) ? filters : null, reason: keywordReason };
  }

  return {
    next: null,
    reason: null,
  };
};
