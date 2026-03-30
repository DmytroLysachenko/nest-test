import { inArray, sql } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';

import {
  canonicalizeContractType,
  canonicalizeEmploymentType,
  canonicalizeWorkMode,
  normalizeCompanyName,
  resolveCanonicalContractType,
  resolveCanonicalEmploymentType,
  resolveCanonicalWorkMode,
  resolvePracujCategoryDefinition,
} from './catalog-normalization';
import { companiesTable, contractTypesTable, employmentTypesTable, jobCategoriesTable, workModesTable } from './schema';

type CatalogNormalizationDetails = {
  companyDescription?: string | null;
  companyLocation?: string | null;
  contractTypes?: string[] | null;
  workModes?: string[] | null;
  workSchedules?: string[] | null;
};

export type CatalogNormalizationJobInput = {
  company?: string | null;
  employmentType?: string | null;
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
};

const toStringArray = (value: unknown) =>
  Array.isArray(value) ? value.map((item) => (typeof item === 'string' ? item.trim() : '')).filter(Boolean) : [];

const upsertContractTypeRows = async (
  db: NodePgDatabase,
  definitions: Array<{ slug: string; label: string; description?: string | null }>,
) => {
  if (!definitions.length) {
    return new Map<string, string>();
  }

  await db
    .insert(contractTypesTable)
    .values(
      definitions.map((definition) => ({
        slug: definition.slug,
        label: definition.label,
        description: definition.description ?? null,
      })),
    )
    .onConflictDoNothing();

  const rows = await db
    .select({
      id: contractTypesTable.id,
      slug: contractTypesTable.slug,
    })
    .from(contractTypesTable)
    .where(
      inArray(
        contractTypesTable.slug,
        definitions.map((definition) => definition.slug),
      ),
    );

  return new Map(rows.map((row) => [row.slug, row.id]));
};

const upsertEmploymentTypeRows = async (
  db: NodePgDatabase,
  definitions: Array<{ slug: string; label: string; description?: string | null }>,
) => {
  if (!definitions.length) {
    return new Map<string, string>();
  }

  await db
    .insert(employmentTypesTable)
    .values(
      definitions.map((definition) => ({
        slug: definition.slug,
        label: definition.label,
        description: definition.description ?? null,
      })),
    )
    .onConflictDoNothing();

  const rows = await db
    .select({
      id: employmentTypesTable.id,
      slug: employmentTypesTable.slug,
    })
    .from(employmentTypesTable)
    .where(
      inArray(
        employmentTypesTable.slug,
        definitions.map((definition) => definition.slug),
      ),
    );

  return new Map(rows.map((row) => [row.slug, row.id]));
};

const upsertWorkModeRows = async (
  db: NodePgDatabase,
  definitions: Array<{ slug: string; label: string; description?: string | null }>,
) => {
  if (!definitions.length) {
    return new Map<string, string>();
  }

  await db
    .insert(workModesTable)
    .values(
      definitions.map((definition) => ({
        slug: definition.slug,
        label: definition.label,
        description: definition.description ?? null,
      })),
    )
    .onConflictDoNothing();

  const rows = await db
    .select({
      id: workModesTable.id,
      slug: workModesTable.slug,
    })
    .from(workModesTable)
    .where(
      inArray(
        workModesTable.slug,
        definitions.map((definition) => definition.slug),
      ),
    );

  return new Map(rows.map((row) => [row.slug, row.id]));
};

