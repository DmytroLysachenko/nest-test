export type CanonicalTaxonomyDefinition = {
  slug: string;
  label: string;
  aliases?: string[];
};

const normalizeText = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

const normalizeAscii = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const normalizeKey = (value: string) => normalizeAscii(value).replace(/[^a-z0-9]+/g, '');
const collapseWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim();

const buildAliasMap = (definitions: CanonicalTaxonomyDefinition[]) => {
  return definitions.reduce<Map<string, CanonicalTaxonomyDefinition>>((map, definition) => {
    map.set(normalizeKey(definition.slug), definition);
    map.set(normalizeKey(definition.label), definition);
    for (const alias of definition.aliases ?? []) {
      map.set(normalizeKey(alias), definition);
    }
    return map;
  }, new Map());
};

const fallbackSlug = (value: string) =>
  normalizeAscii(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const resolveCanonicalDefinition = (
  value: string | null | undefined,
  aliases: Map<string, CanonicalTaxonomyDefinition>,
) => {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }

  const matched = aliases.get(normalizeKey(normalized));
  if (matched) {
    return matched;
  }

  return {
    slug: fallbackSlug(normalized),
    label: collapseWhitespace(normalized),
  };
};

export const CANONICAL_WORK_MODES: CanonicalTaxonomyDefinition[] = [
  { slug: 'remote', label: 'Remote', aliases: ['praca zdalna', 'home office', 'home-office', 'zdalnie'] },
  { slug: 'hybrid', label: 'Hybrid', aliases: ['hybrydowo', 'hybrid work'] },
  { slug: 'onsite', label: 'On-site', aliases: ['stacjonarnie', 'office', 'full office', 'in office'] },
  { slug: 'mobile', label: 'Mobile', aliases: ['field', 'mobilna', 'terenowa'] },
];

export const CANONICAL_CONTRACT_TYPES: CanonicalTaxonomyDefinition[] = [
  { slug: 'uop', label: 'Employment contract', aliases: ['umowa o prace', 'employment contract'] },
  { slug: 'b2b', label: 'B2B contract', aliases: ['kontrakt b2b', 'contract b2b'] },
  { slug: 'mandate', label: 'Mandate contract', aliases: ['umowa zlecenie', 'zlecenie'] },
  { slug: 'specific-task', label: 'Specific-task contract', aliases: ['umowa o dzielo', 'dzielo'] },
  { slug: 'internship', label: 'Internship', aliases: ['staz', 'praktyki', 'trainee'] },
  { slug: 'substitution', label: 'Substitution contract', aliases: ['umowa na zastepstwo'] },
  { slug: 'agency', label: 'Agency contract', aliases: ['umowa agencyjna'] },
  { slug: 'temporary-employment', label: 'Temporary employment', aliases: ['umowa o prace tymczasowa'] },
];

export const CANONICAL_EMPLOYMENT_TYPES: CanonicalTaxonomyDefinition[] = [
  { slug: 'full-time', label: 'Full-time', aliases: ['pelny etat', 'full time'] },
  { slug: 'part-time', label: 'Part-time', aliases: ['czesc etatu', 'part time'] },
  { slug: 'temporary', label: 'Temporary', aliases: ['dodatkowa', 'tymczasowa', 'temporary work'] },
  { slug: 'internship', label: 'Internship', aliases: ['staz', 'praktyki', 'trainee'] },
];

export const CANONICAL_JOB_CATEGORIES: CanonicalTaxonomyDefinition[] = [
  {
    slug: 'software-development',
    label: 'Software development',
    aliases: ['it - rozwoj oprogramowania', 'software engineering', 'development'],
  },
  {
    slug: 'it-administration',
    label: 'IT administration',
    aliases: ['it - administracja', 'system administration', 'security'],
  },
  { slug: 'engineering', label: 'Engineering', aliases: ['inzynieria'] },
  { slug: 'finance', label: 'Finance', aliases: ['finanse', 'ekonomia', 'bankowosc'] },
  { slug: 'sales', label: 'Sales', aliases: ['sprzedaz'] },
  { slug: 'marketing', label: 'Marketing', aliases: ['public relations', 'reklama', 'ux ui'] },
  { slug: 'operations', label: 'Operations', aliases: ['logistyka', 'transport', 'spedycja'] },
  { slug: 'customer-support', label: 'Customer support', aliases: ['obsluga klienta', 'helpdesk'] },
  { slug: 'human-resources', label: 'Human resources', aliases: ['human resources', 'zasoby ludzkie'] },
  { slug: 'healthcare', label: 'Healthcare', aliases: ['zdrowie', 'uroda', 'rekreacja'] },
  { slug: 'education', label: 'Education', aliases: ['edukacja', 'szkolenia'] },
  { slug: 'manufacturing', label: 'Manufacturing', aliases: ['produkcja'] },
  { slug: 'construction', label: 'Construction', aliases: ['budownictwo'] },
  { slug: 'legal', label: 'Legal', aliases: ['prawo'] },
  { slug: 'research-and-development', label: 'Research and development', aliases: ['badania i rozwoj'] },
  { slug: 'administration', label: 'Administration', aliases: ['administracja biurowa'] },
  { slug: 'other', label: 'Other', aliases: ['inne'] },
];

