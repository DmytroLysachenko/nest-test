import { canonicalizeContractType, canonicalizeWorkMode } from '@repo/db';

import type { JobDetails, NormalizedJob, ParsedJob } from '../types';

const normalizeText = (value?: string) => (value ? value.trim() : null);
const normalizeAscii = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const normalizeList = (value?: string[]) => {
  if (!value?.length) {
    return undefined;
  }
  const items = value.map((item) => item.trim()).filter(Boolean);
  return items.length ? items : undefined;
};

const dedupeList = (value?: Array<string | null | undefined>) => {
  const items = Array.from(new Set((value ?? []).filter((item): item is string => Boolean(item))));
  return items.length ? items : undefined;
};

const canonicalizePositionLevel = (value?: string | null) => {
  const trimmed = normalizeText(value);
  if (!trimmed) {
    return null;
  }

  const normalized = normalizeAscii(trimmed).replace(/[^a-z0-9]+/g, '');
  if (
    normalized.includes('manager') ||
    normalized.includes('menedzer') ||
    normalized.includes('kierownik') ||
    normalized.includes('head')
  ) {
    return 'manager';
  }
  if (
    normalized.includes('lead') ||
    normalized.includes('principal') ||
    normalized.includes('expert') ||
    normalized.includes('architekt')
  ) {
    return 'lead';
  }
  if (normalized.includes('senior') || normalized.includes('starszy')) {
    return 'senior';
  }
  if (
    normalized.includes('intern') ||
    normalized.includes('trainee') ||
    normalized.includes('praktyk') ||
    normalized.includes('staz')
  ) {
    return 'intern';
  }
  if (
    normalized.includes('junior') ||
    normalized.includes('mlodszy') ||
    normalized.includes('asystent') ||
    normalized.includes('assistant')
  ) {
    return 'junior';
  }
  if (
    normalized.includes('regular') ||
    normalized.includes('mid') ||
    normalized.includes('specjalista') ||
    normalized.includes('specialist')
  ) {
    return 'mid';
  }

  return trimmed.toLowerCase();
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
    technologies: technologies?.required || technologies?.niceToHave || technologies?.all ? technologies : undefined,
    requirements: details.requirements
      ? {
          all: normalizeList(details.requirements.all),
          required: normalizeList(details.requirements.required),
          niceToHave: normalizeList(details.requirements.niceToHave),
        }
      : undefined,
    positionLevels: dedupeList(details.positionLevels?.map((item) => canonicalizePositionLevel(item))),
    workModes: dedupeList(details.workModes?.map((item) => canonicalizeWorkMode(item))),
    workSchedules: normalizeList(details.workSchedules),
    contractTypes: dedupeList(details.contractTypes?.map((item) => canonicalizeContractType(item))),
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
    tags: job.tags?.map((item) => item.trim()).filter(Boolean) ?? [],
    salary: normalizeText(job.salary),
    employmentType: canonicalizeContractType(job.employmentType),
    requirements: job.requirements?.map((item) => item.trim()).filter(Boolean) ?? [],
    details: normalizeDetails(job.details),
    isExpired: job.isExpired,
  }));
};
