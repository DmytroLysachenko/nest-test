export type RawPage = {
  url: string;
  html: string;
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
