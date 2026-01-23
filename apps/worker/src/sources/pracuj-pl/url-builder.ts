type ListingFilters = {
  specializations?: string[];
  workModes?: string[];
  location?: string;
  employmentTypes?: string[];
  experienceLevels?: string[];
  keywords?: string;
};

export const buildPracujListingUrl = (filters: ListingFilters) => {
  const url = new URL('https://it.pracuj.pl/praca');
  const params = url.searchParams;

  if (filters.specializations?.length) {
    params.set('its', filters.specializations.join(','));
  }
  if (filters.workModes?.length) {
    params.set('wm', filters.workModes.join(','));
  }
  if (filters.location) {
    params.set('wp', filters.location);
  }
  if (filters.employmentTypes?.length) {
    params.set('et', filters.employmentTypes.join(','));
  }
  if (filters.experienceLevels?.length) {
    params.set('exp', filters.experienceLevels.join(','));
  }
  if (filters.keywords) {
    params.set('q', filters.keywords);
  }

  return url.toString();
};
