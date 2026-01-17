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
};

export type NormalizedJob = {
  title: string;
  company: string | null;
  location: string | null;
  description: string;
  url: string;
  tags: string[];
};
