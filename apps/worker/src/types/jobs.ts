export type ScrapeSourceJob = {
  source: string;
  runId?: string;
  listingUrl?: string;
  limit?: number;
  filters?: {
    specializations?: string[];
    workModes?: string[];
    location?: string;
    employmentTypes?: string[];
    experienceLevels?: string[];
    keywords?: string;
  };
};
