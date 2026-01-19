export type RawPage = {
  url: string;
  html: string;
};

export type ListingJobSummary = {
  url: string;
  title?: string;
  company?: string;
  location?: string;
  sourceId?: string;
  description?: string;
  salary?: string;
  isRemote?: boolean;
};

export type ParsedJob = {
  title: string;
  company?: string;
  location?: string;
  description: string;
  url: string;
  salary?: string;
  employmentType?: string;
  sourceId?: string;
  requirements?: string[];
};

export type NormalizedJob = {
  source: string;
  sourceId: string | null;
  title: string;
  company: string | null;
  location: string | null;
  description: string;
  url: string;
  tags: string[];
  salary: string | null;
  employmentType: string | null;
  requirements: string[];
};
