import type { NormalizedJob, ParsedJob } from '../types';

const normalizeText = (value?: string) => (value ? value.trim() : null);

export const normalizePracujPl = (jobs: ParsedJob[]): NormalizedJob[] => {
  return jobs.map((job) => ({
    source: 'pracuj-pl',
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
  }));
};