export const CANONICAL_SENIORITY_LEVELS: CanonicalTaxonomyDefinition[] = [
  { slug: 'intern', label: 'Intern', aliases: ['praktykant', 'stazysta', 'trainee', 'intern'] },
  { slug: 'junior', label: 'Junior', aliases: ['mlodszy specjalista', 'junior', 'associate'] },
  { slug: 'mid', label: 'Mid', aliases: ['specjalista', 'mid', 'regular'] },
  { slug: 'senior', label: 'Senior', aliases: ['starszy specjalista', 'senior'] },
  { slug: 'lead', label: 'Lead', aliases: ['ekspert', 'lead', 'principal', 'architekt'] },
  { slug: 'manager', label: 'Manager', aliases: ['manager', 'menedzer', 'kierownik', 'koordynator', 'head'] },
  { slug: 'director', label: 'Director', aliases: ['dyrektor', 'director'] },
  { slug: 'executive', label: 'Executive', aliases: ['prezes', 'executive', 'vp', 'chief'] },
];

export const CANONICAL_WORK_SCHEDULES: CanonicalTaxonomyDefinition[] = [
  { slug: 'full-time', label: 'Full-time', aliases: ['pelny etat', 'full time'] },
  { slug: 'part-time', label: 'Part-time', aliases: ['czesc etatu', 'part time'] },
  { slug: 'temporary', label: 'Temporary', aliases: ['tymczasowa', 'temporary', 'dodatkowa'] },
  { slug: 'shift', label: 'Shift work', aliases: ['zmianowa', 'shift'] },
  { slug: 'flexible', label: 'Flexible schedule', aliases: ['elastyczny czas pracy', 'flexible'] },
  { slug: 'internship', label: 'Internship schedule', aliases: ['praktyki', 'staz'] },
];

const WORK_MODE_ALIASES = buildAliasMap(CANONICAL_WORK_MODES);
const CONTRACT_TYPE_ALIASES = buildAliasMap(CANONICAL_CONTRACT_TYPES);
const EMPLOYMENT_TYPE_ALIASES = buildAliasMap(CANONICAL_EMPLOYMENT_TYPES);
const JOB_CATEGORY_ALIASES = buildAliasMap(CANONICAL_JOB_CATEGORIES);
const SENIORITY_LEVEL_ALIASES = buildAliasMap(CANONICAL_SENIORITY_LEVELS);
const WORK_SCHEDULE_ALIASES = buildAliasMap(CANONICAL_WORK_SCHEDULES);

export const normalizeCompanyName = (value?: string | null) => {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }

  const canonicalName = collapseWhitespace(normalized);
  const normalizedName = normalizeAscii(canonicalName)
    .replace(/\b(sp\.?\s*z\.?\s*o\.?\s*o\.?|spolka z ograniczona odpowiedzialnoscia)\b/g, '')
    .replace(/\b(s\.?\s*a\.?|sa)\b/g, '')
    .replace(/\b(inc\.?|llc|ltd\.?|gmbh)\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    canonicalName,
    normalizedName:
      normalizedName ||
      normalizeAscii(canonicalName)
        .replace(/[^a-z0-9]+/g, ' ')
        .trim(),
  };
};

export const canonicalizeWorkMode = (value?: string | null) =>
  resolveCanonicalDefinition(value, WORK_MODE_ALIASES)?.slug ?? null;

export const canonicalizeContractType = (value?: string | null) =>
  resolveCanonicalDefinition(value, CONTRACT_TYPE_ALIASES)?.slug ?? null;

export const canonicalizeEmploymentType = (value?: string | null) =>
  resolveCanonicalDefinition(value, EMPLOYMENT_TYPE_ALIASES)?.slug ?? null;

export const canonicalizeJobCategory = (value?: string | null) =>
  resolveCanonicalDefinition(value, JOB_CATEGORY_ALIASES)?.slug ?? null;

export const canonicalizeSeniorityLevel = (value?: string | null) =>
  resolveCanonicalDefinition(value, SENIORITY_LEVEL_ALIASES)?.slug ?? null;

export const canonicalizeWorkSchedule = (value?: string | null) =>
  resolveCanonicalDefinition(value, WORK_SCHEDULE_ALIASES)?.slug ?? null;

export const canonicalizeTechnology = (value?: string | null) => {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }

  return {
    slug: fallbackSlug(normalized),
    label: collapseWhitespace(normalized),
  };
};

export const resolveCanonicalWorkMode = (value?: string | null) => resolveCanonicalDefinition(value, WORK_MODE_ALIASES);
export const resolveCanonicalContractType = (value?: string | null) =>
  resolveCanonicalDefinition(value, CONTRACT_TYPE_ALIASES);
