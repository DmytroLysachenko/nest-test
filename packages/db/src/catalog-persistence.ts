import { and, eq, inArray, sql } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';

import {
  canonicalizeContractType,
  canonicalizeEmploymentType,
  canonicalizeSeniorityLevel,
  canonicalizeTechnology,
  canonicalizeWorkMode,
  canonicalizeWorkSchedule,
  normalizeCompanyName,
  parseSalaryText,
  resolveCanonicalContractType,
  resolveCanonicalEmploymentType,
  resolveCanonicalSeniorityLevel,
  resolveCanonicalWorkMode,
  resolveCanonicalWorkSchedule,
  resolvePracujCategoryDefinition,
  type ParsedSalary,
} from './catalog-normalization';
import {
  companiesTable,
  companyAliasesTable,
  companySourceProfilesTable,
  contractTypesTable,
  employmentTypesTable,
  jobCategoriesTable,
  jobOfferContractTypesTable,
  jobOfferRawPayloadsTable,
  jobOfferSeniorityLevelsTable,
  jobOfferSourceObservationsTable,
  jobOfferTechnologiesTable,
  jobOfferWorkModesTable,
  jobOfferWorkSchedulesTable,
  jobOffersTable,
  seniorityLevelsTable,
  technologiesTable,
  workModesTable,
  workSchedulesTable,
} from './schema';

type CatalogNormalizationDetails = {
  companyDescription?: string | null;
  companyLocation?: string | null;
  contractTypes?: string[] | null;
  workModes?: string[] | null;
  workSchedules?: string[] | null;
  positionLevels?: string[] | null;
  technologies?: {
    required?: string[] | null;
    niceToHave?: string[] | null;
    all?: string[] | null;
  } | null;
};

export type CatalogNormalizationJobInput = {
  sourceId?: string | null;
  company?: string | null;
  employmentType?: string | null;
  salary?: string | null;
  sourceCompanyProfileUrl?: string | null;
  applyUrl?: string | null;
  postedAt?: Date | string | null;
  details?: CatalogNormalizationDetails | null;
};

export type CatalogNormalizationContext = {
  filters?: Record<string, unknown> | null;
  listingUrl?: string | null;
  source?: 'PRACUJ_PL' | null;
};

export type CatalogNormalizationRefs = {
  companyId: string | null;
  jobCategoryId: string | null;
  employmentTypeId: string | null;
  contractTypeId: string | null;
  workModeId: string | null;
  contractTypeIds: string[];
  workModeIds: string[];
  workScheduleIds: string[];
  seniorityLevelIds: string[];
  technologies: Array<{ technologyId: string; category: 'required' | 'nice_to_have' | 'all' }>;
  parsedSalary: ParsedSalary;
  sourceCompanyProfileUrl: string | null;
};

export type CatalogObservationPayload = {
  jobOfferId: string;
  runId?: string | null;
  source: 'PRACUJ_PL';
  sourceId?: string | null;
  title: string;
  company?: string | null;
  location?: string | null;
  salary?: string | null;
  sourceCompanyProfileUrl?: string | null;
  employmentType?: string | null;
  applyUrl?: string | null;
  postedAt?: Date | null;
  description: string;
  requirements?: unknown;
  details?: unknown;
  contentHash: string;
  qualityState: 'ACCEPTED' | 'REJECTED' | 'REVIEW';
  qualityReason?: string | null;
  parserVersion: string;
  normalizationVersion: string;
  normalizedRefs: CatalogNormalizationRefs;
  rawPayloads?: Array<{ payloadType: string; payloadJson?: unknown; payloadText?: string | null }>;
};

const toStringArray = (value: unknown) =>
  Array.isArray(value) ? value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean) : [];

const uniqueStrings = (items: Array<string | null | undefined>) =>
  Array.from(new Set(items.filter((item): item is string => Boolean(item))));

const mapDefinitions = <T extends { slug: string; label: string; description?: string | null }>(definitions: T[]) =>
  Array.from(new Map(definitions.map((item) => [item.slug, item])).values());

