import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { and, desc, eq, not, sql, isNull } from 'drizzle-orm';
import {
  companiesTable,
  employmentTypesTable,
  contractTypesTable,
  workModesTable,
  jobOffersTable,
  jobCategoriesTable,
  notebookPreferencesTable,
  userJobOffersTable,
  type JobSource,
} from '@repo/db';

import { Drizzle } from '@/common/decorators';
import {
  computeNotebookOfferRanking,
  type NotebookRankingMode,
  type NotebookRankingTuning,
} from '@/features/job-offers/notebook-ranking';

import { ListJobOffersQuery } from './dto/list-job-offers.query';
import { buildAttentionSignals, buildCollectionState } from './job-offers-attention';
import { defaultNotebookFilters, normalizeNotebookFilters } from './job-offers-preferences';
import { buildStructuredOfferDetails, loadStructuredOfferRelations } from './job-offers-structured-details';
import { buildRecommendedAction } from './job-offers-recommended-action';
import { UpdateNotebookPreferencesDto } from './dto/notebook-preferences.dto';
import {
  extractFollowUpFields,
  resolveFollowUpState,
  hasMissingNextStep,
  buildPipelineMetaWithFollowUp,
} from './job-offer-follow-up';

import type { Env } from '@/config/env';

const toIsoString = (value: Date | null) => (value ? value.toISOString() : null);

@Injectable()
export class JobOffersNotebookService {
  private readonly rankingTuning: NotebookRankingTuning;

  constructor(
    @Drizzle() private readonly db: NodePgDatabase,
    private readonly configService: ConfigService<Env, true>,
  ) {
    this.rankingTuning = {
      approxViolationPenalty: this.configService.get('NOTEBOOK_APPROX_VIOLATION_PENALTY', { infer: true }),
      approxMaxViolationPenalty: this.configService.get('NOTEBOOK_APPROX_MAX_VIOLATION_PENALTY', { infer: true }),
      approxScoredBonus: this.configService.get('NOTEBOOK_APPROX_SCORED_BONUS', { infer: true }),
      exploreUnscoredBase: this.configService.get('NOTEBOOK_EXPLORE_UNSCORED_BASE', { infer: true }),
      exploreRecencyWeight: this.configService.get('NOTEBOOK_EXPLORE_RECENCY_WEIGHT', { infer: true }),
    };
  }

