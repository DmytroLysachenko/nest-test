export type RawPage = {
  url: string;
  html: string;
};

export type DetailFetchDiagnostics = {
  url: string;
  finalUrl?: string;
  status?: number | null;
  title?: string;
  htmlLength?: number;
  blocked?: boolean;
  attempt: number;
  error?: string;
};

export type JobDetails = {
  technologies?: {
    required?: string[];
    niceToHave?: string[];
    all?: string[];
  };
  requirements?: {
    required?: string[];
    niceToHave?: string[];
    all?: string[];
  };
  positionLevels?: string[];
  workModes?: string[];
  workSchedules?: string[];
  contractTypes?: string[];
  workplace?: string;
  companyLocation?: string;
  companyDescription?: string;
  benefits?: string[];
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
  details?: JobDetails;
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
  details?: JobDetails;
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
  details?: JobDetails;
};
