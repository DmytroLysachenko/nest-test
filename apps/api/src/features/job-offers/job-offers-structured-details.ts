import { eq, inArray } from 'drizzle-orm';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import {
  contractTypesTable,
  jobOfferContractTypesTable,
  jobOfferSeniorityLevelsTable,
  jobOfferTechnologiesTable,
  jobOfferWorkModesTable,
  jobOfferWorkSchedulesTable,
  seniorityLevelsTable,
  technologiesTable,
  workModesTable,
  workSchedulesTable,
} from '@repo/db';

export type StructuredOfferSelectRow = {
  jobOfferId?: string;
  companySummaryId?: string | null;
  companyCanonicalName?: string | null;
  companyWebsiteUrl?: string | null;
  companySourceProfileUrl?: string | null;
  companyLogoUrl?: string | null;
  companyDescription?: string | null;
  companyHqLocation?: string | null;
  jobCategoryLabel?: string | null;
  employmentTypeLabel?: string | null;
  contractTypeLabel?: string | null;
  workModeLabel?: string | null;
};

export type StructuredOfferRelations = {
  contractTypes: string[];
  workModes: string[];
  workSchedules: string[];
  seniorityLevels: string[];
  technologies: Array<{ label: string; category: 'required' | 'nice_to_have' | 'all' }>;
};

export const EMPTY_STRUCTURED_RELATIONS: StructuredOfferRelations = {
  contractTypes: [],
  workModes: [],
  workSchedules: [],
  seniorityLevels: [],
  technologies: [],
};

export const loadStructuredOfferRelations = async (db: NodePgDatabase, jobOfferIds: string[]) => {
  const ids = Array.from(new Set(jobOfferIds.filter(Boolean)));
  if (!ids.length) {
    return new Map<string, StructuredOfferRelations>();
  }

  try {
    const [contractTypeRows, workModeRows, workScheduleRows, seniorityLevelRows, technologyRows] = await Promise.all([
      db
        .select({
          jobOfferId: jobOfferContractTypesTable.jobOfferId,
          label: contractTypesTable.label,
        })
        .from(jobOfferContractTypesTable)
        .innerJoin(contractTypesTable, eq(jobOfferContractTypesTable.contractTypeId, contractTypesTable.id))
        .where(inArray(jobOfferContractTypesTable.jobOfferId, ids)),
      db
        .select({
          jobOfferId: jobOfferWorkModesTable.jobOfferId,
          label: workModesTable.label,
        })
        .from(jobOfferWorkModesTable)
        .innerJoin(workModesTable, eq(jobOfferWorkModesTable.workModeId, workModesTable.id))
        .where(inArray(jobOfferWorkModesTable.jobOfferId, ids)),
      db
        .select({
          jobOfferId: jobOfferWorkSchedulesTable.jobOfferId,
          label: workSchedulesTable.label,
        })
        .from(jobOfferWorkSchedulesTable)
        .innerJoin(workSchedulesTable, eq(jobOfferWorkSchedulesTable.workScheduleId, workSchedulesTable.id))
        .where(inArray(jobOfferWorkSchedulesTable.jobOfferId, ids)),
      db
        .select({
          jobOfferId: jobOfferSeniorityLevelsTable.jobOfferId,
          label: seniorityLevelsTable.label,
        })
        .from(jobOfferSeniorityLevelsTable)
        .innerJoin(seniorityLevelsTable, eq(jobOfferSeniorityLevelsTable.seniorityLevelId, seniorityLevelsTable.id))
        .where(inArray(jobOfferSeniorityLevelsTable.jobOfferId, ids)),
      db
        .select({
          jobOfferId: jobOfferTechnologiesTable.jobOfferId,
          label: technologiesTable.label,
          category: jobOfferTechnologiesTable.category,
        })
        .from(jobOfferTechnologiesTable)
        .innerJoin(technologiesTable, eq(jobOfferTechnologiesTable.technologyId, technologiesTable.id))
        .where(inArray(jobOfferTechnologiesTable.jobOfferId, ids)),
    ]);

    const relationMap = new Map<string, StructuredOfferRelations>();
    const ensureEntry = (jobOfferId: string) => {
      const existing = relationMap.get(jobOfferId);
      if (existing) {
        return existing;
      }
      const created: StructuredOfferRelations = {
        contractTypes: [],
        workModes: [],
        workSchedules: [],
        seniorityLevels: [],
        technologies: [],
      };
      relationMap.set(jobOfferId, created);
      return created;
    };

    for (const row of contractTypeRows) {
      if (!row.label) {
        continue;
      }
      const entry = ensureEntry(row.jobOfferId);
      if (!entry.contractTypes.includes(row.label)) {
        entry.contractTypes.push(row.label);
      }
    }
    for (const row of workModeRows) {
      if (!row.label) {
        continue;
      }
      const entry = ensureEntry(row.jobOfferId);
      if (!entry.workModes.includes(row.label)) {
        entry.workModes.push(row.label);
      }
    }
    for (const row of workScheduleRows) {
      if (!row.label) {
        continue;
      }
      const entry = ensureEntry(row.jobOfferId);
      if (!entry.workSchedules.includes(row.label)) {
        entry.workSchedules.push(row.label);
      }
    }
    for (const row of seniorityLevelRows) {
      if (!row.label) {
        continue;
      }
      const entry = ensureEntry(row.jobOfferId);
      if (!entry.seniorityLevels.includes(row.label)) {
        entry.seniorityLevels.push(row.label);
      }
    }
    for (const row of technologyRows) {
      if (!row.label) {
        continue;
      }
      const entry = ensureEntry(row.jobOfferId);
      if (
        !entry.technologies.some((technology) => technology.label === row.label && technology.category === row.category)
      ) {
        entry.technologies.push({
          label: row.label,
          category: row.category as 'required' | 'nice_to_have' | 'all',
        });
      }
    }

    for (const entry of relationMap.values()) {
      entry.contractTypes.sort((a, b) => a.localeCompare(b));
      entry.workModes.sort((a, b) => a.localeCompare(b));
      entry.workSchedules.sort((a, b) => a.localeCompare(b));
      entry.seniorityLevels.sort((a, b) => a.localeCompare(b));
      entry.technologies.sort((a, b) =>
        a.category === b.category ? a.label.localeCompare(b.label) : a.category.localeCompare(b.category),
      );
    }

    return relationMap;
  } catch {
    return new Map<string, StructuredOfferRelations>();
  }
};