  async list(userId: string, query: ListJobOffersQuery) {
    const limit = query.limit ? Number(query.limit) : 20;
    const offset = query.offset ? Number(query.offset) : 0;
    const mode: NotebookRankingMode = query.mode ?? 'strict';
    const fetchWindow = mode === 'explore' ? limit : Math.max(limit * 3, limit + offset);
    const fetchOffset = mode === 'explore' ? offset : 0;

    const conditions = [eq(userJobOffersTable.userId, userId)];
    if (query.includeExpired !== 'true') {
      conditions.push(eq(jobOffersTable.isExpired, false));
    }
    if (query.status) {
      conditions.push(eq(userJobOffersTable.status, query.status));
    }
    if (query.source) {
      conditions.push(eq(jobOffersTable.source, query.source as JobSource));
    }
    if (query.minScore !== undefined) {
      conditions.push(sql`${userJobOffersTable.matchScore} >= ${query.minScore}`);
    }
    if (query.hasScore !== undefined) {
      const wantsScore = query.hasScore === 'true';
      conditions.push(wantsScore ? not(isNull(userJobOffersTable.matchScore)) : isNull(userJobOffersTable.matchScore));
    }

    const items = await this.db
      .select({
        id: userJobOffersTable.id,
        jobOfferId: jobOffersTable.id,
        sourceRunId: userJobOffersTable.sourceRunId,
        status: userJobOffersTable.status,
        matchScore: userJobOffersTable.matchScore,
        matchMeta: userJobOffersTable.matchMeta,
        pipelineMeta: userJobOffersTable.pipelineMeta,
        followUpAt: userJobOffersTable.followUpAt,
        nextStep: userJobOffersTable.nextStep,
        followUpNote: userJobOffersTable.followUpNote,
        applicationUrl: userJobOffersTable.applicationUrl,
        contactName: userJobOffersTable.contactName,
        lastFollowUpCompletedAt: userJobOffersTable.lastFollowUpCompletedAt,
        lastFollowUpSnoozedAt: userJobOffersTable.lastFollowUpSnoozedAt,
        prepMaterials: userJobOffersTable.prepMaterials,
        notes: userJobOffersTable.notes,
        tags: userJobOffersTable.tags,
        statusHistory: userJobOffersTable.statusHistory,
        lastStatusAt: userJobOffersTable.lastStatusAt,
        source: jobOffersTable.source,
        url: jobOffersTable.url,
        title: jobOffersTable.title,
        company: jobOffersTable.company,
        location: jobOffersTable.location,
        salary: jobOffersTable.salary,
        employmentType: jobOffersTable.employmentType,
        isExpired: jobOffersTable.isExpired,
        expiresAt: jobOffersTable.expiresAt,
        companySummaryId: companiesTable.id,
        companyCanonicalName: companiesTable.canonicalName,
        companyWebsiteUrl: companiesTable.websiteUrl,
        companySourceProfileUrl: companiesTable.sourceProfileUrl,
        companyLogoUrl: companiesTable.logoUrl,
        companyDescription: companiesTable.description,
        companyHqLocation: companiesTable.hqLocation,
        jobCategoryLabel: jobCategoriesTable.label,
        employmentTypeLabel: employmentTypesTable.label,
        contractTypeLabel: contractTypesTable.label,
        workModeLabel: workModesTable.label,
        description: jobOffersTable.description,
        requirements: jobOffersTable.requirements,
        details: jobOffersTable.details,
        qualityReason: jobOffersTable.qualityReason,
        createdAt: jobOffersTable.fetchedAt,
      })
      .from(userJobOffersTable)
      .innerJoin(jobOffersTable, eq(jobOffersTable.id, userJobOffersTable.jobOfferId))
      .leftJoin(companiesTable, eq(jobOffersTable.companyId, companiesTable.id))
      .leftJoin(jobCategoriesTable, eq(jobOffersTable.jobCategoryId, jobCategoriesTable.id))
      .leftJoin(employmentTypesTable, eq(jobOffersTable.employmentTypeId, employmentTypesTable.id))
      .leftJoin(contractTypesTable, eq(jobOffersTable.contractTypeId, contractTypesTable.id))
      .leftJoin(workModesTable, eq(jobOffersTable.workModeId, workModesTable.id))
      .where(and(...conditions))
      .orderBy(desc(userJobOffersTable.lastStatusAt), desc(userJobOffersTable.createdAt))
      .limit(fetchWindow)
      .offset(fetchOffset);

    const followUpNow = new Date();
    const structuredRelationMap = await loadStructuredOfferRelations(
      this.db,
      items.map((item) => item.jobOfferId),
    );

    const modeEligibleItems = items
      .map((item) => {
        const followUpFields = extractFollowUpFields(item);
        const ranking = computeNotebookOfferRanking(
          {
            matchScore: item.matchScore,
            matchMeta: (item.matchMeta as Record<string, unknown> | null) ?? null,
          },
          mode,
          this.rankingTuning,
        );
        const structuredDetails = buildStructuredOfferDetails(item, structuredRelationMap.get(item.jobOfferId) ?? null);
        const {
          companySummaryId,
          companyCanonicalName,
          companyWebsiteUrl,
          companySourceProfileUrl,
          companyLogoUrl,
          companyDescription,
          companyHqLocation,
          jobCategoryLabel,
          employmentTypeLabel,
          contractTypeLabel,
          workModeLabel,
          ...responseItem
        } = item;

        return {
          ...responseItem,
          structuredDetails,
          rankingScore: ranking.rankingScore,
          explanationTags: ranking.explanationTags,
          attentionSignals: buildAttentionSignals({ status: item.status, source: item, now: followUpNow }),
          recommendedAction: buildRecommendedAction(item, followUpNow),
          followUpState: resolveFollowUpState(item.status, item, followUpNow),
          pipelineMeta: buildPipelineMetaWithFollowUp(item.pipelineMeta, followUpFields),
          followUpAt: toIsoString(followUpFields.followUpAt),
          expiresAt: toIsoString(item.expiresAt),
          nextStep: followUpFields.nextStep,
          followUpNote: followUpFields.followUpNote,
          applicationUrl: followUpFields.applicationUrl,
          contactName: followUpFields.contactName,
          lastFollowUpCompletedAt: toIsoString(followUpFields.lastFollowUpCompletedAt),
          lastFollowUpSnoozedAt: toIsoString(followUpFields.lastFollowUpSnoozedAt),
          __createdAtMs: new Date(item.createdAt).getTime(),
          __include: ranking.include,
          __isDegradedSource: item.qualityReason === 'listing_salvage' || item.qualityReason === 'low_context',
        };
      })
      .filter((item) => {
        if (!query.followUp) return true;
        return item.followUpState === query.followUp;
      });

    const filteredRankedItems = modeEligibleItems
      .filter((item) => item.__include)
      .sort((a, b) => {
        if (mode === 'explore') return b.__createdAtMs - a.__createdAtMs;
        return (b.rankingScore ?? 0) - (a.rankingScore ?? 0);
      });

    const rankedItems = filteredRankedItems
      .slice(offset, offset + limit)
      .map(({ __include, __createdAtMs, ...item }) => item);

    return {
      items: rankedItems,
      total: filteredRankedItems.length,
      mode,
      collectionState: buildCollectionState({
        mode,
        hiddenByModeCount: modeEligibleItems.length - filteredRankedItems.length,
        degradedResultCount: filteredRankedItems.filter((item) => item.__isDegradedSource).length,
        lastScrapeStatus: null,
      }),
    };
  }

