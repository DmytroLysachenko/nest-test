import { and, eq, isNull, or } from 'drizzle-orm';
import { type NodePgDatabase } from 'drizzle-orm/node-postgres';

import {
  persistCatalogObservation,
  replaceJobOfferRelations,
  resolveCatalogNormalizationRefs,
  type CatalogNormalizationJobInput,
} from './catalog-persistence';
import { jobOffersTable, jobSourceRunsTable } from './schema';

export type CatalogBackfillStats = {
  scannedRows: number;
  updatedRows: number;
  companyResolved: number;
  categoryResolved: number;
  employmentTypeResolved: number;
  contractTypeResolved: number;
  workModeResolved: number;
  unresolvedRows: number;
};

type BackfillOptions = {
  batchSize?: number;
};

type BackfillRow = {
  id: string;
  source: 'PRACUJ_PL';
  sourceId: string | null;
  title: string;
  company: string | null;
  location: string | null;
  salary: string | null;
  employmentType: string | null;
  sourceCompanyProfileUrl: string | null;
  applyUrl: string | null;
  postedAt: Date | null;
  description: string;
  requirements: unknown;
  details: unknown;
  contentHash: string | null;
  qualityState: 'ACCEPTED' | 'REJECTED' | 'REVIEW';
  qualityReason: string | null;
  companyId: string | null;
  jobCategoryId: string | null;
  employmentTypeId: string | null;
  contractTypeId: string | null;
  workModeId: string | null;
  listingUrl: string | null;
  filters: unknown;
};

const asCatalogDetails = (value: unknown): CatalogNormalizationJobInput['details'] => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const details = value as Record<string, unknown>;
  return {
    companyDescription: typeof details.companyDescription === 'string' ? details.companyDescription : null,
    companyLocation: typeof details.companyLocation === 'string' ? details.companyLocation : null,
    contractTypes: Array.isArray(details.contractTypes)
      ? details.contractTypes.filter((item): item is string => typeof item === 'string')
      : null,
    positionLevels: Array.isArray(details.positionLevels)
      ? details.positionLevels.filter((item): item is string => typeof item === 'string')
      : null,
    workModes: Array.isArray(details.workModes)
      ? details.workModes.filter((item): item is string => typeof item === 'string')
      : null,
    workSchedules: Array.isArray(details.workSchedules)
      ? details.workSchedules.filter((item): item is string => typeof item === 'string')
      : null,
    technologies:
      details.technologies && typeof details.technologies === 'object' && !Array.isArray(details.technologies)
        ? {
            required: Array.isArray((details.technologies as Record<string, unknown>).required)
              ? ((details.technologies as Record<string, unknown>).required as unknown[]).filter(
                  (item): item is string => typeof item === 'string',
                )
              : null,
            niceToHave: Array.isArray((details.technologies as Record<string, unknown>).niceToHave)
              ? ((details.technologies as Record<string, unknown>).niceToHave as unknown[]).filter(
                  (item): item is string => typeof item === 'string',
                )
              : null,
            all: Array.isArray((details.technologies as Record<string, unknown>).all)
              ? ((details.technologies as Record<string, unknown>).all as unknown[]).filter(
                  (item): item is string => typeof item === 'string',
                )
              : null,
          }
        : null,
  };
};