export const resolveCanonicalEmploymentType = (value?: string | null) =>
  resolveCanonicalDefinition(value, EMPLOYMENT_TYPE_ALIASES);
export const resolveCanonicalJobCategory = (value?: string | null) =>
  resolveCanonicalDefinition(value, JOB_CATEGORY_ALIASES);
export const resolveCanonicalSeniorityLevel = (value?: string | null) =>
  resolveCanonicalDefinition(value, SENIORITY_LEVEL_ALIASES);
export const resolveCanonicalWorkSchedule = (value?: string | null) =>
  resolveCanonicalDefinition(value, WORK_SCHEDULE_ALIASES);

const PRACUJ_GENERAL_CATEGORY_BY_ID: Record<string, string> = {
  '5001': 'research-and-development',
  '5002': 'finance',
  '5003': 'operations',
  '5004': 'customer-support',
  '5005': 'operations',
  '5006': 'construction',
  '5007': 'other',
  '5008': 'marketing',
  '5009': 'human-resources',
  '5010': 'finance',
  '5011': 'operations',
  '5012': 'healthcare',
  '5013': 'engineering',
  '5014': 'it-administration',
  '5015': 'software-development',
  '5016': 'operations',
  '5017': 'administration',
  '5018': 'operations',
  '5019': 'marketing',
  '5020': 'marketing',
  '5021': 'sales',
  '5022': 'customer-support',
  '5023': 'operations',
  '5024': 'legal',
  '5025': 'manufacturing',
  '5026': 'marketing',
  '5027': 'marketing',
  '5028': 'administration',
  '5031': 'sales',
  '5032': 'operations',
  '5033': 'operations',
  '5034': 'other',
  '5035': 'finance',
  '5036': 'operations',
  '5037': 'education',
};

const PRACUJ_IT_SPECIALIZATION_BY_SLUG: Record<string, string> = {
  backend: 'software-development',
  frontend: 'software-development',
  fullstack: 'software-development',
  mobile: 'software-development',
  architecture: 'software-development',
  devops: 'it-administration',
  gamedev: 'software-development',
  'data-analytics-and-bi': 'research-and-development',
  'big-data-science': 'research-and-development',
  embedded: 'software-development',
  testing: 'software-development',
  security: 'it-administration',
  helpdesk: 'customer-support',
  'product-management': 'operations',
  'project-management': 'operations',
  agile: 'operations',
  'ux-ui': 'marketing',
  'business-analytics': 'operations',
  'system-analytics': 'operations',
  'sap-erp': 'operations',
  'it-admin': 'it-administration',
  'ai-ml': 'research-and-development',
};

export const resolvePracujCategoryDefinition = (value?: string | null, source?: 'it' | 'general') => {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }

  const mappedSlug =
    source === 'general'
      ? PRACUJ_GENERAL_CATEGORY_BY_ID[normalized]
      : (PRACUJ_IT_SPECIALIZATION_BY_SLUG[normalized] ?? PRACUJ_GENERAL_CATEGORY_BY_ID[normalized]);

  if (!mappedSlug) {
    return resolveCanonicalJobCategory(normalized);
  }

  return CANONICAL_JOB_CATEGORIES.find((item) => item.slug === mappedSlug) ?? { slug: mappedSlug, label: mappedSlug };
};

export type ParsedSalary = {
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  salaryPeriod: string | null;
  salaryKind: string | null;
};

export const parseSalaryText = (value?: string | null): ParsedSalary => {
  const normalized = normalizeText(value);
  if (!normalized) {
    return {
      salaryMin: null,
      salaryMax: null,
      salaryCurrency: null,
      salaryPeriod: null,
      salaryKind: null,
    };
  }

  const amountMatches = Array.from(normalized.matchAll(/(\d[\d\s]*)/g))
    .map((match) => match[1] ?? null)
    .filter((value): value is string => Boolean(value))
    .map((value) => Number(value.replace(/\s+/g, '')))
    .filter((item) => Number.isFinite(item));
  const salaryCurrency =
    /\b(pln|zł|zl|eur|usd|gbp)\b/i.exec(normalized)?.[1]?.toUpperCase().replace('ZŁ', 'PLN') ?? null;
  const salaryPeriod = normalized.match(/\/\s*(godz|godz\.|h|mies|mies\.|month|rok|year)/i)?.[1]?.toLowerCase() ?? null;
  const salaryKind = /\bnetto\b/i.test(normalized)
    ? 'net'
    : /\bbrutto\b/i.test(normalized)
      ? 'gross'
      : /\+?\s*vat/i.test(normalized)
        ? 'net-plus-vat'
        : null;

  return {
    salaryMin: amountMatches[0] ?? null,
    salaryMax: amountMatches[1] ?? amountMatches[0] ?? null,
    salaryCurrency,
    salaryPeriod,
    salaryKind,
  };
};
