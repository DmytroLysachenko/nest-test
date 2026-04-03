export type StructuredOfferSelectRow = {
  jobOfferId?: string;
  companySummaryId?: string | null;
  companyCanonicalName?: string | null;
  companyWebsiteUrl?: string | null;
  companySourceProfileUrl?: string | null;
  companyLogoUrl?: string | null;
  companyDescription?: string | null;
  companyHqLocation?: string | null;
  jobCategoryLabel?: string | null;
  employmentTypeLabel?: string | null;
  contractTypeLabel?: string | null;
  workModeLabel?: string | null;
};

export type StructuredOfferRelations = {
  contractTypes: string[];
  workModes: string[];
  workSchedules: string[];
  seniorityLevels: string[];
  technologies: Array<{ label: string; category: 'required' | 'nice_to_have' | 'all' }>;
};

export const EMPTY_STRUCTURED_RELATIONS: StructuredOfferRelations = {
  contractTypes: [],
  workModes: [],
  workSchedules: [],
  seniorityLevels: [],
  technologies: [],
};

export const buildStructuredOfferDetails = (
  row: StructuredOfferSelectRow,
  relations?: StructuredOfferRelations | null,
) => {
  const companySummary = row.companySummaryId
    ? {
        id: row.companySummaryId,
        canonicalName: row.companyCanonicalName ?? 'Unknown company',
        websiteUrl: row.companyWebsiteUrl ?? null,
        sourceProfileUrl: row.companySourceProfileUrl ?? null,
        logoUrl: row.companyLogoUrl ?? null,
        description: row.companyDescription ?? null,
        hqLocation: row.companyHqLocation ?? null,
      }
    : null;

  const jobCategory = row.jobCategoryLabel ?? null;
  const employmentTypeLabel = row.employmentTypeLabel ?? null;
  const contractTypeLabel = row.contractTypeLabel ?? null;
  const workModeLabel = row.workModeLabel ?? null;
  const mergedRelations = relations ?? EMPTY_STRUCTURED_RELATIONS;

  if (
    !companySummary &&
    !jobCategory &&
    !employmentTypeLabel &&
    !contractTypeLabel &&
    !workModeLabel &&
    !mergedRelations.contractTypes.length &&
    !mergedRelations.workModes.length &&
    !mergedRelations.workSchedules.length &&
    !mergedRelations.seniorityLevels.length &&
    !mergedRelations.technologies.length
  ) {
    return null;
  }

  return {
    companySummary,
    jobCategory,
    employmentTypeLabel,
    contractTypeLabel,
    workModeLabel,
    contractTypes: mergedRelations.contractTypes,
    workModes: mergedRelations.workModes,
    workSchedules: mergedRelations.workSchedules,
    seniorityLevels: mergedRelations.seniorityLevels,
    technologies: mergedRelations.technologies,
  };
};