export const backfillCatalogNormalization = async (
  db: NodePgDatabase,
  options: BackfillOptions = {},
): Promise<CatalogBackfillStats> => {
  const batchSize = Math.max(1, options.batchSize ?? 250);
  const stats: CatalogBackfillStats = {
    scannedRows: 0,
    updatedRows: 0,
    companyResolved: 0,
    categoryResolved: 0,
    employmentTypeResolved: 0,
    contractTypeResolved: 0,
    workModeResolved: 0,
    unresolvedRows: 0,
  };

  while (true) {
    const rows: BackfillRow[] = await db
      .select({
        id: jobOffersTable.id,
        source: jobOffersTable.source,
        sourceId: jobOffersTable.sourceId,
        title: jobOffersTable.title,
        company: jobOffersTable.company,
        location: jobOffersTable.location,
        salary: jobOffersTable.salary,
        employmentType: jobOffersTable.employmentType,
        sourceCompanyProfileUrl: jobOffersTable.sourceCompanyProfileUrl,
        applyUrl: jobOffersTable.applyUrl,
        postedAt: jobOffersTable.postedAt,
        description: jobOffersTable.description,
        requirements: jobOffersTable.requirements,
        details: jobOffersTable.details,
        contentHash: jobOffersTable.contentHash,
        qualityState: jobOffersTable.qualityState,
        qualityReason: jobOffersTable.qualityReason,
        companyId: jobOffersTable.companyId,
        jobCategoryId: jobOffersTable.jobCategoryId,
        employmentTypeId: jobOffersTable.employmentTypeId,
        contractTypeId: jobOffersTable.contractTypeId,
        workModeId: jobOffersTable.workModeId,
        listingUrl: jobSourceRunsTable.listingUrl,
        filters: jobSourceRunsTable.filters,
      })
      .from(jobOffersTable)
      .leftJoin(jobSourceRunsTable, eq(jobOffersTable.runId, jobSourceRunsTable.id))
      .where(
        and(
          eq(jobOffersTable.source, 'PRACUJ_PL'),
          or(
            isNull(jobOffersTable.companyId),
            isNull(jobOffersTable.jobCategoryId),
            isNull(jobOffersTable.employmentTypeId),
            isNull(jobOffersTable.contractTypeId),
            isNull(jobOffersTable.workModeId),
          ),
        ),
      )
      .limit(batchSize);

    if (!rows.length) {
      return stats;
    }

    stats.scannedRows += rows.length;

    const groups = new Map<
      string,
      {
        context: { source: 'PRACUJ_PL'; listingUrl: string | null; filters: Record<string, unknown> | null };
        rows: BackfillRow[];
      }
    >();

    for (const row of rows) {
      const context = {
        source: row.source,
        listingUrl: row.listingUrl,
        filters: row.filters && typeof row.filters === 'object' ? (row.filters as Record<string, unknown>) : null,
      };
      const key = JSON.stringify(context);
      const group = groups.get(key);
      if (group) {
        group.rows.push(row);
      } else {
        groups.set(key, { context, rows: [row] });
      }
    }

    for (const group of groups.values()) {
      const refs = await resolveCatalogNormalizationRefs(
        db,
        group.rows.map((row) => ({
          company: row.company,
          employmentType: row.employmentType,
          salary: row.salary,
          sourceCompanyProfileUrl: row.sourceCompanyProfileUrl,
          applyUrl: row.applyUrl,
          postedAt: row.postedAt,
          details: asCatalogDetails(row.details),
        })),
        group.context,
      );

      for (const [index, row] of group.rows.entries()) {
        const resolved = refs[index];
        if (!resolved) {
          stats.unresolvedRows += 1;
          continue;
        }
        const nextCompanyId = row.companyId ?? resolved?.companyId ?? null;
        const nextJobCategoryId = row.jobCategoryId ?? resolved?.jobCategoryId ?? null;
        const nextEmploymentTypeId = row.employmentTypeId ?? resolved?.employmentTypeId ?? null;
        const nextContractTypeId = row.contractTypeId ?? resolved?.contractTypeId ?? null;
        const nextWorkModeId = row.workModeId ?? resolved?.workModeId ?? null;

        if (
          nextCompanyId === row.companyId &&
          nextJobCategoryId === row.jobCategoryId &&
          nextEmploymentTypeId === row.employmentTypeId &&
          nextContractTypeId === row.contractTypeId &&
          nextWorkModeId === row.workModeId
        ) {
          stats.unresolvedRows += 1;
          continue;
        }

        await db
          .update(jobOffersTable)
          .set({
            companyId: nextCompanyId,
            jobCategoryId: nextJobCategoryId,
            employmentTypeId: nextEmploymentTypeId,
            contractTypeId: nextContractTypeId,
            workModeId: nextWorkModeId,
            salaryMin: resolved.parsedSalary.salaryMin,
            salaryMax: resolved.parsedSalary.salaryMax,
            salaryCurrency: resolved.parsedSalary.salaryCurrency,
            salaryPeriod: resolved.parsedSalary.salaryPeriod,
            salaryKind: resolved.parsedSalary.salaryKind,
            sourceCompanyProfileUrl: row.sourceCompanyProfileUrl ?? resolved.sourceCompanyProfileUrl,
          })
          .where(eq(jobOffersTable.id, row.id));

        await replaceJobOfferRelations(db, row.id, resolved);
        await persistCatalogObservation(db, {
          jobOfferId: row.id,
          source: row.source,
          sourceId: row.sourceId,
          title: row.title,
          company: row.company,
          location: row.location,
          salary: row.salary,
          employmentType: row.employmentType,
          applyUrl: row.applyUrl,
          postedAt: row.postedAt,
          description: row.description,
          requirements: row.requirements,
          details: row.details,
          contentHash: row.contentHash ?? `${row.id}-backfill`,
          qualityState: row.qualityState,
          qualityReason: row.qualityReason,
          parserVersion: 'legacy-backfill',
          normalizationVersion: 'catalog-normalization-v2',
          normalizedRefs: resolved,
          rawPayloads: [
            {
              payloadType: 'legacy-job-offer-details',
              payloadJson: {
                requirements: row.requirements,
                details: row.details,
              },
            },
          ],
        });

        stats.updatedRows += 1;
        if (!row.companyId && nextCompanyId) {
          stats.companyResolved += 1;
        }
        if (!row.jobCategoryId && nextJobCategoryId) {
          stats.categoryResolved += 1;
        }
        if (!row.employmentTypeId && nextEmploymentTypeId) {
          stats.employmentTypeResolved += 1;
        }
        if (!row.contractTypeId && nextContractTypeId) {
          stats.contractTypeResolved += 1;
        }
        if (!row.workModeId && nextWorkModeId) {
          stats.workModeResolved += 1;
        }
      }
    }
  }
};
