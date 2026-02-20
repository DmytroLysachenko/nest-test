import { z } from 'zod';

const SeniorityEnum = z.enum(['intern', 'junior', 'mid', 'senior', 'lead', 'manager']);
const SpecializationEnum = z.enum([
  'frontend',
  'backend',
  'fullstack',
  'devops',
  'data',
  'qa',
  'security',
  'product',
]);
const WorkModeEnum = z.enum(['remote', 'hybrid', 'onsite', 'mobile']);
const WorkTimeEnum = z.enum(['full-time', 'part-time', 'temporary']);
const ContractTypeEnum = z.enum(['uop', 'b2b', 'mandate', 'specific-task', 'internship']);
const LanguageLevelEnum = z.enum(['a1', 'a2', 'b1', 'b2', 'c1', 'c2', 'native']);
const CurrencyEnum = z.enum(['PLN', 'EUR', 'USD']);
const SalaryPeriodEnum = z.enum(['month', 'year', 'hour']);
const SearchSourceKindEnum = z.enum(['it', 'general']);

export const normalizedRoleSchema = z.object({
  name: z.string().min(1),
  aliases: z.array(z.string().min(1)).default([]),
  priority: z.number().int().min(1),
});

export const normalizedLocationSchema = z.object({
  city: z.string().min(1),
  radiusKm: z.number().int().min(1).max(200).optional(),
  country: z.string().min(2).max(2).default('PL'),
});

export const normalizedSalarySchema = z.object({
  min: z.number().int().positive(),
  currency: CurrencyEnum.default('PLN'),
  period: SalaryPeriodEnum.default('month'),
});

export const normalizedLanguageSchema = z.object({
  code: z.string().min(2).max(5),
  level: LanguageLevelEnum,
});

export const normalizedConstraintsSchema = z.object({
  noPolishRequired: z.boolean().default(false),
  ukrainiansWelcome: z.boolean().default(false),
  onlyEmployerOffers: z.boolean().default(false),
  onlyWithProjectDescription: z.boolean().default(false),
});

export const normalizedSearchPreferencesSchema = z.object({
  sourceKind: SearchSourceKindEnum.default('it'),
  seniority: z.array(SeniorityEnum).default([]),
  workModes: z.array(WorkModeEnum).default([]),
  employmentTypes: z.array(ContractTypeEnum).default([]),
  timeModes: z.array(WorkTimeEnum).default([]),
  salaryMin: z.number().int().positive().nullable().default(null),
  city: z.string().min(1).nullable().default(null),
  radiusKm: z.number().int().min(1).max(200).nullable().default(null),
  keywords: z.array(z.string().min(1)).default([]),
});

export const normalizedProfileInputSchema = z.object({
  roles: z.array(normalizedRoleSchema).default([]),
  seniority: z.array(SeniorityEnum).default([]),
  specializations: z.array(SpecializationEnum).default([]),
  technologies: z.array(z.string().min(1)).default([]),
  workModes: z.array(WorkModeEnum).default([]),
  workTime: z.array(WorkTimeEnum).default([]),
  contractTypes: z.array(ContractTypeEnum).default([]),
  locations: z.array(normalizedLocationSchema).default([]),
  salary: normalizedSalarySchema.nullable().default(null),
  languages: z.array(normalizedLanguageSchema).default([]),
  constraints: normalizedConstraintsSchema.default({
    noPolishRequired: false,
    ukrainiansWelcome: false,
    onlyEmployerOffers: false,
    onlyWithProjectDescription: false,
  }),
  searchPreferences: normalizedSearchPreferencesSchema.default({
    sourceKind: 'it',
    seniority: [],
    workModes: [],
    employmentTypes: [],
    timeModes: [],
    salaryMin: null,
    city: null,
    radiusKm: null,
    keywords: [],
  }),
  freeText: z.string().default(''),
});

export const normalizationIssueSchema = z.object({
  code: z.string().min(1),
  value: z.string().min(1),
});

export const normalizationMetaSchema = z.object({
  mapperVersion: z.string().min(1),
  status: z.enum(['ok', 'partial', 'failed']),
  warnings: z.array(normalizationIssueSchema).default([]),
  errors: z.array(normalizationIssueSchema).default([]),
  rawSnapshot: z.object({
    targetRoles: z.string(),
    notes: z.string().nullable(),
  }),
});

export type NormalizedProfileInput = z.infer<typeof normalizedProfileInputSchema>;
export type NormalizationMeta = z.infer<typeof normalizationMetaSchema>;
