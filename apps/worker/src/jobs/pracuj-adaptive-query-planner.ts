import type { PracujSourceKind, ScrapeFilters } from '@repo/db';

export type AdaptiveQueryAttempt = {
  stage: string;
  listingUrl: string;
  listingCount: number;
};

export type AdaptiveQueryWindow = {
  min: number;
  max: number;
};

type PlannerInput = {
  source: PracujSourceKind;
  acquisitionFilters: ScrapeFilters;
  matchingFilters?: ScrapeFilters;
  buildListingUrl: (filters: ScrapeFilters) => string;
  probeListingCount: (filters: ScrapeFilters, stage: string) => Promise<number>;
  targetWindow: AdaptiveQueryWindow;
};

export type AdaptiveQueryPlanResult = {
  selectedFilters: ScrapeFilters;
  selectedListingUrl: string;
  selectedStage: string;
  selectedCount: number;
  attempts: AdaptiveQueryAttempt[];
  targetWindowMissed: boolean;
  scarcityReason: 'listing_count_too_low' | 'listing_count_too_high' | null;
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

const buildNarrowingStages = (
  source: PracujSourceKind,
  acquisitionFilters: ScrapeFilters,
  matchingFilters: ScrapeFilters | undefined,
): Array<{ stage: string; filters: ScrapeFilters }> => {
  const stages: Array<{ stage: string; filters: ScrapeFilters }> = [
    { stage: 'base', filters: cloneFilters(acquisitionFilters) },
  ];
  if (!matchingFilters) {
    return stages;
  }

  const specializationKey = source === 'pracuj-pl-general' ? 'categories' : 'specializations';
  const specializationValues =
    specializationKey === 'categories' ? matchingFilters.categories : matchingFilters.specializations;
  if (specializationValues?.length) {
    stages.push({
      stage: 'specialization',
      filters: {
        ...cloneFilters(acquisitionFilters),
        [specializationKey]: [specializationValues[0]],
      },
    });
  }

  const keywords = matchingFilters.keywords?.trim();
  if (keywords) {
    stages.push({
      stage: 'keyword',
      filters: {
        ...cloneFilters(acquisitionFilters),
        keywords,
      },
    });
  }

  if (matchingFilters.workModes?.length) {
    stages.push({
      stage: 'work_mode',
      filters: {
        ...cloneFilters(acquisitionFilters),
        workModes: [...matchingFilters.workModes],
      },
    });
  }

  if (matchingFilters.contractTypes?.length) {
    stages.push({
      stage: 'contract',
      filters: {
        ...cloneFilters(acquisitionFilters),
        contractTypes: [...matchingFilters.contractTypes],
      },
    });
  }

  return stages;
};

const buildBroadeningStages = (filters: ScrapeFilters): Array<{ stage: string; filters: ScrapeFilters }> => {
  const stages: Array<{ stage: string; filters: ScrapeFilters }> = [];
  const base = cloneFilters(filters);

  if (typeof base.radiusKm === 'number' && base.radiusKm < 75) {
    stages.push({
      stage: 'broaden_radius_75',
      filters: { ...cloneFilters(base), radiusKm: 75 },
    });
  }
  if (typeof base.radiusKm === 'number' && base.radiusKm < 150) {
    stages.push({
      stage: 'broaden_radius_150',
      filters: { ...cloneFilters(base), radiusKm: 150 },
    });
  }
  if (base.positionLevels?.length) {
    const widened = cloneFilters(base);
    delete widened.positionLevels;
    stages.push({
      stage: 'remove_seniority_band',
      filters: widened,
    });
  }
  if (base.location) {
    const widened = cloneFilters(base);
    delete widened.location;
    delete widened.radiusKm;
    stages.push({
      stage: 'remove_location',
      filters: widened,
    });
  }

  return stages;
};

const isWithinWindow = (count: number, targetWindow: AdaptiveQueryWindow) =>
  count >= targetWindow.min && count <= targetWindow.max;

const scoreWindowDistance = (count: number, targetWindow: AdaptiveQueryWindow) => {
  if (isWithinWindow(count, targetWindow)) {
    return 0;
  }
  if (count < targetWindow.min) {
    return targetWindow.min - count;
  }
  return count - targetWindow.max;
};

export const planPracujAdaptiveQuery = async ({
  source,
  acquisitionFilters,
  matchingFilters,
  buildListingUrl,
  probeListingCount,
  targetWindow,
}: PlannerInput): Promise<AdaptiveQueryPlanResult> => {
  const attempts: AdaptiveQueryAttempt[] = [];
  const tryStage = async (stage: string, filters: ScrapeFilters) => {
    const listingUrl = buildListingUrl(filters);
    const listingCount = await probeListingCount(filters, stage);
    attempts.push({ stage, listingUrl, listingCount });
    return { stage, filters, listingUrl, listingCount };
  };

  const narrowingStages = buildNarrowingStages(source, acquisitionFilters, matchingFilters);
  let selected = await tryStage(narrowingStages[0]!.stage, narrowingStages[0]!.filters);

  for (const stage of narrowingStages.slice(1)) {
    if (selected.listingCount <= targetWindow.max) {
      break;
    }
    const candidate = await tryStage(stage.stage, stage.filters);
    selected =
      scoreWindowDistance(candidate.listingCount, targetWindow) <=
      scoreWindowDistance(selected.listingCount, targetWindow)
        ? candidate
        : selected;
    if (isWithinWindow(candidate.listingCount, targetWindow)) {
      selected = candidate;
      break;
    }
  }

  if (selected.listingCount < targetWindow.min) {
    for (const stage of buildBroadeningStages(selected.filters)) {
      const candidate = await tryStage(stage.stage, stage.filters);
      if (
        scoreWindowDistance(candidate.listingCount, targetWindow) <=
        scoreWindowDistance(selected.listingCount, targetWindow)
      ) {
        selected = candidate;
      }
      if (isWithinWindow(candidate.listingCount, targetWindow)) {
        selected = candidate;
        break;
      }
    }
  }

  return {
    selectedFilters: selected.filters,
    selectedListingUrl: selected.listingUrl,
    selectedStage: selected.stage,
    selectedCount: selected.listingCount,
    attempts,
    targetWindowMissed: !isWithinWindow(selected.listingCount, targetWindow),
    scarcityReason:
      selected.listingCount < targetWindow.min
        ? 'listing_count_too_low'
        : selected.listingCount > targetWindow.max
          ? 'listing_count_too_high'
          : null,
  };
};