const upsertDimensionRows = async (
  db: NodePgDatabase,
  table:
    | typeof contractTypesTable
    | typeof employmentTypesTable
    | typeof workModesTable
    | typeof jobCategoriesTable
    | typeof seniorityLevelsTable
    | typeof workSchedulesTable
    | typeof technologiesTable,
  definitions: Array<{ slug: string; label: string; description?: string | null }>,
) => {
  if (!definitions.length) {
    return new Map<string, string>();
  }

  await db.insert(table).values(definitions).onConflictDoNothing();
  const rows = await db
    .select({ id: table.id, slug: table.slug })
    .from(table)
    .where(
      inArray(
        table.slug,
        definitions.map((definition) => definition.slug),
      ),
    );

  return new Map(rows.map((row) => [row.slug, row.id]));
};

const inferPracujCategoryDefinition = (context?: CatalogNormalizationContext | null) => {
  const filters = context?.filters ?? null;
  if (!filters) {
    return null;
  }

  const generalCategories = toStringArray(filters.categories);
  if (generalCategories.length === 1) {
    return resolvePracujCategoryDefinition(generalCategories[0], 'general');
  }

  const itSpecializations = toStringArray(filters.specializations);
  if (itSpecializations.length === 1) {
    return resolvePracujCategoryDefinition(itSpecializations[0], 'it');
  }

  return null;
};

