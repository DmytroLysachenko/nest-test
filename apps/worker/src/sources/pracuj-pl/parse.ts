import type { ParsedJob, RawPage } from '../types';

export const parsePracujPl = (pages: RawPage[]): ParsedJob[] => {
  return pages.map((page) => ({
    title: 'Example job from pracuj.pl',
    company: 'Example Company',
    location: 'Poland',
    description: 'Placeholder description extracted from HTML.',
    url: page.url,
  }));
};
