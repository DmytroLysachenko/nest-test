import { z } from 'zod';

export const CANDIDATE_PROFILE_SCHEMA_VERSION = '1.0.0';

const ConfidenceLevelEnum = z.enum(['very-low', 'low', 'medium', 'high', 'very-high']);
const ImportanceLevelEnum = z.enum(['low', 'medium', 'high']);
const WorkModeEnum = z.enum(['remote', 'hybrid', 'onsite', 'mobile']);
const EmploymentTypeEnum = z.enum(['uop', 'b2b', 'mandate', 'specific-task', 'internship']);
const SalaryPeriodEnum = z.enum(['month', 'year', 'hour']);
const CurrencyEnum = z.enum(['PLN', 'EUR', 'USD']);
const CompetencyTypeEnum = z.enum([
  'technology',
  'domain',
  'tool',
  'methodology',
  'language',
  'soft-skill',
  'role-skill',
]);

const weightedValueSchema = <T extends z.ZodTypeAny>(valueSchema: T) =>
  z.object({
    value: valueSchema,
    weight: z.number().min(0).max(1),
  });

const salaryExpectationSchema = z.object({
  amount: z.number().int().positive(),
  currency: CurrencyEnum.default('PLN'),
  period: SalaryPeriodEnum.default('month'),
});

const locationConstraintSchema = z.object({
  city: z.string().min(1).optional(),
  country: z.string().min(2).max(2).optional(),
  radiusKm: z.number().int().min(1).max(300).optional(),
});

const competencySchema = z.object({
  name: z.string().min(1),
  type: CompetencyTypeEnum,
  confidenceScore: z.number().min(0).max(1),
  confidenceLevel: ConfidenceLevelEnum,
  importance: ImportanceLevelEnum,
  evidence: z.array(z.string().min(1)).default([]),
  yearsUsed: z.number().min(0).max(50).optional(),
  recencyMonths: z.number().int().min(0).max(600).optional(),
  isTransferable: z.boolean().default(false),
});

const candidateProfileSchemaBase = z.object({
  schemaVersion: z.literal(CANDIDATE_PROFILE_SCHEMA_VERSION),
  generatedAt: z.string().datetime().optional(),
  candidateCore: z.object({
    fullName: z.string().min(1).optional(),
    headline: z.string().min(1),
    summary: z.string().min(1),
    totalExperienceYears: z.number().min(0).max(60).optional(),
    seniority: z.object({
      primary: z.enum(['intern', 'junior', 'mid', 'senior', 'lead', 'manager']).optional(),
      secondary: z.array(z.enum(['intern', 'junior', 'mid', 'senior', 'lead', 'manager'])).default([]),
    }),
    languages: z
      .array(
        z.object({
          code: z.string().min(2).max(5),
          level: z.enum(['a1', 'a2', 'b1', 'b2', 'c1', 'c2', 'native']),
        }),
      )
      .default([]),
  }),
  targetRoles: z
    .array(
      z.object({
        title: z.string().min(1),
        confidenceScore: z.number().min(0).max(1),
        confidenceLevel: ConfidenceLevelEnum,
        priority: z.number().int().min(1).max(10),
        rationale: z.string().optional(),
      }),
    )
    .default([]),
  competencies: z.array(competencySchema).default([]),
  workPreferences: z.object({
    hardConstraints: z.object({
      workModes: z.array(WorkModeEnum).default([]),
      employmentTypes: z.array(EmploymentTypeEnum).default([]),
      locations: z.array(locationConstraintSchema).default([]),
      minSalary: salaryExpectationSchema.optional(),
      noPolishRequired: z.boolean().default(false),
      onlyEmployerOffers: z.boolean().default(false),
      onlyWithProjectDescription: z.boolean().default(false),
    }),
    softPreferences: z.object({
      workModes: z.array(weightedValueSchema(WorkModeEnum)).default([]),
      employmentTypes: z.array(weightedValueSchema(EmploymentTypeEnum)).default([]),
      locations: z.array(weightedValueSchema(locationConstraintSchema)).default([]),
      salary: weightedValueSchema(salaryExpectationSchema).optional(),
    }),
  }),
  searchSignals: z.object({
    keywords: z.array(weightedValueSchema(z.string().min(1))).default([]),
    specializations: z.array(weightedValueSchema(z.string().min(1))).default([]),
    technologies: z.array(weightedValueSchema(z.string().min(1))).default([]),
  }),
  riskAndGrowth: z.object({
    gaps: z.array(z.string().min(1)).default([]),
    growthDirections: z.array(z.string().min(1)).default([]),
    transferableStrengths: z.array(z.string().min(1)).default([]),
  }),
});

export const candidateProfileSchema = candidateProfileSchemaBase.superRefine((value, ctx) => {
  if (value.targetRoles.length < 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['targetRoles'],
      message: 'At least one target role is required for matching and search.',
    });
  }

  if (value.competencies.length < 6) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['competencies'],
      message: 'At least six competencies are required to build robust matches.',
    });
  }

  if (value.searchSignals.keywords.length < 10) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['searchSignals', 'keywords'],
      message: 'At least ten keywords are required to broaden candidate search coverage.',
    });
  }

  if (value.searchSignals.technologies.length < 5) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['searchSignals', 'technologies'],
      message: 'At least five technologies/tools are required to improve discoverability.',
    });
  }
});

export type CandidateProfile = z.infer<typeof candidateProfileSchema>;
export type CandidateCompetency = z.infer<typeof competencySchema>;
export type CandidateWorkMode = z.infer<typeof WorkModeEnum>;
export type CandidateEmploymentType = z.infer<typeof EmploymentTypeEnum>;

export const parseCandidateProfile = (value: unknown) => candidateProfileSchema.safeParse(value);
