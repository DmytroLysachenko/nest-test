import type { NormalizedJob, ParsedJob } from '../types';

const normalizeText = (value?: string) => (value ? value.trim() : null);

export const normalizePracujPl = (jobs: ParsedJob[]): NormalizedJob[] => {
  return jobs.map((job) => ({
    title: job.title.trim(),
    company: normalizeText(job.company),
    location: normalizeText(job.location),
    description: job.description.trim(),
    url: job.url,
    tags: [],
  }));
};
