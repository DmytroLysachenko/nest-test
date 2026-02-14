import type { JobDetails, NormalizedJob, ParsedJob } from '../types';

const normalizeText = (value?: string) => (value ? value.trim() : null);

const normalizeList = (value?: string[]) => {
  if (!value?.length) {
    return undefined;
  }
  const items = value.map((item) => item.trim()).filter(Boolean);
  return items.length ? items : undefined;
};

const normalizeDetails = (details?: JobDetails): JobDetails | undefined => {
  if (!details) {
    return undefined;
  }
  const technologies = details.technologies
    ? {
        required: normalizeList(details.technologies.required),
        niceToHave: normalizeList(details.technologies.niceToHave),
        all: normalizeList(details.technologies.all),
      }
    : undefined;
    const normalized: JobDetails = {
      technologies:
        technologies?.required || technologies?.niceToHave || technologies?.all ? technologies : undefined,
      requirements: details.requirements
        ? {
            all: normalizeList(details.requirements.all),
            required: normalizeList(details.requirements.required),
            niceToHave: normalizeList(details.requirements.niceToHave),
          }
        : undefined,
      positionLevels: normalizeList(details.positionLevels),
      workModes: normalizeList(details.workModes),
      workSchedules: normalizeList(details.workSchedules),
      contractTypes: normalizeList(details.contractTypes),
      workplace: normalizeText(details.workplace) ?? undefined,
      companyLocation: normalizeText(details.companyLocation) ?? undefined,
      companyDescription: normalizeText(details.companyDescription) ?? undefined,
      benefits: normalizeList(details.benefits),
    };

    if (
      !normalized.technologies &&
      !normalized.requirements &&
      !normalized.positionLevels &&
      !normalized.workModes &&
      !normalized.workSchedules &&
      !normalized.contractTypes &&
    !normalized.workplace &&
    !normalized.companyLocation &&
    !normalized.companyDescription &&
    !normalized.benefits
  ) {
    return undefined;
  }

  return normalized;
};

export const normalizePracujPl = (jobs: ParsedJob[], source = 'pracuj-pl'): NormalizedJob[] => {
  return jobs.map((job) => ({
    source,
    sourceId: job.sourceId ? job.sourceId.trim() : null,
    title: job.title.trim(),
    company: normalizeText(job.company),
    location: normalizeText(job.location),
    description: job.description.trim(),
    url: job.url,
    tags: [],
    salary: normalizeText(job.salary),
    employmentType: normalizeText(job.employmentType),
    requirements: job.requirements?.map((item) => item.trim()).filter(Boolean) ?? [],
    details: normalizeDetails(job.details),
  }));
};