const upsertJobCategoryRows = async (
  db: NodePgDatabase,
  definitions: Array<{ slug: string; label: string; description?: string | null }>,
) => {
  if (!definitions.length) {
    return new Map<string, string>();
  }

  await db
    .insert(jobCategoriesTable)
    .values(
      definitions.map((definition) => ({
        slug: definition.slug,
        label: definition.label,
        description: definition.description ?? null,
      })),
    )
    .onConflictDoNothing();

  const rows = await db
    .select({
      id: jobCategoriesTable.id,
      slug: jobCategoriesTable.slug,
    })
    .from(jobCategoriesTable)
    .where(
      inArray(
        jobCategoriesTable.slug,
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

export const resolveCatalogNormalizationRefs = async (
  db: NodePgDatabase,
  jobs: CatalogNormalizationJobInput[],
  context?: CatalogNormalizationContext | null,
): Promise<CatalogNormalizationRefs[]> => {
  const now = new Date();
  const inferredCategory = inferPracujCategoryDefinition(context);

  const preparedJobs = jobs.map((job) => {
    const normalizedCompany = normalizeCompanyName(job.company);
    const primaryContractTypeSlug =
      canonicalizeContractType(job.employmentType) ?? canonicalizeContractType(job.details?.contractTypes?.[0]);
    const primaryEmploymentTypeSlug = canonicalizeEmploymentType(job.details?.workSchedules?.[0]);
    const primaryWorkModeSlug = canonicalizeWorkMode(job.details?.workModes?.[0]);

    return {
      normalizedCompany,
      primaryContractTypeSlug,
      primaryEmploymentTypeSlug,
      primaryWorkModeSlug,
      categorySlug: inferredCategory?.slug ?? null,
      categoryLabel: inferredCategory?.label ?? null,
      companyLocation: job.details?.companyLocation?.trim() || null,
      companyDescription: job.details?.companyDescription?.trim() || null,
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
          hqLocation: sql`coalesce(${companiesTable.hqLocation}, excluded."hq_location")`,
          description: sql`coalesce(${companiesTable.description}, excluded."description")`,
          primarySource: sql`coalesce(${companiesTable.primarySource}, excluded."primary_source")`,
        },
      });
  }

  const contractTypeDefinitions = Array.from(
    new Map(
      preparedJobs
        .map((job) => job.primaryContractTypeSlug)
        .filter((value): value is string => Boolean(value))
        .map((slug) => {
          const definition = resolveCanonicalContractType(slug);
          return [slug, { slug, label: definition?.label ?? slug }];
        }),
    ).values(),
  );

  const employmentTypeDefinitions = Array.from(
    new Map(
      preparedJobs
        .map((job) => job.primaryEmploymentTypeSlug)
        .filter((value): value is string => Boolean(value))
        .map((slug) => {
          const definition = resolveCanonicalEmploymentType(slug);
          return [slug, { slug, label: definition?.label ?? slug }];
        }),
    ).values(),
  );

  const workModeDefinitions = Array.from(
    new Map(
      preparedJobs
        .map((job) => job.primaryWorkModeSlug)
        .filter((value): value is string => Boolean(value))
        .map((slug) => {
          const definition = resolveCanonicalWorkMode(slug);
          return [slug, { slug, label: definition?.label ?? slug }];
        }),
    ).values(),
  );

  const jobCategoryDefinitions =
    inferredCategory && inferredCategory.slug
      ? [{ slug: inferredCategory.slug, label: inferredCategory.label, description: null }]
      : [];

  const [companyRows, contractTypeIds, employmentTypeIds, workModeIds, jobCategoryIds] = await Promise.all([
    companyInputs.length
      ? db
          .select({
            id: companiesTable.id,
            normalizedName: companiesTable.normalizedName,
          })
          .from(companiesTable)
          .where(
            inArray(
              companiesTable.normalizedName,
              companyInputs.map((company) => company.normalizedName),
            ),
          )
      : Promise.resolve([]),
    upsertContractTypeRows(db, contractTypeDefinitions),
    upsertEmploymentTypeRows(db, employmentTypeDefinitions),
    upsertWorkModeRows(db, workModeDefinitions),
    upsertJobCategoryRows(db, jobCategoryDefinitions),
  ]);

  const companyIds = new Map(companyRows.map((row) => [row.normalizedName, row.id]));

  return preparedJobs.map((job) => ({
    companyId: job.normalizedCompany ? (companyIds.get(job.normalizedCompany.normalizedName) ?? null) : null,
    jobCategoryId: job.categorySlug ? (jobCategoryIds.get(job.categorySlug) ?? null) : null,
    employmentTypeId: job.primaryEmploymentTypeSlug
      ? (employmentTypeIds.get(job.primaryEmploymentTypeSlug) ?? null)
      : null,
    contractTypeId: job.primaryContractTypeSlug ? (contractTypeIds.get(job.primaryContractTypeSlug) ?? null) : null,
    workModeId: job.primaryWorkModeSlug ? (workModeIds.get(job.primaryWorkModeSlug) ?? null) : null,
  }));
};