const normalizePostedAt = (value?: Date | string | null) => {
  if (!value) {
    return null;
  }
  if (value instanceof Date) {
    return value;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export const resolveCatalogNormalizationRefs = async (
  db: NodePgDatabase,
  jobs: CatalogNormalizationJobInput[],
  context?: CatalogNormalizationContext | null,
): Promise<CatalogNormalizationRefs[]> => {
  const now = new Date();
  const inferredCategory = inferPracujCategoryDefinition(context);

  const preparedJobs = jobs.map((job) => {
    const normalizedCompany = normalizeCompanyName(job.company);
    const contractTypeSlugs = uniqueStrings([
      canonicalizeContractType(job.employmentType),
      ...toStringArray(job.details?.contractTypes).map((item) => canonicalizeContractType(item)),
    ]);
    const employmentTypeSlug = canonicalizeEmploymentType(toStringArray(job.details?.workSchedules)[0]);
    const workModeSlugs = uniqueStrings(
      toStringArray(job.details?.workModes).map((item) => canonicalizeWorkMode(item)),
    );
    const workScheduleSlugs = uniqueStrings(
      toStringArray(job.details?.workSchedules).map((item) => canonicalizeWorkSchedule(item)),
    );
    const seniorityLevelSlugs = uniqueStrings(
      toStringArray(job.details?.positionLevels).map((item) => canonicalizeSeniorityLevel(item)),
    );
    const technologyInputs = [
      ...toStringArray(job.details?.technologies?.required).map((item) => ({
        ...canonicalizeTechnology(item),
        category: 'required' as const,
      })),
      ...toStringArray(job.details?.technologies?.niceToHave).map((item) => ({
        ...canonicalizeTechnology(item),
        category: 'nice_to_have' as const,
      })),
      ...toStringArray(job.details?.technologies?.all).map((item) => ({
        ...canonicalizeTechnology(item),
        category: 'all' as const,
      })),
    ].filter((item): item is { slug: string; label: string; category: 'required' | 'nice_to_have' | 'all' } =>
      Boolean(item?.slug && item?.label),
    );

    return {
      normalizedCompany,
      companyLocation: job.details?.companyLocation?.trim() || null,
      companyDescription: job.details?.companyDescription?.trim() || null,
      sourceCompanyProfileUrl: job.sourceCompanyProfileUrl?.trim() || null,
      contractTypeSlugs,
      employmentTypeSlug,
      workModeSlugs,
      workScheduleSlugs,
      seniorityLevelSlugs,
      technologyInputs,
      categorySlug: inferredCategory?.slug ?? null,
      categoryLabel: inferredCategory?.label ?? null,
      parsedSalary: parseSalaryText(job.salary),
    };
  });

  const companyInputs = Array.from(
    new Map(
      preparedJobs
        .filter((job) => job.normalizedCompany)
        .map((job) => [
          job.normalizedCompany!.normalizedName,
          {
            canonicalName: job.normalizedCompany!.canonicalName,
            normalizedName: job.normalizedCompany!.normalizedName,
            hqLocation: job.companyLocation,
            description: job.companyDescription,
            sourceCompanyProfileUrl: job.sourceCompanyProfileUrl,
          },
        ]),
    ).values(),
  );

  if (companyInputs.length) {
    await db
      .insert(companiesTable)
      .values(
        companyInputs.map((company) => ({
          canonicalName: company.canonicalName,
          normalizedName: company.normalizedName,
          primarySource: 'pracuj-pl',
          sourceProfileUrl: company.sourceCompanyProfileUrl,
          hqLocation: company.hqLocation,
          description: company.description,
          firstSeenAt: now,
          lastSeenAt: now,
          createdAt: now,
          updatedAt: now,
        })),
      )
      .onConflictDoUpdate({
        target: companiesTable.normalizedName,
        set: {
          lastSeenAt: now,
          updatedAt: now,
          sourceProfileUrl: sql`coalesce(excluded."source_profile_url", ${companiesTable.sourceProfileUrl})`,
          hqLocation: sql`coalesce(${companiesTable.hqLocation}, excluded."hq_location")`,
          description: sql`coalesce(${companiesTable.description}, excluded."description")`,
        },
      });
  }

  const contractTypeDefinitions = mapDefinitions(
    preparedJobs.flatMap((job) =>
      job.contractTypeSlugs.map((slug) => {
        const definition = resolveCanonicalContractType(slug);
        return { slug, label: definition?.label ?? slug };
      }),
    ),
  );
  const employmentTypeDefinitions = mapDefinitions(
    preparedJobs
      .map((job) => job.employmentTypeSlug)
      .filter((value): value is string => Boolean(value))
      .map((slug) => {
        const definition = resolveCanonicalEmploymentType(slug);
        return { slug, label: definition?.label ?? slug };
      }),
  );
  const workModeDefinitions = mapDefinitions(
    preparedJobs.flatMap((job) =>
      job.workModeSlugs.map((slug) => {
        const definition = resolveCanonicalWorkMode(slug);
        return { slug, label: definition?.label ?? slug };
      }),
    ),
  );
  const workScheduleDefinitions = mapDefinitions(
    preparedJobs.flatMap((job) =>
      job.workScheduleSlugs.map((slug) => {
        const definition = resolveCanonicalWorkSchedule(slug);
        return { slug, label: definition?.label ?? slug };
      }),
    ),
  );
  const seniorityDefinitions = mapDefinitions(
    preparedJobs.flatMap((job) =>
      job.seniorityLevelSlugs.map((slug) => {
        const definition = resolveCanonicalSeniorityLevel(slug);
        return { slug, label: definition?.label ?? slug };
      }),
    ),
  );
  const technologyDefinitions = mapDefinitions(
    preparedJobs.flatMap((job) =>
      job.technologyInputs.map((tech) => ({
        slug: tech.slug,
        label: tech.label,
      })),
    ),
  );
  const jobCategoryDefinitions =
    inferredCategory && inferredCategory.slug
      ? [{ slug: inferredCategory.slug, label: inferredCategory.label, description: null }]
      : [];

  const [
    companyRows,
    contractTypeIds,
    employmentTypeIds,
    workModeIds,
    workScheduleIds,
    seniorityLevelIds,
    technologyIds,
    jobCategoryIds,
  ] = await Promise.all([
    companyInputs.length
      ? db
          .select({ id: companiesTable.id, normalizedName: companiesTable.normalizedName })
          .from(companiesTable)
          .where(
            inArray(
              companiesTable.normalizedName,
              companyInputs.map((company) => company.normalizedName),
            ),
          )
      : Promise.resolve([]),
    upsertDimensionRows(db, contractTypesTable, contractTypeDefinitions),
    upsertDimensionRows(db, employmentTypesTable, employmentTypeDefinitions),
    upsertDimensionRows(db, workModesTable, workModeDefinitions),
    upsertDimensionRows(db, workSchedulesTable, workScheduleDefinitions),
    upsertDimensionRows(db, seniorityLevelsTable, seniorityDefinitions),
    upsertDimensionRows(db, technologiesTable, technologyDefinitions),
    upsertDimensionRows(db, jobCategoriesTable, jobCategoryDefinitions),
  ]);

  const companyIds = new Map(companyRows.map((row) => [row.normalizedName, row.id]));

  for (const company of companyInputs) {
    const companyId = companyIds.get(company.normalizedName);
    if (!companyId) {
      continue;
    }

    await db
      .insert(companyAliasesTable)
      .values({
        companyId,
        alias: company.canonicalName,
        normalizedAlias: company.normalizedName,
        source: 'pracuj-pl',
        createdAt: now,
      })
      .onConflictDoNothing();

    if (company.sourceCompanyProfileUrl) {
      await db
        .insert(companySourceProfilesTable)
        .values({
          companyId,
          source: 'pracuj-pl',
          sourceProfileUrl: company.sourceCompanyProfileUrl,
          displayName: company.canonicalName,
          firstSeenAt: now,
          lastSeenAt: now,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing();
    }
  }

  return preparedJobs.map((job) => ({
    companyId: job.normalizedCompany ? (companyIds.get(job.normalizedCompany.normalizedName) ?? null) : null,
    jobCategoryId: job.categorySlug ? (jobCategoryIds.get(job.categorySlug) ?? null) : null,
    employmentTypeId: job.employmentTypeSlug ? (employmentTypeIds.get(job.employmentTypeSlug) ?? null) : null,
    contractTypeId: job.contractTypeSlugs[0] ? (contractTypeIds.get(job.contractTypeSlugs[0]) ?? null) : null,
    workModeId: job.workModeSlugs[0] ? (workModeIds.get(job.workModeSlugs[0]) ?? null) : null,
    contractTypeIds: job.contractTypeSlugs
      .map((slug) => contractTypeIds.get(slug))
      .filter((value): value is string => Boolean(value)),
    workModeIds: job.workModeSlugs
      .map((slug) => workModeIds.get(slug))
      .filter((value): value is string => Boolean(value)),
    workScheduleIds: job.workScheduleSlugs
      .map((slug) => workScheduleIds.get(slug))
      .filter((value): value is string => Boolean(value)),
    seniorityLevelIds: job.seniorityLevelSlugs
      .map((slug) => seniorityLevelIds.get(slug))
      .filter((value): value is string => Boolean(value)),
    technologies: job.technologyInputs
      .map((tech) => {
        const technologyId = technologyIds.get(tech.slug);
        return technologyId ? { technologyId, category: tech.category } : null;
      })
      .filter((value): value is { technologyId: string; category: 'required' | 'nice_to_have' | 'all' } =>
        Boolean(value),
      ),
    parsedSalary: job.parsedSalary,
    sourceCompanyProfileUrl: job.sourceCompanyProfileUrl,
  }));
};

const replaceRelationRows = async (db: NodePgDatabase, jobOfferId: string, input: CatalogNormalizationRefs) => {
  await Promise.all([
    db.delete(jobOfferContractTypesTable).where(eq(jobOfferContractTypesTable.jobOfferId, jobOfferId)),
    db.delete(jobOfferWorkModesTable).where(eq(jobOfferWorkModesTable.jobOfferId, jobOfferId)),
    db.delete(jobOfferWorkSchedulesTable).where(eq(jobOfferWorkSchedulesTable.jobOfferId, jobOfferId)),
    db.delete(jobOfferSeniorityLevelsTable).where(eq(jobOfferSeniorityLevelsTable.jobOfferId, jobOfferId)),
    db.delete(jobOfferTechnologiesTable).where(eq(jobOfferTechnologiesTable.jobOfferId, jobOfferId)),
  ]);

  if (input.contractTypeIds.length) {
    await db
      .insert(jobOfferContractTypesTable)
      .values(input.contractTypeIds.map((contractTypeId) => ({ jobOfferId, contractTypeId })));
  }
  if (input.workModeIds.length) {
    await db.insert(jobOfferWorkModesTable).values(input.workModeIds.map((workModeId) => ({ jobOfferId, workModeId })));
  }
  if (input.workScheduleIds.length) {
    await db
      .insert(jobOfferWorkSchedulesTable)
      .values(input.workScheduleIds.map((workScheduleId) => ({ jobOfferId, workScheduleId })));
  }
  if (input.seniorityLevelIds.length) {
    await db
      .insert(jobOfferSeniorityLevelsTable)
      .values(input.seniorityLevelIds.map((seniorityLevelId) => ({ jobOfferId, seniorityLevelId })));
  }
  if (input.technologies.length) {
    await db.insert(jobOfferTechnologiesTable).values(
      input.technologies.map((technology) => ({
        jobOfferId,
        technologyId: technology.technologyId,
        category: technology.category,
      })),
    );
  }
};

export const replaceJobOfferRelations = replaceRelationRows;

export const persistCatalogObservation = async (db: NodePgDatabase, payload: CatalogObservationPayload) => {
  const [observation] = await db
    .insert(jobOfferSourceObservationsTable)
    .values({
      jobOfferId: payload.jobOfferId,
      runId: payload.runId ?? null,
      source: payload.source,
      sourceId: payload.sourceId ?? null,
      sourceCompanyProfileUrl:
        payload.sourceCompanyProfileUrl ?? payload.normalizedRefs.sourceCompanyProfileUrl ?? null,
      parserVersion: payload.parserVersion,
      normalizationVersion: payload.normalizationVersion,
      observedAt: new Date(),
      title: payload.title,
      company: payload.company ?? null,
      location: payload.location ?? null,
      salary: payload.salary ?? null,
      salaryMin: payload.normalizedRefs.parsedSalary.salaryMin,
      salaryMax: payload.normalizedRefs.parsedSalary.salaryMax,
      salaryCurrency: payload.normalizedRefs.parsedSalary.salaryCurrency,
      salaryPeriod: payload.normalizedRefs.parsedSalary.salaryPeriod,
      salaryKind: payload.normalizedRefs.parsedSalary.salaryKind,
      employmentType: payload.employmentType ?? null,
      applyUrl: payload.applyUrl ?? null,
      postedAt: payload.postedAt ?? null,
      description: payload.description,
      requirements: payload.requirements ?? null,
      details: payload.details ?? null,
      contentHash: payload.contentHash,
      qualityState: payload.qualityState,
      qualityReason: payload.qualityReason ?? null,
      companyId: payload.normalizedRefs.companyId,
      jobCategoryId: payload.normalizedRefs.jobCategoryId,
      employmentTypeId: payload.normalizedRefs.employmentTypeId,
      contractTypeId: payload.normalizedRefs.contractTypeId,
      workModeId: payload.normalizedRefs.workModeId,
    })
    .onConflictDoNothing()
    .returning({ id: jobOfferSourceObservationsTable.id });

  if (!observation?.id) {
    return null;
  }

  if (payload.rawPayloads?.length) {
    await db.insert(jobOfferRawPayloadsTable).values(
      payload.rawPayloads.map((rawPayload) => ({
        observationId: observation.id,
        payloadType: rawPayload.payloadType,
        payloadJson: rawPayload.payloadJson ?? null,
        payloadText: rawPayload.payloadText ?? null,
      })),
    );
  }

  await replaceRelationRows(db, payload.jobOfferId, payload.normalizedRefs);
  return observation.id;
};