export const buildStructuredOfferDetails = (
  row: StructuredOfferSelectRow,
  relations?: StructuredOfferRelations | null,
) => {
  const companySummary = row.companySummaryId
    ? {
        id: row.companySummaryId,
        canonicalName: row.companyCanonicalName ?? 'Unknown company',
        websiteUrl: row.companyWebsiteUrl ?? null,
        sourceProfileUrl: row.companySourceProfileUrl ?? null,
        logoUrl: row.companyLogoUrl ?? null,
        description: row.companyDescription ?? null,
        hqLocation: row.companyHqLocation ?? null,
      }
    : null;

  const jobCategory = row.jobCategoryLabel ?? null;
  const employmentTypeLabel = row.employmentTypeLabel ?? null;
  const contractTypeLabel = row.contractTypeLabel ?? null;
  const workModeLabel = row.workModeLabel ?? null;
  const mergedRelations = relations ?? EMPTY_STRUCTURED_RELATIONS;

  if (
    !companySummary &&
    !jobCategory &&
    !employmentTypeLabel &&
    !contractTypeLabel &&
    !workModeLabel &&
    !mergedRelations.contractTypes.length &&
    !mergedRelations.workModes.length &&
    !mergedRelations.workSchedules.length &&
    !mergedRelations.seniorityLevels.length &&
    !mergedRelations.technologies.length
  ) {
    return null;
  }

  return {
    companySummary,
    jobCategory,
    employmentTypeLabel,
    contractTypeLabel,
    workModeLabel,
    contractTypes: mergedRelations.contractTypes,
    workModes: mergedRelations.workModes,
    workSchedules: mergedRelations.workSchedules,
    seniorityLevels: mergedRelations.seniorityLevels,
    technologies: mergedRelations.technologies,
  };
};