  async getNotebookSummary(userId: string) {
    const items = await this.db
      .select({
        id: userJobOffersTable.id,
        status: userJobOffersTable.status,
        matchScore: userJobOffersTable.matchScore,
        matchMeta: userJobOffersTable.matchMeta,
        pipelineMeta: userJobOffersTable.pipelineMeta,
        followUpAt: userJobOffersTable.followUpAt,
        nextStep: userJobOffersTable.nextStep,
        followUpNote: userJobOffersTable.followUpNote,
        applicationUrl: userJobOffersTable.applicationUrl,
        contactName: userJobOffersTable.contactName,
        lastFollowUpCompletedAt: userJobOffersTable.lastFollowUpCompletedAt,
        lastFollowUpSnoozedAt: userJobOffersTable.lastFollowUpSnoozedAt,
        qualityReason: jobOffersTable.qualityReason,
        createdAt: userJobOffersTable.createdAt,
        lastStatusAt: userJobOffersTable.lastStatusAt,
      })
      .from(userJobOffersTable)
      .innerJoin(jobOffersTable, eq(jobOffersTable.id, userJobOffersTable.jobOfferId))
      .where(and(eq(userJobOffersTable.userId, userId), eq(jobOffersTable.isExpired, false)));

    const total = items.length;
    const followUpDue = items.filter((item) => resolveFollowUpState(item.status, item) === 'due').length;
    const missingNextStep = items.filter((item) => hasMissingNextStep(item.status, item)).length;

    return {
      total,
      followUpDue,
      missingNextStep,
    };
  }

  async getPreferences(userId: string) {
    const existing = await this.db
      .select()
      .from(notebookPreferencesTable)
      .where(eq(notebookPreferencesTable.userId, userId))
      .limit(1)
      .then(([item]) => item);

    if (existing) {
      return {
        ...existing,
        filters: normalizeNotebookFilters(existing.filters),
        savedPreset: existing.savedPreset ? normalizeNotebookFilters(existing.savedPreset) : null,
      };
    }

    const now = new Date();
    return {
      id: 'default',
      userId,
      filters: defaultNotebookFilters,
      savedPreset: null,
      createdAt: now,
      updatedAt: now,
    };
  }

  async updatePreferences(userId: string, input: UpdateNotebookPreferencesDto) {
    const now = new Date();
    const [existing] = await this.db
      .select({ id: notebookPreferencesTable.id })
      .from(notebookPreferencesTable)
      .where(eq(notebookPreferencesTable.userId, userId))
      .limit(1);

    if (existing) {
      const [updated] = await this.db
        .update(notebookPreferencesTable)
        .set({
          filters: normalizeNotebookFilters(input.filters),
          savedPreset: input.savedPreset ? normalizeNotebookFilters(input.savedPreset) : null,
          updatedAt: now,
        })
        .where(eq(notebookPreferencesTable.id, existing.id))
        .returning();

      return updated;
    }

    const [created] = await this.db
      .insert(notebookPreferencesTable)
      .values({
        userId,
        filters: normalizeNotebookFilters(input.filters),
        savedPreset: input.savedPreset ? normalizeNotebookFilters(input.savedPreset) : null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    return created;
  }
}
